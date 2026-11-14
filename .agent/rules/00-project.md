---
trigger: always_on
---

# Project rules (Antigravity)

- This repository is shared by three AI agents. **Read `AGENTS.md` and `GEMINI.md` at the
  start of every task** and obey them; they override anything here.
- Your role: Lead UI/UX & Visualization Engineer. Owned paths are listed in `AGENTS.md §5`.
- Never edit files outside your owned paths. Never push to `main`. Branch: `antigravity/<issue#>-<slug>`.
- Never fabricate scientific values; render missing data as "—" with the QA reason.
- English-only UI. Use design tokens from `src/app/globals.css`; no raw hex colours.
- Verify UI in the browser at 360/768/1440 px before opening a PR; attach screenshots.
- Before finishing: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then update
  `docs/coordination/status/antigravity.md`.
