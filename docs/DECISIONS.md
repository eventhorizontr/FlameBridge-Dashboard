# Decision Log (ADR-lite)

Format: **ID · date · status** — decision — why — consequences. Newest last. Owner: Claude.

**ADR-001 · 2026-11-14 · accepted** — Next.js 16 App Router + TypeScript strict + pnpm + Tailwind v4,
deployed on Vercel. *Why:* mandated stack, best Vercel fit, RSC lets us ship JSON-heavy pages
fast. *Consequence:* Next 16 differs from training data — agents read `node_modules/next/dist/docs`.

**ADR-002 · 2026-11-14 · accepted** — Primary dataset **PSI-25 (BASS-II)**; PSI-20 (ACME BRE)
registered as the second investigation. *Why:* PSI-25 holds the PMMA burns, test matrix and
~300 videos the brief describes; the provided PSI-20 link is a 1-file gaseous-fuel emulator.

**ADR-003 · 2026-11-14 · accepted** — Data access via the public PSI API
(`/repo/investigations`, `/files/v2`, `/studies/{acc}/download`) with a stdlib Python client.
*Why:* reproducible, Colab-compatible, no manual downloads. *Consequence:* API is undocumented —
client pinned to verified behaviour; CI smoke test should detect breakage.

**ADR-004 · 2026-11-14 · accepted** — Videos streamed from NASA S3 through a 302 resolver route;
never re-hosted. *Why:* 275 GB, CC0 but huge; S3 sends CORS `*` + ranges, so canvas frame
analysis works. *Consequence:* demo depends on PSI uptime → keep 2–3 short fallback clips
(transcoded, < 5 MB each) in `public/media/` for the live demo.

**ADR-005 · 2026-11-14 · accepted** — Google Drive is pipeline working storage only, not a
runtime dependency. *Why:* Drive is not a CDN, has quotas, needs auth for automation.

**ADR-006 · 2026-11-14 · accepted** — Integrity model: null + QA flag + raw cell + `inferred[]`
for every record; seed parse labelled `heuristic-v0`. *Why:* the brief forbids fabricated
results; the source CSV is hand-typed and inconsistent.

**ADR-007 · 2026-11-14 · accepted** — UI state only through a typed Zustand action registry
shared by UI and AI. *Why:* "AI controls the dashboard" must be reliable, visible and undoable.

**ADR-008 · 2026-11-14 · accepted** — AI provider: official `@anthropic-ai/sdk`, model
`claude-opus-5-5`, adaptive thinking, streaming, Zod tool schemas, server-side refusal fallback;
Gemini optional via adapter. *Why:* strongest tool-use reliability; adapter keeps the brief's
"Gemini/Claude" option open.

**ADR-009 · 2026-11-14 · accepted** — Bespoke D3 + React rendering for charts (no chart kit).
Palette validated with the dataviz validator on `--surface-2`; scatter plots capped at 3
categorical series. *Why:* "NASA-grade, not generic" + colour-blind safety.

**ADR-010 · 2026-11-14 · accepted** — Team topology: Claude = lead/contracts/AI/integration;
Codex = data/science/tests; Antigravity = UI/viz with browser QA. Path ownership in AGENTS.md §5.
GitHub Issues = source of truth; squash merges by Claude.

**ADR-011 · 2026-11-14 · accepted** — Delivery is a **24-hour continuous build**. T0 =
2026-11-14 21:00 (+03:00), submission T+24 = 2026-11-15 21:00 (+03:00). Three phases replace
the week-long sprints: **P1 Foundation T+0→T+7**, **P2 Core T+7→T+17**, **P3 Polish & demo
T+17→T+24**, with **code freeze at T+22** (19:00) — after that only fixes for the demo path.
*Why:* owner confirmed the event format. *Consequence:* PRs stay small (≤ ~2 h of work),
reviews are turned around within 30 min, agents work on fixtures instead of waiting on
dependencies, and anything not on the demo path is cut before quality is.

**ADR-012 · 2026-11-14 · accepted** (amends ADR-008) — The assistant ships **two providers
with a user-visible switch: Claude (default, `claude-opus-5-5`) and Gemini** (`@google/genai`,
model from `GEMINI_MODEL`). Both sit behind one `AiProvider` interface in
`src/lib/ai/providers/` and share the *same* Zod tool definitions, system prompt, evidence
rules and `DashboardAction` validation; the provider is chosen per request
(`provider: "claude" | "gemini"`), persisted in the store, and the UI shows only providers whose
key is configured (`GET /api/ai/providers`). *Why:* owner requirement; it also gives a live
fallback if one API degrades during the demo. *Consequence:* no provider-specific features in
the product surface; provider-specific tuning stays inside its adapter.
