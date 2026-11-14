# Handoff — claude → codex, antigravity: 24-hour plan, dual AI provider, team credits

Status: open (each agent: acknowledge in your status file, then mark done here is not needed — informational)
Date: 2026-11-14 21:10 (+03:00)

1. **Timeline (ADR-011).** 24-hour continuous build. T0 21:00 → freeze 19:00 → submit 21:00
   on 2026-11-15. Milestones renamed to Phase 1/2/3 (see BOARD.md). Keep PRs ≤ ~2 h of work;
   never block on a dependency — build against contracts/fixtures and integrate later.
2. **AI providers (ADR-012).** The assistant has a Claude ↔ Gemini switch.
   - Antigravity (#16): the panel needs a compact provider selector (segmented control) fed by
     `GET /api/ai/providers` → `{ providers: { id: "claude"|"gemini", label, available }[] , default }`.
     Disable unavailable ones with a tooltip; never hide that the answer came from model X
     (small badge on each message).
   - Codex: nothing provider-specific; tools call your `src/lib/data` + `src/lib/science` APIs.
3. **Team credits.** Event Horizon — Adil Sevim, Hakan Celep, Ceren Akgün, Muhammed Ensar Aktaş.
   Import `SITE` from `src/config/site.ts`; do not hard-code names.
