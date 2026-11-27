"""Actual-inference smoke test: starts the adapter, sends one real photograph through POST /remove, and writes evidence.

Usage: .venv\\Scripts\\python smoke.py <output folder>
HELD: this runs inference, which the adapter now refuses (403) while u2netp is "unresolved" in models.json. The earlier
evidence from PROTO-BGR-BATCH-001 stays as recorded; do not re-run this until a checkpoint is admitted.
The photograph is scikit-image's bundled 'coffee' sample (CC0, Rachel Michetti); no Seller image is used.
"""
import hashlib
import io
import json
import os
import platform
import subprocess
import sys
import time
import urllib.request
from importlib import metadata
from pathlib import Path

HERE = Path(__file__).resolve().parent
PORT, TOKEN = 8798, "smoke-test-token"


def main(out_dir: Path) -> int:
    from PIL import Image
    from skimage import data

    out_dir.mkdir(parents=True, exist_ok=True)
    source = io.BytesIO()
    Image.fromarray(data.coffee()).save(source, format="JPEG", quality=92)
    original = source.getvalue()
    (out_dir / "sample-original.jpg").write_bytes(original)

    env = {**os.environ, "ADAPTER_PORT": str(PORT), "ADAPTER_TOKEN": TOKEN}
    adapter = subprocess.Popen([sys.executable, str(HERE / "adapter.py")], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(240):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=1).read()
                break
            except OSError:
                time.sleep(0.25)
        runs = []
        for label in ("cold (model load included)", "warm"):
            request = urllib.request.Request(f"http://127.0.0.1:{PORT}/remove?model=u2netp", data=original, method="POST", headers={"X-Adulis-Token": TOKEN, "Content-Type": "image/jpeg"})
            started = time.perf_counter()
            with urllib.request.urlopen(request, timeout=120) as response:
                png = response.read()
                headers = {key: response.headers[key] for key in ("X-Model", "X-Inference-Ms", "X-Load-Ms", "X-Peak-Rss-Mb", "X-Provider", "X-Input-Size")}
            runs.append({"run": label, "round_trip_ms": round((time.perf_counter() - started) * 1000), **headers})
        (out_dir / "sample-processed.png").write_bytes(png)
        result = Image.open(io.BytesIO(png))
        alpha = result.getchannel("A")
        histogram = alpha.histogram()
        total = sum(histogram)
        evidence = {
            "rembg": metadata.version("rembg"), "onnxruntime": metadata.version("onnxruntime"), "numpy": metadata.version("numpy"),
            "pillow": metadata.version("pillow"), "python": platform.python_version(), "platform": platform.platform(),
            "model": "u2netp", "checkpoint": json.loads((HERE / "models.json").read_text())["models"]["u2netp"],
            "input": {"file": "sample-original.jpg", "bytes": len(original), "sha256": hashlib.sha256(original).hexdigest(), "size": list(Image.open(io.BytesIO(original)).size)},
            "output": {"file": "sample-processed.png", "bytes": len(png), "sha256": hashlib.sha256(png).hexdigest(), "size": list(result.size), "mode": result.mode},
            "transparency": {"transparent_pct_alpha_le_8": round(100 * sum(histogram[:9]) / total, 1), "opaque_pct_alpha_ge_247": round(100 * sum(histogram[247:]) / total, 1), "soft_edge_pct": round(100 * sum(histogram[9:247]) / total, 1)},
            "runs": runs,
        }
        (out_dir / "smoke-evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
        print(json.dumps(evidence, indent=2))
        ok = result.mode == "RGBA" and sum(histogram[:9]) > 0 and sum(histogram[247:]) > 0
        print("TRANSPARENCY VERIFIED" if ok else "TRANSPARENCY NOT VERIFIED")
        return 0 if ok else 1
    finally:
        adapter.terminate()
        adapter.wait(10)


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
