"""Cross-checks of the vision layer against independent sources -> docs/qa/vision/VALIDATION.md.

    python pipeline/vision/validate.py --data public/data/psi-25 --out docs/qa/vision/VALIDATION.md

1. Overlay OCR read rates and the date audit (overlay date vs. test-matrix date).
2. AIR read from the overlay vs. the test-matrix air-flow set-points (independent source).
3. Flame onset found by geometry vs. the nearest DINOv2 phase boundary (independent method).
4. Coverage: how many videos/frames were measurable, and why the rest were not.
"""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import statistics


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    dataset = json.loads((args.data / "experiments.json").read_text(encoding="utf8"))
    experiments = {e["id"]: e for e in dataset["experiments"]}
    vision_dir = args.data / "vision"
    index = json.loads((vision_dir / "index.json").read_text(encoding="utf8"))

    statuses = Counter(v["status"] for v in index["videos"])
    ok = [v for v in index["videos"] if v["status"] == "ok"]
    primary_ok = [v for v in ok if v["kind"] == "primary"]

    read_rates: dict[str, list[float]] = {}
    date_status = Counter()
    clock_consistency = []
    air_rows = []
    onset_gaps = []
    frames_total = frames_instrument = frames_flame = 0
    for entry in ok:
        d = json.loads((vision_dir / f"{entry['videoId']}.json").read_text(encoding="utf8"))
        cov = d["coverage"]
        frames_total += cov["analysedFrames"]
        frames_instrument += cov["instrumentFrames"]
        frames_flame += cov["flameFrames"]
        osd = d.get("osd")
        if osd:
            for k, v in osd["readRate"].items():
                read_rates.setdefault(k, []).append(v)
            date_status[osd["dateCheck"]["status"]] += 1
            if osd.get("clock"):
                clock_consistency.append(osd["clock"]["consistency"])
            e = experiments.get(d["experimentId"])
            setpoints = (e or {}).get("conditions", {}).get("airflowSetpointsCmS") or []
            air = [a for a in osd["series"].get("air", []) if a is not None]
            if setpoints and air and d["kind"] == "primary":
                observed = sorted(set(air))
                # a set-point is "seen" if the duct sensor reads within 1 cm/s of it for >= 5 s
                counts = Counter(air)
                hz = d["sampling"]["storeHz"]
                seen = [s for s in setpoints if sum(c for a, c in counts.items() if abs(a - s) <= 1.0) >= 5 * hz]
                air_rows.append((e["testId"], setpoints, observed[:12], len(seen) / len(setpoints)))
        emb = d.get("embedding")
        first = d["events"].get("firstFlameS")
        if emb and first is not None and first > 5:
            boundaries = [s["startS"] for s in emb["segments"][1:]]
            if boundaries:
                onset_gaps.append(min(abs(b - first) for b in boundaries))

    def mean(xs):
        return statistics.fmean(xs) if xs else float("nan")

    lines = [
        "# Vision layer — validation against independent sources",
        "",
        f"Generated from `{vision_dir.as_posix()}` (algorithm {index['algorithm']['name']} {index['algorithm']['version']}). "
        "Regenerate with `python pipeline/vision/validate.py`.",
        "",
        "## Coverage",
        "",
        "| Status | Videos |",
        "|---|---|",
        *[f"| {k} | {v} |" for k, v in sorted(statuses.items())],
        "",
        f"Analysed frames (≈10 Hz): {frames_total:,}; instrument-camera frames {frames_instrument:,} "
        f"({frames_instrument / max(1, frames_total):.1%}); frames with a visible flame {frames_flame:,}.",
        "",
        "## Overlay OCR",
        "",
        "| Field | Mean read rate | Min read rate | Videos |",
        "|---|---|---|---|",
        *[f"| {k} | {mean(v):.4f} | {min(v):.4f} | {len(v)} |" for k, v in sorted(read_rates.items())],
        "",
        f"Date audit (overlay date − 1 day vs. test-matrix date): "
        + ", ".join(f"{k} {v}" for k, v in sorted(date_status.items()))
        + f". Mean clock consistency (reads within 2 s of the per-video clock fit): {mean(clock_consistency):.4f}.",
        "",
        "A `mismatch` means the overlay date of that recording differs from the matrix date of the test it is filed under "
        "(e.g. a recording made on another day); it is reported, not corrected.",
        "",
        "## AIR (overlay) vs. air-flow set-points (test matrix)",
        "",
        f"Primary videos with both: {len(air_rows)}. Mean share of set-points that the duct sensor reads (±1 cm/s, ≥ 5 s): "
        f"**{mean([r[3] for r in air_rows]):.1%}**; all set-points seen in "
        f"{sum(1 for r in air_rows if r[3] == 1.0)} of {len(air_rows)} videos.",
        "",
        "The sensor lags the set-point by ~1 min and some recordings stop before a later set-point, so a set-point can be "
        "missing without any OCR error.",
        "",
        "| Run | Set-points (cm/s) | AIR values read (cm/s, first 12) | Seen |",
        "|---|---|---|---|",
        *[f"| {t} | {' → '.join(f'{s:g}' for s in sp)} | {', '.join(f'{a:g}' for a in obs)} | {share:.0%} |"
          for t, sp, obs, share in sorted(air_rows, key=lambda r: r[3])[:25]],
        "",
        "## Flame onset (geometry) vs. DINOv2 phase boundaries",
        "",
        f"Videos with a flame after 5 s and an embedding: {len(onset_gaps)}. Median distance from the first-flame time to "
        f"the nearest DINOv2 phase boundary: **{statistics.median(onset_gaps) if onset_gaps else float('nan'):.1f} s**; "
        f"within 5 s in {sum(1 for g in onset_gaps if g <= 5)} of {len(onset_gaps)}.",
        "",
        "Two unrelated methods (thresholded flame mask vs. self-supervised scene embedding) agreeing on when the scene "
        "changes is evidence that both track the flame rather than noise.",
        "",
    ]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(lines), encoding="utf8")
    print("\n".join(lines[:40]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
