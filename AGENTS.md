# AGENTS.md — Fire in Freefall · Shared Agent Constitution

> Read this file completely before every task. It is the contract between the three AI
> engineers on this repo — **Claude Code (lead)**, **OpenAI Codex**, **Google Antigravity** —
> and the human owner. Tool-specific files (`CLAUDE.md`, `GEMINI.md`, `.agent/rules/`) only
> add a role on top of this; they never override it.

## 1. Mission

An AI-powered, NASA-grade interactive dashboard for the **2026 NASA Space Apps Challenge –
"Fire in Freefall"**. It turns NASA microgravity combustion data — starting with **PSI-25
(BASS-II, PMMA burns on the ISS)** — into a visually extraordinary, scientifically honest web
platform with two modes (**Expert** / **Explore & Learn**), a **Visual What-if Lab**, and an
**agentic AI assistant** that can drive the UI. Full spec: [docs/PRODUCT.md](docs/PRODUCT.md).

**Timeline: 24-hour continuous build** (ADR-011) — T0 2026-11-14 21:00 (+03:00) → submission
2026-11-15 21:00 (+03:00), code freeze 19:00. Small PRs, fast reviews, no idle waiting: build on
fixtures/contracts and integrate later.

## 2. Non-negotiable rules

1. **Never fabricate science.** No invented data points, curves, rates or citations. Every
   number shown must trace to a PSI file, a documented calculation in `src/lib/science/`, or a
   peer-reviewed source with DOI. Missing ⇒ show "—" + reason. The What-if Lab *matches* real
   experiments; it never simulates results it presents as measured.
2. **English-only UI and code.** (Chat with the human owner may be Turkish.)
3. **Contract first.** Data shapes live in `src/types/` and `docs/DATA.md`. Do not change a
   contract in a feature PR — open a `contract` PR owned by Claude.
4. **Stay in your lane.** Edit only paths your role owns (§5). Need a change elsewhere? Open an
   issue labelled `needs:<agent>` or write a handoff note — do not edit it yourself.
5. **Small, reviewed PRs into `main`.** No direct pushes to `main`. No force-push to others'
   branches. One issue ⇒ one branch ⇒ one PR.
