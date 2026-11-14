# Architecture

```
┌──────────────── NASA PSI (psi.nasa.gov) ────────────────┐
│ metadata API  ·  file tree API  ·  presigned S3 (CORS *) │
└───────┬────────────────────────────────────┬────────────┘
        │ pipeline/ (Python, local or Colab) │ runtime video streaming
        ▼                                    │
  data/raw/<acc>/  ──build──►  public/data/<acc>/*.json      │
  (verbatim, CC0)              (contract-validated)          │
        │  optional: heavy derived assets → Google Drive     │
        ▼                                                    ▼
┌──────────────────────── Next.js 16 app (Vercel) ────────────────────────┐
│ src/lib/data   typed loaders + query functions (pure, testable)         │
│ src/lib/science validated calculations (formula · units · DOI · tests)  │
│ src/lib/store  Zustand store + ACTION REGISTRY  ◄──────┐                │
│ src/components UI, D3 viz, flame viewer, lab           │ same actions   │
│ src/lib/ai     agent: system prompt, tools, provider ──┘                │
│ /api/ai        streaming agent endpoint (server tools)                  │
│ /api/psi/file  302 → fresh presigned S3 URL                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1. Data pipeline
- **Source of truth:** PSI public API (documented in `pipeline/psi_client.py`). Stdlib-only so
  the same code runs in Google Colab (`pipeline/notebooks/`).
- **Build:** `pipeline/build_<acc>.py` → `public/data/<acc>/manifest.json` (all files, grouped)
  and `experiments.json` (one record per run, contract in `src/types/experiment.ts`).
- **Integrity:** raw cells preserved; parse failures ⇒ null + QA flag; inferences listed.
- **Google Drive** ("Nasa Space Apps Data 2026"): working storage for Colab outputs that are too
  large for git (extracted frames, intermediate CSVs). The web app never depends on Drive at
  runtime; only small, final JSON/WebP derived assets are promoted into `public/data/`.
- **Video:** never re-hosted. `/api/psi/file/{acc}/{id}` resolves a presigned URL on demand
  (~1 h validity, CORS `*`, byte ranges) so `<video crossOrigin="anonymous">` can stream and
  draw frames to canvas for frame-by-frame analysis.
- **Scalability:** a new investigation = a registry entry in `src/lib/psi/config.ts` + a
  builder emitting the same contract. Loaders are keyed by accession.

## 2. Front end
- App Router; server components load JSON at build/request time and pass typed data down.
- **Store & action registry (`src/lib/store`)** — the backbone of "AI controls the UI":
  ```ts
  type DashboardAction =
    | { type: "setMode"; mode: "expert" | "learn" }
    | { type: "setFilters"; filters: Partial<ExperimentFilters> }
    | { type: "selectExperiments"; ids: string[] }
    | { type: "openExperiment"; id: string }
    | { type: "compare"; ids: string[] }
    | { type: "seekVideo"; experimentId: string; videoId: string; timeS: number }
    | { type: "setLabParams"; params: Partial<LabParams> }
    | { type: "navigate"; route: string }
    | { type: "highlight"; target: string };
  ```
  Each action has a Zod schema, a reducer, a human label ("Filtered to PMMA rods") and an
  inverse for undo. UI components and the AI dispatch the **same** actions.
- URL sync via `nuqs` for mode, filters, selection → every view is shareable.
- Viz: D3 for scales/shapes, React renders SVG (≤ 2k marks) or Canvas (more). Flame/3D: R3F.

## 3. AI agent
- Endpoint `POST /api/ai` (Node runtime, streaming SSE). **Two providers behind one
  `AiProvider` interface (`src/lib/ai/providers/`), switchable per request (ADR-012):**
  - `claude` (optional) — `@anthropic-ai/sdk`, model `claude-opus-5-5`,
    `thinking: {type: "adaptive"}`, `effort: "medium"`, streaming manual tool loop, cached
    system prompt; a `refusal` stop is surfaced as a polite decline.
  - `openai` (default, ADR-015) — `openai` SDK Responses API, model `gpt-6.1-sol` (`OPENAI_MODEL`),
    `reasoning.effort: medium`, streaming, turn state via `previous_response_id`.
  Both consume the same Zod tool definitions, system prompt and action validation; the agent
  loop is provider-agnostic. `GET /api/ai/providers` reports which providers have keys so the
  UI only offers working ones.
- **Server tools** (execute on server, read-only over our data):
  `search_experiments(filters)`, `get_experiment(id)`, `compare_experiments(ids)`,
  `find_closest_experiments(params, k)`, `compute(metric, args)` (only functions in
  `src/lib/science`), `list_sources(id)`, `get_publication(doi)`.
- **UI tool**: `dashboard_actions(actions: DashboardAction[])` is validated **on the server**
  (Zod + known run/video ids via the shared `checkReferences`) and streamed as an `actions`
  event; `useAssistant()` applies it with `dispatchMany(..., {source: "ai", groupId: turnId})`.
  No client-to-server round trip mid-turn (ADR-013).
- Wire format: NDJSON `AiStreamEvent` (`src/types/ai.ts`): start, text, tool_call,
  tool_result (summary + evidence), actions, done, error. Max 8 tool steps per turn.
- `find_closest_experiments` and `compute` are registered when #8 / `src/lib/science` land.
- Grounding: the system prompt carries the dataset summary + integrity rules; answers must cite
  evidence ids returned by tools. No tool ⇒ no number.
- Keys: `OPENAI_API_KEY` (and optional `ANTHROPIC_API_KEY`) in Vercel env only. Rate limiting
  per IP on `/api/ai` since there is no login.

## 4. What-if Lab matching
Feature vector per run: O₂ % (initial), representative flow (median of set-points), material,
geometry, characteristic size (thickness or diameter). Distance = weighted, range-normalized
Euclidean on numeric features + categorical mismatch penalties; weights documented in
`src/lib/science/matching.ts`. Output: top-k with per-feature deltas and an "envelope"
score (is the query inside the convex hull of measured runs?). Never interpolates outcomes.

## 5. Quality
CI (GitHub Actions): lint · typecheck · vitest · build · pipeline unit tests. Preview deploys
per PR on Vercel. Lighthouse ≥ 90 performance/accessibility on the overview page.
