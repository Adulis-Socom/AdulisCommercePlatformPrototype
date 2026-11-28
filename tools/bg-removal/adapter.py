"""Local-only background-removal adapter for the Adulis prototype (experiment, not production).

Endpoints (all on 127.0.0.1; GET needs no token, POST needs X-Adulis-Token):
  GET  /health                       status, busy flag, per-model id/status/ready
  GET  /catalogue                    the full registry (models.json) as the Lab shows it, plus live installed/loaded/preflight state
  GET  /status?model=<id>            one model's registry entry and live state
  GET  /measurements                 the last runs: load time, inference time, memory, cold or warm, settings, failures
  POST /remove?model=<id>&...        body = raw JPEG/PNG/single-frame-WebP bytes  ->  PNG (RGBA cut-out, or an L mask with only_mask=1)
  POST /unload[?model=<id>]          drop one cached session (or all) so memory is released
  POST /install?model=<id>           download a PERMITTED model's registered files (registry URLs only), verify, report SHA-256

Command line only (never HTTP):
  python adapter.py register-custom <name> <u2net_custom|dis_custom|ben_custom> <file.onnx>   list a local checkpoint as `custom:<name>`, blocked until a
        reviewed customAdmissions entry binds its SHA-256 AND session type (with evidence)
  python adapter.py quarantine-verify                      re-hash every file in models/quarantine/MANIFEST.json; exit 1 on a mismatch or a missing file
  python adapter.py promote <model-id> <asset-file>        copy ONE quarantined asset to the folder rembg reads, only for an admitted model whose pinned
        SHA-256, the manifest SHA-256 and the file's SHA-256 all agree
Anything under models/quarantine is inspection-only and is never loaded.

Safeguards: binds 127.0.0.1 only; Host and Origin allowlists; per-run token; no URLs or paths accepted from a request; models
limited to models.json AND status exactly "admitted" with pinned SHA-256s and a complete admission record (anything else is refused with 403
before any load; there is no flag or environment bypass); SHA-256 of every checkpoint file verified before loading; decoded-image checks; one inference at a time;
at most MAX_SESSIONS models cached (loading another evicts the oldest); RAM and disk preflight before any load or download;
no implicit fallback model and no default model; settings the model does not support are rejected, never silently dropped.
"""
import collections
import contextlib
import datetime
import gc
import hashlib
import hmac
import importlib.util
import inspect
import io
import json
import os
import re
import secrets
import shutil
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

HERE = Path(__file__).resolve().parent
MODEL_ROOT = HERE / "models" / "models"  # rembg layout: <REMBG_HOME>/models/<id>/<file>; the ONLY place a rembg session reads from
QUARANTINE_DIR = HERE / "models" / "quarantine"  # downloaded for inspection only; nothing here is ever loadable
QUARANTINE_MANIFEST = QUARANTINE_DIR / "MANIFEST.json"
QUARANTINE_KEYS = ("id", "family", "file", "sourceUrl", "publisher", "revision", "bytes", "sha256", "publisherDigest", "digestMatch", "acquiredAt", "licence", "licenceUrl", "architecture", "intendedScope", "role")
ADMISSION_SCOPE = "internal-evaluation"
ADMISSION_FIELDS = ("scope", "decision", "decidedBy", "date", "checkpointRole", "limitations")
SHA_RE = re.compile(r"[0-9a-f]{64}")
CUSTOM_SESSIONS = ("u2net_custom", "dis_custom", "ben_custom")


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def admission_problems(entry, models):
    """Why this registry entry may NOT carry status "admitted" (empty list: it may). Checked at load and again before every run."""
    problems = []
    if entry.get("kind") != "local":
        problems.append("only a local model can be admitted")
    source = entry.get("derivedFrom")  # a converted copy (birefnet-general-fp16) runs the source model's checkpoint
    assets = (models.get(source) or {}).get("assets", []) if source else entry.get("assets", [])
    if source and (models.get(source) or {}).get("status") != "admitted":
        problems.append(f"its source model {source} is not admitted")
    if not assets:
        problems.append("no executable asset is registered")
    for asset in assets:
        if not SHA_RE.fullmatch(str(asset.get("pinnedSha256") or "")):
            problems.append(f"asset {asset.get('file')} has no pinned SHA-256")
    admission = entry.get("admission")
    if not isinstance(admission, dict):
        problems.append("no admission record")
        return problems
    if admission.get("scope") != ADMISSION_SCOPE:
        problems.append(f"admission scope must be {ADMISSION_SCOPE}")
    if admission.get("decision") != "admitted":
        problems.append("admission decision is not 'admitted'")
    problems += [f"admission.{f} is missing" for f in ADMISSION_FIELDS if not _text(admission.get(f))]
    evidence = admission.get("evidence")
    if not (isinstance(evidence, list) and evidence and all(_text(e) for e in evidence)):
        problems.append("admission has no evidence reference")
    return problems


