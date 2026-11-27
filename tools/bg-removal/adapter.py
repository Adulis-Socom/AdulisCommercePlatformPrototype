"""Local-only background-removal adapter for the Adulis prototype (experiment, not production).

Endpoints (all on 127.0.0.1; GET needs no token, POST needs X-Adulis-Token):
  GET  /health                       status, busy flag, per-model id/status/ready
  GET  /catalogue                    the full registry (models.json) as the Lab shows it, plus live installed/loaded/preflight state
  GET  /status?model=<id>            one model's registry entry and live state
  GET  /measurements                 the last runs: load time, inference time, memory, cold or warm, settings, failures
  POST /remove?model=<id>&...        body = raw JPEG/PNG/single-frame-WebP bytes  ->  PNG (RGBA cut-out, or an L mask with only_mask=1)
  POST /unload[?model=<id>]          drop one cached session (or all) so memory is released
  POST /install?model=<id>           download a PERMITTED model's registered files (registry URLs only), verify, report SHA-256

Safeguards: binds 127.0.0.1 only; Host and Origin allowlists; per-run token; no URLs or paths accepted from a request; models
limited to models.json AND status exactly "admitted" (anything else is refused with 403 before any load; there is no flag or
environment bypass); SHA-256 of every checkpoint file verified before loading; decoded-image checks; one inference at a time;
at most MAX_SESSIONS models cached (loading another evicts the oldest); RAM and disk preflight before any load or download;
no implicit fallback model and no default model; settings the model does not support are rejected, never silently dropped.
"""
import collections
import gc
import hashlib
import hmac
import io
import json
import os
import secrets
import shutil
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

HERE = Path(__file__).resolve().parent
REGISTRY = json.loads((HERE / "models.json").read_text(encoding="utf-8"))
MANIFEST = REGISTRY["models"]
MODEL_ROOT = HERE / "models" / "models"  # rembg layout: <REMBG_HOME>/models/<id>/<file>

# Experiment defaults, not approved production policy.
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 16_000_000
TIMEOUT_S = 60
MAX_SESSIONS = max(1, min(2, int(os.environ.get("ADAPTER_MAX_SESSIONS", "1"))))
RAM_HEADROOM_MB = 1024   # free memory that must remain after the estimated model footprint
DISK_HEADROOM_MB = 2048
MAX_POINTS = 8
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
_sessions = collections.OrderedDict()  # model id -> session, oldest first
_runs = collections.deque(maxlen=50)   # measurements; never holds image data


class Refused(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def _counters():
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
    return counters


def peak_rss_mb():
    if sys.platform == "win32":
        return _counters().PeakWorkingSetSize / 1048576
    import resource
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def rss_mb():
    """The adapter process's memory right now (the peak only ever rises, so it cannot show an unload)."""
    if sys.platform == "win32":
        return _counters().WorkingSetSize / 1048576
    with open("/proc/self/statm") as handle:
        return int(handle.read().split()[1]) * os.sysconf("SC_PAGE_SIZE") / 1048576


def free_ram_mb():
    if sys.platform == "win32":
        import ctypes

        class Status(ctypes.Structure):
            _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong), ("totalPhys", ctypes.c_ulonglong), ("availPhys", ctypes.c_ulonglong),
                        ("totalPage", ctypes.c_ulonglong), ("availPage", ctypes.c_ulonglong), ("totalVirt", ctypes.c_ulonglong),
                        ("availVirt", ctypes.c_ulonglong), ("availExt", ctypes.c_ulonglong)]

        status = Status()
        status.length = ctypes.sizeof(status)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
        return status.availPhys / 1048576
    with open("/proc/meminfo") as handle:
        return next(int(line.split()[1]) for line in handle if line.startswith("MemAvailable")) / 1024


def free_disk_mb():
    return shutil.disk_usage(HERE).free / 1048576


def preflight(entry, stage="run"):
    """Whether this machine can safely load (stage "run") or download (stage "install") the model right now."""
    resources = entry.get("resources") or {}
    free_ram, free_disk = free_ram_mb(), free_disk_mb()
    need_ram = (resources.get("ramMbEstimate") or 0) + RAM_HEADROOM_MB
    need_disk = (resources.get("diskMb") or 0) * 2 + DISK_HEADROOM_MB
    ok = free_disk >= need_disk if stage == "install" else free_ram >= need_ram
    return {"ok": ok, "stage": stage, "freeRamMb": round(free_ram), "needRamMb": round(need_ram), "freeDiskMb": round(free_disk), "needDiskMb": round(need_disk)}


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_admitted(entry):
    """Fail closed: only an exact status of "admitted" may run. No environment or request override exists."""
    return entry.get("status") == "admitted"


