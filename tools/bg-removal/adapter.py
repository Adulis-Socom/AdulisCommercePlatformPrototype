"""Local-only background-removal adapter for the Adulis prototype (experiment, not production).

One request/response endpoint around rembg:
  POST /remove?model=<id>   body = raw JPEG/PNG/single-frame-WebP bytes, header X-Adulis-Token   ->  PNG with alpha
  GET  /health                                                                              ->  JSON status

Safeguards: binds 127.0.0.1 only; Host and Origin allowlists; per-run token; no URLs or paths accepted;
models limited to models.json AND status "admitted" (unresolved checkpoints are refused with 403 before any load), with
SHA-256 verified before loading; decoded-image checks; one inference at a time.
"""
import hashlib
import hmac
import io
import json
import os
import secrets
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

HERE = Path(__file__).resolve().parent
MANIFEST = json.loads((HERE / "models.json").read_text(encoding="utf-8"))["models"]

# Experiment defaults, not approved production policy.
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 16_000_000
TIMEOUT_S = 60
FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
PORT = int(os.environ.get("ADAPTER_PORT", "8765"))
APP_PORTS = os.environ.get("ADAPTER_APP_PORTS", "8443,5173,4173").split(",")
ORIGINS = {f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in APP_PORTS}
HOSTS = {f"{host}:{PORT}" for host in ("localhost", "127.0.0.1")}

# Bound CPU use before onnxruntime starts; rembg reads this when it builds a session.
os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ["REMBG_HOME"] = str(HERE / "models")
os.environ.pop("U2NET_HOME", None)
os.environ.pop("MODEL_CHECKSUM_DISABLED", None)

TOKEN = os.environ.get("ADAPTER_TOKEN") or secrets.token_urlsafe(24)
_busy = threading.Lock()  # held until the native inference really finishes, even after a client timeout
_sessions = {}


class Refused(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def peak_rss_mb():
    if sys.platform == "win32":
        import ctypes
        from ctypes import wintypes

        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD)] + [
                (name, ctypes.c_size_t) for name in (
                    "PeakWorkingSetSize", "WorkingSetSize", "QuotaPeakPagedPoolUsage", "QuotaPagedPoolUsage",
                    "QuotaPeakNonPagedPoolUsage", "QuotaNonPagedPoolUsage", "PagefileUsage", "PeakPagefileUsage")]

        counters = Counters()
        counters.cb = ctypes.sizeof(counters)
        kernel, psapi = ctypes.WinDLL("kernel32"), ctypes.WinDLL("psapi")
        kernel.GetCurrentProcess.restype = wintypes.HANDLE
        psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        psapi.GetProcessMemoryInfo(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb)
        return counters.PeakWorkingSetSize / 1048576
    import resource
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_admitted(entry):
    """Fail closed: only an exact status of "admitted" may run. No environment or request override exists."""
    return entry.get("status") == "admitted"


def load_session(model):
    """The cached session for an admitted model, loaded after its checkpoint's SHA-256 matches the manifest.

    The only place a session is created or reused, so the admission check here covers every inference path."""
    if model not in MANIFEST:
        raise Refused(400, "Model is not on the allowlist.")
    if not is_admitted(MANIFEST[model]):
        _sessions.pop(model, None)
        raise Refused(403, "Model unavailable: permission for this checkpoint is unresolved, so it is not loaded or run.")
    if model in _sessions:
        return _sessions[model], 0.0
    entry = MANIFEST[model]
    path = HERE / "models" / entry["file"]  # rembg finds it here: REMBG_HOME/models/<name>/<name>.onnx
    if not path.is_file():
        raise Refused(503, f"Checkpoint missing. Run setup_models.py ({model}).")
    if sha256_of(path) != entry["sha256"]:
        raise Refused(500, "Checkpoint SHA-256 does not match the manifest; refusing to load it.")
    started = time.perf_counter()
    from rembg import new_session
    session = new_session(model, providers=["CPUExecutionProvider"])
    _sessions[model] = session
    return session, (time.perf_counter() - started) * 1000


def decode(body):
    """A decoded RGB image, or Refused. Size is checked from the header before any pixel is decoded."""
    from PIL import Image, ImageOps, UnidentifiedImageError
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        image = Image.open(io.BytesIO(body))
        if image.format not in FORMATS:
            raise Refused(415, "Only JPEG, PNG and single-frame WebP images are accepted.")
        if image.width * image.height > MAX_PIXELS:
            raise Refused(413, "Image is larger than 16 megapixels.")
        if getattr(image, "n_frames", 1) > 1:
            raise Refused(415, "Animated images are not accepted.")
        image.load()
        return ImageOps.exif_transpose(image).convert("RGB")
    except Refused:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise Refused(400, "The file is not a valid image.")


def remove(image, session):
    from rembg import remove as rembg_remove
    buffer = io.BytesIO()
    rembg_remove(image, session=session).save(buffer, format="PNG")
    return buffer.getvalue()


