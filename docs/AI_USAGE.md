# AI usage

Where AI is used in FlameBridge, what it is limited to, and what a human checks.

## 1. Inside the product

### Research assistant (`src/lib/ai/`, `/api/ai`)

| | |
|---|---|
| Models | OpenAI `gpt-6.1-sol` (default, Responses API) or Anthropic `claude-opus-5-5` (optional), switchable per request (ADR-015). Overridable with `OPENAI_MODEL` / `CLAUDE_MODEL`. |
| Job | Answer questions about the loaded dataset and drive the dashboard (filter, open, compare, seek video, set up the Lab, switch mode). |
| Where it runs | Server only. Keys never reach the browser. Replies stream as NDJSON. 20 requests per 5 minutes per client. |
| What it can read | Read-only tools over the same data the page shows: `dataset_overview`, `search_experiments`, `get_experiment`, `compare_experiments`, `find_closest_experiments`, `list_sources`, `get_flame_analysis`, `get_flame_at_time`, `find_similar_frames`, `rank_flame_metrics`, `get_learn_modules`. |
| What it can do | One UI tool, `dashboard_actions`. The server validates every action with Zod and against known run, video and module ids before the browser applies it. Every applied action is shown in the panel and can be undone, including a whole turn. |
| Limit | At most 8 tool steps per turn. |

**Source limits (system prompt, `src/lib/ai/system-prompt.ts`).** Every number, run id, date or
condition must come from a tool result in the conversation. If the data does not hold the
answer, the assistant must say so. `null` means missing, never zero. It may explain general
combustion physics but must keep that apart from what the dataset shows. It cannot predict an
experiment that was not flown: "what if" questions go to `find_closest_experiments`, and an
out-of-envelope query must be called out. Image-derived values stay in pixels.

**Without an API key.** `GET /api/ai/providers` reports which providers have a key; the panel
offers only those and says why the others are off. Every other feature works with no key. There
is no mock or template mode: the app never shows canned AI output as if it were an analysis.

### Computer vision (`pipeline/vision/`, offline)

- **Overlay OCR:** a small CNN trained in this repo (`train_osd.py`) on labels derived from the
  NASA test matrix and clock continuity, with no hand labels. Held-out accuracy is in
  `pipeline/vision/assets/osd-glyph-cnn.report.json`.
- **Frame similarity:** DINOv2 ViT-S/14 (Oquab et al. 2024, arXiv:2304.07193), pretrained
  weights loaded through `timm` as safetensors. Used for "frames like this one" only; the UI says
  similarity is visual, not physical equivalence.

## 2. Building the product

The code and docs were written by AI coding agents under the direction of the human owner and
team (see [AGENTS.md](../AGENTS.md)):

- **Claude Code** (Anthropic, Claude Opus) — tech lead: contracts, AI agent, store, app shell,
  docs, reviews and merges.
- **OpenAI Codex** — data pipeline, science module, visualisations, Lab, Learn track.
- **Antigravity** — UI work until 2026-11-15 (ADR-016).

Commits carry an `Agent:` trailer. Work runs through GitHub issues and pull requests;
decisions are logged in [DECISIONS.md](DECISIONS.md).

## 3. Human control

| Checked by a human | Not checked by a human |
|---|---|
| Product scope, design direction and every merge decision (owner requests are recorded in the ADRs) | Each line of generated code (reviewed by the lead agent; CI must be green) |
| What the demo shows, against the live app | Flame segmentation frame by frame (no hand-labelled ground truth) |
| | Each AI answer at runtime: users verify through the evidence chips and run links |

## 4. Evaluation

What runs today is listed in [METHODS_AND_VALIDATION.md](METHODS_AND_VALIDATION.md): tool
semantics, action validation against known ids, error handling and rate limiting are tested in
`src/lib/ai/ai.test.ts`. **There is no fixed question set that scores answer quality yet** —
that is planned (missing fields, ambiguous units, out-of-scope questions).

## 5. Generated media

The repository contains no AI-generated images, video, voice-over or music. If the
presentation uses generated scenes, they are listed in [MEDIA_CREDITS.md](MEDIA_CREDITS.md).
