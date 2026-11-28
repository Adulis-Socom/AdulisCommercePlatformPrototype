"""PROTO-BGR-RESEARCH-001 tests: admission schema (3), quarantine vs execution, promote, quarantine-verify, no override, runtime readiness.

IMPORTANT: every test here uses a MOCKED `rembg` (bgfixtures.FakeRembg) and TEMPORARY files with synthetic admission records. Nothing runs a
real model, and nothing here is evidence for any admission: models.json admits nothing, and the tests prove the live registry still refuses.
Run: .venv\\Scripts\\python -m unittest test_quarantine -v
"""
import ast
import contextlib
import copy
import importlib.metadata
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import adapter  # noqa: E402  (does not import rembg)
from bgfixtures import ADMISSION, FakeRembg, admit_for_test, png, sha  # noqa: E402

REGISTRY = json.loads((HERE / "models.json").read_text(encoding="utf-8"))
QUARANTINE_RECORD = {"id": "silueta", "family": "silueta", "file": "silueta.onnx", "sourceUrl": "https://example.invalid/silueta.onnx", "publisher": "test", "revision": "r1",
                     "bytes": None, "sha256": None, "publisherDigest": None, "digestMatch": False, "acquiredAt": "2026-11-28T00:00:00Z", "licence": "test", "licenceUrl": "https://example.invalid/licence",
                     "architecture": "u2net", "intendedScope": "internal-evaluation", "role": "test"}


def exit_message(call, *args):
    with unittest.TestCase().assertRaises(SystemExit) as caught:
        call(*args)
    return str(caught.exception)


