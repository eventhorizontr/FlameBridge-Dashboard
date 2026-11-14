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

**ADR-013 · 2026-11-14 · accepted** — AI dashboard actions are validated server-side and
applied client-side without a mid-turn round trip. The `dashboard_actions` tool checks schema
and references against the same catalog the client uses, returns "applied" to the model, and
streams the actions; the client applies them atomically as one undo group. *Why:* keeps the
turn a single streamed request (simpler, faster, works on serverless) while the action bus
stays the only mutator. *Consequence:* client store and server share `checkReferences` and the
dataset version; a client-side failure is shown on the step.

**ADR-014 · 2026-11-14 · accepted** (contract; unblocks #3, #13) — Three **optional,
backward-compatible** additions, each absent until measured (never `null`/`0` placeholders):
(1) `Conditions.coFinalLowerBoundPpm` — an *exclusive* lower bound set only from a cell that
literally states one (M5 `>500` → 500) and only with `coFinalPpm: null`; `OR` cells keep no
bound. (2) Flat video metadata `durationS`, `fps`, `width`+`height` (paired), `fallbackHref` on
`ExperimentVideo` and on the matching manifest entry (`ManifestFileRef`, `.mp4` only), equal
key-for-key; values describe the PSI source, the fallback shares its time origin.
(3) `InvestigationManifest.miscVideos` — ids of every video not attached to an experiment,
exhaustive and disjoint when present. **`public/media/**` is owned by Codex** for the #13
fallback clips (ADR-004 budget: 2–3 clips, < 5 MB each, transcoded from CC0 PSI-25 sources
with the command recorded in `pipeline/`). *Why:* the brief forbids presenting a bound as a
value or dropping footage silently, and the demo needs offline video without re-hosting PSI.
*Consequence:* strict schemas still reject unknown keys; `validateMediaLinks` enforces the
cross-file rules; `schemaVersion` stays `0.1.0` until the pipeline emits the fields, then
bumps to `0.2.0`.

**ADR-015 · 2026-11-15 · accepted** (supersedes the Gemini half of ADR-012) — The assistant's
providers are **OpenAI (default) and Claude (optional)**; Gemini is removed. OpenAI runs through
the official `openai` SDK Responses API, model `gpt-6.1-sol` (OpenAI's top 6.1 agentic tier,
confirmed in the key's model list), `reasoning.effort: "medium"`, streamed, with turn state
carried by `previous_response_id` and Zod validation of every tool call (`strict: false` since
several inputs are optional). *Why:* owner decision; in live tests it used the action
vocabulary correctly on the first try and kept integrity caveats. *Consequence:*
`AiProviderId = "openai" | "claude"`, `OPENAI_API_KEY`/`OPENAI_MODEL` env; `@google/genai` removed.

**ADR-016 · 2026-11-15 · accepted** (amends ADR-010) — **Antigravity leaves the team**; owner
decision. Its UI stack (#33, #35–#41) was reviewed and merged in #44. The UI lane is split:
**Claude** owns the shell, primitives, assistant panel, overview page and tokens
(`src/components/{layout,ui,ai}`, `src/app/page.tsx`, `layout.tsx`, `globals.css`); **Codex**
owns data-heavy views and science copy (`src/components/{viz,lab}`, `src/app/(dashboard)`,
`src/app/(learn)`). Visual QA moves to headless-browser screenshots at 390/768/1440 px attached
to every UI PR. `GEMINI.md`, `.agent/` and the Antigravity kickoff are removed.
