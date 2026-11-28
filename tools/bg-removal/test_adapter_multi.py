"""BGR-014/015/016 tests: registry integrity, settings validation, and the multi-model session logic.

IMPORTANT: no model is admitted in models.json, so no real inference can run. The session-logic tests below use a MOCKED `rembg` module
(a fake new_session/remove that returns a flat image) and temporary checkpoint files; they prove the adapter's own behaviour
(lazy load, bounded cache, unload, preflight, verification, failure isolation, settings), NOT any model's quality.
Run: .venv\\Scripts\\python -m unittest test_adapter_multi -v
"""
import hashlib
import io
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import adapter  # noqa: E402  (does not import rembg)
from bgfixtures import ADMITTED_MODELS, admit_for_test, sha  # noqa: E402

REGISTRY = json.loads((HERE / "models.json").read_text(encoding="utf-8"))
INSPECTED = json.loads((HERE / "rembg_sessions_2.0.88.json").read_text(encoding="utf-8"))["sessions"]


def png(width=40, height=30):
    from PIL import Image
    out = io.BytesIO()
    Image.new("RGB", (width, height), (180, 90, 40)).save(out, format="PNG")
    return out.getvalue()


class RegistryTest(unittest.TestCase):
    def test_every_rembg_session_is_registered_with_its_exact_runtime_id(self):
        self.assertEqual(len(INSPECTED), 23)
        self.assertEqual(sorted(REGISTRY["models"]), sorted(s["id"] for s in INSPECTED))
        for want in ("u2netp", "u2net", "silueta", "isnet-general-use", "isnet-anime", "u2net_human_seg", "u2net_cloth_seg", "sam", "birefnet-general", "birefnet-general-lite",
                     "birefnet-general-fp16", "birefnet-dynamic", "birefnet-portrait", "birefnet-dis", "birefnet-hrsod", "birefnet-cod", "birefnet-massive", "bria-rmbg",
                     "u2net_custom", "dis_custom", "ben_custom", "withoutbg", "atlascloud"):
            self.assertIn(want, REGISTRY["models"])

    def test_checkpoint_urls_and_checksums_match_what_rembg_itself_declares(self):
        for session in INSPECTED:
            entry = REGISTRY["models"][session["id"]]
            urls = [a["url"] for a in entry["assets"]]
            for url in session["urls"]:
                if "{" not in url:
                    self.assertIn(url, urls, session["id"])
            single = [a for a in entry["assets"] if a.get("rembgChecksum")]
            if len(entry["assets"]) == 1 and session["checksums"]:
                self.assertEqual(single[0]["rembgChecksum"], session["checksums"][0], session["id"])

    def test_exactly_the_reviewed_models_are_admitted_and_each_other_model_says_why(self):
        self.assertEqual(sorted(k for k, e in REGISTRY["models"].items() if e["status"] == "admitted"), sorted(ADMITTED_MODELS))
        for key, entry in REGISTRY["models"].items():
            self.assertTrue(entry["statusNote"], key)
            self.assertIn(entry["kind"], ("local", "remote", "custom"))
            self.assertFalse(entry["installPermitted"], key)  # nothing may be downloaded by /install; admitted files come from quarantine through promote
            if key in ADMITTED_MODELS:
                self.assertTrue(entry["executable"], key)
                self.assertEqual(entry["blocker"], "", key)
            else:
                self.assertFalse(entry["executable"], key)
                self.assertTrue(entry["blocker"], key)

    def test_remote_services_are_inactive_and_hold_no_credentials(self):
        for key in ("withoutbg", "atlascloud"):
            entry = REGISTRY["models"][key]
            self.assertEqual((entry["kind"], entry["status"], entry["assets"], entry["providers"]), ("remote", "external-inactive", [], []))
        self.assertNotIn("api_key", json.dumps(REGISTRY).lower())

    def test_u2netp_history_and_weights_record_are_preserved(self):
        self.assertEqual(REGISTRY["history"][0]["model"], "u2netp")
        self.assertEqual(REGISTRY["models"]["u2netp"]["sha256"], "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8")
        self.assertEqual(REGISTRY["models"]["u2netp"]["status"], "unresolved")

    def test_public_catalogue_entry_has_no_paths_and_only_admitted_installed_models_are_ready(self):
        for key in REGISTRY["models"]:
            entry = adapter.public_entry(key)
            self.assertNotIn("file", entry)
            if key in ADMITTED_MODELS:
                self.assertTrue(entry["admitted"], key)
                self.assertEqual(entry["ready"], entry["installed"] and entry["dependencies"]["ok"], key)  # depends on this disk, never on the registry alone
            else:
                self.assertFalse(entry["ready"], key)
            self.assertNotIn(str(HERE), json.dumps(entry))


