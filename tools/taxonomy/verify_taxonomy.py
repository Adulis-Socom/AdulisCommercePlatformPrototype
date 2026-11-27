"""TAX-001: reproducible source-to-generated taxonomy verification.

Compares the complete taxonomy extraction (Adulis_Taxonomy_Complete.json, produced from the submitted workbook archive) with what
the prototype ships (src/demo-data/taxonomy.ts and taxonomy-attributes.json), and reports data-quality findings. Read-only.
It never corrects a label: ambiguous source text (for example a replacement character where an apostrophe belongs) is reported.

Usage (from the repo root):
  python tools/taxonomy/verify_taxonomy.py <Adulis_Taxonomy_Complete.json> [report.json]
Exit code 0 when every source-to-generated comparison matches, 1 otherwise. Data-quality findings do not fail the run; they are the report.
"""
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_SOURCE_ZIP_SHA256 = "377aba802a39b0b37c4066cb37254fe01184c80bea787336f3607492147c47a9"
EXPECTED = {"workbooks": 76, "worksheets": 77, "attribute_workbooks": 66, "index_workbooks": 10, "attribute_fields": 1374, "attribute_option_entries": 15705,
            "major_categories": 3, "category_names": 26, "fashion_branches_with_subcategories": 6, "fashion_subcategories": 72, "missing_leaf_workbooks": 6}


def slug(text: str) -> str:
    text = text.replace("&", " and ").replace("�", "").replace("’", "").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def load_generated_taxonomy() -> list:
    text = (ROOT / "src/demo-data/taxonomy.ts").read_text(encoding="utf-8")
    start = text.index("export const TAXONOMY")
    start = text.index("[", text.index("=", start))
    depth = 0
    for i in range(start, len(text)):
        depth += {"[": 1, "]": -1}.get(text[i], 0)
        if depth == 0:
            return json.loads(text[start:i + 1])
    raise ValueError("TAXONOMY literal not closed")


