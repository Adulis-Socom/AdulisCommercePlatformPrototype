"""Actual-inference smoke test for ONE admitted model: starts the real adapter, sends the authorised synthetic photographs through POST /remove and writes evidence.

  .venv\\Scripts\\python smoke.py <model-id> <evidence folder outside the repository> [--images bottle,mug,...] [--port 8798]

REAL inference only, never a mock. Uses the adapter's own admission gate (the model must be admitted with pinned hashes and promoted from quarantine; an
unadmitted model gets the adapter's 403) and the synthetic images made by `make_synthetic.py` (nothing private, nothing downloaded). Records, per image:
the HTTP result, whether the output is a real RGBA PNG whose size equals the input, input/output SHA-256, checkpoint SHA-256 (re-verified by this script before the
load AND by the adapter), execution provider, cold load seconds (the first request), warm inference seconds (later requests), RSS deltas, and the alpha coverage.
SAM (interactive) is given ONE foreground point per image: the subject centre recorded by the generator (not by any model).
"alphaCoverage" and "nonTrivialAlpha" are raw measurements (is the alpha neither all 0 nor all 255; what fraction of alpha is on). They are NOT quality scores.
A refusal (for example HTTP 507 because free RAM is short) is a real result: it is recorded with the adapter's own message and nothing is faked.
Exit status 0 only when every image produced a verified real RGBA output.
"""
import argparse
import hashlib
import io
import json
import os
import platform
import subprocess
import sys
import time
import urllib.error
import urllib.request
from importlib import metadata
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import adapter  # noqa: E402  (does not import rembg)

FIXTURES = HERE / "fixtures" / "synthetic"
TOKEN = "smoke-test-token"
HEADERS = ("X-Model", "X-Cold", "X-Inference-Ms", "X-Load-Ms", "X-Load-Delta-Mb", "X-Inference-Rss-Delta-Mb", "X-Inference-Index", "X-Rss-Mb", "X-Peak-Rss-Mb",
           "X-Provider", "X-Input-Size", "X-Output-Size", "X-Input-Sha256", "X-Output-Sha256", "X-Checkpoint-Sha256")


def machine():
    cpu = ""
    try:
        cpu = subprocess.run(["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_Processor).Name"], capture_output=True, text=True, timeout=30).stdout.strip()
    except Exception:  # noqa: BLE001
        pass
    return {"cpu": cpu or platform.processor(), "logicalCores": os.cpu_count(), "platform": platform.platform(), "python": platform.python_version(),
            "rembg": metadata.version("rembg"), "onnxruntime": metadata.version("onnxruntime"), "numpy": metadata.version("numpy"), "pillow": metadata.version("pillow"),
            "ompNumThreads": os.environ.get("OMP_NUM_THREADS", "4 (adapter default)")}


def call(port, path, body=None, headers=None, timeout=180):
    request = urllib.request.Request(f"http://127.0.0.1:{port}{path}", data=body, method="POST" if body is not None else "GET", headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read()


def start_adapter(port, log):
    env = {**os.environ, "ADAPTER_PORT": str(port), "ADAPTER_TOKEN": TOKEN}
    process = subprocess.Popen([sys.executable, str(HERE / "adapter.py")], env=env, stdout=log, stderr=subprocess.STDOUT, text=True)
    for _ in range(480):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=1).read()
            return process
        except OSError:
            time.sleep(0.25)
    process.terminate()
    raise SystemExit("the adapter did not start")


def cap_memory(process, limit_mb):
    """Windows only: put the adapter child in a job object whose per-process commit limit protects the user's other programs. It is NOT an admission or
    preflight override (the adapter's gate and RAM check are untouched): a model that needs more than the cap fails with an allocation error, which is recorded as the result."""
    import ctypes
    from ctypes import wintypes

    class Basic(ctypes.Structure):
        _fields_ = [("a", ctypes.c_int64), ("b", ctypes.c_int64), ("LimitFlags", wintypes.DWORD), ("c", ctypes.c_size_t), ("d", ctypes.c_size_t), ("e", wintypes.DWORD),
                    ("f", ctypes.c_size_t), ("g", wintypes.DWORD), ("h", wintypes.DWORD)]

    class Extended(ctypes.Structure):
        _fields_ = [("Basic", Basic), ("io", ctypes.c_uint64 * 6), ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                    ("PeakProcess", ctypes.c_size_t), ("PeakJob", ctypes.c_size_t)]
    kernel = ctypes.windll.kernel32
    kernel.CreateJobObjectW.restype = wintypes.HANDLE
    job = kernel.CreateJobObjectW(None, None)
    info = Extended()
    info.Basic.LimitFlags = 0x100 | 0x2000  # JOB_OBJECT_LIMIT_PROCESS_MEMORY | JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    info.ProcessMemoryLimit = limit_mb * 1048576
    kernel.SetInformationJobObject(wintypes.HANDLE(job), 9, ctypes.byref(info), ctypes.sizeof(info))
    kernel.AssignProcessToJobObject(wintypes.HANDLE(job), wintypes.HANDLE(int(process._handle)))
    return job


