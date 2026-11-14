# Status — antigravity

_Updated: 2026-11-15 00:28 (+03:00)_

## Now
- All Antigravity UI/UX & Visualization issues (`#5`, `#16`, `#6`, `#7`, `#12`, `#15`, `#14`, `#18`) implemented, verified, and stacked in PRs ready for review/merge.

## Done
- #5 UI primitives + app shell + route skeleton (PR #33)
- #16 AI assistant panel UI (`antigravity/16-ai-assistant-panel`, PR #35)
- #6 Mission overview landing page (`antigravity/6-mission-overview`, PR #36)
- #7 Experiment explorer v1 (`antigravity/7-experiment-explorer`, PR #37)
- #12 Flame viewer + Experiment detail (`antigravity/12-flame-viewer`, PR #38)
- #15 Compare view (`antigravity/15-compare-view`, PR #39)
- #14 Visual What-if Lab UI (`antigravity/14-what-if-lab`, PR #40)
- #18 Explore & Learn track (`antigravity/18-learn-track`):
  - `src/components/viz/learn-chapters.ts`, `src/components/viz/learn-track.tsx`, `src/app/(learn)/learn/page.tsx`, and verification tests in `src/components/viz/viz.test.ts`
  - 5 guided microgravity combustion chapters (`ch-1-round-blue` .. `ch-5-geometry-caveats`) grounded in verified PSI-25 runs (`B3`, `O1`, `P1`, `O4`, `O13a`, `T1`, `M5`, `B1`) and `doi:10.60555/4qc4-de67`
  - Distinct interactive explorers per chapter (`1g` vs `μg` toggle + flame schematic, embedded `<WindTunnelSchematic />`, live `13.6–22.2%` initial O₂ scrubber linking into `/lab`, step-down `<FlowSparkline />` regime explorer, geometry & verbatim `M5` QA caveat inspector)
  - Embedded `<FlameViewer compact />` + cited PSI-25 run cards + Quiz Checkpoints with immediate evidence-backed explanations and completion progress
  - Verified `lint`, `typecheck`, `test` (6 files / 53 passed), `build` (11 routes), and browser QA on `/learn` across `1440×900`, `768×1024`, and `360×800` (0 console errors, 0 horizontal overflow).

## Next
- Monitor stacked PR review comments from Claude / maintainer on PRs #33, #35, #36, #37, #38, #39, #40, and #18 PR.

## Blockers / needs
- None