def enforce_admission(models):
    """Fail closed at load: an entry that says "admitted" without the pinned hashes and a complete admission record is demoted, so it can never run."""
    for _ in range(2):  # a derived model depends on its source's final status
        for entry in models.values():
            if entry.get("status") == "admitted" and not entry.get("custom"):
                problems = admission_problems(entry, models)
                if problems:
                    entry.update(status="invalid-admission", admissionProblems=problems, blocker="Not admitted: " + "; ".join(problems))
    return models


def valid_custom_admission(item):
    """A customAdmissions entry binds a checkpoint hash AND its session type; anything partial is ignored."""
    return (isinstance(item, dict) and SHA_RE.fullmatch(str(item.get("sha256") or "")) is not None and item.get("sessionType") in CUSTOM_SESSIONS
            and item.get("scope") == ADMISSION_SCOPE and isinstance(item.get("evidence"), list) and bool(item["evidence"]) and all(_text(e) for e in item["evidence"]))


def load_registry(path):
    registry = json.loads(Path(path).read_text(encoding="utf-8"))
    enforce_admission(registry["models"])
    registry["customAdmissions"] = [e for e in registry.get("customAdmissions", []) if valid_custom_admission(e)]
    return registry


REGISTRY = load_registry(HERE / "models.json")
MANIFEST = REGISTRY["models"]
CUSTOM_ADMISSIONS = REGISTRY["customAdmissions"]

# Experiment defaults, not approved production policy.
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 16_000_000
TIMEOUT_S = 60
MAX_SESSIONS = max(1, min(2, int(os.environ.get("ADAPTER_MAX_SESSIONS", "1"))))
RAM_HEADROOM_MB = 1024   # free memory that must remain after the estimated model footprint
DISK_HEADROOM_MB = 2048
MAX_POINTS = 8
MAX_MATTING_PIXELS = 4_000_000  # alpha matting solves a sparse system; larger images are refused instead of exhausting memory
CUSTOM_DIR = HERE / "models" / "models" / "custom"
CUSTOM_REGISTRY = CUSTOM_DIR / "custom_registry.json"  # local, gitignored with the weights
MAX_CUSTOM_BYTES = 2 * 1024 ** 3
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
_inferences = {}  # model id -> inferences since its session was loaded (1 = the first one after a load)


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


def custom_admission_for(sha, session):
    """The reviewed customAdmissions entry for exactly this checkpoint hash AND this session type, or None."""
    return next((a for a in CUSTOM_ADMISSIONS if a["sha256"] == sha and a["sessionType"] == session), None)


def under_quarantine(path):
    """Whether this path (symlinks resolved) is the quarantine folder or anything inside it. Fails closed if it cannot be resolved."""
    try:
        resolved, root = Path(path).resolve(), QUARANTINE_DIR.resolve()
    except (OSError, RuntimeError):
        return True
    return resolved == root or root in resolved.parents


def refuse_quarantined(path):
    if under_quarantine(path):
        raise Refused(403, "A file in the quarantine folder is for inspection only and is never loaded. Promote an admitted checkpoint with: adapter.py promote <model-id> <file>.")