def checkpoint_files(model):
    """(path, expected sha256 or None, asset) for every file the model needs. Legacy single-file records keep their own fields."""
    entry = MANIFEST[model]
    if entry.get("file") and entry.get("sha256"):
        return [(HERE / "models" / entry["file"], entry["sha256"], None)]
    return [(MODEL_ROOT / model / asset["file"], asset.get("actualSha256"), asset) for asset in entry.get("assets", [])]


def is_installed(model):
    files = checkpoint_files(model)
    return bool(files) and all(path.is_file() for path, _, _ in files)


def unload(model=None):
    for key in ([model] if model else list(_sessions)):
        _sessions.pop(key, None)
    gc.collect()


def load_session(model):
    """The cached session for an admitted model, loaded after every checkpoint file's SHA-256 matches the registry.

    The only place a session is created or reused, so the admission check here covers every inference path.
    Returns (session, load_ms, cold)."""
    if model not in MANIFEST:
        raise Refused(400, "Model is not on the allowlist.")
    entry = MANIFEST[model]
    if not is_admitted(entry):
        _sessions.pop(model, None)
        raise Refused(403, "Model unavailable: permission for this checkpoint is unresolved, so it is not loaded or run.")
    if model in _sessions:
        _sessions.move_to_end(model)
        return _sessions[model], 0.0, False
    files = checkpoint_files(model)
    if not files:
        raise Refused(503, "No checkpoint is registered for this model.")
    for path, expected, _ in files:
        if not path.is_file():
            raise Refused(503, f"Checkpoint missing. Install it first ({model}).")
        if expected is None:
            raise Refused(503, "The checkpoint's SHA-256 is not recorded in the registry, so it cannot be verified or loaded.")
        if sha256_of(path) != expected:
            raise Refused(500, "Checkpoint SHA-256 does not match the registry; refusing to load it.")
    check = preflight(entry, "run")
    if not check["ok"]:
        raise Refused(507, f"Not enough free memory to load this model safely: {check['freeRamMb']} MB free, about {check['needRamMb']} MB needed. Close other programs or choose a smaller model.")
    while len(_sessions) >= MAX_SESSIONS:  # bounded cache: evict the oldest before loading another
        _sessions.popitem(last=False)
    gc.collect()
    started = time.perf_counter()
    from rembg import new_session
    session = new_session(model, providers=["CPUExecutionProvider"])
    _sessions[model] = session
    return session, (time.perf_counter() - started) * 1000, True


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


# ---- settings -------------------------------------------------------------------------------------------------------------
SETTING_KEYS = {"only_mask": "onlyMask", "alpha_matting": "alphaMatting", "post_process_mask": "postProcessMask", "points": "samPoints", "cloth": "clothRegion"}


def _flag(query, name):
    value = query.get(name, ["0"])[0].lower()
    if value not in ("0", "1", "true", "false"):
        raise Refused(400, f"{name} must be 0 or 1.")
    return value in ("1", "true")


def parse_settings(model, query):
    """Validated inference settings from the query string. Unknown or unsupported settings are refused, never ignored."""
    supported = MANIFEST[model].get("settings", {})
    known = set(SETTING_KEYS) | {"model"}
    for name in query:
        if name not in known:
            raise Refused(400, f"Unknown setting: {name}.")
    settings = {"only_mask": _flag(query, "only_mask"), "alpha_matting": _flag(query, "alpha_matting"), "post_process_mask": _flag(query, "post_process_mask")}
    for name in ("only_mask", "alpha_matting", "post_process_mask"):
        if settings[name] and not supported.get(SETTING_KEYS[name]):
            raise Refused(400, f"{name} is not supported by this model.")
    if settings["only_mask"] and settings["alpha_matting"]:
        raise Refused(400, "Alpha matting changes the cut-out, so it cannot be combined with a mask-only result.")
    points = query.get("points", [""])[0]
    if model == "sam" or points:
        if not supported.get("samPoints"):
            raise Refused(400, "points is only supported by the interactive SAM model.")
        parsed = []
        for part in [p for p in points.split(";") if p]:
            try:
                x, y, label = (int(v) for v in part.split(","))
            except ValueError:
                raise Refused(400, "points must look like x,y,label;x,y,label with whole numbers.")
            if label not in (0, 1) or x < 0 or y < 0:
                raise Refused(400, "A point needs x, y of 0 or more and label 1 (foreground) or 0 (background).")
            parsed.append((x, y, label))
        if not parsed or not any(label == 1 for _, _, label in parsed):
            raise Refused(400, "SAM is interactive: give at least one foreground point (x,y,1). It is not an automatic segmenter.")
        if len(parsed) > MAX_POINTS:
            raise Refused(400, f"At most {MAX_POINTS} points.")
        settings["points"] = parsed
    cloth = query.get("cloth", [""])[0]
    if model == "u2net_cloth_seg" or cloth:
        if not supported.get("clothRegion"):
            raise Refused(400, "cloth is only supported by the cloth-segmentation model.")
        if cloth not in supported["clothRegion"]:
            raise Refused(400, f"Choose a clothing region: {', '.join(supported['clothRegion'])}.")
        settings["cloth"] = cloth
    return settings


