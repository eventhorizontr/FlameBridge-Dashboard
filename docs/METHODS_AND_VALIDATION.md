# Methods and validation

What each method does, how it is checked, and what has **not** been validated. Only checks
that actually run are listed as checks; everything else is marked *planned*.

## Kinds of information

FlameBridge keeps four kinds of information apart, in the data and in the UI:

| Kind | Example | Where it comes from | Label in the UI |
|---|---|---|---|
| **Source finding** | a run's initial O₂ % and airflow set-points (cm/s) | NASA PSI tables and documents | value + source chip |
| **Image measurement** | flame area in px, an overlay AIR reading | `pipeline/vision/` on NASA video | "image-derived", pixels |
| **Documented calculation** | distance to the closest real runs, O₂ partial pressure from two stated values | `src/lib/science/` (formula, units, citation, tests) | method text + inputs |
| **AI explanation** | a written answer in the assistant panel | LLM, restricted to tool results | assistant panel, with evidence chips |

There is **no predictive model** of flame behaviour. Nothing in the app forecasts a spread rate,
an extinction or any other outcome.

## Methods

**Data parsing** (`pipeline/build_psi25.py`). Cells are parsed with explicit per-column rules.
A cell that does not parse becomes `null` with a QA flag; the raw cell is kept next to it.

**What-if Lab matching** (`src/lib/science/matching.ts`). Retrieval, not simulation. Distance is
a range-normalised weighted Euclidean distance on measured O₂, median airflow and characteristic
size (weights 1 · 1 · 0.5), plus one unit per material or geometry mismatch. The query is
"inside the measured envelope" only when a complete same-material, same-geometry run lies within
0.25 normalised distance and the inputs are inside that group's range. The weights are retrieval
choices, not fitted coefficients.

**Pressure** (`src/lib/science/pressure.ts`, ADR-021). Compared on a ratio scale and only when a
run states a pressure. No run in PSI-25 or PSI-20 does, so a pressure query is always reported as
outside the envelope on pressure.

**Flame vision** (`pipeline/vision/`, full method in its README). Background-subtracted flame
segmentation, overlay OCR with a small CNN, frame similarity (SSIM, histogram, mask IoU, optical
flow, DINOv2 ViT-S/14 embeddings). All lengths stay in pixels of the 720×480 frame.

## Validation that runs today

| Check | Command | Last result |
|---|---|---|
| Data contracts: Zod schemas + cross-record invariants on the published JSON, media links | `pnpm test` | pass |
| Matching: exact run ranks first; out-of-envelope reported; film thickness never compared with rod diameter; missing O₂/airflow excluded, missing size → `null` delta | `pnpm test` (`matching.test.ts`) | pass |
| Pressure: ratio scale; O₂ partial pressure only from two stated values; unstated pressure never read; server and client matchers agree | `pnpm test` (`pressure.test.ts`) | pass |
| AI tools: filter semantics; unknown runs refused; dashboard actions validated against known ids; out-of-bounds inputs rejected; errors are outcomes, not crashes; rate limit | `pnpm test` (`ai.test.ts`) | pass |
| Store: invalid or hallucinated actions rejected without state change; every applied action logged with a label and source; undo restores exactly the touched slice, including a whole AI turn | `pnpm test` (`store.test.ts`) | pass |
| Pipeline: test-matrix parsing, cell parsing, PSI-20 builder, vision helpers | `python -m unittest discover -s pipeline/tests` | pass |
| Overlay OCR, held out by video (26 of 132 videos) | `pipeline/vision/train_osd.py` | 99.98 % character accuracy on 16 404 held-out cells (`assets/osd-glyph-cnn.report.json`) |

`pnpm test` on 2026-11-15: 16 files, 142 tests passed. `unittest`: 27 tests passed.
CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build and the pipeline tests on
every pull request.

Notes on independence: the OCR labels come from the NASA test matrix and clock continuity, and the
held-out set is split by video, but it is the same campaign and overlay font. It is not an
independent validation on other footage.

## Not validated (planned)

- **Flame segmentation** has no hand-labelled ground truth. Known bias: compact flames read up to
  ~15–20 % large (blurred fringe). Visual QA sheets (`pipeline/vision/audit.py`) are reviewed by eye.
- **AI answers** have no fixed evaluation set yet. Planned: a fixed question set covering missing
  fields, ambiguous units and out-of-scope questions, scored for "number came from a tool result".
- **Lab weights** have not been tuned or tested against expert judgement of "similar runs".