def load_custom():
    """Local custom checkpoints become `custom:<name>` entries, blocked unless the reviewed customAdmissions hold their SHA-256 AND session type."""
    for key in [k for k in MANIFEST if k.startswith("custom:")]:
        del MANIFEST[key]
    if not CUSTOM_REGISTRY.is_file():
        return
    try:
        records = json.loads(CUSTOM_REGISTRY.read_text(encoding="utf-8")).get("checkpoints", [])
    except (OSError, ValueError):
        return
    for record in records:
        name, session, sha = record.get("name", ""), record.get("session", ""), record.get("sha256", "")
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,40}", name) or session not in CUSTOM_SESSIONS or not SHA_RE.fullmatch(sha):
            continue
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,40}\.onnx", record.get("file", "")):
            continue
        base = MANIFEST[session]
        path = CUSTOM_DIR / record["file"]
        actual = path.stat().st_size if path.is_file() and not path.is_symlink() else None
        reasons = []
        if custom_admission_for(sha, session) is None:
            other = [a["sessionType"] for a in CUSTOM_ADMISSIONS if a["sha256"] == sha]
            reasons.append(f"this hash is admitted only as {other[0]}, not as {session}" if other else "no reviewed customAdmissions entry binds this SHA-256 and session type")
        if actual is None:
            reasons.append("the registered file is missing")
        elif record.get("bytes") is not None and actual != record["bytes"]:
            reasons.append("the file changed after registration (its size differs)")
        MANIFEST[f"custom:{name}"] = {
            **{k: v for k, v in base.items() if k not in ("assets", "statusNote", "blocker", "status")},
            "label": f"Custom: {name} ({base['label']})", "status": "registered" if reasons else "admitted",
            "statusNote": "Custom checkpoint registered locally. It runs only when its SHA-256 and session type both match a reviewed customAdmissions entry.",
            "blocker": "Not admitted: " + "; ".join(reasons) if reasons else "",
            "name": name, "customFile": record["file"], "customSession": session, "sha256": sha, "bytes": record.get("bytes", actual),
            "registeredAt": record.get("registeredAt"), "customState": "blocked" if reasons else "admitted",
            "assets": [], "installPermitted": False, "custom": True,
        }


def register_custom(name, session, source):
    """Copy a local .onnx into the custom folder, record its SHA-256 and session type and list it as blocked. Command line only; never reachable over HTTP."""
    if session not in CUSTOM_SESSIONS:
        raise SystemExit(f"session must be one of {', '.join(CUSTOM_SESSIONS)}")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,40}", name):
        raise SystemExit("name must be lowercase letters, digits and hyphens (at most 41 characters)")
    src = Path(source)
    if src.is_symlink() or not src.is_file() or src.suffix.lower() != ".onnx":
        raise SystemExit("source must be an existing regular .onnx file (symbolic links are refused)")
    if under_quarantine(src):
        raise SystemExit("source is in the quarantine folder; a quarantined file is never registered or run")
    if src.stat().st_size > MAX_CUSTOM_BYTES:
        raise SystemExit("source is larger than 2 GB")
    CUSTOM_DIR.mkdir(parents=True, exist_ok=True)
    target = CUSTOM_DIR / f"{name}.onnx"
    shutil.copyfile(src, target)
    sha = sha256_of(target)
    data = json.loads(CUSTOM_REGISTRY.read_text(encoding="utf-8")) if CUSTOM_REGISTRY.is_file() else {"checkpoints": []}
    record = {"name": name, "session": session, "file": target.name, "sha256": sha, "bytes": target.stat().st_size,
              "registeredAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")}
    data["checkpoints"] = [c for c in data["checkpoints"] if c.get("name") != name] + [record]
    CUSTOM_REGISTRY.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"registered custom:{name} ({session}), sha256 {sha}. It is BLOCKED until a reviewed customAdmissions entry in models.json binds this hash AND session type, with evidence.")
    return sha


def resolve_custom_path(entry):
    """The explicit model_path for a custom session: a regular, non-symlink file directly inside the custom folder, nowhere else."""
    root = CUSTOM_DIR.resolve()
    candidate = CUSTOM_DIR / entry["customFile"]
    refuse_quarantined(candidate)
    if candidate.is_symlink() or not candidate.is_file():
        raise Refused(503, "The registered custom checkpoint is missing.")
    resolved = candidate.resolve()
    if resolved.parent != root:
        raise Refused(500, "Custom checkpoint path is outside the custom folder; refusing it.")
    return resolved


def is_admitted(entry):
    """Fail closed: only an exact status of "admitted" backed by pinned hashes and a complete admission record may run.
    A custom checkpoint also needs a reviewed customAdmissions entry for its SHA-256 AND session type. No environment or request override exists."""
    if entry.get("status") != "admitted":
        return False
    if entry.get("custom"):
        return custom_admission_for(entry.get("sha256"), entry.get("customSession")) is not None
    return not admission_problems(entry, MANIFEST)


def checkpoint_files(model):
    """(path, pinned sha256 or None, asset) for every file the model needs. Only a registry-pinned hash is ever accepted."""
    entry = MANIFEST[model]
    if entry.get("custom"):
        return [(CUSTOM_DIR / entry["customFile"], entry["sha256"], None)]
    source = entry.get("derivedFrom", model)
    return [(MODEL_ROOT / source / asset["file"], asset.get("pinnedSha256"), asset) for asset in MANIFEST[source].get("assets", [])]