class Sandbox(unittest.TestCase):
    """Temporary quarantine, executable and custom folders; mocked rembg; a registry restored afterwards."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.quarantine, self.models = self.root / "quarantine", self.root / "models"
        self.quarantine.mkdir()
        self.fake = FakeRembg()
        self.saved = {k: copy.deepcopy(v) for k, v in adapter.MANIFEST.items()}
        self.patches = [mock.patch.dict(sys.modules, {"rembg": self.fake.module}), mock.patch.object(adapter, "QUARANTINE_DIR", self.quarantine),
                        mock.patch.object(adapter, "QUARANTINE_MANIFEST", self.quarantine / "MANIFEST.json"), mock.patch.object(adapter, "MODEL_ROOT", self.models),
                        mock.patch.object(adapter, "CUSTOM_DIR", self.models / "custom"), mock.patch.object(adapter, "CUSTOM_REGISTRY", self.models / "custom" / "custom_registry.json"),
                        mock.patch.object(adapter, "free_ram_mb", lambda: 8000.0), mock.patch.object(adapter, "free_disk_mb", lambda: 100000.0)]
        for p in self.patches:
            p.start()
        adapter._sessions.clear()
        adapter._runs.clear()
        adapter._inferences.clear()

    def tearDown(self):
        for key in [k for k in adapter.MANIFEST if k.startswith("custom:")]:
            del adapter.MANIFEST[key]
        for key, value in self.saved.items():
            adapter.MANIFEST[key].clear()
            adapter.MANIFEST[key].update(copy.deepcopy(value))
        adapter._sessions.clear()
        for p in reversed(self.patches):
            p.stop()
        self.tmp.cleanup()

    def quarantine_checkpoint(self, model="silueta", data=b"quarantined checkpoint bytes", admit=True, manifest=True):
        """A checkpoint that exists ONLY in quarantine; optionally admitted in the in-memory registry with its hash pinned, and listed in the manifest."""
        file = adapter.MANIFEST[model]["assets"][0]["file"]
        (self.quarantine / model).mkdir(exist_ok=True)
        (self.quarantine / model / file).write_bytes(data)
        if admit:
            entry = adapter.MANIFEST[model]
            entry.update(status="admitted", assets=[dict(entry["assets"][0], pinnedSha256=sha(data))], admission=copy.deepcopy(ADMISSION))
        record = dict(QUARANTINE_RECORD, id=model, family=adapter.MANIFEST[model]["family"], file=file, bytes=len(data), sha256=sha(data))
        if manifest:
            (self.quarantine / "MANIFEST.json").write_text(json.dumps([record]), encoding="utf-8")
        return file, record

    def refused(self, call, *args):
        with self.assertRaises(SystemExit) as caught:
            call(*args)
        return str(caught.exception)


class AdmissionSchemaTest(unittest.TestCase):
    def test_registry_is_schema_3_with_pinned_hash_and_admission_slots_and_admits_nothing(self):
        self.assertEqual(REGISTRY["schema"], 3)
        for key, entry in REGISTRY["models"].items():
            self.assertNotEqual(entry["status"], "admitted", key)
            self.assertIn("admission", entry, key)
            self.assertIsNone(entry["admission"], key)
            for asset in entry["assets"]:
                self.assertIn("pinnedSha256", asset, key)
                self.assertIsNone(asset["pinnedSha256"], key)
        self.assertEqual(REGISTRY["customAdmissions"], [])
        self.assertEqual(REGISTRY["models"]["birefnet-general-fp16"]["derivedFrom"], "birefnet-general")

    def test_models_json_is_what_build_registry_generates(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "models.json"
            subprocess.run([sys.executable, str(HERE / "build_registry.py"), "-", str(target)], check=True, capture_output=True)
            self.assertEqual(target.read_text(encoding="utf-8").replace("\r\n", "\n"), (HERE / "models.json").read_text(encoding="utf-8").replace("\r\n", "\n"))

    def test_regenerating_the_registry_keeps_a_reviewed_admission(self):
        registry = copy.deepcopy(REGISTRY)
        entry = registry["models"]["silueta"]
        entry.update(status="admitted", statusNote="reviewed note", blocker="", admission=copy.deepcopy(ADMISSION), installPermitted=True, assets=[dict(entry["assets"][0], pinnedSha256="a" * 64)])
        registry["models"]["u2net"]["admission"] = copy.deepcopy(ADMISSION)  # an admission record without an admitted status does not admit anything
        with tempfile.TemporaryDirectory() as tmp:
            previous, out = Path(tmp) / "previous.json", Path(tmp) / "out.json"
            previous.write_text(json.dumps(registry), encoding="utf-8")
            subprocess.run([sys.executable, str(HERE / "build_registry.py"), "-", str(out), str(previous)], check=True, capture_output=True)
            kept = json.loads(out.read_text(encoding="utf-8"))["models"]
            self.assertEqual({k: kept["silueta"][k] for k in ("status", "statusNote", "blocker", "installPermitted")}, {"status": "admitted", "statusNote": "reviewed note", "blocker": "", "installPermitted": True})
            self.assertEqual((kept["silueta"]["admission"], kept["silueta"]["assets"][0]["pinnedSha256"]), (ADMISSION, "a" * 64))
            self.assertEqual(kept["u2net"]["status"], "unresolved")
            self.assertEqual(adapter.load_registry(out)["models"]["silueta"]["status"], "admitted")

    def forged(self, **mutations):
        """models.json written with one model set to "admitted" and then altered; returns that model's status after adapter.load_registry."""
        registry = copy.deepcopy(REGISTRY)
        entry = registry["models"]["silueta"]
        entry.update(status="admitted", admission=copy.deepcopy(ADMISSION), assets=[dict(entry["assets"][0], pinnedSha256="a" * 64)])
        for path, value in mutations.items():
            target = entry
            *head, last = path.split(".")
            for part in head:
                target = target[int(part)] if part.isdigit() else target[part]
            if value is KeyError:
                del target[last]
            else:
                target[last] = value
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "models.json"
            file.write_text(json.dumps(registry), encoding="utf-8")
            loaded = adapter.load_registry(file)
        return loaded["models"]["silueta"]

    def test_a_complete_entry_stays_admitted_at_load(self):
        entry = self.forged()
        self.assertEqual(entry["status"], "admitted")
        with mock.patch.dict(adapter.MANIFEST, {"silueta": entry}):
            self.assertTrue(adapter.is_admitted(entry))

    def test_a_forged_or_partial_entry_is_refused_at_load(self):
        cases = {"no admission record": {"admission": None}, "no evidence": {"admission.evidence": []}, "blank evidence": {"admission.evidence": ["  "]},
                 "evidence not a list": {"admission.evidence": "see file"}, "no scope": {"admission.scope": KeyError}, "wrong scope": {"admission.scope": "commercial"},
                 "decision not admitted": {"admission.decision": "candidate"}, "no decidedBy": {"admission.decidedBy": ""}, "no date": {"admission.date": KeyError},
                 "no role": {"admission.checkpointRole": KeyError}, "no limitations": {"admission.limitations": KeyError},
                 "no pinned hash": {"assets.0.pinnedSha256": None}, "short pinned hash": {"assets.0.pinnedSha256": "abc"}, "upper-case pinned hash": {"assets.0.pinnedSha256": "A" * 64},
                 "remote service": {"kind": "remote"}, "custom base": {"kind": "custom"}, "no assets": {"assets": []}}
        for name, mutation in cases.items():
            entry = self.forged(**mutation)
            self.assertEqual(entry["status"], "invalid-admission", name)
            self.assertTrue(entry["blocker"].startswith("Not admitted"), name)
            self.assertTrue(entry["admissionProblems"], name)
            self.assertFalse(adapter.is_admitted(entry), name)

    def test_a_derived_model_needs_its_source_admitted_and_pinned(self):
        registry = copy.deepcopy(REGISTRY)
        fp16, source = registry["models"]["birefnet-general-fp16"], registry["models"]["birefnet-general"]
        fp16.update(status="admitted", admission=copy.deepcopy(ADMISSION))
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "models.json"
            file.write_text(json.dumps(registry), encoding="utf-8")
            self.assertEqual(adapter.load_registry(file)["models"]["birefnet-general-fp16"]["status"], "invalid-admission")
            source.update(status="admitted", admission=copy.deepcopy(ADMISSION), assets=[dict(source["assets"][0], pinnedSha256="b" * 64)])
            file.write_text(json.dumps(registry), encoding="utf-8")
            loaded = adapter.load_registry(file)["models"]
            self.assertEqual((loaded["birefnet-general"]["status"], loaded["birefnet-general-fp16"]["status"]), ("admitted", "admitted"))

    def test_status_alone_is_not_admission_at_run_time_either(self):
        entry = adapter.MANIFEST["silueta"]
        saved = copy.deepcopy(entry)
        fake = FakeRembg()
        try:
            entry["status"] = "admitted"  # forged in memory after load: no pinned hash, no admission record
            self.assertFalse(adapter.is_admitted(entry))
            with mock.patch.dict(sys.modules, {"rembg": fake.module}), self.assertRaises(adapter.Refused) as caught:
                adapter.process(png(), "silueta", adapter.parse_settings("silueta", {}))
            self.assertEqual(caught.exception.status, 403)
            self.assertEqual(fake.created, [])
        finally:
            entry.clear()
            entry.update(saved)

    def test_the_live_registry_refuses_every_model_even_with_an_installed_u2netp_file(self):
        """u2netp.onnx may exist on this disk from an earlier session; it is NOT admitted, so every gate refuses it."""
        fake = FakeRembg()
        with mock.patch.dict(sys.modules, {"rembg": fake.module}):
            for key in REGISTRY["models"]:
                self.assertFalse(adapter.is_admitted(adapter.MANIFEST[key]), key)
                with self.assertRaises(adapter.Refused) as caught:
                    adapter.load_session(key)
                self.assertEqual(caught.exception.status, 403, key)
                with self.assertRaises(adapter.Refused) as caught:
                    adapter.install(key)
                self.assertEqual(caught.exception.status, 403, key)
            with self.assertRaises(adapter.Refused) as caught:
                adapter.process(png(), "u2netp", adapter.parse_settings("u2netp", {}))
            self.assertEqual(caught.exception.status, 403)
        self.assertEqual(fake.created, [])
        self.assertIn("not admitted", exit_message(adapter.promote, "u2netp", "u2netp.onnx"))


