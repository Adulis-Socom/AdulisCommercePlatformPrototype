"""Downloads each allowlisted checkpoint from models.json into ./models and verifies size and SHA-256.

Run with the adapter's virtualenv: .venv\\Scripts\\python setup_models.py
It only fetches the URLs written in models.json; nothing else is downloaded.
"""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    manifest = json.loads((HERE / "models.json").read_text(encoding="utf-8"))
    status = 0
    for name, entry in manifest["models"].items():
        if entry.get("status") != "admitted" or not entry.get("file"):  # fail closed: never download a blocked or unregistered model
            print(f"{name}: skipped (status {entry.get('status')}; not admitted)")
            continue
        target = HERE / "models" / entry["file"]
        if target.exists() and sha256_of(target) == entry["sha256"]:
            print(f"{name}: already present, SHA-256 verified")
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        part = target.with_suffix(".part")
        print(f"{name}: downloading {entry['url']}")
        with urllib.request.urlopen(entry["url"], timeout=120) as response, part.open("wb") as out:
            out.write(response.read(entry["bytes"] + 1))
        if part.stat().st_size != entry["bytes"] or sha256_of(part) != entry["sha256"]:
            part.unlink()
            print(f"{name}: downloaded file does not match the pinned size/SHA-256; removed", file=sys.stderr)
            status = 1
            continue
        part.replace(target)
        print(f"{name}: ok ({entry['bytes']} bytes, SHA-256 verified)")
    return status


if __name__ == "__main__":
    sys.exit(main())