def is_installed(model):
    files = checkpoint_files(model)
    return bool(files) and all(path.is_file() and not under_quarantine(path) for path, _, _ in files)


# ---- runtime dependencies (read from the installed rembg 2.0.88 sources; test_adapter_readiness re-checks them by parsing those sources) ----
# rembg/bg.py imports pymatting, scipy and skimage at module level and sessions/__init__.py imports every session (SAM adds jsonschema, pooch),
# so `import rembg` needs all of these for ANY model. numba is pymatting's own requirement.
CORE_MODULES = ("numpy", "PIL", "onnxruntime", "pymatting", "numba", "scipy", "skimage", "pooch", "jsonschema")
FEATURE_MODULES = {"alphaMatting": ("pymatting", "skimage", "scipy", "numba"), "decontaminate": ("pymatting", "numba"), "postProcessMask": ("scipy", "skimage")}
MODEL_MODULES = {"birefnet-general-fp16": ("onnx", "onnxconverter_common")}  # imported inside the session's download_models when it converts the float32 file
PACKAGE_OF = {"PIL": "pillow", "skimage": "scikit-image", "pymatting": "PyMatting", "onnxconverter_common": "onnxconverter-common"}


def module_missing(name):
    try:
        return importlib.util.find_spec(name) is None
    except (ImportError, ValueError):
        return True


def dependencies(model):
    """What this model needs in order to run on this machine: the modules it imports, which are missing, and per optional setting."""
    entry = MANIFEST[model]
    if entry.get("kind") == "remote":
        return {"ok": False, "required": [], "missing": [], "missingPackages": [], "features": {}, "note": "hosted service: inactive, nothing runs locally"}
    required = list(dict.fromkeys([*CORE_MODULES, *MODEL_MODULES.get(entry.get("rembgSession", model), ())]))
    missing = [m for m in required if module_missing(m)]
    features = {}
    for feature, modules in FEATURE_MODULES.items():
        if (entry.get("settings") or {}).get(feature):
            lacking = [m for m in modules if module_missing(m)]
            features[feature] = {"ok": not lacking, "missing": lacking}
    return {"ok": not missing, "required": required, "missing": missing, "missingPackages": [PACKAGE_OF.get(m, m) for m in missing], "features": features}


def readiness(model):
    """ready means: admitted, every checkpoint file present, and every module the model imports importable. A file's existence alone never counts."""
    deps, admitted, installed = dependencies(model), is_admitted(MANIFEST[model]), is_installed(model)
    why = ([] if admitted else ["not admitted"]) + ([] if installed else ["checkpoint not installed"]) + ([f"missing Python module: {', '.join(deps['missing'])}"] if deps["missing"] else [])
    return {"ready": admitted and installed and deps["ok"], "admitted": admitted, "installed": installed, "dependencies": deps, "reasons": why}


def _forget(model):
    _sessions.pop(model, None)
    _inferences.pop(model, None)


def unload(model=None):
    for key in ([model] if model else list(_sessions)):
        _forget(key)
    gc.collect()


class DownloadBlocked(Exception):
    pass


@contextlib.contextmanager
def no_downloads():
    """Loading a session never downloads: rembg fetches missing or mismatching files with pooch, which is refused while a session is built."""
    import pooch

    def refuse(*args, **kwargs):
        raise DownloadBlocked("rembg tried to download a file while loading a session")
    original, pooch.retrieve = pooch.retrieve, refuse
    try:
        yield
    finally:
        pooch.retrieve = original