class NoOverrideTest(unittest.TestCase):
    ALLOWED_ENV = {"ADAPTER_MAX_SESSIONS", "ADAPTER_PORT", "ADAPTER_APP_PORTS", "ADAPTER_TOKEN", "OMP_NUM_THREADS", "REMBG_HOME", "U2NET_HOME", "MODEL_CHECKSUM_DISABLED"}

    def test_the_only_environment_names_the_adapter_touches_are_known_and_none_admits_anything(self):
        source = (HERE / "adapter.py").read_text(encoding="utf-8")
        names = set(re.findall(r'os\.environ(?:\.get|\.pop|\.setdefault)?\(?\[?"([A-Z0-9_]+)"', source)) | set(re.findall(r'os\.getenv\("([A-Z0-9_]+)"', source))
        self.assertEqual(names - self.ALLOWED_ENV, set(), "a new environment variable must be reviewed: it may not change admission")
        bench = (HERE / "bench.py").read_text(encoding="utf-8")
        self.assertNotIn("os.getenv", bench)
        self.assertEqual(set(re.findall(r'os\.environ(?:\.get)?\(?\[?"([A-Z0-9_]+)"', bench)), {"OMP_NUM_THREADS"})

    def test_no_environment_variable_or_flag_changes_the_decision(self):
        entry = adapter.MANIFEST["u2netp"]
        with mock.patch.dict(os.environ, {"ADAPTER_ADMIT_ALL": "1", "ADAPTER_ALLOW_UNADMITTED": "1", "ADAPTER_ADMIT": "u2netp", "MODEL_CHECKSUM_DISABLED": "1", "ADAPTER_QUARANTINE_OK": "1", "BENCH_FORCE": "1"}):
            self.assertFalse(adapter.is_admitted(entry))
            self.assertIn("not admitted", exit_message(adapter.promote, "u2netp", "u2netp.onnx"))
            import bench
            self.assertIn("not admitted", bench.refusal("u2netp"))
        for flag in ("--force", "--admit", "--allow-unadmitted", "--override"):
            with self.assertRaises(SystemExit):
                with contextlib.redirect_stderr(io.StringIO()):
                    __import__("bench").main(["--model", "u2netp", "--image", "x.png", "--out", str(Path(tempfile.gettempdir()) / "bench-x"), flag])
        with mock.patch.object(sys, "argv", ["adapter.py", "promote", "u2netp", "u2netp.onnx", "--force"]), self.assertRaises(SystemExit) as caught:
            adapter.main()
        self.assertIn("usage", str(caught.exception))


