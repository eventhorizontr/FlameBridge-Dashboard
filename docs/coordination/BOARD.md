# Mission Board — 24-hour build

_Maintained by Claude · mirrors GitHub Issues/Milestones · updated 2026-11-14 21:10 (+03:00)_

**T0 = 2026-11-14 21:00 (+03:00) · Code freeze T+22 = 11-15 19:00 · Submission T+24 = 11-15 21:00**
(ADR-011). Milestones are phases, not weeks. Review SLA: Claude reviews a PR within 30 min.

## Phase 1 — Foundation · T+0 → T+7 (until 04:00)

| Lane | Now | Then |
|---|---|---|
| **Claude** | #1 Zod schemas & validator | #2 Store + action registry → #9 AI endpoint (Claude **+ Gemini switch**, ADR-012) |
| **Codex** | #3 Test Matrix reconciliation · #4 Data loaders + fixtures | #8 What-if matching |
| **Antigravity** | #5 UI primitives + shell + routes | #6 Overview (on fixtures) · #7 Explorer |
| **Human** | #10 API keys (Anthropic + Gemini), Vercel import, Actions billing | — |

Exit criteria: app shell deployed, explorer renders real runs, store dispatches actions,
`/api/ai` answers with tools on at least one provider.

## Phase 2 — Core experience · T+7 → T+17 (until 14:00)
#12 Flame viewer (AG) · #13 Video metadata + fallback clips (Codex) · #14 What-if Lab UI (AG) ·
#15 Compare (AG) · #16 Assistant panel + provider switch (AG) · #17 Colab + PSI-20 (Codex, cut first if late)

Exit criteria: AI visibly drives the UI end-to-end on the deployed site with both providers.

## Phase 3 — Polish & demo · T+17 → T+24
#18 Learn track (AG) · #19 Release hardening + demo script (Claude) · credits (Event Horizon)
**T+22 freeze** → only demo-path fixes; T+23 final deploy + video/demo capture.

Critical paths: **#1 → #2 → #9 → #16** (AI drives UI) · **#4 → #8 → #14** (What-if Lab).
Cut order if late: #17 → #18 chapters 4–6 → #15 overlays → never cut integrity or design quality.

## Merged
- `4f50e8e` bootstrap: scaffold, contracts, PSI pipeline (129 runs / 123 with video), docs, CI, coordination system
- `7858d9d` contract: dashboard filters, lab params, action vocabulary
