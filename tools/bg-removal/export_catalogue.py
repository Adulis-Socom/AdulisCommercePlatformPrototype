"""BGR-014: generates src/lab/model-catalogue.json, the only catalogue the frontend ships, from models.json (never edited by hand).
It carries the registry's public fields and no file paths. When the adapter is running, its live /catalogue overrides installed,
loaded and preflight state; admission always comes from the registry/adapter, never from this file's presence.

Usage: python export_catalogue.py [--check]   (--check exits 1 when the committed file is out of date)
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE.parents[1] / "src" / "lab" / "model-catalogue.json"
PRIVATE = {"file", "earlierRecord", "sha256"}


def build() -> str:
    registry = json.loads((HERE / "models.json").read_text(encoding="utf-8"))
    models = []
    for key, entry in registry["models"].items():
        public = {k: v for k, v in entry.items() if k not in PRIVATE}
        public["id"] = key
        public["admitted"] = entry.get("status") == "admitted"
        models.append(public)
    out = {"generatedFrom": "tools/bg-removal/models.json", "rembg": registry["rembg"], "licenceFamilies": registry["licenceFamilies"],
           "notRegisteredReleaseAssets": registry["notRegisteredReleaseAssets"], "models": models}
    return json.dumps(out, indent=1, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    text = build()
    if "--check" in sys.argv:
        sys.exit(0 if TARGET.exists() and TARGET.read_text(encoding="utf-8") == text else 1)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(text, encoding="utf-8")
    print(f"{TARGET} written")
