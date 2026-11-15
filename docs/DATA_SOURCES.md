# Data sources

Every number FlameBridge shows comes from one of the NASA sources below, from a documented
calculation in `src/lib/science/`, or from an image measurement made by `pipeline/vision/`.
The field-level contract is in [DATA.md](DATA.md). The file-level trail (location, hash,
transformation, checks, limits) is in [data-manifest.csv](data-manifest.csv).

## NASA investigations

| Source | What we use | Where it lives | Runs | Licence |
|---|---|---|---|---|
| **PSI-25 · BASS-II** (Burning and Suppression of Solids – II), ISS Microgravity Science Glovebox · [DOI 10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) · [PSI page](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25) | Experimental table, test matrices, ReadMe, ops notes, fan calibration; ISS videos streamed from NASA S3 | `data/raw/psi-25/` (verbatim) → `public/data/psi-25/` (built) | 129 runs, 6 PIs | CC0 1.0 |
| **PSI-20 · ACME BRE** · [DOI 10.60555/vb93-3y72](https://doi.org/10.60555/vb93-3y72) | Experimental table, ReadMe, test summary | `data/raw/psi-20/` → `public/data/psi-20/` | 18 runs | CC0 1.0 |

PSI-25 is the dataset behind every view. PSI-20 is built with the same contract to show that a
second investigation needs a new builder, not a new app. It is not shown in the main views.

## From source to screen

```
psi.nasa.gov (metadata + file tree API)
  └─ pipeline/build_psi25.py ──► data/raw/psi-25/*      verbatim cells, never edited
                             └─► public/data/psi-25/experiments.json   one record per run
                             └─► public/data/psi-25/manifest.json      every PSI file + video headers
NASA S3 videos ─ pipeline/vision/ ──► public/data/psi-25/vision/*.json  image measurements (pixels)
public/data/** ─ src/lib/data (Zod-validated loaders) ──► pages, What-if Lab, AI tools
```

- **Original and derived data are kept apart.** `data/raw/` holds the NASA files byte for byte;
  `public/data/` holds what the pipeline derived from them.
- **No large archives in git.** PSI-25 is 695 files (~275 GB). Videos are never re-hosted:
  `/api/psi/file/{accession}/{fileId}` answers with a 302 to a fresh presigned NASA S3 URL.
  Three short fallback clips (B3, O1, T1) live in `public/media/` for when S3 is unreachable.
- **Missing is not zero.** A cell that cannot be parsed becomes `null` with a QA flag and the
  raw cell is kept. The UI shows "—" with the reason. No per-run pressure is stated in PSI-25 or
  PSI-20, so the field is absent; no assumed cabin pressure is filled in (ADR-021).
- **Video ↔ run links are explicit.** Each video is attached to a run in
  `experiments.json`; videos with no table row are listed in `manifest.miscVideos`, never guessed.

## Rebuild

```bash
python -I pipeline/build_psi25.py .      # needs network access to psi.nasa.gov
```

The vision layer is rebuilt with the commands in [pipeline/vision/README.md](../pipeline/vision/README.md)
(~21 GB video mirror, GPU for the similarity pass).

## Known source issues

Listed with their handling in [DATA.md → Known issues](DATA.md#known-issues-seed-heuristic-v0-codex-to-resolve-against-the-test-matrix-xlsx):
mixed fan/air cells, implausible final O₂ values, two runs dated outside the campaign year, a CO
lower bound (`>500`), undocumented sample-id suffixes.

## Credit

Data courtesy of NASA's Physical Sciences Informatics (PSI) system. BASS-II PIs:
S. Bhattacharjee, C. Fernandez-Pello, P. Ferkul, F. Miller, S. Olson, J. T'ien.
FlameBridge is not affiliated with or endorsed by NASA.