6. **Green before review:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass.
7. **Design quality is a feature.** Follow [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
   Use tokens, never ad-hoc hex values or magic spacing.
8. **No secrets in git.** Keys go in `.env.local` (gitignored) and Vercel env; document new
   variables in `.env.example`.
9. **Dependencies:** adding a package requires a one-line justification in the PR body. Only
   one open PR may touch `package.json`/`pnpm-lock.yaml` at a time (label `deps`).

## 3. Sync protocol (summary — full version in [docs/coordination/PROTOCOL.md](docs/coordination/PROTOCOL.md))

```
START  git pull → read docs/coordination/status/*.md → pick an issue assigned to you
       → comment "claimed by <agent>" → branch <agent>/<issue#>-<slug>
WORK   commit often (Conventional Commits) → stay inside owned paths
FINISH update docs/coordination/status/<agent>.md → push → open PR with template
       → if another agent must act, add docs/coordination/handoffs/<date>-<from>-to-<to>-<slug>.md
```

GitHub Issues are the **single source of truth** for work. Labels: `agent:claude`,
`agent:codex`, `agent:antigravity`, `needs:<agent>`, `blocked`, `contract`, `deps`,
`area:*`, `priority:p0..p2`. Milestones = sprints.

## 4. Stack (decided — see [docs/DECISIONS.md](docs/DECISIONS.md))

| Layer | Choice |
|---|---|
| App | Next.js 16 App Router, React 19, TypeScript strict, pnpm |
| Styling | Tailwind CSS v4 + CSS design tokens (`src/app/globals.css`) |
| Motion | `motion` (Framer Motion) |
| Charts | D3 (`d3-scale`, `d3-shape`, `d3-array`) rendered with React SVG/Canvas — bespoke, not chart-kit defaults |
| 3D / flame | React Three Fiber + custom GLSL (added when the flame viewer lands) |
| State | Zustand (`src/lib/store/`) — the **only** way UI state changes, so the AI can drive it |
| URL state | `nuqs` (shareable views) |
| Validation | Zod (contracts + AI tool schemas) |
| AI | Switchable providers (ADR-015): OpenAI via `openai` (Responses API, `gpt-6.1-sol`, default) and Claude via `@anthropic-ai/sdk` (`claude-opus-5-5`, optional), one interface in `src/lib/ai/providers/` |
| Data pipeline | Python (stdlib-first) in `pipeline/` → runs locally or in Google Colab → JSON in `public/data/` |
| Video | Streamed from NASA S3 via `/api/psi/file/{accession}/{id}` (302 → presigned URL, CORS `*`) |
| Tests | Vitest (TS), `python -m unittest` (pipeline) |
| Deploy | Vercel, no login |

## 5. Ownership map (who may edit what)

| Path | Owner | Others |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agent/`, `docs/**`, `.github/**` | **Claude** | propose via issue |
| `src/types/**` (contracts), `src/config/**`, `src/lib/store/**`, `src/lib/ai/**`, `src/app/api/ai/**` | **Claude** | — |
| `src/app/layout.tsx`, `src/app/globals.css` (tokens) | **Claude** | Antigravity may PR token *additions* |
| `pipeline/**`, `data/**`, `public/data/**`, `public/media/**` (fallback clips, ADR-014) | **Codex** | — |
| `src/lib/data/**`, `src/lib/science/**`, `src/lib/psi/**`, `src/app/api/psi/**` | **Codex** | — |
| `pipeline/tests/**`, tests for data/science | **Codex** | everyone runs |
| `<module>.test.ts` next to a module | that module's owner | Codex may add cases |
| `src/components/**`, `src/app/(dashboard)/**`, `src/app/(learn)/**`, `src/app/page.tsx`, `public/brand/**` | **Antigravity** | — |
| `docs/coordination/status/<agent>.md` | that agent | — |
| `docs/coordination/handoffs/**` | anyone (append-only) | — |

## 6. Repo map

```
pipeline/            Python: PSI client + dataset builders (Colab-ready)
data/raw/<acc>/      small verbatim source files (provenance, CC0)
public/data/<acc>/   built JSON consumed by the app (manifest.json, experiments.json, …)
src/types/           CONTRACTS
src/lib/data/        typed loaders + queries over public/data
src/lib/science/     validated calculations (each with formula, units, citation, tests)
src/lib/store/       Zustand dashboard store + action registry (AI-drivable)
src/lib/ai/          agent loop, tool definitions, providers, system prompt
src/components/      ui/ (primitives) · viz/ (charts, flame) · lab/ (What-if) · ai/ (assistant) · layout/
src/app/             routes; api/psi (data proxy), api/ai (agent endpoint)
docs/                PRODUCT · ARCHITECTURE · DESIGN_SYSTEM · DATA · DECISIONS · coordination/
```

## 7. Commands

```bash
pnpm dev            # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
python -I pipeline/build_psi25.py .     # rebuild PSI-25 data (network)
```

## 8. Definition of Done

- Acceptance criteria in the issue are met and demonstrated (screenshot/GIF for UI).
- Lint, typecheck, tests, build green. No `any`, no `@ts-ignore` without a comment.
- Responsive at 360 px, 768 px, 1440 px; keyboard reachable; respects `prefers-reduced-motion`.
- Scientific values carry units and source; nulls rendered honestly.
- Status file updated; follow-ups filed as issues.

## 9. Conventions

- Conventional Commits: `feat(viz): …`, `fix(pipeline): …`, `docs: …`, `chore(deps): …`.
  Add a trailer `Agent: claude|codex|antigravity` to every commit.
- Files `kebab-case.tsx`; components `PascalCase`; hooks `useThing`; no default exports except
  Next.js route files.
- Units in identifiers: `o2Pct`, `flowCmS`, `thicknessMm`, `spreadRateMmS`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