def load_session(model):
    """The cached session for an admitted model, loaded after every checkpoint file's SHA-256 matches the registry's pinned hash.

    The only place a session is created or reused, so the admission check here covers every inference path.
    Returns (session, load_ms, cold)."""
    if model not in MANIFEST:
        raise Refused(400, "Model is not on the allowlist.")
    entry = MANIFEST[model]
    if not is_admitted(entry):
        _forget(model)
        raise Refused(403, "Model unavailable: permission for this checkpoint is unresolved, so it is not loaded or run.")
    if model in _sessions:
        _sessions.move_to_end(model)
        return _sessions[model], 0.0, False
    files = checkpoint_files(model)
    if not files:
        raise Refused(503, "No checkpoint is registered for this model.")
    for path, expected, _ in files:
        refuse_quarantined(path)
        if not path.is_file():
            raise Refused(503, f"Checkpoint missing. Install it first ({model}).")
        if expected is None:
            raise Refused(503, "The checkpoint's SHA-256 is not recorded in the registry, so it cannot be verified or loaded.")
        if sha256_of(path) != expected:
            raise Refused(500, "Checkpoint SHA-256 does not match the registry; refusing to load it.")
    missing = dependencies(model)["missing"]
    if missing:
        raise Refused(503, f"This model cannot run here: the Python module {', '.join(missing)} cannot be imported ({', '.join(PACKAGE_OF.get(m, m) for m in missing)} is not installed).")
    check = preflight(entry, "run")
    if not check["ok"]:
        raise Refused(507, f"Not enough free memory to load this model safely: {check['freeRamMb']} MB free, about {check['needRamMb']} MB needed. Close other programs or choose a smaller model.")
    while len(_sessions) >= MAX_SESSIONS:  # bounded cache: evict the oldest before loading another
        _forget(next(iter(_sessions)))
    gc.collect()
    started = time.perf_counter()
    from rembg import new_session
    kwargs = {"model_path": str(resolve_custom_path(entry))} if entry.get("custom") else {}
    try:
        with no_downloads():
            session = new_session(entry["rembgSession"], providers=["CPUExecutionProvider"], **kwargs)
    except DownloadBlocked:
        raise Refused(403, "Loading refused: rembg tried to download a file. Loading never downloads; use a verified, promoted checkpoint.")
    _sessions[model] = session
    _inferences[model] = 0
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
SETTING_KEYS = {"only_mask": "onlyMask", "alpha_matting": "alphaMatting", "post_process_mask": "postProcessMask", "decontaminate": "decontaminate", "points": "samPoints", "cloth": "clothRegion"}
# rembg 2.0.88 (rembg/bg.py alpha_matting_cutout) defaults: foreground threshold 240, background threshold 10, erode size 10
MATTING_DEFAULTS = {"fg_threshold": 240, "bg_threshold": 10, "erode_size": 10}


def _flag(query, name):
    value = query.get(name, ["0"])[0].lower()
    if value not in ("0", "1", "true", "false"):
        raise Refused(400, f"{name} must be 0 or 1.")
    return value in ("1", "true")


