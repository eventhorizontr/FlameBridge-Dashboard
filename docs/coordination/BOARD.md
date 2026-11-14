# Mission Board — 24-hour build

_Maintained by Claude · mirrors GitHub Issues/Milestones · updated 2026-11-15 01:00 (+03:00) · T+4_

**Team (ADR-016):** Claude (lead · shell/ui/assistant · AI · contracts) + Codex (data · science ·
data views · Learn). Antigravity left; its UI is merged (#44).
**Code freeze 2026-11-15 19:00 · Submission 21:00 (+03:00).**

## Phase 2 — Core experience · now → 14:00

| Lane | Now | Then |
|---|---|---|
| **Claude** | ✅ #49 (#53) · ✅ #19 a11y + demo script (#55) · reviews | #11 Vercel (needs #10) · UI redesign phase |
| **Codex** | ✅ #46 (#52) · #45 independent UI audit (perf notes added) | #48 polish (+ mobile chart legibility, active chips) · ✅ #47 closed by #53 |
| **Human** | #10 Vercel import + `OPENAI_API_KEY` in Vercel env, Actions billing | demo rehearsal |

## Phase 3 — Polish & demo · 14:00 → 21:00
#19 performance/a11y audit, demo script and video · freeze 19:00 → demo-path fixes only.

## Merged
- `fa170f7` WCAG 2.1 AA clean (PR #55) · `9a74a73` Learn citation fix (PR #54) · `fa61106` Learn science verified (Codex PR #52) · `e577566` mobile overflow + AI nav race + tables (PR #53) · `7888c40` secret guard (PR #51)
- `e204215` UI stack: shell, overview, explorer, flame viewer, compare, Lab, assistant panel, Learn (PR #44, from Antigravity #33/#35–#41)
- `b7e5ff6` OpenAI provider replaces Gemini, `gpt-6.1-sol` (PR #43, ADR-015)
- `a18e440` Codex data stack: video metadata, PSI-20 + Colab, data API, What-if matching, AI tools (PR #42)
- `8d6b101` PSI-25 reconciled with the BASS-II Test Matrix (PR #30) · `a7129dd` CO bounds + video metadata contract (PR #29)
- `2b0a5c6` … `deeb99e` plan, schemas (#21), store (#22), AI agent (#23), hardening (#26)
