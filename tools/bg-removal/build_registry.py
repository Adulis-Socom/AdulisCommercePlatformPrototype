"""BGR-014/015: builds models.json, the single model registry, from a reviewed table (below) plus the published asset sizes of the
rembg v0.0.0 release (GitHub API metadata; nothing is downloaded). models.json is the ONLY source of the model catalogue: the
adapter reads it and src/lab/model-catalogue.json is generated from it (export_catalogue.py).

Admission is fail-closed. A model may run only when its status is exactly "admitted". Nothing is admitted today: that needs
a reviewed commit recording evidence for the EXACT checkpoint file. Editing this table never admits anything by itself.

Usage: python build_registry.py <release_v0.0.0.json> [models.json]
Update rules: never delete history; append to `history` and keep earlier records.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RELEASE = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/"
EVIDENCE = "Deliverables/Prototype/PROTO-AUTONOMOUS-002/evidence/BGR-015/licence_evidence.md"

# Per licence family: what the primary sources say (retrieved 2026-11-27 through a summarising fetch; a human must re-read before legal reliance).
FAMILIES = {
    "u2net": dict(classification="UNCLEAR", code="Apache-2.0 (xuebinqin/U-2-Net)", weights="no weights licence stated", data="DUTS-TR terms not read; u2net_human_seg trained on a non-commercial dataset", note="ONNX files are hosted in a rembg release that states no provenance or licence"),
    "silueta": dict(classification="UNCLEAR", code="not found", weights="not found", data="unknown", note="origin is a third-party web app built on U2-Net; source unreachable"),
    "cloth": dict(classification="UNCLEAR", code="MIT", weights="no weights licence stated", data="iMaterialist (Kaggle) terms not retrieved", note=""),
    "isnet": dict(classification="UNCLEAR", code="Apache-2.0 (xuebinqin/DIS)", weights="no weights licence stated", data="DIS5K terms: non-commercial research or education; whether weights trained on it inherit this is a legal question", note="training data of the general-use file is unstated"),
    "isnet-anime": dict(classification="UNCLEAR", code="Apache-2.0", weights="Apache-2.0 on the model card", data="AniSeg and character_bg_seg_data licences not read", note="leans permissive"),
    "birefnet": dict(classification="PERMISSIVE-EVIDENCED at label level", code="MIT (ZhengPeng7/BiRefNet)", weights="License: mit on the Hugging Face cards read", data="DIS5K and other dataset terms may be inherited (legal call); per-variant cards for portrait, HRSOD, COD, massive and fp16 not read", note="ONNX conversions hosted by rembg; exact-file provenance not stated"),
    "bria": dict(classification="RESTRICTED", code="n/a", weights="CC BY-NC 4.0; commercial use needs a commercial agreement with BRIA", data="licensed data per publisher", note="gated card; nothing was clicked through"),
    "ben": dict(classification="UNCLEAR", code="n/a", weights="BEN2 labelled MIT, BEN base Apache-2.0; rembg bundles no weights", data="BEN2 trained on DIS5K plus proprietary data", note="full model is sold by contact"),
    "sam": dict(classification="PERMISSIVE-EVIDENCED at label level", code="Apache-2.0 (facebookresearch/segment-anything)", weights="Apache-2.0 per the README", data="SA-1B licence text not read", note="ONNX conversions by rembg; MobileSAM licence not read"),
    "withoutbg": dict(classification="REMOTE-COMMERCIAL-SERVICE", code="n/a", weights="n/a (hosted)", data="terms state no training on inputs and RAM-only processing", note="credit-based, EUR 0.05-0.10 per image; images leave the machine"),
    "atlascloud": dict(classification="REMOTE-COMMERCIAL-SERVICE", code="n/a", weights="n/a (hosted)", data="retention and training terms NOT VERIFIED", note="pay-as-you-go about USD 0.086 per image; images leave the machine"),
}

# id: (label, family, purpose, scope, assets, size, status, note)
LOCAL, REMOTE, CUSTOM = "local", "remote", "custom"
M = {
    "u2net": ("U²-Net", "u2net", "General salient-object removal (the original model)", "general", ["u2net.onnx"], 320, "unresolved", "No weights licence found for this ONNX file."),
    "u2netp": ("U²-Net-P (lightweight)", "u2net", "Small and fast general removal", "lightweight", ["u2netp.onnx"], 320, "unresolved", "Permission for this exact ONNX file is unconfirmed; blocked since PROTO-BGR-BATCH-001 (inference ran once before it was classified)."),
    "u2net_human_seg": ("U²-Net human segmentation", "u2net", "People and portraits", "specialised", ["u2net_human_seg.onnx"], 320, "restricted", "Trained on a non-commercial dataset per the evidence; leans restricted."),
    "silueta": ("Silueta", "silueta", "Lightweight general removal (U²-Net derivative)", "lightweight", ["silueta.onnx"], 320, "unresolved", "No repository or licence found."),
    "u2net_cloth_seg": ("U²-Net cloth segmentation", "cloth", "Garment regions: upper, lower or full body", "specialised", ["u2net_cloth_seg.onnx"], 768, "unresolved", "Weights licence and dataset terms unstated."),
    "isnet-general-use": ("IS-Net general use", "isnet", "High-detail general removal", "high-detail", ["isnet-general-use.onnx"], 1024, "unresolved", "Weights licence unstated; DIS5K non-commercial terms may propagate."),
    "isnet-anime": ("IS-Net anime", "isnet-anime", "Anime and illustration characters", "specialised", ["isnet-anime.onnx"], 1024, "unresolved", "Apache-2.0 on the card; dataset licences unread."),
    "birefnet-general": ("BiRefNet general", "birefnet", "High-detail general removal", "high-detail", ["BiRefNet-general-epoch_244.onnx"], 1024, "candidate", "MIT label evidence; pending a legal view on DIS5K inheritance and exact-file provenance. Not admitted."),
    "birefnet-general-lite": ("BiRefNet general lite (Swin-tiny)", "birefnet", "Smaller high-detail general removal", "lightweight", ["BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx"], 1024, "candidate", "As birefnet-general. The smallest BiRefNet; the first pilot once admitted."),
    "birefnet-general-fp16": ("BiRefNet general (float16)", "birefnet", "GPU-oriented half-precision copy of birefnet-general", "high-detail", [], 1024, "candidate", "Converted on first use from birefnet-general; needs the onnx and onnxconverter-common packages (not installed) and is intended for GPUs; usually slower on CPU."),
    "birefnet-portrait": ("BiRefNet portrait", "birefnet", "People and portraits", "specialised", ["BiRefNet-portrait-epoch_150.onnx"], 1024, "candidate", "As birefnet-general; no per-variant card read."),
    "birefnet-dis": ("BiRefNet DIS", "birefnet", "Dichotomous segmentation (DIS5K-trained)", "specialised", ["BiRefNet-DIS-epoch_590.onnx"], 1024, "candidate", "Trained on DIS5K, whose terms are non-commercial."),
    "birefnet-hrsod": ("BiRefNet HRSOD", "birefnet", "High-resolution salient objects", "specialised", ["BiRefNet-HRSOD_DHU-epoch_115.onnx"], 1024, "candidate", "As birefnet-general; no per-variant card read."),
    "birefnet-cod": ("BiRefNet COD", "birefnet", "Camouflaged objects", "specialised", ["BiRefNet-COD-epoch_125.onnx"], 1024, "candidate", "As birefnet-general; no per-variant card read."),
    "birefnet-massive": ("BiRefNet massive", "birefnet", "Larger-data general removal", "high-detail", ["BiRefNet-massive-TR_DIS5K_TR_TEs-epoch_420.onnx"], 1024, "candidate", "Training data of this variant is broader and unread."),
    "birefnet-dynamic": ("BiRefNet dynamic resolution", "birefnet", "General removal at variable input resolution", "high-detail", ["BiRefNet_dynamic-1024x1024.onnx"], None, "candidate", "The release asset was replaced on 2026-11-24, so rembg 2.0.88's built-in md5 may no longer match it."),
    "bria-rmbg": ("BRIA RMBG 2.0", "bria", "Commercial-grade general removal", "high-detail", ["bria-rmbg-2.0.onnx"], 1024, "restricted", "CC BY-NC 4.0; commercial use needs a paid agreement. Research and integration support only."),
    "sam": ("Segment Anything (SAM, ViT-B)", "sam", "Interactive point-prompted segmentation (not automatic)", "interactive", ["sam_vit_b_01ec64.encoder.onnx", "sam_vit_b_01ec64.decoder.onnx"], None, "candidate", "Apache-2.0 label evidence; ONNX conversion provenance unverified. Larger ViT-L and ViT-H checkpoints and quantised variants exist but are not registered."),
    "u2net_custom": ("U²-Net custom checkpoint", "u2net", "Your own U²-Net checkpoint", "custom", [], 320, "custom-unregistered", "No checkpoint registered. A custom checkpoint needs its own verified, permitted registry entry."),
    "dis_custom": ("IS-Net custom checkpoint", "isnet", "Your own IS-Net checkpoint", "custom", [], 1024, "custom-unregistered", "No checkpoint registered."),
    "ben_custom": ("BEN custom checkpoint", "ben", "Your own BEN checkpoint (rembg bundles none)", "custom", [], 1024, "custom-unregistered", "No checkpoint registered."),
    "withoutbg": ("withoutBG API", "withoutbg", "Hosted removal service", "external", [], None, "external-inactive", "Remote paid service. Inactive: no credentials, no trial, no image is ever sent."),
    "atlascloud": ("Atlas Cloud API", "atlascloud", "Hosted removal service", "external", [], None, "external-inactive", "Remote paid service. Inactive: no credentials, no trial, no image is ever sent."),
}
KIND = {"u2net_custom": CUSTOM, "dis_custom": CUSTOM, "ben_custom": CUSTOM, "withoutbg": REMOTE, "atlascloud": REMOTE}
RUNTIME_CLASSES = {"birefnet-general-fp16": "BiRefNetSessionGeneralFP16", "isnet-general-use": "DisSession (dis_general_use.py)", "isnet-anime": "DisSession (dis_anime.py)", "dis_custom": "DisCustomSession"}


def main() -> None:
    release = {a["name"]: a for a in json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))["assets"]}
    inspected = {s["id"]: s for s in json.loads((HERE / "rembg_sessions_2.0.88.json").read_text(encoding="utf-8"))["sessions"]} if (HERE / "rembg_sessions_2.0.88.json").exists() else {}
    previous = json.loads((HERE / "models.json").read_text(encoding="utf-8")) if (HERE / "models.json").exists() else {}
    old = {k: v.get("earlierRecord", v) for k, v in previous.get("models", {}).items()}  # idempotent: the first record stays the earlier record
    history = previous.get("history", [])
    for h in history:  # the first recorded state of a model is the authority for its earlier fields
        old[h["model"]] = h["record"]
    if not history and "u2netp" in old:
        history.append({"date": "2026-11-26", "model": "u2netp", "event": "Inference ran once (PROTO-BGR-BATCH-001) before the checkpoint was classified; then set to unresolved and blocked.", "record": old["u2netp"]})
    models = {}
    for key, (label, family, purpose, scope, assets, size, status, note) in M.items():
        kind = KIND.get(key, REMOTE if scope == "external" else LOCAL)
        entry = {
            "label": label, "family": family, "purpose": purpose, "scope": scope, "kind": kind, "rembgSession": key,
            "implementation": RUNTIME_CLASSES.get(key, "rembg session"),
            "status": status, "statusNote": note, "executable": False,
            "blocker": "Not admitted: " + ("licence restricted" if status == "restricted" else "licence evidence insufficient for the exact checkpoint file" if status in ("unresolved", "candidate") else "no checkpoint is registered" if status == "custom-unregistered" else "external inference is inactive in this prototype"),
            "evaluationPermission": {"candidate": "label-level (not sufficient to admit)", "restricted": "restricted"}.get(status, "unresolved" if kind == LOCAL else "not-applicable"),
            "commercialUse": {"restricted": "licence or commercial agreement required", "candidate": "unresolved (dataset terms)", "external-inactive": "paid service terms", "custom-unregistered": "depends on the checkpoint"}.get(status, "unresolved"),
            "redistribution": "unresolved" if kind == LOCAL else "not-applicable",
            "licenceFamily": family, "licenceEvidence": EVIDENCE,
            "trainingDataConcerns": FAMILIES[family]["data"],
            "providers": ["CPUExecutionProvider"] if kind == LOCAL else [], "gpu": "not used (no CUDA/ROCm installed; none will be installed without approval)",
            "inputSize": inspected.get(key, {}).get("input_size"),
            "settings": ({"alphaMatting": True, "postProcessMask": True, "onlyMask": True} if kind == LOCAL else {}),
            "install": "not-installed", "installPermitted": False,
        }
        if key == "sam":
            entry["settings"] |= {"samPoints": True}
            entry["modes"] = ["interactive point prompt (label 1 foreground, 0 background); not automatic segmentation"]
        if key == "u2net_cloth_seg":
            entry["settings"] |= {"clothRegion": ["upper", "lower", "full"]}
        if key == "birefnet-dynamic":
            entry["settings"] |= {"dynamicResolution": True}
        if key == "birefnet-general-fp16":
            entry["requirements"] = ["onnx", "onnxconverter-common"]
        entry["assets"] = []
        for name in assets:
            asset = release.get(name, {})
            entry["assets"].append({"file": name, "url": RELEASE + name, "bytes": asset.get("size"), "publisherSha256": (asset.get("digest") or "").removeprefix("sha256:") or None, "rembgChecksum": next(iter(inspected.get(key, {}).get("checksums", [])), None) if len(assets) == 1 else None, "actualSha256": None})
        if entry["assets"]:
            disk = sum(a["bytes"] or 0 for a in entry["assets"])
            entry["resources"] = {"diskMb": round(disk / 1048576), "ramMbEstimate": round(disk / 1048576 * 2.5), "basis": "estimate: 2.5x the weight files; measured values replace this once a model runs"}
        if key in old:  # keep every field earlier work recorded (file, sha256, bytes, url, owner, licence ...)
            entry["earlierRecord"] = old[key]
            for field in ("file", "sha256", "bytes", "url", "owner", "licence", "rembg_md5"):
                if field in old[key]:
                    entry[field] = old[key][field]
            if entry["assets"]:
                entry["assets"][0]["actualSha256"] = old[key].get("sha256")
        models[key] = entry
    out = {
        "comment": "Single model registry (schema 2). A checkpoint may be loaded or executed ONLY when its status is exactly \"admitted\"; any other value, or a missing status, is refused (fail closed). There is no environment-variable or flag bypass. A model becomes \"admitted\" only through a reviewed commit that records evidence for the exact checkpoint file. Experiment only: not an approved production model policy. Generated by build_registry.py; history is append-only.",
        "schema": 2, "rembg": {"version": "2.0.88", "licence": "MIT", "release": "https://github.com/danielgatis/rembg/releases/tag/v0.0.0", "sessionCount": len(models)},
        "licenceFamilies": FAMILIES,
        "notRegisteredReleaseAssets": sorted(set(release) - {a["file"] for e in models.values() for a in e["assets"]}),
        "models": models, "history": history,
    }
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "models.json"
    target.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(models)} models written to {target}")


if __name__ == "__main__":
    main()