class QuarantineTest(Sandbox):
    def test_a_quarantined_file_is_never_installed_or_loadable(self):
        self.quarantine_checkpoint()
        self.assertFalse(adapter.is_installed("silueta"))  # nothing in the executable location
        with self.assertRaises(adapter.Refused) as caught:
            adapter.process(png(), "silueta", adapter.parse_settings("silueta", {}))
        self.assertEqual(caught.exception.status, 503)
        self.assertEqual(self.fake.created, [])

    def test_pointing_the_executable_location_into_quarantine_is_refused(self):
        self.quarantine_checkpoint()
        with mock.patch.object(adapter, "MODEL_ROOT", self.quarantine):  # the file is then found at quarantine/silueta/<file>
            self.assertTrue((adapter.MODEL_ROOT / "silueta" / "silueta.onnx").is_file())
            self.assertFalse(adapter.is_installed("silueta"))
            with self.assertRaises(adapter.Refused) as caught:
                adapter.load_session("silueta")
            self.assertEqual(caught.exception.status, 403)
            self.assertIn("quarantine", caught.exception.message)
        self.assertEqual(self.fake.created, [])

    def test_a_symlink_that_leads_into_quarantine_is_refused(self):
        file, _ = self.quarantine_checkpoint()
        link = self.models / "silueta" / file
        link.parent.mkdir(parents=True)
        try:
            os.symlink(self.quarantine / "silueta" / file, link)
        except (OSError, NotImplementedError):
            self.skipTest("this account may not create symbolic links")
        self.assertTrue(adapter.under_quarantine(link))
        self.assertFalse(adapter.is_installed("silueta"))
        with self.assertRaises(adapter.Refused) as caught:
            adapter.load_session("silueta")
        self.assertEqual(caught.exception.status, 403)
        self.assertEqual(self.fake.created, [])

    def test_a_custom_checkpoint_path_inside_quarantine_is_refused(self):
        (self.quarantine / "custom").mkdir()
        (self.quarantine / "custom" / "mine.onnx").write_bytes(b"x")
        with mock.patch.object(adapter, "CUSTOM_DIR", self.quarantine / "custom"):
            with self.assertRaises(adapter.Refused) as caught:
                adapter.resolve_custom_path({"customFile": "mine.onnx"})
            self.assertEqual(caught.exception.status, 403)
        self.assertIn("quarantine", self.refused(adapter.register_custom, "mine", "u2net_custom", str(self.quarantine / "custom" / "mine.onnx")))

    def test_under_quarantine_covers_the_folder_its_children_and_dot_dot_but_not_siblings(self):
        for inside in (self.quarantine, self.quarantine / "a" / "b.onnx", self.quarantine / ".." / "quarantine" / "x"):
            self.assertTrue(adapter.under_quarantine(inside), inside)
        for outside in (self.root / "quarantine-extra" / "x", self.models / "x", self.root):
            self.assertFalse(adapter.under_quarantine(outside), outside)

    def test_rembg_is_never_allowed_to_download_while_a_session_loads(self):
        admit_for_test(adapter, "silueta", self.models)
        self.fake.download = True
        with self.assertRaises(adapter.Refused) as caught:
            adapter.load_session("silueta")
        self.assertEqual(caught.exception.status, 403)
        self.assertIn("never downloads", caught.exception.message)
        self.assertEqual(self.fake.created, [])
        import pooch
        self.assertTrue(pooch.retrieve.__module__.startswith("pooch"), "pooch.retrieve must be restored after the refusal")


class QuarantineVerifyTest(Sandbox):
    def run_command(self, *args):
        out = io.StringIO()
        with mock.patch.object(sys, "argv", ["adapter.py", "quarantine-verify", *args]), contextlib.redirect_stdout(out), self.assertRaises(SystemExit) as caught:
            adapter.main()
        return caught.exception.code, out.getvalue()

    def test_a_clean_quarantine_verifies_and_exits_zero(self):
        self.quarantine_checkpoint(admit=False)
        code, text = self.run_command()
        self.assertEqual(code, 0)
        self.assertIn("1 verified, 0 problem(s)", text)

    def test_a_changed_file_is_a_mismatch_and_exits_non_zero(self):
        file, _ = self.quarantine_checkpoint(admit=False)
        (self.quarantine / "silueta" / file).write_bytes(b"quarantined checkpoint bytes!")
        code, text = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn("SHA-256 MISMATCH", text)

    def test_a_missing_file_a_missing_key_and_an_inconsistent_digest_are_reported(self):
        file, record = self.quarantine_checkpoint(admit=False)
        (self.quarantine / "silueta" / file).unlink()
        incomplete = {k: v for k, v in record.items() if k not in ("licence", "role")}
        wrong_digest = dict(record, file="other.onnx", digestMatch=True, publisherDigest="sha256:" + "c" * 64)
        (self.quarantine / "silueta" / "other.onnx").write_bytes(b"quarantined checkpoint bytes")
        (self.quarantine / "MANIFEST.json").write_text(json.dumps([incomplete, wrong_digest]), encoding="utf-8")
        code, text = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn("MISSING", text)
        self.assertIn("lacks licence, role", text)
        self.assertIn("digestMatch is true but publisherDigest differs", text)

    def test_a_manifest_that_is_not_a_list_or_names_a_path_is_refused(self):
        (self.quarantine / "MANIFEST.json").write_text(json.dumps({"id": "x"}), encoding="utf-8")
        self.assertIn("list of objects", self.refused(adapter.quarantine_verify))
        (self.quarantine / "MANIFEST.json").write_text(json.dumps([dict(QUARANTINE_RECORD, file="../escape.onnx")]), encoding="utf-8")
        code, text = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn("not a plain name", text)

    def test_no_manifest_is_a_clear_refusal(self):
        self.assertIn("no quarantine manifest", self.refused(adapter.quarantine_verify))

    def test_the_manifest_schema_has_the_agreed_keys(self):
        self.assertEqual(adapter.QUARANTINE_KEYS, ("id", "family", "file", "sourceUrl", "publisher", "revision", "bytes", "sha256", "publisherDigest", "digestMatch",
                                                   "acquiredAt", "licence", "licenceUrl", "architecture", "intendedScope", "role"))


