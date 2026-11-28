"""Shared TEST fixtures for the background-removal tests. Nothing here is real evidence: every admission below is a synthetic record used
with temporary files and a mocked rembg, to prove the adapter's rules. models.json itself admits nothing."""
import hashlib
from pathlib import Path

# Loaded before any test patches sys.modules: mock.patch.dict would otherwise unload a native module imported inside the patch
# (onnxruntime cannot be imported twice in one process), which made later tests see an empty provider list.
import onnxruntime  # noqa: F401
import pooch  # noqa: F401

ADMISSION = {"scope": "internal-evaluation", "decision": "admitted", "decidedBy": "unit test", "date": "2026-11-28",
             "evidence": ["test fixture (not real evidence)"], "checkpointRole": "test", "limitations": "test only"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def admit_for_test(adapter, model, root):
    """Make `model` genuinely admitted in the in-memory registry: write a synthetic file per asset under root/<model>/, pin its hash, add the
    admission record. Returns {asset file: bytes}. Callers restore adapter.MANIFEST afterwards."""
    entry = adapter.MANIFEST[model]
    files, assets = {}, []
    (Path(root) / model).mkdir(parents=True, exist_ok=True)
    for asset in entry["assets"]:
        data = f"checkpoint {asset['file']}".encode()
        (Path(root) / model / asset["file"]).write_bytes(data)
        files[asset["file"]] = data
        assets.append(dict(asset, pinnedSha256=sha(data)))
    entry.update(status="admitted", assets=assets, admission=dict(ADMISSION, evidence=list(ADMISSION["evidence"])))
    return files


def custom_admission(checkpoint_sha, session="u2net_custom"):
    return {"sha256": checkpoint_sha, "sessionType": session, "scope": "internal-evaluation", "evidence": ["test fixture (not real evidence)"]}


class FakeRembg:
    """MOCK rembg module: returns a flat image and records what the adapter asked for. No model, no inference."""

    def __init__(self):
        import types
        self.module = types.ModuleType("rembg")
        self.created, self.calls, self.session_kwargs, self.download = [], [], {}, False
        self.module.new_session = self.new_session
        self.module.remove = self.remove

    def new_session(self, model, providers=None, **kwargs):
        import types
        if self.download:  # simulate rembg fetching a file it did not find (pooch.retrieve)
            import pooch
            pooch.retrieve("https://example.invalid/model.onnx", None, fname="x.onnx", path=".")
        self.created.append(model)
        self.session_kwargs = kwargs
        return types.SimpleNamespace(model=model, providers=providers, inner_session=types.SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"]))

    def remove(self, image, session=None, decontaminate=False, **kwargs):
        from PIL import Image
        self.calls.append((session.model, dict(kwargs, decontaminate=decontaminate)))
        return Image.new("RGBA", image.size, (10, 20, 30, 128))


def png(width=40, height=30):
    import io
    from PIL import Image
    out = io.BytesIO()
    Image.new("RGB", (width, height), (180, 90, 40)).save(out, format="PNG")
    return out.getvalue()