def check_output(png, input_size):
    """Raw facts about the returned PNG. Not a quality score."""
    from PIL import Image
    image = Image.open(io.BytesIO(png))
    image.load()
    out = {"format": image.format, "mode": image.mode, "size": list(image.size), "sizeEqualsInput": list(image.size) == list(input_size), "hasAlphaChannel": image.mode == "RGBA"}
    if image.mode == "RGBA":
        alpha = image.getchannel("A")
        low, high = alpha.getextrema()
        histogram = alpha.histogram()
        total = sum(histogram)
        out |= {"alphaMin": low, "alphaMax": high, "nonTrivialAlpha": low != high,
                "alphaCoverage": round(sum(i * c for i, c in enumerate(histogram)) / (255 * total), 4),
                "alphaCoverageNote": "mean alpha / 255: a raw measurement, NOT a quality score"}
    out["verified"] = bool(out["hasAlphaChannel"] and out["sizeEqualsInput"] and out.get("nonTrivialAlpha"))
    return out


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("model")
    parser.add_argument("out")
    parser.add_argument("--images", default="")
    parser.add_argument("--port", type=int, default=8798)
    parser.add_argument("--job-limit-mb", type=int, default=0, help="Windows: cap the adapter process memory (commit) at this many MB so a model that needs more cannot starve the user's other programs; 0 = no cap")
    parser.add_argument("--retry-507", type=int, default=0, help="when the adapter refuses with 507 (free RAM short), wait 20 s and ask again up to this many times; every attempt is recorded, the margin is never changed")
    args = parser.parse_args(argv)
    model, out = args.model, Path(args.out)
    repo = HERE.parents[1]
    if out.resolve() == repo or repo in out.resolve().parents:
        raise SystemExit("refused: evidence must not be written inside the repository")
    entry = adapter.MANIFEST.get(model)
    if entry is None or not adapter.is_admitted(entry):
        raise SystemExit(f"refused: {model} is not admitted ({'; '.join((entry or {}).get('admissionProblems') or ['not on the allowlist'])}); nothing is run")
    out.mkdir(parents=True, exist_ok=True)
    index = json.loads((FIXTURES / "index.json").read_text(encoding="utf-8"))
    wanted = [n for n in args.images.split(",") if n]
    items = [i for i in index if not wanted or i["name"] in wanted]

    # checkpoint integrity, re-verified here before the adapter loads it
    files = adapter.checkpoint_files(model)
    checkpoint = [{"file": path.name, "bytes": path.stat().st_size if path.is_file() else None, "pinnedSha256": pinned,
                   "sha256NowOnDisk": adapter.sha256_of(path) if path.is_file() else None} for path, pinned, _ in files]
    for item in checkpoint:
        item["verified"] = item["sha256NowOnDisk"] == item["pinnedSha256"]
    free_at_start = adapter.free_ram_mb()
    evidence = {"schema": "bgr-smoke-2", "model": model, "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "machine": machine(), "freeRamMbAtStart": round(free_at_start),
                "checkpointVerifiedBeforeLoad": checkpoint, "admission": entry["admission"], "images": []}
    if not all(c["verified"] for c in checkpoint):
        evidence["result"] = "checkpoint hash mismatch: not run"
        (out / "smoke-evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
        raise SystemExit("checkpoint SHA-256 does not match the pinned value; not run")

    with open(out / "adapter-console.txt", "w", encoding="utf-8") as log:
        adapter_process = start_adapter(args.port, log)
        job = cap_memory(adapter_process, args.job_limit_mb) if args.job_limit_mb and sys.platform == "win32" else None
        evidence["memoryCapMb"] = args.job_limit_mb or None
        try:
            status, _, body = call(args.port, "/catalogue")
            catalogue = json.loads(body)
            row = next(m for m in catalogue["models"] if m["id"] == model)
            evidence["catalogueEntry"] = {k: row.get(k) for k in ("id", "status", "admitted", "installed", "ready", "readinessReasons", "dependencies") if k in row}
            all_ok = True
            for number, item in enumerate(items):
                source = (FIXTURES / item["file"]).read_bytes()
                query = f"/remove?model={model}" + (f"&points={item['subjectCentre'][0]},{item['subjectCentre'][1]},1" if model == "sam" else "")
                series = []
                for label in (["first request (cold load included)", "second request, same image (warm)"] if number == 0 else ["warm"]):
                    attempts = []
                    for attempt in range(args.retry_507 + 1):
                        started = time.perf_counter()
                        status, headers, payload = call(args.port, query, source, {"X-Adulis-Token": TOKEN, "Content-Type": "image/jpeg"})
                        wall = round(time.perf_counter() - started, 3)
                        if status != 507:
                            break
                        attempts.append({"httpStatus": 507, "freeRamMb": round(adapter.free_ram_mb()), "message": payload.decode("utf-8", "replace")[:300]})
                        if attempt < args.retry_507:
                            time.sleep(20)
                    run = {"refused507Attempts": attempts} if attempts else {}
                    run |= {"label": label, "httpStatus": status, "roundTripSeconds": wall, "freeRamMbJustAfter": round(adapter.free_ram_mb())}
                    if status == 200:
                        h = {k: headers.get(k) for k in HEADERS}
                        run |= {"headers": h, "coldLoadSeconds": round(float(h["X-Load-Ms"]) / 1000, 3) if h["X-Cold"] == "1" else None,
                                "inferenceSeconds": round(float(h["X-Inference-Ms"]) / 1000, 3), "executionProvider": h["X-Provider"],
                                "inputSha256": hashlib.sha256(source).hexdigest(), "outputSha256": hashlib.sha256(payload).hexdigest(),
                                "inputSha256Matches": h["X-Input-Sha256"] == hashlib.sha256(source).hexdigest(),
                                "outputSha256Matches": h["X-Output-Sha256"] == hashlib.sha256(payload).hexdigest(),
                                "checkpointSha256InResponse": h["X-Checkpoint-Sha256"], "output": check_output(payload, (item["width"], item["height"]))}
                        (out / f"{item['name']}.cutout.png").write_bytes(payload)
                        all_ok &= run["output"]["verified"] and run["inputSha256Matches"] and run["outputSha256Matches"]
                    else:
                        run["refusal"] = {"body": payload.decode("utf-8", "replace")[:600]}
                        all_ok = False
                    series.append(run)
                    if status != 200:
                        break
                record = {"image": item["file"], "width": item["width"], "height": item["height"], "inputBytes": len(source), "runs": series}
                if model == "sam":
                    record["foregroundPoint"] = {"x": item["subjectCentre"][0], "y": item["subjectCentre"][1], "label": 1, "source": item["centreSource"]}
                evidence["images"].append(record)
                if series[-1]["httpStatus"] != 200:
                    break  # the same refusal would repeat; it is recorded as the result
            evidence["measurementsEndpoint"] = json.loads(call(args.port, "/measurements")[2])
            call(args.port, "/unload?model=" + model, b"", {"X-Adulis-Token": TOKEN})
            evidence["result"] = "REAL INFERENCE VERIFIED on every image" if all_ok else "NOT VERIFIED (see images[].runs[].refusal / output)"
        finally:
            adapter_process.terminate()
            adapter_process.wait(30)
    (out / "smoke-evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    first = (evidence["images"][0]["runs"] or [{}])[0] if evidence["images"] else {}
    print(json.dumps({k: first.get(k) for k in ("httpStatus", "coldLoadSeconds", "inferenceSeconds", "executionProvider")} | {"result": evidence["result"], "freeRamMbAtStart": evidence["freeRamMbAtStart"]}, indent=2))
    return 0 if evidence["result"].startswith("REAL") else 1


if __name__ == "__main__":
    sys.exit(main())