class PromoteTest(Sandbox):
    def target(self):
        return self.models / "silueta" / "silueta.onnx"

    def test_promote_copies_only_when_every_hash_agrees_and_the_model_then_loads(self):
        self.quarantine_checkpoint()
        adapter.promote("silueta", "silueta.onnx")
        self.assertEqual(self.target().read_bytes(), b"quarantined checkpoint bytes")
        self.assertFalse((self.models / "silueta" / "silueta.onnx.part").exists())
        self.assertTrue(adapter.is_installed("silueta"))
        result = adapter.process(png(), "silueta", adapter.parse_settings("silueta", {}))  # MOCKED inference
        self.assertEqual(self.fake.created, ["silueta"])
        self.assertEqual(result["facts"]["checkpointSha256"], [sha(b"quarantined checkpoint bytes")])

    def test_promote_refuses_an_unadmitted_model_and_copies_nothing(self):
        self.quarantine_checkpoint(admit=False)
        self.assertIn("is not admitted", self.refused(adapter.promote, "silueta", "silueta.onnx"))
        self.assertFalse(self.target().exists())

    def test_promote_refuses_a_partial_admission_with_the_reason(self):
        self.quarantine_checkpoint()
        adapter.MANIFEST["silueta"]["admission"]["evidence"] = []
        message = self.refused(adapter.promote, "silueta", "silueta.onnx")
        self.assertIn("is not admitted", message)
        self.assertFalse(self.target().exists())

    def test_promote_refuses_when_the_manifest_hash_differs_from_the_pinned_hash(self):
        file, record = self.quarantine_checkpoint()
        (self.quarantine / "MANIFEST.json").write_text(json.dumps([dict(record, sha256="d" * 64)]), encoding="utf-8")
        self.assertIn("manifest sha256", self.refused(adapter.promote, "silueta", file))
        self.assertFalse(self.target().exists())

    def test_promote_refuses_when_the_file_no_longer_matches_the_pinned_hash(self):
        file, _ = self.quarantine_checkpoint()
        (self.quarantine / "silueta" / file).write_bytes(b"changed after the manifest was written")
        self.assertIn("hashes to", self.refused(adapter.promote, "silueta", file))
        self.assertFalse(self.target().exists())

    def test_promote_refuses_an_unregistered_asset_a_path_and_a_missing_manifest_record(self):
        file, _ = self.quarantine_checkpoint()
        self.assertIn("not a registered asset", self.refused(adapter.promote, "silueta", "other.onnx"))
        self.assertIn("not a registered asset", self.refused(adapter.promote, "silueta", "../silueta.onnx"))
        (self.quarantine / "MANIFEST.json").write_text("[]", encoding="utf-8")
        self.assertIn("no record", self.refused(adapter.promote, "silueta", file))
        self.assertFalse(self.target().exists())

    def test_promote_refuses_a_missing_quarantined_file_a_custom_id_a_derived_model_and_low_disk(self):
        file, _ = self.quarantine_checkpoint()
        with mock.patch.object(adapter, "free_disk_mb", lambda: 10.0):
            self.assertIn("not enough free disk", self.refused(adapter.promote, "silueta", file))
        (self.quarantine / "silueta" / file).unlink()
        self.assertIn("missing", self.refused(adapter.promote, "silueta", file))
        self.assertIn("not a registry model", self.refused(adapter.promote, "custom:mine", "x.onnx"))
        self.assertIn("not a registry model", self.refused(adapter.promote, "nope", "x.onnx"))
        self.assertIn("promote that model's file", self.refused(self.promote_fp16))
        self.assertFalse(self.target().exists())

    def promote_fp16(self):
        admit_for_test(adapter, "birefnet-general", self.root / "scratch")
        adapter.MANIFEST["birefnet-general-fp16"].update(status="admitted", admission=copy.deepcopy(ADMISSION))
        adapter.promote("birefnet-general-fp16", adapter.MANIFEST["birefnet-general"]["assets"][0]["file"])

    def test_the_cli_exit_codes(self):
        self.quarantine_checkpoint(admit=False)
        for args in (["promote", "silueta", "silueta.onnx"], ["promote"], ["bogus"]):
            with mock.patch.object(sys, "argv", ["adapter.py", *args]), self.assertRaises(SystemExit) as caught:
                adapter.main()
            self.assertNotIn(caught.exception.code, (0, None), args)


