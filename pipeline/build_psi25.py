"""
Build the PSI-25 (BASS-II) dataset consumed by the web app.

Outputs (schema: see docs/DATA.md and src/types/experiment.ts — the contract):
  data/raw/psi-25/                         small source files (CSV, xlsx, docx) — provenance
  public/data/psi-25/manifest.json         every PSI file, grouped, with stream/download routes
  public/data/psi-25/experiments.json      one record per test run, normalized + QA flags

Scientific integrity rules (non-negotiable):
  * Never invent or "fix" a value. Unparseable or implausible values become null and
    get a QA flag; the original string is always kept in `raw`.
  * Every inferred field is listed in `inferred` with the reason.

Usage:  python -I pipeline/build_psi25.py [repo_root]
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import psi_client as psi  # noqa: E402
from bass_matrix import CSV_COLUMNS, discrepancies, notes, parse_airflow, read_matrix  # noqa: E402

ACCESSION = "PSI-25"
SCHEMA_VERSION = "0.2.0"
SMALL_DOCS = (".csv", ".xlsx", ".docx")

INCH_MM = 25.4
FRACTION_INCH = {"1/4": 0.25, "3/8": 0.375, "1/2": 0.5, "0.5": 0.5}


# ---------------------------------------------------------------- parsing helpers
def num(s: str) -> float | None:
    s = (s or "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def parse_material(raw: str) -> dict:
    t = raw.lower()
    inferred: list[str] = []
    out: dict = {"raw": raw.strip()}

    if "sibal" in t:
        out.update(material="SIBAL", geometry="fabric", composition="75/25 cotton/fiberglass (PSI-25 ReadMe)")
    elif "nomex" in t:
        out.update(material="Nomex", geometry="fabric")
    elif "wax" in t or "candle" in t:
        out.update(material="Japan wax", geometry="candle")
    elif "spherical" in t:
        out.update(material="PMMA", geometry="spherical-section")
        inferred.append("material=PMMA: BASS-II spherical sections are PMMA (investigation objectives)")
    elif "rod" in t:
        out.update(material="PMMA", geometry="rod")
        if "pmma" not in t:
            inferred.append("material=PMMA: PSI-25 ReadMe — Olson and Fernandez-Pello burned PMMA rods")
        out["color"] = "black" if "black" in t or "blac " in t else ("clear" if "clear" in t else None)
        m = re.search(r'(1/4|3/8|1/2|0\.5)\s*"?', raw)
        if m:
            out["diameterMm"] = round(FRACTION_INCH[m.group(1)] * INCH_MM, 3)
    else:
        out.update(material="PMMA" if ("pmma" in t or "film" in t or "micron" in t or "thick" in t) else None)
        if "pmma" not in t and out["material"]:
            inferred.append("material=PMMA: unnamed film/slab in a PMMA test series")

    if out.get("geometry") is None and out.get("material") == "PMMA":
        thick = None
        if m := re.search(r"(\d+(?:\.\d+)?)\s*micron", t):
            thick = float(m.group(1)) / 1000
        elif m := re.search(r"(\d+(?:\.\d+)?)\s*mm", t):
            thick = float(m.group(1))
        out["thicknessMm"] = thick
        out["geometry"] = "film" if (thick is not None and thick < 1) or "film" in t else "slab"

    if m := re.search(r"(\d+(?:\.\d+)?)\s*cm\s*(?:wide|width)?", t):
        if out.get("geometry") in ("film", "slab", "fabric"):
            out["widthCm"] = float(m.group(1))
        elif out.get("geometry") == "spherical-section":
            out["diameterMm"] = float(m.group(1)) * 10
    if "1 sided" in t or "1 side" in t:
        out["burnSides"] = 1
    elif "2 sided" in t:
        out["burnSides"] = 2

    out["inferred"] = inferred
    return out


def parse_o2(raw: str, flags: list[str], label: str) -> float | None:
    v = num(raw)
    if v is None:
        if raw.strip():
            flags.append(f"{label}: non-numeric '{raw.strip()}'")
        return None
    if not (10.0 <= v <= 25.0):
        flags.append(f"{label}: {v} outside the 10–25 % campaign QA range; excluded")
        return None
    return v


# Flow configuration per PI, as stated in the PSI-25 ReadMe ("Test Matrix explanation").
FLOW_CONFIG = {
    "Olson": "concurrent",  # upstream-end ignition, stagnation/concurrent flame
    "Fernandez-Pello": "opposed",  # downstream-end ignition, opposed-flow spread
}


def parse_plain(raw: str, flags: list[str], label: str) -> float | None:
    if label.startswith("co") and not label.startswith("co2") and raw.strip().upper() == "OR":
        flags.append(f"{label}: sensor over range ('{raw.strip()}', CO OR = >1000 ppm per ReadMe)")
        return None
    v = num(raw)
    if v is None and raw.strip() and raw.strip().lower() not in ("none",):
        flags.append(f"{label}: non-numeric '{raw.strip()}'")
    return v


# ---------------------------------------------------------------- video manifest
TEST_RE = re.compile(r"TEST[_ ]?([A-Z]\d+[a-z]?)", re.I)


def test_id_for(f: psi.PsiFile) -> str | None:
    sub = [p.strip() for p in f.subcategory.split("/") if p.strip()]
    if len(sub) >= 3:
        return sub[-1]
    m = TEST_RE.search(f.file_name)
    return m.group(1)[0].upper() + m.group(1)[1:].lower() if m else None


def video_kind(name: str) -> str:
    n = name.upper()
    if "STILL_SEQUENCE" in n:
        return "still-sequence"
    if "2ND_VIEW" in n:
        return "second-view"
    return "primary"


def build_experiments(
    csv_path: Path, matrix_path: Path, by_test: dict[str, list[dict]],
) -> tuple[list[dict], list[str]]:
    with open(csv_path, encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))
    header, rows = rows[0], rows[1:]

    matrix = read_matrix(Path(matrix_path))
    experiments = []
    seen = set()
    for r in rows:
        r = (r + [""] * len(header))[: len(header)]
        raw = dict(zip(header, r))
        flags: list[str] = []
        test_id = r[1].strip()
        if test_id in seen:
            raise ValueError(f"Duplicate CSV test ID: {test_id}")
        seen.add(test_id)
        pi, cells = matrix[test_id]
        differences = discrepancies(header, r, pi, cells)
        flags.extend(differences.values())
        source = dict(zip(CSV_COLUMNS, cells))
        # The matrix defines units and column semantics. Values that disagree
        # remain unreported until the two sources can be reconciled.
        def agreed(index: int) -> str:
            return "" if index in differences else source[index]

        csv_material = parse_material(r[5])
        matrix_material = parse_material(source[5])
        # Report both cells even when word order differs and the parsed descriptions agree.
        same_material = {k: v for k, v in csv_material.items() if k != "raw"} == {
            k: v for k, v in matrix_material.items() if k != "raw"
        }
        mat = matrix_material if 5 not in differences or same_material else parse_material("")
        mat["raw"] = r[5].strip()
        try:
            date = datetime.strptime(agreed(2).strip(), "%m/%d/%Y").date().isoformat()
        except ValueError:
            date = None
            flags.append(f"date: unparseable '{r[2]}'")
        if date and not date.startswith("2014") and date.startswith(("2016", "2018")) and r[0] == "T'ien":
            flags.append(f"date: {date} conflicts with the 2014 campaign and reported GMT day (CSV and Test Matrix agree on the literal date)")

        o2_i = parse_o2(agreed(11), flags, "o2Initial")
        o2_f = parse_o2(agreed(12), flags, "o2Final")
        # Split runs (O13a/O13b) share the parent test's footage.
        base_id = re.sub(r"[ab]$", "", test_id)
        videos = by_test.get(test_id) or by_test.get(base_id, [])
        for v in videos:
            name_test = TEST_RE.search(v["fileName"])
            if name_test and re.sub(r"[ab]$", "", name_test.group(1), flags=re.I).casefold() != base_id.casefold():
                flags.append(f"video-filename-test-id-mismatch:{v['id']}")
        air = parse_airflow(test_id, agreed(8), flags)
        if not air and test_id in {"O6", "O7", "O8a", "O8b", "O9"}:
            flags.append("airflow: Test Matrix Air display lacks measured set-points; fan notes are ambiguous")
        co_final = agreed(16)
        lower_bound = re.fullmatch(r">\s*(\d+(?:\.\d+)?)", co_final.strip())
        if lower_bound:
            co_fields = {"coFinalPpm": None, "coFinalLowerBoundPpm": float(lower_bound[1])}
            flags.append(f"coFinal: source reports an exclusive lower bound ({co_final.strip()})")
        else:
            co_fields = {"coFinalPpm": parse_plain(co_final, flags, "coFinal")}
        experiments.append(
            {
                "id": f"{ACCESSION}:{test_id}",
                "testId": test_id,
                "investigation": ACCESSION,
                "principalInvestigator": r[0].strip(),
                "date": date,
                "gmtDay": num(agreed(3)),
                "sampleId": r[4].strip(),
                "fuel": mat,
                "conditions": {
                    "o2InitialPct": o2_i,
                    "o2FinalPct": o2_f,
                    "co2InitialPct": parse_plain(agreed(13), flags, "co2Initial"),
                    "co2FinalPct": parse_plain(agreed(14), flags, "co2Final"),
                    "coInitialPpm": parse_plain(agreed(15), flags, "coInitial"),
                    **co_fields,
                    "flowRestrictor": num(agreed(6)),
                    "airflowSetpointsCmS": air,
                    "airflowRaw": r[8].strip(),
                    "fanDisplayRaw": r[7].strip(),
                    "radiometerGainRaw": r[9].strip(),
                },
                "flowConfiguration": FLOW_CONFIG.get(r[0].strip()),
                "outcomeHints": notes(agreed(7), agreed(8)),
                "totalFramesShot": num(agreed(10)),
                "videos": videos,
                "qa": {"flags": flags, "parse": "matrix-v1"},
                "raw": raw,
            }
        )

    covered = {e["testId"] for e in experiments} | {re.sub(r"[ab]$", "", e["testId"]) for e in experiments}
    if matrix_only := set(matrix) - seen:
        raise ValueError(f"Test Matrix rows missing from CSV: {sorted(matrix_only)}")
    return experiments, sorted(set(by_test) - covered)


# ---------------------------------------------------------------- main
def main(root: str) -> None:
    meta = psi.get_investigation(ACCESSION)
    study_version = int(meta["version"])
    files = psi.list_files(ACCESSION, study_version)
    raw_dir = os.path.join(root, "data", "raw", "psi-25")
    out_dir = os.path.join(root, "public", "data", "psi-25")
    os.makedirs(out_dir, exist_ok=True)

    # 1) small provenance docs
    for f in files:
        if f.ext in SMALL_DOCS and f.size_bytes < 5_000_000:
            psi.download(f, raw_dir, study_version)

    # 2) manifest
    by_test: dict[str, list[dict]] = defaultdict(list)
    groups: dict[str, list[dict]] = defaultdict(list)
    for f in files:
        rec = {
            "id": f.id,
            "fileName": f.file_name,
            "category": f.category,
            "subcategory": f.subcategory or None,
            "ext": f.ext,
            "sizeBytes": f.size_bytes,
            # Resolve on demand via the app route; PSI presigned URLs expire.
            "href": f"/api/psi/file/{ACCESSION}/{f.id}",
        }
        groups[f.category].append(rec)
        if f.ext == ".mp4" and (tid := test_id_for(f)):
            # Matrix: B1 is sample 147, B3 is sample 148 (both GMT50).
            # The B3 primary appears under B1 in the file tree.
            if tid == "B1" and "GMT50_SAMPLE_148_TEST_B3" in f.file_name:
                tid = "B3"
            # B17 is sample 175m, GMT183; the filenames say B15 but the
            # folder, GMT and sample support B17. Keep footage and flag it.
            by_test[tid].append({**rec, "kind": video_kind(f.file_name)})

    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "accession": ACCESSION,
        "title": meta.get("title"),
        "acronym": meta.get("investigationAcronym"),
        "doi": meta.get("doi"),
        "license": meta.get("licenseName"),
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": f"https://psi.nasa.gov/physci/repo/data/investigations/{ACCESSION}",
        "studyVersion": study_version,
        "downloadEndpoint": f"{psi.BASE}/studies/{ACCESSION}/download?file={{id}}&version={study_version}&redirect=false",
        "totals": {"files": len(files), "bytes": sum(f.size_bytes for f in files)},
        "groups": groups,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)

    # 3) experiments
    csv_path = next(Path(raw_dir).glob("*Experimental table*.csv"))
    matrix_path = next(Path(raw_dir).glob("*Test.Matrices.xlsx"))
    experiments, unmatched = build_experiments(csv_path, matrix_path, by_test)
    out = {
        "schemaVersion": SCHEMA_VERSION,
        "accession": ACCESSION,
        "doi": meta.get("doi"),
        "license": meta.get("licenseName"),
        "generatedAt": manifest["generatedAt"],
        "count": len(experiments),
        "videoTestIdsWithoutTableRow": unmatched,
        "experiments": experiments,
    }
    with open(os.path.join(out_dir, "experiments.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)

    with_video = sum(1 for e in experiments if e["videos"])
    flagged = sum(1 for e in experiments if e["qa"]["flags"])
    print(f"files={len(files)} experiments={len(experiments)} with_video={with_video} "
          f"qa_flagged={flagged} unmatched_video_ids={unmatched}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
