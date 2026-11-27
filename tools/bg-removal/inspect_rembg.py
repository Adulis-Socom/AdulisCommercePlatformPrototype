"""BGR-014: static inspection of the installed rembg session catalogue. Reads the package SOURCE text only (nothing is imported or
executed, no model is touched) and prints JSON: one record per session with its runtime id, class, checkpoint URL(s), the
checksum rembg itself verifies, input size and the local/remote and credential flags.

Usage: .venv/Scripts/python inspect_rembg.py [output.json]
"""
import json
import re
import sys
from importlib.metadata import version
from pathlib import Path

import importlib.util

spec = importlib.util.find_spec("rembg")
SESSIONS = Path(spec.submodule_search_locations[0]) / "sessions"  # find_spec does not import rembg


def registered(init_text: str) -> list[str]:
    """Classes in registration order, from the `sessions[X.name()] = X` lines of sessions/__init__.py."""
    return re.findall(r"sessions\[(\w+)\.name\(\)\] = \1", init_text)


def inspect(path: Path, cls: str) -> dict:
    text = path.read_text(encoding="utf-8")
    name = re.search(r'def name\(.*?\):.*?return "([^"]*)"', text, re.S)
    urls = re.findall(r'"(https://[^"]+\.(?:onnx|bin|pth))"', text) + re.findall(r'f"(https://[^"]+\{[^"]+)"', text)
    checks = re.findall(r'"((?:md5|sha256):[0-9a-f]+)"', text)
    size = re.search(r"\((\d{3,4}), (\d{3,4})\)\s*,?\s*\)", text)
    base = re.search(rf"class {cls}\((\w+)\)", text)
    remote = re.search(r"def is_local.*?return (\w+)", text, re.S)
    creds = re.search(r"def requires_credentials.*?return (\w+)", text, re.S)
    return {
        "class": cls,
        "id": name.group(1) if name else None,
        "file": path.name,
        "base": base.group(1) if base else None,
        "urls": urls,
        "checksums": checks,
        "input_size": [int(size.group(1)), int(size.group(2))] if size else None,
        "is_local": (remote.group(1) != "False") if remote else True,
        "requires_credentials": (creds.group(1) == "True") if creds else False,
        "downloads_a_checkpoint": "def download_models" in text and bool(urls),
        "has_custom_checkpoint_env": bool(re.search(r"environ|CUSTOM|model_path", text)),
    }


def main() -> None:
    init = (SESSIONS / "__init__.py").read_text(encoding="utf-8")
    classes = registered(init)
    file_for = {}
    for line in re.finditer(r"from \.(\w+) import (\w+)(?: as (\w+))?", init):
        file_for[line.group(3) or line.group(2)] = line.group(1) + ".py"
    records = [inspect(SESSIONS / file_for[c], c) for c in classes]
    out = {"rembg_version": version("rembg"), "count": len(records), "sessions": records}
    text = json.dumps(out, indent=2)
    if len(sys.argv) > 1:
        Path(sys.argv[1]).parent.mkdir(parents=True, exist_ok=True)
        Path(sys.argv[1]).write_text(text, encoding="utf-8")
    print(text if len(sys.argv) < 2 else f"{len(records)} sessions written to {sys.argv[1]}")


if __name__ == "__main__":
    main()