class CatalogueExportTest(unittest.TestCase):
    def test_the_frontend_catalogue_is_generated_from_the_registry_and_in_sync(self):
        import export_catalogue
        self.assertEqual(export_catalogue.TARGET.read_text(encoding="utf-8"), export_catalogue.build(), "run: python export_catalogue.py")

    def test_the_frontend_catalogue_leaks_no_paths_or_hashes_of_local_files(self):
        text = (HERE.parents[1] / "src" / "lab" / "model-catalogue.json").read_text(encoding="utf-8")
        self.assertNotIn(str(HERE), text)
        self.assertNotIn("309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8", text.replace('"actualSha256": "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8"', ""))


class SettingsTest(unittest.TestCase):
    def parse(self, model, **query):
        return adapter.parse_settings(model, {k: [str(v)] for k, v in query.items()})

    def refused(self, model, **query):
        with self.assertRaises(adapter.Refused) as caught:
            self.parse(model, **query)
        return caught.exception.status

    def test_defaults_and_compatible_settings(self):
        self.assertEqual(self.parse("birefnet-general-lite"), {"only_mask": False, "alpha_matting": False, "post_process_mask": False, "decontaminate": False})
        self.assertTrue(self.parse("birefnet-general-lite", only_mask=1, post_process_mask=1)["only_mask"])
        self.assertTrue(self.parse("birefnet-general-lite", alpha_matting=1)["alpha_matting"])

    def test_incompatible_or_unknown_settings_are_refused_not_dropped(self):
        self.assertEqual(self.refused("birefnet-general-lite", only_mask=1, alpha_matting=1), 400)
        self.assertEqual(self.refused("birefnet-general-lite", unknown=1), 400)
        self.assertEqual(self.refused("birefnet-general-lite", only_mask="maybe"), 400)
        self.assertEqual(self.refused("birefnet-general-lite", points="5,5,1"), 400)  # points are SAM-only
        self.assertEqual(self.refused("birefnet-general-lite", cloth="upper"), 400)    # cloth regions are cloth-model only
        self.assertEqual(self.refused("withoutbg", only_mask=1), 400)                  # a remote model supports none of these

    def test_sam_is_interactive_and_needs_a_foreground_point(self):
        self.assertEqual(self.refused("sam"), 400)
        self.assertEqual(self.refused("sam", points="10,10,0"), 400)  # background only
        self.assertEqual(self.refused("sam", points="a,b,1"), 400)
        self.assertEqual(self.refused("sam", points="10,10,2"), 400)
        self.assertEqual(self.refused("sam", points="-1,10,1"), 400)
        self.assertEqual(self.refused("sam", points=";".join(["1,1,1"] * 9)), 400)
        self.assertEqual(self.parse("sam", points="10,10,1;5,5,0")["points"], [(10, 10, 1), (5, 5, 0)])

    def test_cloth_model_needs_an_explicit_region(self):
        self.assertEqual(self.refused("u2net_cloth_seg"), 400)
        self.assertEqual(self.refused("u2net_cloth_seg", cloth="shoes"), 400)
        self.assertEqual(self.parse("u2net_cloth_seg", cloth="lower")["cloth"], "lower")