def remove(image, session, settings):
    from rembg import remove as rembg_remove
    for x, y, _ in settings.get("points", []):
        if x >= image.width or y >= image.height:
            raise Refused(400, "A point lies outside the image.")
    kwargs = {"only_mask": settings["only_mask"], "alpha_matting": settings["alpha_matting"], "post_process_mask": settings["post_process_mask"]}
    if "points" in settings:
        kwargs["sam_prompt"] = [{"type": "point", "label": label, "data": [x, y]} for x, y, label in settings["points"]]
    if "cloth" in settings:
        kwargs["cloth_category"] = settings["cloth"]
    buffer = io.BytesIO()
    rembg_remove(image, session=session, **kwargs).save(buffer, format="PNG")
    return buffer.getvalue()


def process(body, model, settings=None):
    if not _busy.acquire(blocking=False):
        raise Refused(429, "Another image is being processed. Try again in a moment.")
    result = {}
    record = {"ts": time.time(), "model": model, "ok": False, "settings": {k: v for k, v in (settings or {}).items() if v not in (False, None)}}

    def work():
        try:
            image = decode(body)
            session, load_ms, cold = load_session(model)
            started = time.perf_counter()
            png = remove(image, session, settings or {"only_mask": False, "alpha_matting": False, "post_process_mask": False})
            ms = (time.perf_counter() - started) * 1000
            result.update(png=png, load_ms=load_ms, ms=ms, size=image.size, cold=cold)
            record.update(ok=True, loadMs=round(load_ms), ms=round(ms), size=list(image.size), cold=cold, rssMb=round(rss_mb()), peakRssMb=round(peak_rss_mb()), bytesOut=len(png))
        except Refused as refusal:
            result["refused"] = refusal
            record.update(error=refusal.message, status=refusal.status)
        except Exception as error:  # surfaced to the caller as a generic failure, details kept in the console
            print(f"inference failed: {error!r}", file=sys.stderr)
            result["refused"] = Refused(500, "Background removal failed.")
            record.update(error="Background removal failed.", status=500)
        finally:
            _busy.release()

    thread = threading.Thread(target=work, daemon=True)
    thread.start()
    thread.join(TIMEOUT_S)
    if thread.is_alive():
        record.update(error="timeout", status=504)
        _runs.append(record)
        raise Refused(504, "Processing took too long. The model may still be finishing; try again shortly.")
    _runs.append(record)
    if "refused" in result:
        raise result["refused"]
    return result


def public_entry(model):
    """The registry entry as shown to the Lab, plus live state. Never includes file paths."""
    entry = dict(MANIFEST[model])
    for private in ("file", "earlierRecord"):
        entry.pop(private, None)
    entry["id"] = model
    entry["installed"] = is_installed(model)
    entry["loaded"] = model in _sessions
    entry["admitted"] = is_admitted(MANIFEST[model])
    entry["ready"] = entry["admitted"] and entry["installed"]
    entry["preflight"] = preflight(MANIFEST[model], "run") if entry["kind"] == "local" else None
    return entry


