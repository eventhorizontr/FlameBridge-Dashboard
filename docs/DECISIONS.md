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

**ADR-017 · 2026-11-15 · accepted** (contract) — **Flame vision layer.** Owner request: frame
the flame in the footage, measure inside it, chart it, show "flame only", extract frames and
compute frame-to-frame similarity, for PSI-25 and future datasets, usable by the AI.
Decisions: (1) *Classical, documented segmentation* (background percentile + noise-scaled
hysteresis + halo/grouping rules) instead of a trained segmentation net — there is no ground
truth to train or validate a net against, and every threshold here is inspectable and testable.
(2) *Learning where labels exist for free*: the overlay OCR is a CNN trained only on labels the
data provides (test-matrix dates, clock continuity), validated on held-out videos. (3) *DINOv2*
(self-supervised, no fine-tuning) for contextual similarity; loaded via `timm` (weights only, no
remote code). (4) Units are pixels / 8-bit counts / overlay display units — never millimetres
(no visible scale). (5) Per-frame QA flags instead of silent filtering; "2nd view" monitor
recordings are skipped with a reason. (6) Output = `public/data/<acc>/vision/` (index, per-video
series at 5 Hz, lazily loaded contours, keyframe sprites); contract `src/types/vision.ts`;
access via `src/lib/vision`, `/api/vision`, AI tools `get_flame_analysis` / `rank_flame_metrics`
and the `setFlameOverlay` action. Ownership: `pipeline/vision/**`, `src/lib/vision/**`,
`src/components/vision/**`, `src/app/api/vision/**` and `public/data/*/vision/**` → Claude.

**ADR-018 · 2026-11-15 · accepted** (amends ADR-017) — **Frame search, 3D flame and 3D Lab.**
(1) *Contextual frame search*: DINOv2 embeddings of 1 Hz flame-visible frames, PCA-128 + int8
(`frame-index.bin`; recall@10 vs. full vectors recorded), cosine search server-side
(`/api/vision/similar`, tool `find_similar_frames`); results travel as an optional `gallery` on
`tool_result` events (contract `FrameGallery` in `src/types/ai.ts`) and render as clickable tiles.
(2) *3D flame*: built only from measured outlines; three models with stated assumptions — revolve
(axisymmetric; default for rods, spheres, candles in axial flow), extrude (planar samples, depth
illustrative), space-time (x, y, t; assumption-free), and for planar samples a two-camera
silhouette hull (video camera edge-on + Nikon still camera face-on, verified on B-series films where
the video shows both flame sheets and the still shows one): views normalised by flame length on
the shared flow axis, mirroring by profile correlation, frames paired by burn phase because the
cameras are not synchronised (Nikon clock offset by minutes). No mm scale (FlameBridge's rod-scale
study found the dark body is the holder). (3) *Lab 3D*: O₂ × √flow × log size scatter of
the measured runs with the query and the group envelope. (4) Peaks use frames fully inside the
view (igniter glow excluded); still-camera playback layouts are measured on the photo only
(vision v1.3.0). Deps: three, @react-three/fiber, @react-three/drei.

**ADR-019 · 2026-11-15 · accepted** (amends ADR-018) — **Flame 3D Studio.** The 3D flame is a
volumetric *emission* reconstruction rendered by ray marching with bloom, not a coloured surface.
Axisymmetric samples (rods, spheres, candles): onion-peeling Abel inversion (Dasch 1992, Appl. Opt.
31:1146, DOI 10.1364/AO.31.001146) of every column of the current video frame, per colour channel,
optically thin assumption. Planar samples: side-view brightness spread across the Nikon face-view
silhouette preserving the side projection (two-camera) or through an illustrative depth (planar).
Pixels are linearised from sRGB, masked to the measured flame (main flame only; remote reflections
dropped); values are relative emission and clipped pixels are reported. "Auto" picks the valid model
per sample; the studio drives the viewer video so the reconstruction follows playback. Deps:
@react-three/postprocessing, postprocessing (bloom).

**ADR-020 · 2026-11-15 · accepted** — **"Orbital Glass" UI and a find → read → compare
information architecture** (full IA in [UX.md](UX.md)). The left rail and context bar are replaced
by a sticky glass top navigation (Atlas · Compare · Lab · Learn, ⌘K run search, Ask AI) and a
phone tab bar. The overview page becomes a landing page whose every figure is computed from the
published data (`src/lib/vision/landing.ts`) over drifting real flame posters (OSD blanked).
`/explore` becomes the **Atlas**: one facet set feeding three lenses (Gallery default, Map, Table;
`?view=`). The run page keeps the viewer on screen and moves analysis into tabs (Signals · 3D
Studio · Conditions & source) instead of one long scroll. Tokens: deeper `--bg` (#04060b),
translucent surfaces with backdrop blur, flame/plasma gradients; chart palettes stay valid because
the composited `--surface-2` (≈ #101623) is within 1 step of the validated #0f1520. Motion respects
`prefers-reduced-motion`. No dependency added.

**ADR-021 · 2026-11-15 · proposed** (contract) — **Pressure in the What-if Lab, without assumed values.**
Owner request: add cabin pressure to the system. The data does not record it: the PSI-25 BASS-II
test table and ReadMe give no pressure; the Ops procedure mentions only "adding GN2 to the WV to
reduce the O2 partial pressure"; the PSI-20 ACME BRE table says "The chamber pressures were also
varied but are not identified in this summary table." Decisions: (1) *Contract*:
`Conditions.pressureKpa?: number` + `pressureBasis?: "recorded" | "stated-for-series" |
"not-stated"` (absent = not stated); `LabParams.pressureKpa: number | null` (Zod default null, so
older params still parse); `LabMatch.deltas.pressureKpa`; `LabResult.pressure: PressureCoverage`
with the verbatim series statements. (2) *No assumed cabin pressure* for any run, ever; a pressure
query on today's data is reported as `not-recorded` and the Lab and the assistant say the query is
outside the envelope on pressure. (3) *Ratio scale*: pressures are compared by
r = max/min; matched r ≤ 1.10, near r ≤ 1.30 (retrieval choices, mirroring the FlameBridge
Katman 4 profiles). Pressure enters the distance only when at least one run states it
(term (|ln r| / ln(p_max/p_min))², weight 1), so today's ranking is unchanged. (4) *Derived ppO₂*
(Dalton) only for the query, or a run with both values stated. Code: `src/lib/science/pressure.ts`
(shared by the server matcher and the client matcher), tests `pressure.test.ts`. Follow-ups
(Codex): pipeline emits `pressureBasis: "not-stated"` explicitly; Lab pressure control design pass.