class BenchGateTest(Sandbox):
    def test_the_benchmark_refuses_an_unadmitted_model_and_never_starts_a_child(self):
        import bench
        out = Path(tempfile.gettempdir()) / "bgr-bench-test-out"
        with mock.patch("subprocess.run") as spawned, self.assertRaises(SystemExit) as caught:
            bench.main(["--model", "u2netp", "--image", str(self.root / "x.png"), "--out", str(out)])
        self.assertIn("not admitted", str(caught.exception))
        spawned.assert_not_called()
        self.assertFalse(out.exists())

    def test_the_benchmark_refuses_when_the_adapter_preflight_fails_and_when_the_output_is_inside_the_repository(self):
        import bench
        admit_for_test(adapter, "silueta", self.models)
        self.assertIsNone(bench.refusal("silueta"))
        with mock.patch.object(adapter, "free_ram_mb", lambda: 100.0):
            self.assertIn("not enough free memory", bench.refusal("silueta"))
        with mock.patch.object(adapter, "free_disk_mb", lambda: 100.0):
            self.assertIn("not enough free disk", bench.refusal("silueta"))
        with mock.patch.object(adapter, "module_missing", lambda name: name == "onnxruntime"):
            self.assertIn("onnxruntime", bench.refusal("silueta"))
        (self.models / "silueta" / adapter.MANIFEST["silueta"]["assets"][0]["file"]).unlink()
        self.assertIn("not installed", bench.refusal("silueta"))
        with mock.patch("subprocess.run") as spawned, self.assertRaises(SystemExit) as caught:
            bench.main(["--model", "silueta", "--image", str(self.root / "x.png"), "--out", str(HERE / "bench-out")])
        self.assertIn("inside the repository", str(caught.exception))
        spawned.assert_not_called()

    def test_an_admitted_model_is_run_in_a_fresh_child_with_the_same_arguments(self):
        import bench
        admit_for_test(adapter, "silueta", self.models)
        photo = self.root / "photo.png"
        photo.write_bytes(png())
        with mock.patch("subprocess.run", return_value=subprocess.CompletedProcess([], 0)) as spawned:
            self.assertEqual(bench.main(["--model", "silueta", "--image", str(photo), "--out", str(self.root / "out"), "--runs", "2", "--setting", "only_mask=1"]), 0)
        command = spawned.call_args[0][0]
        self.assertEqual((command[1].endswith("bench.py"), "--child" in command), (True, True))
        self.assertEqual(command[command.index("--runs") + 1], "2")
        self.assertEqual(command[command.index("--setting") + 1], "only_mask=1")


class BenchSeriesTest(Sandbox):
    """The child's work, in-process, with a MOCKED rembg: proves the record layout, not any timing or model."""

    def test_one_json_per_run_with_the_separated_measurements_and_no_score(self):
        import bench
        files = admit_for_test(adapter, "silueta", self.models)
        out = self.root / "out"
        body = png(50, 40)
        records = bench.run_series("silueta", body, 3, out, ["only_mask=1"], "C:/private/dir/shirt.png")
        written = sorted(p.name for p in out.glob("*.json"))
        self.assertEqual(len(written), 4)  # run 0 (cold load + first inference) and 3 warm runs
        self.assertEqual(len(list(out.glob("*.png"))), 1)
        first, warm = records[0], records[1:]
        self.assertEqual((first["kind"], first["inferenceIndexSinceLoad"]), ("cold-load+first-inference", 1))
        self.assertTrue(all(r["kind"] == "warm" for r in warm))
        self.assertEqual([r["inferenceIndexSinceLoad"] for r in warm], [2, 3, 4])
        for record in records:
            self.assertEqual(record["inputSha256"], sha(body))
            self.assertEqual((record["inputDimensions"], record["outputDimensions"], record["outputMode"]), ("50x40", "50x40", "RGBA"))
            self.assertEqual(record["provider"], "CPUExecutionProvider")
            self.assertEqual(record["checkpointSha256"], [sha(next(iter(files.values())))])
            self.assertEqual(record["image"], "shirt.png")  # a name only, never a path
            self.assertNotIn("private", json.dumps(record))
            for key in ("coldLoadSeconds", "inferenceSeconds", "approxModelMemoryMb", "inferenceRssDeltaMb", "isolatedPeakWorkingSetMb", "importBaselineRssMb", "outputSha256"):
                self.assertIn(key, record)
            self.assertIn("this child process only", record["isolatedPeakScope"])
            self.assertFalse([k for k in record if re.search(r"quality|score|rating|accuracy", k, re.I)])
        self.assertIsNotNone(first["coldLoadSeconds"])
        on_disk = json.loads((out / written[0]).read_text(encoding="utf-8"))
        self.assertEqual(on_disk["model"], "silueta")
        self.assertEqual(self.fake.created, ["silueta"])  # loaded once for the series

    def test_run_series_goes_through_the_same_admission_gate(self):
        import bench
        with self.assertRaises(adapter.Refused) as caught:
            bench.run_series("u2netp", png(), 1, self.root / "out", [], "x.png")
        self.assertEqual(caught.exception.status, 403)
        self.assertEqual(self.fake.created, [])
        self.assertFalse((self.root / "out").exists() and list((self.root / "out").glob("*.json")))


