# Status — antigravity

_Updated: 2026-11-14 23:35 (+03:00)_

## Now
- #12 Flame viewer + Experiment detail (`antigravity/12-flame-viewer`)

## Done
- #5 UI primitives + app shell + route skeleton (PR #33)
- #16 AI assistant panel UI (`antigravity/16-ai-assistant-panel`, PR #35)
- #6 Mission overview landing page (`antigravity/6-mission-overview`, PR #36)
- #7 Experiment explorer v1 (`antigravity/7-experiment-explorer`):
  - `src/components/viz/facet-bar.tsx`, `flow-sparkline.tsx`, `parameter-space-map.tsx`, `experiment-matrix.tsx`, `explorer-workspace.tsx`, `src/app/(dashboard)/explore/page.tsx`
  - Faceted filter bar (`filter-material` AI target), D3 O₂ × representative airflow scatter with 2D brush, max-3 fuel-family series (`--series-1..3`), explicit unplotted null strip (O6/O7/O8a/O8b/O9/O12), accessible `Scatter` / `Table` toggle, windowed sortable matrix with flow sparklines, QA badges, and Compare bar
  - Verified `lint`, `typecheck`, `test` (6 files / 52 passed), `build` (11 routes), and browser QA at `1440×900`, `768×1024`, `360×800` (0 console errors, 0 overflow).

## Next
- #12 Flame viewer (NASA S3 video + `requestVideoFrameCallback` stepping + A/B split)
- #15 Compare view (2–4 runs)
- #14 Visual What-if Lab UI
- #18 Explore & Learn track (5 guided chapters + quiz)

## Blockers / needs
- None
