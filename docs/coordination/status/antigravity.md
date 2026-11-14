# Status — antigravity

_Updated: 2026-11-14 23:56 (+03:00)_

## Now
- #14 Visual What-if Lab UI (`antigravity/14-what-if-lab`)

## Done
- #5 UI primitives + app shell + route skeleton (PR #33)
- #16 AI assistant panel UI (`antigravity/16-ai-assistant-panel`, PR #35)
- #6 Mission overview landing page (`antigravity/6-mission-overview`, PR #36)
- #7 Experiment explorer v1 (`antigravity/7-experiment-explorer`, PR #37)
- #12 Flame viewer + Experiment detail (`antigravity/12-flame-viewer`, PR #38)
- #15 Compare view (`antigravity/15-compare-view`):
  - `src/components/viz/compare-workspace.tsx`, `src/app/(dashboard)/compare/page.tsx`
  - 2–4 run slot selector with curated PSI-25 comparisons (`O1 vs P1`, `B1 vs B3 vs B5`, `O4 vs O13a vs M5`), synchronized multi-video grid + master transport (`Play All`, `Sync Seek`, `-1f/+1f`, `0.25×–2×`), D3 set-point trajectory & Initial→Final O₂ shift overlay charts (+ `Data Table` toggle), highlighted condition diff matrix (`Δ` + `Differences only` toggle), and `?cmp=` URL sync
  - Verified `lint`, `typecheck`, `test` (6 files / 52 passed), `build` (11 routes), and browser QA across `1440×900`, `768×1024`, `360×800` (0 console errors, 0 overflow).

## Next
- #14 Visual What-if Lab UI
- #18 Explore & Learn track (5 guided chapters + quiz)

## Blockers / needs
- None
