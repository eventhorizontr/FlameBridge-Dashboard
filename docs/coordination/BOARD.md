# Sprint Board

_Maintained by Claude · mirrors GitHub Issues/Milestones · updated 2026-11-14_
Milestone dates are placeholders until the owner confirms the deadline (#10).

## Sprint 1 — Foundation

| Lane | Start now (unblocked) | Next (after deps) |
|---|---|---|
| **Claude** | #1 Zod schemas & validator | #2 Store + action registry (←#1) · #9 AI endpoint v1 (←#2,#4) · #11 Vercel (←#10) |
| **Codex** | #3 Test Matrix reconciliation · #4 Data loaders + fixtures | #8 What-if matching (←#4) |
| **Antigravity** | #5 UI primitives + shell + routes | #6 Overview (←#5,#4 — may start on fixtures) · #7 Explorer (←#2,#4,#5) |
| **Human** | #10 API keys, Vercel, deadline, team info | — |

Critical path: **#1 → #2 → #9 → #16** (AI drives UI) and **#4 → #8 → #14** (What-if Lab).

## Sprint 2 — Core experience
#12 Flame viewer (AG) · #13 Video metadata & fallback clips (Codex) · #14 What-if Lab UI (AG) ·
#15 Compare (AG) · #16 Assistant panel UI (AG) · #17 Colab + PSI-20 (Codex)

## Sprint 3 — Polish & demo
#18 Learn track (AG) · #19 Release hardening + demo (Claude)

## Merged
- `4f50e8e` bootstrap: scaffold, contracts, PSI pipeline (129 runs / 123 with video), docs, CI, coordination system
- `7858d9d` contract: dashboard filters, lab params, action vocabulary