class FakeRembg(types.ModuleType):
    """Stands in for the rembg package. MOCK: returns a flat image; records what the adapter asked for."""

    def __init__(self):
        super().__init__("rembg")
        self.created, self.calls, self.fail = [], [], False

    def new_session(self, model, providers=None, **kwargs):
        self.created.append(model)
        self.session_kwargs = kwargs
        return types.SimpleNamespace(model=model, providers=providers, inner_session=types.SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"]))

    def remove(self, image, session=None, **kwargs):
        from PIL import Image
        self.calls.append((session.model, kwargs))
        if self.fail:
            raise RuntimeError("simulated native failure")
        return Image.new("L" if kwargs.get("only_mask") else "RGBA", image.size, 255 if kwargs.get("only_mask") else (10, 20, 30, 128))


class SessionLogicTest(unittest.TestCase):
    """MOCKED inference: the adapter's own session handling, with temporary files standing in for checkpoints."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.fake = FakeRembg()
        self.patches = [mock.patch.dict(sys.modules, {"rembg": self.fake}), mock.patch.object(adapter, "MODEL_ROOT", self.root),
                        mock.patch.object(adapter, "free_ram_mb", lambda: 8000.0)]
        for p in self.patches:
            p.start()
        self.saved = {k: dict(v) for k, v in adapter.MANIFEST.items()}
        adapter._sessions.clear()
        adapter._runs.clear()
        for model in ("birefnet-general-lite", "silueta"):
            admit_for_test(adapter, model, self.root)  # synthetic file, pinned hash and admission record (see bgfixtures.py)

    def tearDown(self):
        for key, value in self.saved.items():
            adapter.MANIFEST[key].clear()
            adapter.MANIFEST[key].update(value)
        adapter._sessions.clear()
        for p in reversed(self.patches):
            p.stop()
        self.tmp.cleanup()

    def run_model(self, model, **query):
        return adapter.process(png(), model, adapter.parse_settings(model, {k: [str(v)] for k, v in query.items()}))

    def test_models_load_lazily_and_warm_runs_reuse_the_session(self):
        self.assertEqual(self.fake.created, [])
        first = self.run_model("birefnet-general-lite")
        second = self.run_model("birefnet-general-lite")
        self.assertEqual((first["cold"], second["cold"]), (True, False))
        self.assertEqual(self.fake.created, ["birefnet-general-lite"])
        self.assertEqual([r["cold"] for r in adapter._runs], [True, False])

    def test_cache_is_bounded_and_the_other_model_is_never_a_fallback(self):
        self.run_model("birefnet-general-lite")
        self.run_model("silueta")
        self.assertEqual(list(adapter._sessions), ["silueta"])  # MAX_SESSIONS = 1 evicted the first
        self.assertEqual([c[0] for c in self.fake.calls], ["birefnet-general-lite", "silueta"])  # each ran its own model
        with self.assertRaises(adapter.Refused) as caught:
            self.run_model("u2net")  # not admitted: refused, and the loaded model is not used instead
        self.assertEqual(caught.exception.status, 403)
        self.assertEqual(len(self.fake.calls), 2)

    def test_unload_releases_the_session(self):
        self.run_model("silueta")
        adapter.unload("silueta")
        self.assertEqual(list(adapter._sessions), [])
        self.assertTrue(self.run_model("silueta")["cold"])

    def test_checkpoint_verification_blocks_loading(self):
        asset = adapter.MANIFEST["silueta"]["assets"][0]
        (self.root / "silueta" / asset["file"]).write_bytes(b"tampered")
        with self.assertRaises(adapter.Refused) as caught:
            self.run_model("silueta")
        self.assertEqual(caught.exception.status, 500)
        asset["pinnedSha256"] = None  # a model that says "admitted" without a pinned hash is not loadable at run time either
        with self.assertRaises(adapter.Refused) as caught:
            self.run_model("silueta")
        self.assertEqual(caught.exception.status, 403)
        self.assertEqual(self.fake.created, [])

    def test_missing_checkpoint_is_reported_not_downloaded(self):
        (self.root / "silueta" / adapter.MANIFEST["silueta"]["assets"][0]["file"]).unlink()
        with self.assertRaises(adapter.Refused) as caught:
            self.run_model("silueta")
        self.assertEqual(caught.exception.status, 503)

    def test_low_memory_refuses_before_loading(self):
        with mock.patch.object(adapter, "free_ram_mb", lambda: 300.0):
            with self.assertRaises(adapter.Refused) as caught:
                self.run_model("birefnet-general-lite")
        self.assertEqual(caught.exception.status, 507)
        self.assertIn("free memory", caught.exception.message)
        self.assertEqual(self.fake.created, [])

    def test_a_failure_is_isolated_and_recorded(self):
        self.fake.fail = True
        with self.assertRaises(adapter.Refused) as caught:
            self.run_model("silueta")
        self.assertEqual(caught.exception.status, 500)
        self.fake.fail = False
        self.assertTrue(self.run_model("silueta")["png"])
        self.assertEqual([r["ok"] for r in adapter._runs], [False, True])
        self.assertFalse(adapter._busy.locked())

    def test_mask_only_returns_a_mask_and_settings_reach_the_library(self):
        from PIL import Image
        result = self.run_model("silueta", only_mask=1, post_process_mask=1)
        self.assertEqual(Image.open(io.BytesIO(result["png"])).mode, "L")
        self.assertEqual(self.fake.calls[-1][1], {"only_mask": True, "alpha_matting": False, "post_process_mask": True})
        result = self.run_model("silueta")
        self.assertEqual(Image.open(io.BytesIO(result["png"])).mode, "RGBA")

    def test_sam_points_and_cloth_regions_are_passed_through_and_bounds_checked(self):
        admit_for_test(adapter, "sam", self.root)
        self.run_model("sam", points="10,10,1;20,5,0")
        self.assertEqual(self.fake.calls[-1][1]["sam_prompt"], [{"type": "point", "label": 1, "data": [10, 10]}, {"type": "point", "label": 0, "data": [20, 5]}])
        with self.assertRaises(adapter.Refused) as caught:
            self.run_model("sam", points="500,500,1")  # outside the 40x30 image
        self.assertEqual(caught.exception.status, 400)

    def test_measurements_never_hold_image_bytes(self):
        self.run_model("silueta")
        record = adapter._runs[-1]
        self.assertTrue({"model", "ms", "loadMs", "cold", "rssMb", "peakRssMb", "size"} <= set(record))
        self.assertNotIn("png", record)


class InstallTest(unittest.TestCase):
    def test_install_is_refused_for_anything_not_admitted_and_permitted(self):
        for model in REGISTRY["models"]:
            with self.assertRaises(adapter.Refused) as caught:
                adapter.install(model)
            self.assertEqual(caught.exception.status, 403, model)
        with self.assertRaises(adapter.Refused) as caught:
            adapter.install("../../etc/passwd")
        self.assertEqual(caught.exception.status, 400)

    def test_an_admitted_and_permitted_install_downloads_only_registry_urls_and_reports_the_hash(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(adapter, "MODEL_ROOT", Path(tmp)):
            entry = adapter.MANIFEST["silueta"]
            saved = {k: (list(v) if isinstance(v, list) else v) for k, v in entry.items()}
            data = b"downloaded checkpoint"
            admit_for_test(adapter, "silueta", tmp)
            (Path(tmp) / "silueta" / entry["assets"][0]["file"]).unlink()  # not installed yet
            entry.update(installPermitted=True)
            entry["assets"][0]["pinnedSha256"] = sha(data)
            try:
                with mock.patch("urllib.request.urlopen", return_value=io.BytesIO(data)) as opened, mock.patch.object(adapter, "preflight", lambda e, s="run": {"ok": True}):
                    result = adapter.install("silueta")
                self.assertTrue(opened.call_args[0][0].startswith("https://github.com/danielgatis/rembg/releases/download/"))
                self.assertEqual(result["files"][0]["sha256"], hashlib.sha256(data).hexdigest())
                self.assertTrue(result["files"][0]["recordedInRegistry"])  # an admitted model always has its hash pinned
                entry["assets"][0]["pinnedSha256"] = sha(b"a different file")
                with mock.patch("urllib.request.urlopen", return_value=io.BytesIO(data)), mock.patch.object(adapter, "preflight", lambda e, s="run": {"ok": True}):
                    with self.assertRaises(adapter.Refused) as caught:
                        adapter.install("silueta")  # the download does not match the pinned hash: refused and deleted
                self.assertEqual(caught.exception.status, 500)
                entry["assets"][0]["pinnedSha256"] = sha(data)
                entry["assets"][0]["url"] = "https://evil.example/x.onnx"
                with mock.patch.object(adapter, "preflight", lambda e, s="run": {"ok": True}):
                    with self.assertRaises(adapter.Refused):
                        adapter.install("silueta")
            finally:
                entry.clear()
                entry.update(saved)


if __name__ == "__main__":
    unittest.main()