def main() -> int:
    source_path = Path(sys.argv[1])
    raw = source_path.read_bytes()
    src = json.loads(raw.decode("utf-8"))
    gen_tax = load_generated_taxonomy()
    gen_attr = json.loads((ROOT / "src/demo-data/taxonomy-attributes.json").read_text(encoding="utf-8"))
    workbooks = src["workbooks"]
    problems: list[str] = []
    findings: dict[str, list] = defaultdict(list)

    # --- counts recomputed from the data, not read from the summary ---
    attr = [w for w in workbooks if w["kind"] == "attribute_options"]
    index = [w for w in workbooks if w["kind"] != "attribute_options"]
    fields = [(w, s, f) for w in attr for s in w["sheets"] for f in s["fields"]]
    entries = sum(len(f["values"]) for _, _, f in fields)
    fashion_subs = sum(len(c["subcategories"]) for m in gen_tax if m["id"] == "fashion" for c in m["categories"])
    category_names = sum(len(m["categories"]) for m in gen_tax)
    counts = {
        "workbooks": len(workbooks), "worksheets": sum(len(w["sheets"]) for w in workbooks), "attribute_workbooks": len(attr), "index_workbooks": len(index),
        "attribute_fields": len(fields), "attribute_option_entries": entries, "major_categories": len(gen_tax), "category_names": category_names,
        "fashion_branches_with_subcategories": sum(1 for m in gen_tax if m["id"] == "fashion" for c in m["categories"] if c["subcategories"]),
        "fashion_subcategories": fashion_subs, "missing_leaf_workbooks": len(src["missing_leaf_workbooks"]),
    }
    for key, want in EXPECTED.items():
        if counts[key] != want:
            problems.append(f"count {key}: expected {want}, found {counts[key]}")
    for key in ("workbooks", "worksheets", "attribute_workbooks", "index_workbooks", "attribute_fields", "attribute_option_entries"):
        if src["counts"][key] != counts[key]:
            problems.append(f"source summary {key} = {src['counts'][key]} disagrees with the data ({counts[key]})")
    if src["source_sha256"] != EXPECTED_SOURCE_ZIP_SHA256:
        problems.append("source archive SHA-256 differs from the one the prototype taxonomy was generated from")
    if any("~$" in w["source_path"] for w in workbooks):
        problems.append("an Excel temp lock file was read as a workbook")
    if not src["excluded_lock_files"]:
        findings["lock_files"].append("no lock file excluded (expected one: ~$Fashion_Categories.xlsx)")

    # --- source leaf -> generated leaf, field by field, value by value, in order ---
    leaf_ids = {}
    for w, in ((w,) for w in attr):
        leaf = f"{slug(w['major_category'])}/{slug(w['category'])}/{slug(w['subcategory'])}"
        leaf_ids[leaf] = w
    compared = 0
    for leaf, w in leaf_ids.items():
        generated = gen_attr.get(leaf)
        if generated is None:
            problems.append(f"leaf {leaf} has a source workbook but no generated definition")
            continue
        src_fields = [(f["name"], [v["value"] for v in f["values"]]) for s in w["sheets"] for f in s["fields"]]
        gen_fields = [(g["name"], g["values"]) for g in generated]
        if len(src_fields) != len(gen_fields):
            problems.append(f"leaf {leaf}: {len(src_fields)} source fields, {len(gen_fields)} generated")
            continue
        for (sn, sv), (gn, gv) in zip(src_fields, gen_fields):
            norm = lambda text: text.replace("�", "’")  # the one documented difference; see findings
            if norm(sn) != gn or [norm(x) for x in sv] != gv:
                problems.append(f"leaf {leaf}: field '{sn}' differs from the generated '{gn}'")
        compared += 1
    for leaf in gen_attr:
        if leaf not in leaf_ids:
            problems.append(f"generated leaf {leaf} has no source workbook")
    gen_leaves_flagged = sum(1 for m in gen_tax for c in m["categories"] for s in c["subcategories"] if s["attributes"])
    if gen_leaves_flagged != len(gen_attr):
        problems.append(f"{gen_leaves_flagged} subcategories flagged with attributes but {len(gen_attr)} definitions exist")

    # --- data quality (reported, never auto-corrected) ---
    for w, s, f in fields:
        where = f"{w['source_path'].split('/')[-1]} › {s['sheet']} › {f['name']}"
        if "�" in f["name"] or any("�" in v["value"] for v in f["values"]):
            findings["replacement_character"].append(where)
        values = [v["value"] for v in f["values"]]
        for v in values:
            if v != v.strip() or "  " in v:
                findings["whitespace"].append(f"{where}: {v!r}")
            if unicodedata.normalize("NFC", v) != v:
                findings["not_nfc"].append(f"{where}: {v!r}")
            if not v.strip():
                findings["empty_value"].append(where)
            if any(unicodedata.category(c) == "Cc" for c in v):
                findings["control_character"].append(f"{where}: {v!r}")
        exact = [v for v, n in Counter(values).items() if n > 1]
        folded = [v for v, n in Counter(x.casefold().strip() for x in values).items() if n > 1 and v not in [e.casefold().strip() for e in exact]]
        if exact:
            findings["duplicate_values_exact"].append(f"{where}: {exact}")
        if folded:
            findings["duplicate_values_case_or_space"].append(f"{where}: {folded}")
    for w in attr:
        names = [f["name"] for s in w["sheets"] for f in s["fields"]]
        dup = [n for n, c in Counter(names).items() if c > 1]
        if dup:
            findings["duplicate_field_names"].append(f"{w['source_path'].split('/')[-1]}: {dup}")
    for w in workbooks:
        for s in w["sheets"]:
            for f in s["fields"]:
                if "�" in f["name"] or any("�" in v["value"] for v in f["values"]):
                    findings["replacement_character_all_workbooks"].append(w["source_path"].split("/")[-1])
                    break
    chars = Counter(c for w in workbooks for sh in w["sheets"] for f in sh["fields"] for t in [f["name"], *[v["value"] for v in f["values"]]] for c in t if ord(c) > 127)
    if chars:
        findings["non_ascii_characters"].append({f"U+{ord(c):04X} {unicodedata.name(c, '?')}": n for c, n in chars.most_common()})
    apos = Counter("U+2019" if "’" in t else "U+0027" for w in workbooks for sh in w["sheets"] for f in sh["fields"] for t in [f["name"], *[v["value"] for v in f["values"]]] if "’" in t or "'" in t)
    if len(apos) > 1:
        findings["mixed_apostrophe_forms"].append(dict(apos))
    id_dupes = [i for i, n in Counter(s["id"] for m in gen_tax for c in m["categories"] for s in c["subcategories"]).items() if n > 1]
    if id_dupes:
        problems.append(f"duplicate generated subcategory ids: {id_dupes}")

    report = {
        "source": {"file": source_path.name, "sha256": hashlib.sha256(raw).hexdigest(), "archive": src["source_archive"], "archive_sha256": src["source_sha256"]},
        "counts": counts, "expected": EXPECTED, "leaves_compared": compared,
        "missing_leaf_workbooks": src["missing_leaf_workbooks"], "name_only_categories": {k: len(v) for k, v in src["name_only_categories"].items()},
        "comparison_problems": problems,
        "data_quality_findings": {k: {"count": len(v), "examples": v[:5]} for k, v in findings.items()},
        "note": "Workbook option columns are independent allowed-value lists, not Products or Variant combinations. No attribute is inferred to be mandatory or Variant-defining.",
    }
    if len(sys.argv) > 2:
        Path(sys.argv[2]).parent.mkdir(parents=True, exist_ok=True)
        Path(sys.argv[2]).write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"counts": counts, "leaves_compared": compared, "comparison_problems": problems[:20], "problem_count": len(problems),
                      "findings": {k: len(v) for k, v in findings.items()}}, indent=1, ensure_ascii=False))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