def parse_settings(model, query):
    """Validated inference settings from the query string. Unknown or unsupported settings are refused, never ignored."""
    supported = MANIFEST[model].get("settings", {})
    known = set(SETTING_KEYS) | set(MATTING_DEFAULTS) | {"model"}
    for name in query:
        if name not in known:
            raise Refused(400, f"Unknown setting: {name}.")
    settings = {"only_mask": _flag(query, "only_mask"), "alpha_matting": _flag(query, "alpha_matting"), "post_process_mask": _flag(query, "post_process_mask"), "decontaminate": _flag(query, "decontaminate")}
    for name in ("only_mask", "alpha_matting", "post_process_mask", "decontaminate"):
        if settings[name] and not supported.get(SETTING_KEYS[name]):
            raise Refused(400, f"{name} is not supported by this model.")
        lacking = ((dependencies(model)["features"].get(SETTING_KEYS[name]) or {}).get("missing")) if settings[name] else None
        if lacking:
            raise Refused(503, f"{name} needs the Python module {', '.join(lacking)}, which cannot be imported here.")
    if settings["only_mask"] and settings["alpha_matting"]:
        raise Refused(400, "Alpha matting changes the cut-out, so it cannot be combined with a mask-only result.")
    if settings["decontaminate"] and settings["only_mask"]:
        raise Refused(400, "Colour decontamination recolours the cut-out, so it cannot be combined with a mask-only result.")
    if settings["decontaminate"] and settings["alpha_matting"]:
        raise Refused(400, "Alpha matting already estimates the foreground colour (rembg ignores decontaminate then), so choose one of the two.")
    for name, (low, high) in {"fg_threshold": (1, 255), "bg_threshold": (0, 254), "erode_size": (0, 50)}.items():
        if name in query:
            if not settings["alpha_matting"]:
                raise Refused(400, f"{name} only applies with alpha_matting=1.")
            try:
                value = int(query[name][0])
            except ValueError:
                raise Refused(400, f"{name} must be a whole number.")
            if not low <= value <= high:
                raise Refused(400, f"{name} must be between {low} and {high}.")
            settings[name] = value
    if settings["alpha_matting"]:
        merged = {**MATTING_DEFAULTS, **{k: settings[k] for k in MATTING_DEFAULTS if k in settings}}
        if merged["fg_threshold"] <= merged["bg_threshold"]:
            raise Refused(400, "The foreground threshold must be higher than the background threshold.")
        settings.update(merged)
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
    if settings.get("alpha_matting"):
        if image.width * image.height > MAX_MATTING_PIXELS:
            raise Refused(400, f"Alpha matting is limited to {MAX_MATTING_PIXELS // 1_000_000} megapixels; use a smaller photograph or turn it off.")
        kwargs.update(alpha_matting_foreground_threshold=settings["fg_threshold"], alpha_matting_background_threshold=settings["bg_threshold"], alpha_matting_erode_size=settings["erode_size"])
    if settings.get("decontaminate"):
        if "decontaminate" not in inspect.signature(rembg_remove).parameters:
            raise Refused(501, "This rembg build has no colour decontamination.")
        kwargs["decontaminate"] = True
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
            rss_before = rss_mb()
            session, load_ms, cold = load_session(model)
            rss_loaded = rss_mb()
            started = time.perf_counter()
            png = remove(image, session, settings or {"only_mask": False, "alpha_matting": False, "post_process_mask": False, "decontaminate": False})
            ms = (time.perf_counter() - started) * 1000
            rss_after = rss_mb()
            _inferences[model] = _inferences.get(model, 0) + 1
            from PIL import Image
            out = Image.open(io.BytesIO(png))
            facts = {"inputSha256": hashlib.sha256(body).hexdigest(), "outputSha256": hashlib.sha256(png).hexdigest(), "outputSize": list(out.size),
                     "provider": session_provider(session), "checkpointSha256": [sha for _, sha, _ in checkpoint_files(model)]}
            # Measurements kept apart (IR-045): cold load time (loadMs), the first inference after a load vs later ones (inferenceIndex 1 vs 2+),
            # approximate model memory (RSS growth around a cold load; allocator growth included), per-inference RSS growth, and the whole
            # process's high-water mark since the adapter started, which is cumulative over every model run so far and never one model's.
            memory = {"rssBeforeLoadMb": round(rss_before), "rssAfterLoadMb": round(rss_loaded), "loadDeltaMb": round(rss_loaded - rss_before) if cold else None,
                      "inferenceRssDeltaMb": round(rss_after - rss_loaded), "inferenceIndex": _inferences[model],
                      "processPeakRssMb": round(peak_rss_mb()), "peakScope": "process-cumulative"}
            result.update(png=png, load_ms=load_ms, ms=ms, size=image.size, cold=cold, facts=facts, memory=memory)
            record.update(ok=True, loadMs=round(load_ms), ms=round(ms), size=list(image.size), cold=cold, rssMb=round(rss_mb()), peakRssMb=round(peak_rss_mb()), bytesOut=len(png), **facts, **memory)
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


def session_provider(session):
    """The execution provider onnxruntime actually used (first provider of the live inference session), or 'unknown'."""
    for attribute in ("inner_session", "encoder", "session"):
        inner = getattr(session, attribute, None)
        if inner is not None and hasattr(inner, "get_providers"):
            return inner.get_providers()[0]
    return "unknown"


def runtime_info():
    """What this machine can really run, read from the installed packages (not copied from documentation)."""
    import importlib.metadata as md
    import platform

    def version(name):
        try:
            return md.version(name)
        except md.PackageNotFoundError:
            return None
    info = {
        "python": platform.python_version(), "platform": platform.platform(), "machine": platform.machine(), "cpuCount": os.cpu_count(),
        "freeRamMb": round(free_ram_mb()), "ompNumThreads": os.environ.get("OMP_NUM_THREADS"),
        "packages": {name: version(name) for name in ("rembg", "onnxruntime", "numpy", "pillow", "PyMatting", "numba", "scipy", "scikit-image", "pooch", "jsonschema", "onnx", "onnxconverter-common")},
        "adapterProviders": ["CPUExecutionProvider"], "onnxruntimeProviders": [], "decontaminateSupported": False,
        "coreModulesMissing": [m for m in CORE_MODULES if module_missing(m)],
        "missingRequirements": {key: dependencies(key)["missing"] for key, entry in MANIFEST.items() if entry.get("kind") != "remote" and dependencies(key)["missing"]},
    }
    try:  # a broken install must still let /catalogue answer, with the precise module that failed
        import onnxruntime
        from rembg import remove as rembg_remove
        info.update(onnxruntimeProviders=onnxruntime.get_available_providers(), decontaminateSupported="decontaminate" in inspect.signature(rembg_remove).parameters)
    except ImportError as error:
        info["importError"] = f"{error.name or 'module'}: {error}"
    return info


