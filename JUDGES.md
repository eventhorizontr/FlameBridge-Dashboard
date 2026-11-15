# For judges: where to look

A two-minute map from the NASA Space Apps judging criteria (Impact, Creativity, Validity,
Relevance, Presentation) to the evidence in this project. Each row links to a page you can open,
and the commands at the end let you re-run the checks.

## Start here

| If you have | Open |
|---|---|
| About 1 minute | [Demo video](https://youtu.be/5k1sTZwlpyk) |
| 3 minutes | [The FlameBridge story](STORY.md), one scenario with sources |
| For the science | [SCIENCE.md](SCIENCE.md): literature, method, result, checks |
| For challenge fit | [CHALLENGE.md](CHALLENGE.md): what the challenge asks, where we do it |
| 5 minutes | [Live app](https://nasa-space-apps-2026-seven.vercel.app), then the steps under "Try it" below |

## Criteria and evidence

| Criterion | What we show | Where |
|---|---|---|
| **Impact** | Spacecraft materials are screened with a normal-gravity test, and NASA flight data show cases where microgravity is less forgiving. FlameBridge tells an engineer which real ISS tests are closest to a cabin condition and where the evidence stops | [STORY.md](STORY.md), scenes 1 and 6 |
| **Creativity** | An instrument, not a predictor: it retrieves real tests and names the missing one. Telemetry is recovered from the video picture itself by a network trained with no hand labels. People and the AI use one action system, and every AI step can be undone | [README](README.md#how-it-works), [vision README](pipeline/vision/README.md) |
| **Validity** | 150 TypeScript tests in 18 files and 27 pipeline tests. Source cells kept verbatim. Missing is never zero. No assumed pressure. Pixels are never shown as millimetres. Limits are written down | [METHODS_AND_VALIDATION.md](docs/METHODS_AND_VALIDATION.md), [LIMITATIONS.md](LIMITATIONS.md) |
| **Relevance** | Built on the challenge's NASA data: PSI-25 BASS-II, 129 ISS tests, with a second builder for PSI-20. It summarizes, ranks and interprets experiments, and tests habitat conditions against the measured evidence | [DATA_SOURCES.md](docs/DATA_SOURCES.md), [data-manifest.csv](docs/data-manifest.csv) |
| **Presentation** | Live app with no login, demo video, a guided scenario, Expert and Guided modes | [DEMO.md](docs/DEMO.md), [STORY.md](STORY.md) |

## Try it (about 3 minutes)

1. [Explore](https://nasa-space-apps-2026-seven.vercel.app/explore): open run **B3**. Compare the parsed values with the raw NASA cells.
2. Open run **O13a**. Step through the NASA footage and switch the flame overlay.
3. [What-if Lab](https://nasa-space-apps-2026-seven.vercel.app/lab): set 34 % O₂ and 56.5 kPa. Read the measured-envelope warning.
4. Ask the assistant: "Compare B3 and O13a side by side." Then press **Undo turn**.

## Check our claims yourself

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # 150 tests in 18 files
python -m unittest discover -s pipeline/tests            # 27 tests
python -I pipeline/build_psi25.py .                      # rebuild the test table from NASA PSI
```

## What we are open about

- One investigation is behind the views, with narrow conditions and no per-test pressure.
- Flame segmentation has no hand-labelled ground truth yet.
- AI answers have no fixed evaluation set yet.
- AI (SI) use is disclosed rule by rule in [AI_USAGE.md](AI_USAGE.md). All data, sources and tools are in [RESOURCES.md](RESOURCES.md).
