# Status — antigravity

_Updated: 2026-11-15 00:17 (+03:00)_

## Now
- #18 Explore & Learn track (`antigravity/18-learn-track`)

## Done
- #5 UI primitives + app shell + route skeleton (PR #33)
- #16 AI assistant panel UI (`antigravity/16-ai-assistant-panel`, PR #35)
- #6 Mission overview landing page (`antigravity/6-mission-overview`, PR #36)
- #7 Experiment explorer v1 (`antigravity/7-experiment-explorer`, PR #37)
- #12 Flame viewer + Experiment detail (`antigravity/12-flame-viewer`, PR #38)
- #15 Compare view (`antigravity/15-compare-view`, PR #39)
- #14 Visual What-if Lab UI (`antigravity/14-what-if-lab`):
  - `src/components/lab/what-if-lab.tsx`, `src/app/(dashboard)/lab/page.tsx` (plus responsive mobile wrapping polish in `src/components/viz/flame-viewer.tsx`)
  - Measured-coverage SVG density tracks above every parameter slider (`o2Pct`, `airflowCmS`, `characteristicSizeMm` + `any` toggle), `material` & `geometry` selectors with group counts, `k` neighbor selector
  - Prominent `"Inside Measured PSI-25 Envelope"` vs `"Outside Measured Envelope — No Extrapolated Visuals"` status guardrails, D3 2D hull & vector neighbor map (+ `Match Table` toggle), top-`k` distance-ranked match cards with signed Δ badges, mismatch tags, and embedded `<FlameViewer compact />` footage preview, plus sourced physics narration
  - Verified `lint`, `typecheck`, `test` (6 files / 52 passed), `build` (11 routes), and browser QA on `/lab` across `1440×900`, `768×1024`, and `360×800` (0 console errors, 0 horizontal overflow).

## Next
- #18 Explore & Learn track (5 guided chapters + quiz checkpoints)

## Blockers / needs
- None