class MeasurementTest(Sandbox):
    """IR-045 in the adapter's own run record (MOCKED inference)."""

    def test_cold_and_warm_runs_keep_load_inference_and_memory_apart(self):
        admit_for_test(adapter, "silueta", self.models)
        settings = adapter.parse_settings("silueta", {})
        first = adapter.process(png(), "silueta", settings)
        second = adapter.process(png(), "silueta", settings)
        a, b = adapter._runs
        self.assertEqual((a["cold"], b["cold"]), (True, False))
        self.assertEqual((a["inferenceIndex"], b["inferenceIndex"]), (1, 2))
        self.assertIsNotNone(a["loadDeltaMb"])
        self.assertIsNone(b["loadDeltaMb"])
        for record in (a, b):
            self.assertEqual(record["peakScope"], "process-cumulative")
            for key in ("loadMs", "ms", "inferenceRssDeltaMb", "processPeakRssMb", "rssBeforeLoadMb", "rssAfterLoadMb"):
                self.assertIn(key, record)
        self.assertEqual(first["memory"]["inferenceIndex"], 1)
        self.assertEqual(second["memory"]["inferenceIndex"], 2)
        adapter.unload("silueta")  # a reload starts counting again
        adapter.process(png(), "silueta", settings)
        self.assertEqual(adapter._runs[-1]["inferenceIndex"], 1)

    def test_eviction_resets_the_inference_count_of_the_evicted_model(self):
        admit_for_test(adapter, "silueta", self.models)
        admit_for_test(adapter, "birefnet-general-lite", self.models)
        adapter.process(png(), "silueta", adapter.parse_settings("silueta", {}))
        adapter.process(png(), "birefnet-general-lite", adapter.parse_settings("birefnet-general-lite", {}))
        self.assertNotIn("silueta", adapter._inferences)
        adapter.process(png(), "silueta", adapter.parse_settings("silueta", {}))
        self.assertEqual(adapter._runs[-1]["inferenceIndex"], 1)