def install(model):
    """Download a permitted model's registered files. Only registry URLs; refuses anything not admitted AND installPermitted."""
    entry = MANIFEST.get(model)
    if entry is None:
        raise Refused(400, "Model is not on the allowlist.")
    if not (is_admitted(entry) and entry.get("installPermitted") is True):
        raise Refused(403, "Install refused: this model is not admitted for installation. Nothing was downloaded.")
    check = preflight(entry, "install")
    if not check["ok"]:
        raise Refused(507, f"Not enough free disk to install safely: {check['freeDiskMb']} MB free, about {check['needDiskMb']} MB needed.")
    if not _busy.acquire(blocking=False):
        raise Refused(429, "Another operation is running.")
    try:
        import urllib.request
        done = []
        for path, expected, asset in checkpoint_files(model):
            if asset is None or not asset.get("url", "").startswith("https://github.com/danielgatis/rembg/releases/download/"):
                raise Refused(500, "Registered URL is not an allowed source.")
            path.parent.mkdir(parents=True, exist_ok=True)
            part = path.with_suffix(path.suffix + ".part")
            with urllib.request.urlopen(asset["url"], timeout=60) as response, open(part, "wb") as out:
                shutil.copyfileobj(response, out, 1 << 20)
            actual = sha256_of(part)
            if expected is not None and actual != expected:
                part.unlink(missing_ok=True)
                raise Refused(500, "Downloaded file does not match the registered SHA-256; it was deleted.")
            part.replace(path)
            done.append({"file": asset["file"], "bytes": path.stat().st_size, "sha256": actual, "recordedInRegistry": expected is not None})
        return {"model": model, "files": done}
    finally:
        _busy.release()


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
            self.send_header("Access-Control-Expose-Headers", "X-Model, X-Inference-Ms, X-Load-Ms, X-Peak-Rss-Mb, X-Rss-Mb, X-Provider, X-Input-Size, X-Cold")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status, payload, origin=None):
        self._send(status, json.dumps(payload).encode(), origin=origin)

    def _error(self, refusal, origin=None):
        self._json(refusal.status, {"error": refusal.message}, origin)

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
            parts = urlsplit(self.path)
            query = parse_qs(parts.query)
            if parts.path == "/health":
                models = [{"id": key, "label": entry["label"], "status": entry.get("status", "unresolved"),
                           "ready": is_admitted(entry) and is_installed(key)} for key, entry in MANIFEST.items()]
                return self._json(200, {"ok": True, "busy": _busy.locked(), "models": models}, origin)
            if parts.path == "/catalogue":
                return self._json(200, {"rembg": REGISTRY["rembg"], "licenceFamilies": REGISTRY["licenceFamilies"], "maxSessions": MAX_SESSIONS,
                                        "models": [public_entry(key) for key in MANIFEST]}, origin)
            if parts.path == "/status":
                model = query.get("model", [""])[0]
                if model not in MANIFEST:
                    raise Refused(400, "Model is not on the allowlist.")
                return self._json(200, public_entry(model), origin)
            if parts.path == "/measurements":
                return self._json(200, {"runs": list(_runs), "rssMb": round(rss_mb()), "peakRssMb": round(peak_rss_mb()), "loaded": list(_sessions)}, origin)
            raise Refused(404, "Not found.")
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
            parts = urlsplit(self.path)
            if parts.path not in ("/remove", "/unload", "/install"):
                raise Refused(404, "Not found.")
            if not hmac.compare_digest(self.headers.get("X-Adulis-Token", ""), TOKEN):
                raise Refused(401, "Missing or wrong adapter token.")
            query = parse_qs(parts.query)
            model = query.get("model", [""])[0]
            if parts.path == "/unload":
                if model and model not in MANIFEST:
                    raise Refused(400, "Model is not on the allowlist.")
                if not _busy.acquire(blocking=False):
                    raise Refused(429, "An image is being processed. Try again in a moment.")
                try:
                    unload(model or None)
                finally:
                    _busy.release()
                return self._json(200, {"unloaded": model or "all", "loaded": list(_sessions), "rssMb": round(rss_mb())}, origin)
            if model not in MANIFEST:
                raise Refused(400, "Model is not on the allowlist.")
            if parts.path == "/install":
                return self._json(200, install(model), origin)
            try:
                settings = parse_settings(model, query)
            except Refused:
                if is_admitted(MANIFEST[model]):
                    raise
                settings = None  # a blocked model is refused with 403 after the image checks; its settings never matter
            try:
                length = int(self.headers.get("Content-Length", ""))
            except ValueError:
                raise Refused(411, "Content-Length is required.")
            if length <= 0 or length > MAX_BYTES:
                raise Refused(413, "Image is larger than 10 MB." if length > 0 else "Empty request.")
            body = self.rfile.read(length)
            self._body_read = True
            started = time.perf_counter()
            result = process(body, model, settings)
            self._send(200, result["png"], "image/png", origin, {
                "X-Model": model,
                "X-Inference-Ms": f"{result['ms']:.0f}",
                "X-Load-Ms": f"{result['load_ms']:.0f}",
                "X-Peak-Rss-Mb": f"{peak_rss_mb():.0f}",
                "X-Rss-Mb": f"{rss_mb():.0f}",
                "X-Cold": "1" if result["cold"] else "0",
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
    print("Paste the token into the Background Removal Lab or Seller Console > Products > Media. Ctrl+C stops the adapter.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
