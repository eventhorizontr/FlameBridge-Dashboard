"""Build the ACME BRE daily-summary catalog from NASA PSI-20."""
from __future__ import annotations

import csv
from datetime import date, datetime, timezone
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import psi_client as psi

ACCESSION = "PSI-20"
SOURCE = f"https://psi.nasa.gov/physci/repo/data/investigations/{ACCESSION}"
MONTHS = {name: i for i, name in enumerate(
    ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"), 1
)}


def build_rows(csv_path: Path, principal_investigator: str) -> list[dict]:
    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        return [build_row(row, principal_investigator) for row in csv.DictReader(source)]


def build_row(raw: dict[str, str], principal_investigator: str) -> dict:
    day = date(int(raw["Year"]), MONTHS[raw["Month"][:3]], int(raw["Date"]))
    test_id = day.isoformat()
    oxygen = raw["Oxygen Conc (percent)"]
    # NASA's summary gives approximate chamber concentrations across tests that
    # ignited. They are not an initial/final O₂ reading for the daily record.
    flags = ["granularity: daily summary; raw oxygen entries and ignition count are not individual-run outcomes"]
    try:
        if not all(0 <= float(value.strip()) <= 100 for value in oxygen.split(";")):
            raise ValueError
    except ValueError:
        flags.append(f"oxygen: malformed or out-of-range source value {oxygen!r}, kept verbatim")
    return {
        "id": f"{ACCESSION}:{test_id}",
        "testId": test_id,
        "investigation": ACCESSION,
        "principalInvestigator": principal_investigator,
        "date": test_id,
        "gmtDay": day.timetuple().tm_yday,
        "sampleId": "",
        "fuel": {"raw": raw["Fuel Bottle"], "material": None, "geometry": None, "inferred": []},
        "conditions": {
            "o2InitialPct": None, "o2FinalPct": None,
            "co2InitialPct": None, "co2FinalPct": None,
            "coInitialPpm": None, "coFinalPpm": None,
            "flowRestrictor": None, "airflowSetpointsCmS": [], "airflowRaw": "",
            "fanDisplayRaw": "", "radiometerGainRaw": "",
        },
        "flowConfiguration": None,
        "outcomeHints": [],
        "totalFramesShot": None,
        "videos": [],
        "qa": {"flags": flags, "parse": "bre-daily-summary-v1"},
        "raw": raw,
    }


def main(root: Path) -> None:
    meta = psi.get_investigation(ACCESSION)
    version = int(meta["version"])
    files = psi.list_files(ACCESSION, version)
    raw_dir = root / "data" / "raw" / "psi-20"
    output = root / "public" / "data" / "psi-20"
    output.mkdir(parents=True, exist_ok=True)

    table, = (f for f in files if f.category == "Experimental table" and f.ext == ".csv")
    csv_path = Path(psi.download(table, str(raw_dir), version))
    for f in files:
        if f.ext == ".docx" and f.category == "Science Documents":
            psi.download(f, str(raw_dir), version)
    principal, = (c for c in meta["contacts"] if any(
        role["annotationValue"] == "Principal Investigator (PI)" for role in c["roles"]
    ))
    experiments = build_rows(csv_path, f"{principal['firstName']} {principal['lastName']}")
    if len({run["id"] for run in experiments}) != len(experiments):
        raise ValueError("Multiple PSI-20 summary rows use the same date")

    shared = {
        "schemaVersion": "0.1.0", "accession": ACCESSION,
        "doi": meta["doi"], "license": meta["licenseName"],
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    groups: dict[str, list[dict]] = {}
    for f in files:
        groups.setdefault(f.category, []).append({
            "id": f.id, "fileName": f.file_name, "category": f.category,
            "subcategory": f.subcategory or None, "ext": f.ext, "sizeBytes": f.size_bytes,
            "href": f"/api/psi/file/{ACCESSION}/{f.id}",
        })
    manifest = {
        **shared, "title": meta["title"], "acronym": meta["investigationAcronym"],
        "source": SOURCE, "studyVersion": version,
        "downloadEndpoint": f"{psi.BASE}/studies/{ACCESSION}/download?file={{id}}&version={version}&redirect=false",
        "totals": {"files": len(files), "bytes": sum(f.size_bytes for f in files)}, "groups": groups,
    }
    dataset = {
        **shared, "count": len(experiments), "videoTestIdsWithoutTableRow": [], "experiments": experiments,
    }
    for name, payload in [("manifest", manifest), ("experiments", dataset)]:
        with (output / f"{name}.json").open("w", encoding="utf8", newline="\n") as target:
            json.dump(payload, target, ensure_ascii=False, indent=1)
            target.write("\n")
    print(f"{ACCESSION}: {len(experiments)} daily summaries, {len(files)} cataloged files")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1])