def process(body, model):
    if not _busy.acquire(blocking=False):
        raise Refused(429, "Another image is being processed. Try again in a moment.")
    result = {}

    def work():
        try:
            image = decode(body)
            session, load_ms = load_session(model)
            started = time.perf_counter()
            png = remove(image, session)
            result.update(png=png, load_ms=load_ms, ms=(time.perf_counter() - started) * 1000, size=image.size)
        except Refused as refusal:
            result["refused"] = refusal
        except Exception as error:  # surfaced to the caller as a generic failure, details kept in the console
            print(f"inference failed: {error!r}", file=sys.stderr)
            result["refused"] = Refused(500, "Background removal failed.")
        finally:
            _busy.release()

    thread = threading.Thread(target=work, daemon=True)
    thread.start()
    thread.join(TIMEOUT_S)
    if thread.is_alive():
        raise Refused(504, "Processing took too long. The model may still be finishing; try again shortly.")
    if "refused" in result:
        raise result["refused"]
    return result


class Handler(BaseHTTPRequestHandler):
    server_version = "AdulisBgAdapter"

    def log_message(self, fmt, *args):  # request lines only, never image data
        print(f"{self.address_string()} {fmt % args}")

    def _guard(self):
        """Host and Origin allowlists (DNS-rebinding and cross-site protection)."""
        if self.headers.get("Host") not in HOSTS:
            raise Refused(403, "Host not allowed.")
        origin = self.headers.get("Origin")
        if origin is not None and origin not in ORIGINS:
            raise Refused(403, "Origin not allowed.")
        return origin

    def _send(self, status, body=b"", content_type="application/json", origin=None, extra=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Expose-Headers", "X-Model, X-Inference-Ms, X-Load-Ms, X-Peak-Rss-Mb, X-Provider, X-Input-Size")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _error(self, refusal, origin=None):
        self._send(refusal.status, json.dumps({"error": refusal.message}).encode(), origin=origin)

    def do_OPTIONS(self):
        try:
            origin = self._guard()
        except Refused as refusal:
            return self._error(refusal)
        self._send(204, origin=origin, extra={"Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type, X-Adulis-Token", "Access-Control-Max-Age": "600"})

    def do_GET(self):
        origin = None
        try:
            origin = self._guard()
            if urlsplit(self.path).path != "/health":
                raise Refused(404, "Not found.")
            models = [{"id": key, "label": entry["label"], "status": entry.get("status", "unresolved"),
                       "ready": is_admitted(entry) and (HERE / "models" / entry["file"]).is_file()} for key, entry in MANIFEST.items()]
            self._send(200, json.dumps({"ok": True, "busy": _busy.locked(), "models": models}).encode(), origin=origin)
        except Refused as refusal:
            self._error(refusal, origin)

    def _drain(self):
        """Read an unread body (up to the limit) so a browser still uploading gets the JSON error, not a reset."""
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            return
        if 0 < length <= MAX_BYTES and not self._body_read:
            self.rfile.read(length)
            self._body_read = True

    def do_POST(self):
        origin = None
        self._body_read = False
        try:
            origin = self._guard()
            if urlsplit(self.path).path != "/remove":
                raise Refused(404, "Not found.")
            if not hmac.compare_digest(self.headers.get("X-Adulis-Token", ""), TOKEN):
                raise Refused(401, "Missing or wrong adapter token.")
            model = parse_qs(urlsplit(self.path).query).get("model", [""])[0]
            if model not in MANIFEST:
                raise Refused(400, "Model is not on the allowlist.")
            try:
                length = int(self.headers.get("Content-Length", ""))
            except ValueError:
                raise Refused(411, "Content-Length is required.")
            if length <= 0 or length > MAX_BYTES:
                raise Refused(413, "Image is larger than 10 MB." if length > 0 else "Empty request.")
            body = self.rfile.read(length)
            self._body_read = True
            started = time.perf_counter()
            result = process(body, model)
            self._send(200, result["png"], "image/png", origin, {
                "X-Model": model,
                "X-Inference-Ms": f"{result['ms']:.0f}",
                "X-Load-Ms": f"{result['load_ms']:.0f}",
                "X-Peak-Rss-Mb": f"{peak_rss_mb():.0f}",
                "X-Provider": "CPUExecutionProvider",
                "X-Input-Size": f"{result['size'][0]}x{result['size'][1]}",
            })
            print(f"  {model}: {result['ms']:.0f} ms inference, {(time.perf_counter() - started) * 1000:.0f} ms total")
        except Refused as refusal:
            self._drain()
            self._error(refusal, origin)


def main():
    # rembg's import is slow when cold (numba, scipy: ~20 s); pay it before the first request's time budget starts.
    started = time.perf_counter()
    import rembg  # noqa: F401
    print(f"rembg imported in {time.perf_counter() - started:.1f} s")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Adulis background-removal adapter (experiment) on http://127.0.0.1:{PORT}")
    print(f"Adapter token for this run: {TOKEN}")
    print("Paste the token into Seller Console > Products > Media > Background removal. Ctrl+C stops the adapter.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
