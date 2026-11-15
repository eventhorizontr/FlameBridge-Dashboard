# Limitations

FlameBridge helps people read and compare NASA experiments. It is **not** a fire simulator, a
design tool or a safety certification, and it does not replace physical testing.

## Scope

- **One campaign behind the views.** All views use PSI-25 (BASS-II): 129 runs, mostly PMMA,
  plus SIBAL fabric, Nomex and a candle. Other fuels, geometries and flow regimes are not covered.
- **Narrow conditions.** Initial O₂ 13.6–22.2 %, recorded airflow 0–47 cm/s, ISS cabin as flown. The Lab
  flags a query outside these ranges as outside the measured envelope; it does not extrapolate.
- **No pressure data.** No PSI-25 or PSI-20 run states a pressure. A pressure query can only be
  shown as a gap, never matched (ADR-021).

## Measurement limits (from the NASA ReadMe)

- O₂ sensor out of calibration; corrected by a daily constant offset.
- Duct airflow sensor responds in ~1 min; only long holds are steady.
- Radiometer is uncalibrated; its gain differs by test. Use it for relative change only.
- CO over range (> 1000 ppm) is recorded as `OR`.
- Some table cells are ambiguous or implausible; they are `null` + flagged, not guessed
  ([DATA.md](DATA.md#known-issues-seed-heuristic-v0-codex-to-resolve-against-the-test-matrix-xlsx)).

## Image measurement limits

- No physical scale in the footage: all flame sizes are pixels, never millimetres.
- Compact flames read up to ~15–20 % large; coloured hardware light can pass as flame briefly.
- 5 videos are unreadable, 10 are not instrument footage, 120 second-view recordings are skipped.
- Segmentation has no hand-labelled ground truth ([METHODS_AND_VALIDATION.md](METHODS_AND_VALIDATION.md)).

## AI assistant limits

- It can only state values returned by its read-only tools, but an LLM can still phrase
  things wrongly. Every cited run links to its record so the user can check.
- No fixed evaluation set yet (planned). Without an API key the assistant is off; every other
  feature works.

## Illustrations

The Learn track uses schematic interactives labelled "Illustration · not a simulation" or
"Schematic shape · no fitted values". They teach concepts and carry no measured numbers.
