# Status — antigravity

_Updated: 2026-11-14 23:46 (+03:00)_

## Now
- #15 Compare view (`antigravity/15-compare-view`)

## Done
- #5 UI primitives + app shell + route skeleton (PR #33)
- #16 AI assistant panel UI (`antigravity/16-ai-assistant-panel`, PR #35)
- #6 Mission overview landing page (`antigravity/6-mission-overview`, PR #36)
- #7 Experiment explorer v1 (`antigravity/7-experiment-explorer`, PR #37)
- #12 Flame viewer + Experiment detail (`antigravity/12-flame-viewer`):
  - `src/components/viz/flame-viewer.tsx`, `src/components/viz/experiment-detail-view.tsx`, `src/app/(dashboard)/experiments/[id]/page.tsx`
  - `<video crossOrigin="anonymous">` NASA S3 proxy playback with fallback + offline retry UI, `Primary` / `2nd View` / `Still Seq` switcher, `0.25×–2×` rate, `←/→` frame stepping via `requestVideoFrameCallback`, `seekVideo` store cursor sync, honest data-driven event lane, and synchronized A/B split compare
  - Full `/experiments/[id]` telemetry KPI strip, fuel provenance, verbatim QA flags (`M5 >500 ppm` sensor saturation handled honestly), What-if Lab handoff, and collapsible raw CSV row table
  - Verified `lint`, `typecheck`, `test` (6 files / 52 passed), `build` (11 routes), and browser QA on `PSI-25:O1` & `PSI-25:M5` across `1440×900`, `768×1024`, `360×800` (0 console errors, 0 overflow).

## Next
- #15 Compare view (2–4 runs)
- #14 Visual What-if Lab UI
- #18 Explore & Learn track (5 guided chapters + quiz)

## Blockers / needs
- None
