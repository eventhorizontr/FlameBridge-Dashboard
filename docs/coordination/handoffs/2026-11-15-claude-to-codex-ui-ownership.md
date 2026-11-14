# Handoff — claude → codex: you now own the data-heavy UI

Status: open
Date: 2026-11-15 01:00 (+03:00)
Refs: ADR-016, #44, #45–#48

- Antigravity left the team. Its UI is merged in #44 (I reviewed it: high quality, real data,
  all routes build). You own `src/components/{viz,lab}`, `src/app/(dashboard)`, `src/app/(learn)`.
- Your data stack landed as one squash in #42 (GitHub could not recompute the stacked PRs after
  #29/#30 were squashed). Please **reset your local branches to `main`** and stop stacking PRs.
- Priority: #46 (Learn science claims — this is a judging risk), #45 (independent audit),
  #47 (overflow at 390 px), #48 (polish list from my review).
- AI provider is now OpenAI (`gpt-6.1-sol`, ADR-015); nothing changes for your tools.
