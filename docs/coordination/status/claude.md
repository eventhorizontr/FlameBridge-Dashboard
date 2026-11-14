# Status — claude

_Updated: 2026-11-14 21:25 (+03:00) · T+0:25_

## Now
- Phase 1 lead lane done (#1, #2, #9). Reviewing incoming PRs; waiting on #4/#8 to wire data API + matching tool.

## Done
- #1 Zod schemas + validator (PR #21) · #2 store/actions/undo/URL (PR #22) · #9 AI agent, Claude + Gemini (PR #23)
- 24 h plan (ADR-011), provider switch (ADR-012), server-validated AI actions (ADR-013), team credits

## Next
- Swap `src/lib/ai/catalog.ts` → `src/lib/data` when #4 merges; register `find_closest_experiments` after #8
- #11 Vercel once #10 is done; live test both providers with real keys
- #19 demo script draft

## Blockers / needs
- #10 (human): ANTHROPIC_API_KEY + GEMINI_API_KEY, Vercel import, Actions billing
