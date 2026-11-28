"""Adapter safeguard tests. Run: .venv\\Scripts\\python -m unittest test_adapter -v

These hit a real adapter process over HTTP. No test runs a model unless a checkpoint is "admitted" in models.json
(none is: u2netp is unresolved), so test_actual_inference_* is skipped; every other test is a refusal that must happen
before any inference (no model is loaded for them).
"""
import http.client
import importlib.util
import io
import json
import os
import struct
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PORT, TOKEN = 8797, "unit-test-token"
ORIGIN = "http://localhost:8443"
os.environ.update(ADAPTER_PORT=str(PORT), ADAPTER_TOKEN=TOKEN)
sys.path.insert(0, str(HERE))


def png(width=40, height=30, mode="RGB"):
    from PIL import Image
    out = io.BytesIO()
    Image.new(mode, (width, height), (180, 90, 40)).save(out, format="PNG")
    return out.getvalue()


def png_header_claiming(width, height):
    """A tiny file whose PNG header claims a huge decoded size (decompression-bomb shape)."""
    import zlib

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"\x00")) + chunk(b"IEND", b"")


class AdapterTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.adapter = subprocess.Popen([sys.executable, str(HERE / "adapter.py")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(240):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=1).read()
                return
            except OSError:
                time.sleep(0.25)
        raise RuntimeError("adapter did not start")

    @classmethod
    def tearDownClass(cls):
        cls.adapter.terminate()
        cls.adapter.wait(10)

    def post(self, body, model="u2netp", token=TOKEN, host=None, origin=ORIGIN, path="/remove"):
        connection = http.client.HTTPConnection("127.0.0.1", PORT, timeout=120)
        headers = {"Content-Type": "image/png", "X-Adulis-Token": token}
        if host:
            headers["Host"] = host
        if origin:
            headers["Origin"] = origin
        connection.request("POST", f"{path}?model={model}", body=body, headers=headers)
        response = connection.getresponse()
        data = response.read()
        return response.status, data, dict(response.getheaders())

    def test_health_lists_only_allowlisted_models(self):
        status, data, _ = self.get("/health")
        self.assertEqual(status, 200)
        ids = [m["id"] for m in json.loads(data)["models"]]
        self.assertEqual(len(ids), 23)
        self.assertEqual(ids, list(json.loads((HERE / "models.json").read_text(encoding="utf-8"))["models"]))

    def get(self, path, host=None, origin=ORIGIN):
        connection = http.client.HTTPConnection("127.0.0.1", PORT, timeout=10)
        headers = {k: v for k, v in (("Host", host), ("Origin", origin)) if v}
        connection.request("GET", path, headers=headers)
        response = connection.getresponse()
        return response.status, response.read(), dict(response.getheaders())

    def test_missing_or_wrong_token_is_refused(self):
        self.assertEqual(self.post(png(), token="")[0], 401)
        self.assertEqual(self.post(png(), token="wrong")[0], 401)

    def test_foreign_host_and_origin_are_refused(self):
        self.assertEqual(self.post(png(), host="evil.example:8797")[0], 403)
        self.assertEqual(self.post(png(), origin="https://evil.example")[0], 403)
        self.assertEqual(self.get("/health", origin="https://evil.example")[0], 403)
        self.assertEqual(self.get("/health", host="evil.example")[0], 403)

    def test_unknown_models_are_refused_and_registered_but_blocked_models_never_execute(self):
        for model in ("../u2netp", "u2netp.onnx", "C:/x.onnx", "unknown-model", ""):
            status, data, _ = self.post(png(), model=model)
            self.assertEqual(status, 400, model)
            self.assertIn("allowlist", json.loads(data)["error"])
        from bgfixtures import ADMITTED_MODELS
        blocked = [k for k, e in json.loads((HERE / "models.json").read_text(encoding="utf-8"))["models"].items() if e["status"] != "admitted"]
        self.assertEqual(len(blocked), 23 - len(ADMITTED_MODELS))  # every model but the reviewed internal-evaluation admissions
        for model in blocked:
            status, data, _ = self.post(png(), model=model)
            self.assertEqual(status, 403, model)
            self.assertIn("unavailable", json.loads(data)["error"])

    def test_refusals_stay_readable_while_a_large_photo_is_still_uploading(self):
        # Regression: refusing without reading the body made browsers see a reset (fetch TypeError) instead of the error.
        big = b"\x00" * (6 * 1024 * 1024)
        status, data, _ = self.post(big, token="wrong")
        self.assertEqual((status, json.loads(data)["error"]), (401, "Missing or wrong adapter token."))
        status, data, _ = self.post(big, model="bria-rmbg")
        self.assertIn(status, (400, 403))  # readable either way; the 6 MB of zeros is not an image, and bria-rmbg is blocked

    def test_only_the_remove_path_exists_and_no_url_or_path_input(self):
        self.assertEqual(self.post(png(), path="/api/remove")[0], 404)
        self.assertEqual(self.post(b"http://example.com/a.png")[0], 400)

    def test_invalid_and_unsupported_files_are_refused(self):
        self.assertEqual(self.post(b"not an image at all")[0], 400)
        self.assertEqual(self.post(b"GIF89a" + b"\x00" * 40)[0], 400)
        self.assertEqual(self.post(b"")[0], 413)

    def test_size_limits(self):
        # Refused from Content-Length before the body is read, so a client still uploading may see a reset, not the 413.
        try:
            self.assertEqual(self.post(b"\x00" * (10 * 1024 * 1024 + 1))[0], 413)
        except (ConnectionError, http.client.HTTPException):
            pass
        status, data, _ = self.post(png_header_claiming(5000, 5000))  # 25 MP from a ~70 byte file
        self.assertEqual(status, 413)
        self.assertIn("16 megapixels", json.loads(data)["error"])

    def test_animated_webp_is_refused(self):
        from PIL import Image
        out = io.BytesIO()
        frames = [Image.new("RGB", (20, 20), c) for c in ((255, 0, 0), (0, 255, 0))]
        frames[0].save(out, format="WEBP", save_all=True, append_images=frames[1:], duration=50)
        self.assertEqual(self.post(out.getvalue())[0], 415)

    def test_only_one_inference_at_a_time(self):
        import adapter
        self.assertTrue(adapter._busy.acquire(blocking=False))
        try:
            with self.assertRaises(adapter.Refused) as caught:
                adapter.process(png(), "u2netp")
            self.assertEqual(caught.exception.status, 429)
        finally:
            adapter._busy.release()

    def test_unresolved_checkpoint_is_refused_over_http_and_never_loaded(self):
        # BGR-002-FIX: u2netp is "unresolved", so a valid request is refused 403 with no inference.
        status, data, _ = self.post(png(), model="u2netp")
        self.assertEqual(status, 403)
        self.assertIn("unavailable", json.loads(data)["error"])
        status, data, _ = self.get("/health")
        entry = next(m for m in json.loads(data)["models"] if m["id"] == "u2netp")
        self.assertEqual((entry["id"], entry["status"], entry["ready"]), ("u2netp", "unresolved", False))

    def test_only_an_admitted_status_may_load_and_there_is_no_bypass(self):
        import adapter
        entry = adapter.MANIFEST["u2netp"]
        original = dict(entry)
        for status in ("unresolved", "restricted", "ADMITTED", "", None, "missing"):
            if status == "missing":
                entry.pop("status", None)
            else:
                entry["status"] = status
            adapter._sessions["u2netp"] = object()  # even a cached session must not be reused
            with self.assertRaises(adapter.Refused) as caught:
                adapter.load_session("u2netp")
            self.assertEqual((caught.exception.status, "u2netp" in adapter._sessions), (403, False), status)
        # Environment variables do not change the decision.
        os.environ.update(ADAPTER_ADMIT_ALL="1", ADAPTER_ALLOW_UNRESOLVED="1", MODEL_CHECKSUM_DISABLED="1")
        try:
            entry["status"] = "unresolved"
            with self.assertRaises(adapter.Refused) as caught:
                adapter.load_session("u2netp")
            self.assertEqual(caught.exception.status, 403)
        finally:
            for name in ("ADAPTER_ADMIT_ALL", "ADAPTER_ALLOW_UNRESOLVED", "MODEL_CHECKSUM_DISABLED"):
                os.environ.pop(name, None)
            entry.clear()
            entry.update(original)
        self.assertNotIn("rembg", sys.modules)  # the refusals above never reached the library

    def test_catalogue_and_health_report_readiness_and_missing_modules_per_model(self):
        status, data, _ = self.get("/catalogue")
        self.assertEqual(status, 200)
        catalogue = json.loads(data)
        self.assertEqual(catalogue["runtime"]["coreModulesMissing"], [m for m in ("numpy", "PIL", "onnxruntime", "pymatting", "numba", "scipy", "skimage", "pooch", "jsonschema")
                                                                       if importlib.util.find_spec(m) is None])
        from bgfixtures import ADMITTED_MODELS
        for entry in catalogue["models"]:
            self.assertIn("missing", entry["dependencies"], entry["id"])
            if entry["id"] in ADMITTED_MODELS:
                self.assertTrue(entry["admitted"], entry["id"])
                self.assertEqual(entry["ready"], entry["installed"] and entry["dependencies"]["ok"], entry["id"])  # depends on this disk
            else:
                self.assertFalse(entry["ready"], entry["id"])
                self.assertIn("not admitted", entry["readinessReasons"], entry["id"])
        fp16 = next(m for m in catalogue["models"] if m["id"] == "birefnet-general-fp16")
        self.assertEqual(fp16["dependencies"]["missing"], [m for m in ("onnx", "onnxconverter_common") if importlib.util.find_spec(m) is None])
        status, data, _ = self.get("/health")
        self.assertTrue(all("missingModules" in m for m in json.loads(data)["models"]))

    def test_manifest_keeps_the_research_fields_for_unresolved_u2netp(self):
        import adapter
        entry = adapter.MANIFEST["u2netp"]
        self.assertEqual(entry["status"], "unresolved")
        for field in ("url", "sha256", "bytes", "owner", "licence", "rembg_md5", "statusNote"):
            self.assertTrue(entry.get(field), field)

    def test_corrupt_checkpoint_is_not_loaded(self):
        # Admission is simulated in memory only (pinned hash that the temporary file does not match), so this can never reach the library or run a model.
        import tempfile
        from unittest import mock
        import adapter
        from bgfixtures import admit_for_test
        entry = adapter.MANIFEST["u2netp"]
        original = {k: (list(v) if isinstance(v, list) else v) for k, v in entry.items()}
        adapter._sessions.pop("u2netp", None)
        try:
            with tempfile.TemporaryDirectory() as tmp, mock.patch.object(adapter, "MODEL_ROOT", Path(tmp)):
                admit_for_test(adapter, "u2netp", tmp)
                entry["assets"][0]["pinnedSha256"] = "0" * 64
                with self.assertRaises(adapter.Refused) as caught:
                    adapter.load_session("u2netp")
                self.assertEqual(caught.exception.status, 500)
                self.assertIn("SHA-256", caught.exception.message)
        finally:
            entry.clear()
            entry.update(original)

    def test_actual_inference_returns_a_real_alpha_png(self):
        """REAL inference with an admitted model whose checkpoint was promoted on this machine; skipped (with the reason) when none is installed or RAM is short."""
        from PIL import Image
        from skimage import data
        status, body, _ = self.get("/catalogue")
        ready = [m["id"] for m in json.loads(body)["models"] if m["ready"] and m["id"] != "sam"]  # SAM is interactive (needs a point): covered by smoke.py
        if not ready:
            self.skipTest("no admitted checkpoint is installed on this machine (promote one from quarantine; see README)")
        model = ready[0]
        source = io.BytesIO()
        Image.fromarray(data.coffee()).save(source, format="JPEG", quality=90)
        status, body, headers = self.post(source.getvalue(), model=model)
        if status == 507:
            self.skipTest("the adapter refused for lack of free RAM (a real environment result): " + body.decode()[:120])
        self.assertEqual(status, 200)
        result = Image.open(io.BytesIO(body))
        self.assertEqual((result.mode, result.size), ("RGBA", (600, 400)))
        alpha = result.getchannel("A").histogram()
        self.assertGreater(sum(alpha[:9]), 10000)     # real transparent background
        self.assertGreater(sum(alpha[247:]), 10000)   # real opaque subject
        self.assertEqual(headers["X-Model"], model)
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)


if __name__ == "__main__":
    unittest.main()
