"""BGR-FIX-01 tests: colour decontamination, alpha-matting parameters, custom-checkpoint registration and the facts the adapter records.

IMPORTANT: nothing is admitted, so no real inference runs. These tests use a MOCKED `rembg` and temporary files. They prove the
adapter's validation and path handling, not any model's quality.
Run: .venv\\Scripts\\python -m unittest test_adapter_custom -v
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
import adapter  # noqa: E402

REGISTRY = json.loads((HERE / "models.json").read_text(encoding="utf-8"))


def png(width=40, height=30):
    from PIL import Image
    out = io.BytesIO()
    Image.new("RGB", (width, height), (180, 90, 40)).save(out, format="PNG")
    return out.getvalue()


def parse(model, **query):
    return adapter.parse_settings(model, {k: [str(v)] for k, v in query.items()})


def refused(model, **query):
    with unittest.TestCase().assertRaises(adapter.Refused) as caught:
        parse(model, **query)
    return caught.exception


class SettingsTest(unittest.TestCase):
    def test_decontaminate_is_a_supported_setting_of_local_models_only(self):
        self.assertTrue(parse("birefnet-general-lite", decontaminate=1)["decontaminate"])
        self.assertEqual(refused("withoutbg", decontaminate=1).status, 400)

    def test_decontaminate_cannot_be_combined_with_matting_or_a_mask_only_result(self):
        self.assertIn("already estimates", refused("silueta", decontaminate=1, alpha_matting=1).message)
        self.assertIn("mask-only", refused("silueta", decontaminate=1, only_mask=1).message)

    def test_matting_parameters_need_matting_and_sensible_values(self):
        self.assertIn("only applies", refused("silueta", fg_threshold=200).message)
        s = parse("silueta", alpha_matting=1)
        self.assertEqual((s["fg_threshold"], s["bg_threshold"], s["erode_size"]), (240, 10, 10))  # rembg 2.0.88 defaults
        s = parse("silueta", alpha_matting=1, fg_threshold=200, bg_threshold=20, erode_size=5)
        self.assertEqual((s["fg_threshold"], s["bg_threshold"], s["erode_size"]), (200, 20, 5))
        for bad in ({"fg_threshold": 300}, {"bg_threshold": -1}, {"erode_size": 51}, {"fg_threshold": "x"}, {"fg_threshold": 20, "bg_threshold": 20}, {"fg_threshold": 10, "bg_threshold": 50}):
            self.assertEqual(refused("silueta", alpha_matting=1, **bad).status, 400, bad)

    def test_the_registry_no_longer_claims_dynamic_resolution(self):
        for key, entry in REGISTRY["models"].items():
            self.assertFalse(entry["settings"].get("dynamicResolution"), key)
            if key.startswith("birefnet"):
                self.assertFalse(entry["runtime"]["dynamicResolution"], key)
                self.assertIn("1024", entry["runtime"]["inputHandling"])
        self.assertIn("float16", REGISTRY["models"]["birefnet-general-fp16"]["runtime"]["precision"])
        self.assertEqual(REGISTRY["models"]["birefnet-general-fp16"]["requirements"], ["onnx", "onnxconverter-common"])

    def test_official_publisher_checkpoints_are_recorded_separately_from_rembg_assets(self):
        for key in ("birefnet-general", "birefnet-general-lite", "sam"):
            publisher = REGISTRY["models"][key]["officialPublisher"]
            self.assertTrue(publisher["repo"].startswith("https://github.com/"))
            self.assertIn("hash", publisher)
            rembg_urls = {a["url"] for a in REGISTRY["models"][key]["assets"]}
            self.assertTrue(all("danielgatis/rembg" in u for u in rembg_urls))
        self.assertFalse(REGISTRY["models"]["sam"]["officialPublisher"]["onnxOfficial"])


class FakeRembg(types.ModuleType):
    """MOCK rembg: returns a flat image and records the arguments the adapter passed."""

    def __init__(self):
        super().__init__("rembg")
        self.created, self.calls, self.session_kwargs = [], [], {}

    def new_session(self, model, providers=None, **kwargs):
        self.created.append(model)
        self.session_kwargs = kwargs
        return types.SimpleNamespace(model=model, inner_session=types.SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"]))

    def remove(self, image, session=None, decontaminate=False, **kwargs):
        from PIL import Image
        self.calls.append((session.model, dict(kwargs, decontaminate=decontaminate)))
        return Image.new("RGBA", image.size, (10, 20, 30, 128))


class CustomCheckpointTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.custom = self.root / "custom"
        self.fake = FakeRembg()
        self.saved = {k: dict(v) for k, v in adapter.MANIFEST.items()}
        self.patches = [mock.patch.dict(sys.modules, {"rembg": self.fake}), mock.patch.object(adapter, "CUSTOM_DIR", self.custom),
                        mock.patch.object(adapter, "CUSTOM_REGISTRY", self.custom / "custom_registry.json"),
                        mock.patch.object(adapter, "free_ram_mb", lambda: 8000.0), mock.patch.object(adapter, "ADMITTED_CUSTOM", set())]
        for p in self.patches:
            p.start()
        adapter._sessions.clear()
        adapter._runs.clear()
        self.source = self.root / "mine.onnx"
        self.source.write_bytes(b"my own checkpoint")
        self.sha = hashlib.sha256(b"my own checkpoint").hexdigest()

    def tearDown(self):
        for key in [k for k in adapter.MANIFEST if k.startswith("custom:")]:
            del adapter.MANIFEST[key]
        for key, value in self.saved.items():
            adapter.MANIFEST[key].clear()
            adapter.MANIFEST[key].update(value)
        adapter._sessions.clear()
        for p in reversed(self.patches):
            p.stop()
        self.tmp.cleanup()

    def register(self, name="mine", session="u2net_custom"):
        sha = adapter.register_custom(name, session, str(self.source))
        adapter.load_custom()
        return sha

    def test_registration_copies_hashes_and_lists_the_checkpoint_as_blocked(self):
        self.assertEqual(self.register(), self.sha)
        entry = adapter.MANIFEST["custom:mine"]
        self.assertEqual((entry["status"], entry["sha256"], entry["custom"]), ("registered", self.sha, True))
        self.assertFalse(adapter.is_admitted(entry))
        with self.assertRaises(adapter.Refused) as caught:
            adapter.process(png(), "custom:mine", parse("custom:mine"))
        self.assertEqual(caught.exception.status, 403)
        self.assertEqual(self.fake.created, [])  # never loaded

    def test_only_a_reviewed_customAdmission_with_licence_evidence_lets_it_run_with_an_explicit_model_path(self):
        self.register()
        with mock.patch.object(adapter, "ADMITTED_CUSTOM", {self.sha}):
            adapter.load_custom()
            self.assertTrue(adapter.is_admitted(adapter.MANIFEST["custom:mine"]))
            result = adapter.process(png(), "custom:mine", parse("custom:mine"))
        self.assertEqual(self.fake.created, ["u2net_custom"])
        self.assertEqual(Path(self.fake.session_kwargs["model_path"]), (self.custom / "mine.onnx").resolve())
        self.assertEqual(result["facts"]["checkpointSha256"], [self.sha])
        self.assertEqual(result["facts"]["inputSha256"], hashlib.sha256(png()).hexdigest())
        self.assertEqual(result["facts"]["provider"], "CPUExecutionProvider")

    def test_a_tampered_custom_file_is_refused_even_when_admitted(self):
        self.register()
        (self.custom / "mine.onnx").write_bytes(b"swapped")
        with mock.patch.object(adapter, "ADMITTED_CUSTOM", {self.sha}):
            adapter.load_custom()
            with self.assertRaises(adapter.Refused) as caught:
                adapter.process(png(), "custom:mine", parse("custom:mine"))
        self.assertEqual(caught.exception.status, 500)

    def test_registration_refuses_unsafe_input(self):
        for args in (("Bad Name", "u2net_custom", self.source), ("ok", "u2net", self.source), ("ok", "u2net_custom", self.root / "missing.onnx"), ("ok", "u2net_custom", self.root)):
            with self.assertRaises(SystemExit):
                adapter.register_custom(args[0], args[1], str(args[2]))
        txt = self.root / "weights.txt"
        txt.write_bytes(b"x")
        with self.assertRaises(SystemExit):
            adapter.register_custom("ok", "u2net_custom", str(txt))

    def test_path_resolution_never_leaves_the_custom_folder(self):
        self.register()
        entry = dict(adapter.MANIFEST["custom:mine"], customFile="../mine.onnx")
        (self.root / "mine.onnx").write_bytes(b"outside")
        with self.assertRaises(adapter.Refused):
            adapter.resolve_custom_path(entry)

    def test_no_http_endpoint_registers_or_names_a_path(self):
        source = (HERE / "adapter.py").read_text(encoding="utf-8")
        self.assertNotIn('"/register', source)
        self.assertIn('parts.path not in ("/remove", "/unload", "/install")', source)

    def test_a_corrupt_or_forged_custom_registry_entry_is_ignored(self):
        self.custom.mkdir(parents=True)
        (self.custom / "custom_registry.json").write_text(json.dumps({"checkpoints": [
            {"name": "../evil", "session": "u2net_custom", "file": "x.onnx", "sha256": self.sha},
            {"name": "ok", "session": "u2net", "file": "x.onnx", "sha256": self.sha},
            {"name": "ok2", "session": "u2net_custom", "file": "../../etc.onnx", "sha256": self.sha}]}), encoding="utf-8")
        adapter.load_custom()
        self.assertEqual([k for k in adapter.MANIFEST if k.startswith("custom:")], [])


class RuntimeFactsTest(unittest.TestCase):
    def test_matting_is_refused_above_the_pixel_limit_and_decontaminate_reaches_the_library(self):
        fake = FakeRembg()
        with mock.patch.dict(sys.modules, {"rembg": fake}):
            from PIL import Image
            big = Image.new("RGB", (2100, 2000))
            with self.assertRaises(adapter.Refused) as caught:
                adapter.remove(big, types.SimpleNamespace(model="x"), parse("silueta", alpha_matting=1))
            self.assertEqual(caught.exception.status, 400)
            adapter.remove(Image.new("RGB", (20, 20)), types.SimpleNamespace(model="silueta"), parse("silueta", decontaminate=1))
            self.assertTrue(fake.calls[-1][1]["decontaminate"])
            adapter.remove(Image.new("RGB", (20, 20)), types.SimpleNamespace(model="silueta"), parse("silueta", alpha_matting=1, erode_size=3))
            self.assertEqual(fake.calls[-1][1]["alpha_matting_erode_size"], 3)

    def test_runtime_info_reads_the_installed_packages(self):
        info = adapter.runtime_info()
        self.assertIn("CPUExecutionProvider", info["onnxruntimeProviders"])
        self.assertEqual(info["adapterProviders"], ["CPUExecutionProvider"])
        self.assertEqual(info["packages"]["rembg"], "2.0.88")
        self.assertTrue(info["decontaminateSupported"])
        self.assertEqual(info["missingRequirements"]["birefnet-general-fp16"], ["onnx", "onnxconverter-common"])  # not installed on this machine


if __name__ == "__main__":
    unittest.main()
