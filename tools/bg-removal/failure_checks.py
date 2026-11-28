"""Failure-handling checks against the REAL adapter process (PROTO-BGR-RESEARCH-001, RESEARCH-03). Local experiment tooling.

  .venv\\Scripts\\python failure_checks.py <evidence folder outside the repository>

Each check sends a real HTTP request to a real adapter and records the status code and message. Nothing is mocked and RAM is NOT faked: the RAM-preflight
refusal (507) is only recorded when it really happens (smoke.py --retry-507 records those attempts). The corrupted-checkpoint check copies a checkpoint into
a TEMPORARY folder, flips one byte there, and starts a second real adapter whose model folder points at that temporary tree (the quarantine and the real
model folder are never touched); the adapter's gate is unchanged, only the folder it reads is different. Exit 0 when every expected refusal happened.
"""
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import adapter  # noqa: E402  (does not import rembg)

TOKEN = "failure-check-token"
IMAGE = (HERE / "fixtures" / "synthetic" / "bottle.jpg").read_bytes()


def send(port, path, body=None, token=TOKEN, extra=None):
    headers = {"Content-Type": "image/jpeg", **({"X-Adulis-Token": token} if token else {}), **(extra or {})}
    request = urllib.request.Request(f"http://127.0.0.1:{port}{path}", data=body, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except OSError as error:  # the server may close the socket after refusing a body it will not read
        return f"socket:{type(error).__name__}", str(error).encode()


def start(port, extra_env=None, code=None):
    env = {**os.environ, "ADAPTER_PORT": str(port), "ADAPTER_TOKEN": TOKEN, **(extra_env or {})}
    command = [sys.executable, "-c", code] if code else [sys.executable, str(HERE / "adapter.py")]
    process = subprocess.Popen(command, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(480):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=1).read()
            return process
        except OSError:
            time.sleep(0.25)
    process.terminate()
    raise SystemExit("the adapter did not start")


def big_png(width, height):
    """A valid, tiny-on-disk, huge-in-pixels PNG (solid colour) to exceed the 16 megapixel limit."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    rows = zlib.compress((b"\x00" + b"\x7f" * width) * height, 9)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0)) + chunk(b"IDAT", rows) + chunk(b"IEND", b"")


def main(out):
    out = Path(out)
    repo = HERE.parents[1]
    if out.resolve() == repo or repo in out.resolve().parents:
        raise SystemExit("refused: evidence must not be written inside the repository")
    out.mkdir(parents=True, exist_ok=True)
    results = []

    def record(name, expected, got, message=b""):
        ok = got in expected if isinstance(expected, (list, tuple)) else got == expected
        results.append({"check": name, "expected": expected, "httpStatus": got, "ok": ok, "message": message.decode("utf-8", "replace")[:400]})
        print(("PASS " if ok else "FAIL ") + f"{name}: {got}")

    port = 8797
    process = start(port)
    try:
        admitted = [k for k, e in adapter.MANIFEST.items() if adapter.is_admitted(e)]
        model = "birefnet-general-lite" if "birefnet-general-lite" in admitted else admitted[0]
        for blocked in ("u2net", "u2netp", "bria-rmbg", "silueta", "withoutbg", "atlascloud"):
            record(f"unadmitted model {blocked} refused", 403, *send(port, f"/remove?model={blocked}", IMAGE))
        record("model not on the allowlist", 400, *send(port, "/remove?model=nope", IMAGE))
        record("wrong token", 401, *send(port, f"/remove?model={model}", IMAGE, token="wrong"))
        record("no token", 401, *send(port, f"/remove?model={model}", IMAGE, token=None))
        record("undecodable bytes refused", (400, 415, 422), *send(port, f"/remove?model={model}", b"this is not an image at all"))
        status, body = send(port, f"/remove?model={model}", big_png(5000, 4000))
        record("more than 16 megapixels refused", (400, 413, 422), status, body)
        status, body = send(port, f"/remove?model={model}", b"\xff" * (11 * 1024 * 1024))
        record("larger than 10 MB refused", (413, "socket:ConnectionResetError", "socket:URLError", "socket:ConnectionAbortedError"), status, body)
        if "sam" in admitted:
            record("SAM without a foreground point refused", 400, *send(port, "/remove?model=sam", IMAGE))
        record("unknown setting refused (not ignored)", 400, *send(port, f"/remove?model={model}&nonsense=1", IMAGE))
        record("install refused (no download without installPermitted)", 403, *send(port, f"/install?model={model}", b""))
        busy = adapter.free_ram_mb()
        results.append({"check": "note: RAM-preflight refusal is recorded only when real", "freeRamMbNow": round(busy), "fakedLowRam": False})
    finally:
        process.terminate()
        process.wait(30)

    # corrupted checkpoint: a temporary copy with one flipped byte, a second real adapter reading that temporary tree
    temp = Path(tempfile.mkdtemp(prefix="bgr-corrupt-"))
    try:
        entry = adapter.MANIFEST[model]
        asset = entry["assets"][0]
        source = adapter.MODEL_ROOT / model / (asset.get("localFile") or asset["file"])
        target = temp / model / source.name
        target.parent.mkdir(parents=True)
        shutil.copyfile(source, target)
        with open(target, "r+b") as handle:
            handle.seek(5 * 1024 * 1024)
            byte = handle.read(1)
            handle.seek(5 * 1024 * 1024)
            handle.write(bytes([byte[0] ^ 0xFF]))
        code = f"import sys, pathlib; sys.path.insert(0, r'{HERE}'); import adapter; adapter.MODEL_ROOT = pathlib.Path(r'{temp}'); adapter.main()"
        process = start(8796, code=code)
        try:
            status, body = send(8796, f"/remove?model={model}", IMAGE)
            record(f"corrupted copy of {source.name} (one byte flipped) refused by the SHA-256 check", 500, status, body)
        finally:
            process.terminate()
            process.wait(30)
    finally:
        shutil.rmtree(temp, ignore_errors=True)
    (out / "failure-checks.json").write_text(json.dumps({"schema": "bgr-failure-1", "model": model, "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "results": results}, indent=2), encoding="utf-8")
    failed = [r for r in results if r.get("ok") is False]
    print(f"{len(results)} entries, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
