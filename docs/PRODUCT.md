# Product Spec — FlameBridge

*Bridge the unknown.* Built for the NASA Space Apps Challenge 2026 · Flame in Freefall.

## Team
**Event Horizon** — Adil Sevim · Hakan Celep · Ceren Akgün · Muhammed Ensar Aktaş.
Credits are rendered from `src/config/site.ts` (single source).

## Problem
NASA has flown hundreds of solid-fuel burns in microgravity, but the evidence sits in a
repository of spreadsheets, PDFs and videos (PSI-25 alone: 296 videos, 695 files, ~275 GB). Engineers
cannot quickly compare conditions; students cannot see *why* fire behaves differently in space.

## Users & modes
| Mode | Persona | Needs |
|---|---|---|
| **Expert** | combustion researcher, spacecraft-fire-safety engineer | filter 129 runs by O₂/flow/geometry, inspect raw rows & QA, frame-step footage, compare runs side by side, export, cite |
| **Guided** | student, teacher, public | guided story ("Why is a space flame blue and round?"), plain-language explanations, interactive what-ifs, quizzes; always backed by real footage |

Mode is a global switch (URL-persisted); both read the same data.

## Core features (v1 scope)
1. **Mission overview** — what BASS-II is, the ISS glovebox wind tunnel, key numbers
   (129 runs · 6 PIs · O₂ 13.6–22.2 % · flow 0–47 cm/s), all sourced.
2. **Experiment explorer** — matrix table + parameter-space map (O₂ × flow), linked brushing,
   facets (PI, material, geometry, flow configuration), QA visibility.
3. **Experiment detail** — conditions card, raw row, QA flags, publications, every video
   (primary / 2nd view / still sequence) in the **Flame viewer** with timeline + frame stepping.
4. **Compare** — 2–4 runs side by side: synchronized videos, condition diff table, overlays.
5. **Visual What-if Lab** — user sets O₂ %, flow, material, geometry, thickness; system finds
   the **k closest real experiments** (normalized distance), shows coverage of the measured
   envelope, highlights differences and plays matched footage. Outside the envelope ⇒ explicit
   warning, no extrapolated result.
6. **AI research assistant** — user can switch between **OpenAI** and **Claude**; answers with evidence chips, runs validated calculations,
   compares experiments and **drives the dashboard** (filter, open, compare, switch mode,
   configure views) through the same store actions as the UI. Every action visible & undoable.
7. **Learn Academy** — five short missions with quizzes, built on real runs.

## Scientific-integrity requirements
- Display only measured values, documented derivations, or cited literature.
- Show provenance on demand for every number (PSI file + row/column, or DOI).
- Nulls and QA flags are shown, not hidden.
- The assistant must refuse to invent values and say "not in the dataset" instead.

## Delivered beyond v1
- Image-derived metrics from video (flame area, visible time, overlay telemetry), in pixels
  only and labelled image-derived. No spread rate is computed.
- Second dataset builder (PSI-20 ACME BRE) to prove the multi-investigation architecture. It is
  not shown in the main views.

## Not built
- Shareable "evidence boards" via URL state.

## Success criteria for judging
Impact & clarity of the story · scientific rigour · design excellence · working AI agent that
visibly operates the UI · real NASA data end-to-end · deployed on Vercel, no login.
