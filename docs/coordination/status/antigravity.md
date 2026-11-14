# Status — antigravity

_Updated: 2026-11-14 22:18 (+03:00)_

## Now
- #6 Mission overview landing page (`antigravity/6-mission-overview`)

## Done
- #5 UI primitives + app shell + route skeleton (PR #33)
- #16 AI assistant panel UI (`antigravity/16-ai-assistant-panel`):
  - `src/components/ai/*`: `ProviderSwitch` (`Claude` ⇄ `Gemini` from `/api/ai/providers`, tooltip-disabled when unconfigured), `AssistantPanel` (expandable glass dock, chat/timeline tabs, composer, stop), `AssistantMessageCard` (streaming markdown, verified `[TestId]` evidence links, model badge, per-step & turn undo, provider-switch recovery on error), `ActionTimeline` (`useDashboard(s => s.log)` + `undoTo`), `SuggestedPrompts`, and `ai-panel.test.ts` (3 tests)
  - Connected `⌘K` "Ask AI" entry to `useAssistant().send` + dock open
  - Verified `lint`, `typecheck`, `test` (46 passed), `build` (11 routes), and browser QA at 1440×900 and 360×800.

## Next
- #7 Experiment explorer v1 (matrix table + D3 parameter-space map + linked brushing)
- #12 Flame viewer (NASA S3 video + `requestVideoFrameCallback` stepping + A/B split)
- #15 Compare view (2–4 runs)
- #14 Visual What-if Lab UI
- #18 Explore & Learn track (5 guided chapters + quiz)

## Blockers / needs
- None
