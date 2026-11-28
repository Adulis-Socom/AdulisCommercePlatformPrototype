"""Isolated benchmark for ONE model on ONE image (IR-045). Experiment tooling, local only; computes no quality score of any kind.

  python bench.py --model <id> --image <photo> --out <folder outside the repository> [--runs 3] [--setting only_mask=1 ...]

Each (model, image) series runs in a FRESH child process: cold load, the first inference after the load, then N warm inferences. Because the
child holds nothing else, its peak working set (Windows GetProcessMemoryInfo PeakWorkingSetSize, the same counters the adapter uses) belongs to
that model alone; it still includes the interpreter and library imports, so `importBaselineRssMb` is recorded to read it net. One JSON file per
run is written to --out (never into git): input and output SHA-256, dimensions, provider, the separated timings and memory fields, checkpoint
SHA-256. The model must pass the adapter's own gate (admitted with pinned hashes, checkpoint installed and verified, modules importable, RAM and
disk preflight); an unadmitted model is refused with the reason and nothing is loaded. There is no override.
"""
import argparse
import hashlib
import json
import os
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import adapter  # noqa: E402  (does not import rembg)

REPO = HERE.parents[1]
MAX_RUNS = 20
CHILD_TIMEOUT_S = 1800


def refusal(model):
    """Why this model may not be benchmarked now, or None. The same checks the adapter makes before a load."""
    entry = adapter.MANIFEST.get(model)
    if entry is None:
        return f"{model!r} is not on the allowlist"
    if not adapter.is_admitted(entry):
        why = "; ".join(entry.get("admissionProblems") or []) or f"status is {entry.get('status')!r}"
        return f"{model} is not admitted ({why}); nothing was loaded"
    state = adapter.readiness(model)
    if not state["installed"]:
        return f"{model}: the checkpoint is not installed in the executable location (promote it from quarantine first)"
    if state["dependencies"]["missing"]:
        return f"{model}: the Python module {', '.join(state['dependencies']['missing'])} cannot be imported"
    check = adapter.preflight(entry, "run")
    if not check["ok"]:
        return f"not enough free memory: {check['freeRamMb']} MB free, about {check['needRamMb']} MB needed"
    if adapter.free_disk_mb() < adapter.DISK_HEADROOM_MB:
        return f"not enough free disk: {round(adapter.free_disk_mb())} MB free, {adapter.DISK_HEADROOM_MB} MB headroom needed"
    return None


def output_folder_problem(out):
    out = Path(out).resolve()
    if out == REPO or REPO in out.parents:
        return f"{out} is inside the repository; benchmark records must not go into git"
    return None


def run_series(model, body, runs, out, setting_pairs=(), image_name="image"):
    """The child's work. Returns the list of per-run records (already written to `out`)."""
    from PIL import Image
    import io
    settings = adapter.parse_settings(model, {key: [value] for key, value in (pair.split("=", 1) for pair in setting_pairs)})
    image = adapter.decode(body)
    input_sha = hashlib.sha256(body).hexdigest()
    baseline = adapter.rss_mb()
    session, load_ms, cold = adapter.load_session(model)
    loaded = adapter.rss_mb()
    facts = {
        "schema": "bgr-bench-1", "model": model, "series": f"{model}__{input_sha[:12]}", "image": Path(image_name).name, "inputSha256": input_sha,
        "inputDimensions": f"{image.width}x{image.height}", "provider": adapter.session_provider(session),
        "checkpointSha256": [sha for _, sha, _ in adapter.checkpoint_files(model)], "settings": {k: v for k, v in settings.items() if v not in (False, None)},
        "environment": {"python": platform.python_version(), "platform": platform.platform(), "cpuCount": os.cpu_count(), "ompNumThreads": os.environ.get("OMP_NUM_THREADS")},
        "importBaselineRssMb": round(baseline, 1),
        "approxModelMemoryMb": round(loaded - baseline, 1), "approxModelMemoryNote": "RSS growth around the cold load; approximate, allocator growth included",
        "coldLoadSeconds": round(load_ms / 1000, 3) if cold else None,
    }
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    records = []
    for index in range(runs + 1):  # index 0 = the first inference after the cold load, 1.. = warm
        before = adapter.rss_mb()
        started = time.perf_counter()
        png = adapter.remove(image, session, settings)
        seconds = time.perf_counter() - started
        after = adapter.rss_mb()
        result = Image.open(io.BytesIO(png))
        record = {**facts, "run": index, "kind": "cold-load+first-inference" if index == 0 else "warm",
                  "inferenceIndexSinceLoad": index + 1, "inferenceSeconds": round(seconds, 3),
                  "inferenceRssDeltaMb": round(after - before, 1), "workingSetAfterRunMb": round(after, 1),
                  "isolatedPeakWorkingSetMb": round(adapter.peak_rss_mb(), 1),
                  "isolatedPeakScope": "this child process only (one model); includes interpreter and imports",
                  "outputSha256": hashlib.sha256(png).hexdigest(), "outputDimensions": f"{result.width}x{result.height}", "outputMode": result.mode,
                  "outputBytes": len(png), "recordedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}
        if index == 0:
            (out / f"{facts['series']}.png").write_bytes(png)
            record["outputFile"] = f"{facts['series']}.png"
        (out / f"{facts['series']}__run{index}.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        records.append(record)
    return records


def main(argv=None):
    parser = argparse.ArgumentParser(description="Isolated single-model benchmark (no quality scores)")
    parser.add_argument("--model", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--runs", type=int, default=3, help="warm runs after the cold load (1-20)")
    parser.add_argument("--setting", action="append", default=[], help="name=value as accepted by the adapter, e.g. only_mask=1")
    parser.add_argument("--child", action="store_true", help=argparse.SUPPRESS)  # the series itself; it re-checks the same gate
    args = parser.parse_args(argv)
    if not 1 <= args.runs <= MAX_RUNS:
        raise SystemExit(f"--runs must be between 1 and {MAX_RUNS}")
    problem = output_folder_problem(args.out)
    if problem:
        raise SystemExit(f"refused: {problem}")
    reason = refusal(args.model)
    if reason:
        raise SystemExit(f"refused: {reason}")
    image = Path(args.image)
    if image.is_symlink() or not image.is_file() or image.stat().st_size > adapter.MAX_BYTES:
        raise SystemExit(f"refused: {image.name} must be a regular file of at most {adapter.MAX_BYTES // 1048576} MB")
    if args.child:
        for record in run_series(args.model, image.read_bytes(), args.runs, args.out, args.setting, image.name):
            print(f"run {record['run']}: {record['inferenceSeconds']} s, peak {record['isolatedPeakWorkingSetMb']} MB")
        return 0
    command = [sys.executable, str(Path(__file__).resolve()), "--child", "--model", args.model, "--image", str(image), "--out", str(Path(args.out)), "--runs", str(args.runs)]
    for pair in args.setting:
        command += ["--setting", pair]
    return subprocess.run(command, timeout=CHILD_TIMEOUT_S).returncode


if __name__ == "__main__":
    sys.exit(main())