class ReadinessTest(Sandbox):
    def test_core_modules_cover_every_third_party_import_of_the_installed_rembg(self):
        """Read from the installed rembg sources (module level imports of bg.py, session_factory.py, matting.py and every session)."""
        root = Path(importlib.metadata.distribution("rembg").locate_file("rembg"))  # not find_spec: the mocked rembg module has no spec
        found, inner = set(), set()

        def walk(node, depth):
            for child in ast.iter_child_nodes(node):
                if isinstance(child, (ast.Import, ast.ImportFrom)):
                    names = [a.name for a in child.names] if isinstance(child, ast.Import) else ([child.module] if child.level == 0 and child.module else [])
                    for name in names:
                        top = name.split(".")[0]
                        if top not in sys.stdlib_module_names and top != "rembg":
                            (found if depth == 0 else inner).add(top)
                walk(child, depth + (1 if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) else 0))
        for path in [root / "bg.py", root / "session_factory.py", root / "matting.py", *(root / "sessions").glob("*.py")]:
            walk(ast.parse(path.read_text(encoding="utf-8")), 0)
        self.assertEqual(found - set(adapter.CORE_MODULES), set(), "rembg imports a module the readiness check does not know about")
        self.assertEqual(inner, {"onnx", "onnxconverter_common"})  # imported lazily, only by the fp16 session
        self.assertEqual(set(adapter.MODEL_MODULES["birefnet-general-fp16"]), inner)

    def test_the_registry_requirements_agree_with_the_module_table(self):
        required = REGISTRY["models"]["birefnet-general-fp16"]["requirements"]
        self.assertEqual({r.replace("-", "_") for r in required}, set(adapter.MODEL_MODULES["birefnet-general-fp16"]))

    def test_dependencies_match_what_is_really_importable_here(self):
        for model in ("silueta", "sam", "birefnet-general-fp16", "u2net_cloth_seg"):
            deps = adapter.dependencies(model)
            expected = [m for m in deps["required"] if importlib.util.find_spec(m) is None]
            self.assertEqual(deps["missing"], expected, model)
            self.assertEqual(deps["ok"], not expected, model)
        self.assertEqual(adapter.dependencies("birefnet-general-fp16")["missing"], [m for m in ("onnx", "onnxconverter_common") if importlib.util.find_spec(m) is None])
        for model in ("silueta", "sam"):
            self.assertEqual(adapter.dependencies(model)["required"], list(adapter.CORE_MODULES))

    def test_features_name_the_modules_alpha_matting_and_decontamination_need(self):
        features = adapter.dependencies("silueta")["features"]
        self.assertEqual(set(features), {"alphaMatting", "decontaminate", "postProcessMask"})
        with mock.patch.object(adapter, "module_missing", lambda name: name == "pymatting"):
            features = adapter.dependencies("silueta")["features"]
        self.assertEqual(features["alphaMatting"], {"ok": False, "missing": ["pymatting"]})
        self.assertEqual(features["decontaminate"], {"ok": False, "missing": ["pymatting"]})
        self.assertTrue(features["postProcessMask"]["ok"])
        self.assertEqual(adapter.dependencies("withoutbg")["features"], {})

    def test_a_file_that_exists_is_not_ready_when_a_needed_module_is_missing(self):
        admit_for_test(adapter, "silueta", self.models)
        self.assertTrue(adapter.public_entry("silueta")["installed"])
        with mock.patch.object(adapter, "module_missing", lambda name: name == "skimage"):
            entry = adapter.public_entry("silueta")
            self.assertEqual((entry["admitted"], entry["installed"], entry["ready"]), (True, True, False))
            self.assertEqual(entry["dependencies"]["missing"], ["skimage"])
            self.assertEqual(entry["dependencies"]["missingPackages"], ["scikit-image"])
            self.assertIn("missing Python module: skimage", entry["readinessReasons"])
            with self.assertRaises(adapter.Refused) as caught:
                adapter.process(png(), "silueta", adapter.parse_settings("silueta", {}))
            self.assertEqual(caught.exception.status, 503)
            self.assertIn("skimage", caught.exception.message)
            self.assertIn("scikit-image", caught.exception.message)
            self.assertEqual(self.fake.created, [])

    def test_fp16_is_ready_only_with_its_two_modules_and_its_source_checkpoint(self):
        admit_for_test(adapter, "birefnet-general", self.models)
        adapter.MANIFEST["birefnet-general-fp16"].update(status="admitted", admission=copy.deepcopy(ADMISSION))
        self.assertTrue(adapter.is_admitted(adapter.MANIFEST["birefnet-general-fp16"]))
        self.assertTrue(adapter.is_installed("birefnet-general-fp16"))  # its source float32 file is in place
        with mock.patch.object(adapter, "module_missing", lambda name: name in ("onnx", "onnxconverter_common")):
            entry = adapter.public_entry("birefnet-general-fp16")
            self.assertFalse(entry["ready"])
            self.assertEqual(entry["dependencies"]["missing"], ["onnx", "onnxconverter_common"])
            self.assertEqual(entry["dependencies"]["missingPackages"], ["onnx", "onnxconverter-common"])
            with self.assertRaises(adapter.Refused) as caught:
                adapter.load_session("birefnet-general-fp16")
            self.assertEqual(caught.exception.status, 503)
            self.assertIn("onnx, onnxconverter_common", caught.exception.message)
        with mock.patch.object(adapter, "module_missing", lambda name: False):
            self.assertTrue(adapter.public_entry("birefnet-general-fp16")["ready"])
        (self.models / "birefnet-general" / adapter.MANIFEST["birefnet-general"]["assets"][0]["file"]).unlink()
        with mock.patch.object(adapter, "module_missing", lambda name: False):
            self.assertFalse(adapter.public_entry("birefnet-general-fp16")["ready"])

    def test_sam_needs_both_of_its_files(self):
        files = admit_for_test(adapter, "sam", self.models)
        with mock.patch.object(adapter, "module_missing", lambda name: False):
            self.assertTrue(adapter.public_entry("sam")["ready"])
            (self.models / "sam" / next(iter(files))).unlink()
            self.assertFalse(adapter.public_entry("sam")["ready"])

    def test_a_setting_whose_module_is_missing_is_refused_with_the_module_name(self):
        with mock.patch.object(adapter, "module_missing", lambda name: name == "pymatting"):
            with self.assertRaises(adapter.Refused) as caught:
                adapter.parse_settings("silueta", {"alpha_matting": ["1"]})
            self.assertEqual(caught.exception.status, 503)
            self.assertIn("pymatting", caught.exception.message)
            adapter.parse_settings("silueta", {"post_process_mask": ["1"]})  # needs scipy and skimage only

    def test_runtime_info_survives_a_broken_rembg_and_names_the_module(self):
        with mock.patch.dict(sys.modules, {"rembg": None}):  # an import of rembg now raises ImportError
            info = adapter.runtime_info()
        self.assertIn("importError", info)
        self.assertEqual(info["adapterProviders"], ["CPUExecutionProvider"])

    def test_the_catalogue_payload_carries_dependencies_and_readiness_for_every_model(self):
        payload = adapter.catalogue_payload()
        self.assertEqual(len(payload["models"]), len(REGISTRY["models"]))
        for entry in payload["models"]:
            self.assertIn("ok", entry["dependencies"], entry["id"])
            self.assertFalse(entry["ready"], entry["id"])


if __name__ == "__main__":
    unittest.main()