def public_entry(model):
    """The registry entry as shown to the Lab, plus live state. Never includes file paths."""
    entry = dict(MANIFEST[model])
    for private in ("file", "earlierRecord"):
        entry.pop(private, None)
    entry["id"] = model
    state = readiness(model)
    entry["installed"] = state["installed"]
    entry["loaded"] = model in _sessions
    entry["admitted"] = state["admitted"]
    entry["dependencies"] = state["dependencies"]
    entry["ready"] = state["ready"]
    entry["readinessReasons"] = state["reasons"]
    entry["preflight"] = preflight(MANIFEST[model], "run") if entry["kind"] == "local" else None
    return entry


def catalogue_payload():
    """GET /catalogue: runtime facts and every model, the registered custom checkpoints (`custom:<name>`) included with their
    name, session type, SHA-256, size, registered time, state (blocked or admitted) and the reason."""
    return {"runtime": runtime_info(), "rembg": REGISTRY["rembg"], "licenceFamilies": REGISTRY["licenceFamilies"], "maxSessions": MAX_SESSIONS,
            "models": [public_entry(key) for key in MANIFEST]}


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
            self.send_header("Access-Control-Expose-Headers", "X-Model, X-Inference-Ms, X-Load-Ms, X-Peak-Rss-Mb, X-Rss-Mb, X-Provider, X-Input-Size, X-Cold, X-Input-Sha256, X-Output-Sha256, X-Output-Size, X-Checkpoint-Sha256, X-Load-Delta-Mb, X-Inference-Index, X-Inference-Rss-Delta-Mb")
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
                models = [{"id": key, "label": entry["label"], "status": entry.get("status", "unresolved"), "ready": readiness(key)["ready"],
                           "missingModules": dependencies(key)["missing"]} for key, entry in MANIFEST.items()]
                return self._json(200, {"ok": True, "busy": _busy.locked(), "models": models}, origin)
            if parts.path == "/catalogue":
                return self._json(200, catalogue_payload(), origin)
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
                "X-Provider": result["facts"]["provider"],
                "X-Input-Sha256": result["facts"]["inputSha256"],
                "X-Output-Sha256": result["facts"]["outputSha256"],
                "X-Output-Size": f"{result['facts']['outputSize'][0]}x{result['facts']['outputSize'][1]}",
                "X-Checkpoint-Sha256": ",".join(result["facts"]["checkpointSha256"]),
                "X-Load-Delta-Mb": "" if result["memory"]["loadDeltaMb"] is None else str(result["memory"]["loadDeltaMb"]),
                "X-Inference-Index": str(result["memory"]["inferenceIndex"]),
                "X-Inference-Rss-Delta-Mb": str(result["memory"]["inferenceRssDeltaMb"]),
                "X-Input-Size": f"{result['size'][0]}x{result['size'][1]}",
            })
            print(f"  {model}: {result['ms']:.0f} ms inference, {(time.perf_counter() - started) * 1000:.0f} ms total")
        except Refused as refusal:
            self._drain()
            self._error(refusal, origin)


def read_quarantine_manifest():
    """The quarantine MANIFEST.json (a list of records), or a SystemExit saying why it cannot be used."""
    try:
        data = json.loads(QUARANTINE_MANIFEST.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"no quarantine manifest at {QUARANTINE_MANIFEST}")
    except ValueError as error:
        raise SystemExit(f"the quarantine manifest is not valid JSON: {error}")
    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        raise SystemExit("the quarantine manifest must be a list of objects")
    return data


def quarantine_path(record):
    """Where a manifest record's file must be: quarantine/<model-id>/<file>. Names only, never a path from the record."""
    model, name = str(record.get("id", "")), str(record.get("file", ""))
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", model) or Path(name).name != name or name in ("", ".", ".."):
        return None
    return QUARANTINE_DIR / model / name


