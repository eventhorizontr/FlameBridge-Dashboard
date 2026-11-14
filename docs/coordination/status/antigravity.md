# Status — antigravity

_Updated: 2026-11-14 23:23 (+03:00)_

## Now
- #7 Experiment explorer v1 (`antigravity/7-experiment-explorer`)

## Done
- #5 UI primitives + app shell + route skeleton (PR #33)
- #16 AI assistant panel UI (`antigravity/16-ai-assistant-panel`, PR #35):
  - `src/components/ai/*`: `ProviderSwitch` (`Claude` ⇄ `Gemini` from `/api/ai/providers`, tooltip-disabled when unconfigured), `AssistantPanel`, `AssistantMessageCard`, `ActionTimeline`, `SuggestedPrompts`, and `ai-panel.test.ts` (3 tests)
  - Connected `⌘K` "Ask AI" entry to `useAssistant().send` + dock open
- #6 Mission overview landing page (`antigravity/6-mission-overview`):
  - `src/components/viz/dataset-queries.ts`, `dataset-bridge.ts`, `catalog-hydrator.tsx`, `wind-tunnel-schematic.tsx`, `mission-overview.tsx`, `viz.test.ts` (5 tests), and `src/app/page.tsx`
  - Live NASA S3 hero `<video crossOrigin="anonymous">` stream (`PSI-25:O1`), computed telemetry KPI `<Stat>` + `<EvidenceChip>` row, interactive SVG MSG wind tunnel (`Opposed`/`Concurrent` + `1g vs. μg`), PI campaign matrix routing directly to `/explore?pi=...`, and mode-adaptive entry cards
  - Verified `lint`, `typecheck`, `test` (6 files / 51 passed), `build` (11 routes), and browser QA at `1440×900`, `768×1024`, `360×800` (0 console errors, 0 overflow).

## Next
- #7 Experiment explorer v1 (matrix table + D3 parameter-space map + linked brushing)
- #12 Flame viewer (NASA S3 video + `requestVideoFrameCallback` stepping + A/B split)
- #15 Compare view (2–4 runs)
- #14 Visual What-if Lab UI
- #18 Explore & Learn track (5 guided chapters + quiz)

## Blockers / needs
- None