def quarantine_verify():
    """Re-hash every manifest file. Returns (report lines, problems); the command exits non-zero when there is any problem."""
    lines, problems = [], []
    for index, record in enumerate(read_quarantine_manifest()):
        label = f"{record.get('id', '?')}/{record.get('file', '?')}"
        missing_keys = [k for k in QUARANTINE_KEYS if k not in record]
        path = quarantine_path(record)
        if missing_keys:
            problems.append(f"{label}: manifest record {index} lacks {', '.join(missing_keys)}")
        if path is None:
            problems.append(f"{label}: id or file is not a plain name")
            continue
        if not path.is_file() or path.is_symlink() or not under_quarantine(path):
            problems.append(f"{label}: MISSING (expected {path.relative_to(QUARANTINE_DIR)})")
            continue
        actual, size = sha256_of(path), path.stat().st_size
        if not SHA_RE.fullmatch(str(record.get("sha256") or "")) or actual != record["sha256"]:
            problems.append(f"{label}: SHA-256 MISMATCH (manifest {record.get('sha256')}, file {actual})")
        elif record.get("bytes") not in (None, size):
            problems.append(f"{label}: SIZE MISMATCH (manifest {record.get('bytes')}, file {size})")
        else:
            lines.append(f"{label}: ok {actual} {size} bytes")
        digest = str(record.get("publisherDigest") or "").removeprefix("sha256:")
        if record.get("digestMatch") is True and digest != record.get("sha256"):
            problems.append(f"{label}: digestMatch is true but publisherDigest differs from sha256")
    return lines, problems


def promote(model, asset_file):
    """Copy ONE quarantined asset into the folder a rembg session reads, only when the registry admits the model and every hash agrees.
    Refuses with a specific reason otherwise; nothing is copied on a refusal. Command line only."""
    entry = MANIFEST.get(model)
    if entry is None or entry.get("custom"):
        raise SystemExit(f"refused: {model!r} is not a registry model (a custom checkpoint is registered with register-custom, never promoted)")
    if not is_admitted(entry):
        why = "; ".join(entry.get("admissionProblems") or []) or f"status is {entry.get('status')!r}"
        raise SystemExit(f"refused: {model} is not admitted ({why}). Nothing was copied.")
    if entry.get("derivedFrom"):
        raise SystemExit(f"refused: {model} runs the checkpoint of {entry['derivedFrom']}; promote that model's file instead")
    asset = next((a for a in entry.get("assets", []) if a["file"] == asset_file), None)
    if asset is None:
        raise SystemExit(f"refused: {asset_file!r} is not a registered asset of {model} ({', '.join(a['file'] for a in entry.get('assets', []))})")
    pinned = asset["pinnedSha256"]
    record = next((r for r in read_quarantine_manifest() if r.get("id") == model and r.get("file") == asset_file), None)
    if record is None:
        raise SystemExit(f"refused: the quarantine manifest has no record for {model}/{asset_file}")
    if record.get("sha256") != pinned:
        raise SystemExit(f"refused: the manifest sha256 ({record.get('sha256')}) differs from the registry's pinned sha256 ({pinned})")
    source = quarantine_path(record)
    if source is None or not source.is_file() or source.is_symlink() or not under_quarantine(source):
        raise SystemExit(f"refused: the quarantined file {model}/{asset_file} is missing or not a regular file")
    actual = sha256_of(source)
    if actual != pinned:
        raise SystemExit(f"refused: the quarantined file hashes to {actual}, not the pinned {pinned}")
    target = MODEL_ROOT / model / asset_file
    if under_quarantine(target):
        raise SystemExit("refused: the executable location lies inside the quarantine folder")
    need = source.stat().st_size / 1048576 + DISK_HEADROOM_MB
    if free_disk_mb() < need:
        raise SystemExit(f"refused: not enough free disk ({round(free_disk_mb())} MB free, about {round(need)} MB needed)")
    target.parent.mkdir(parents=True, exist_ok=True)
    part = target.with_suffix(target.suffix + ".part")
    shutil.copyfile(source, part)
    if sha256_of(part) != pinned:
        part.unlink(missing_ok=True)
        raise SystemExit("refused: the copy does not hash to the pinned sha256; it was deleted")
    part.replace(target)
    print(f"promoted {model}/{asset_file} ({pinned}) to {target}")
    return target


def main():
    args = sys.argv[1:]
    if args:
        if args[0] == "register-custom" and len(args) == 4:
            register_custom(*args[1:])
            return
        if args[0] == "quarantine-verify" and len(args) == 1:
            lines, problems = quarantine_verify()
            print("\n".join(lines + [f"PROBLEM {p}" for p in problems] + [f"{len(lines)} verified, {len(problems)} problem(s)"]))
            raise SystemExit(1 if problems else 0)
        if args[0] == "promote" and len(args) == 3:
            promote(*args[1:])
            return
        raise SystemExit("usage: adapter.py [register-custom <name> <u2net_custom|dis_custom|ben_custom> <file.onnx> | quarantine-verify | promote <model-id> <asset-file>]")
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


load_custom()

if __name__ == "__main__":
    main()
