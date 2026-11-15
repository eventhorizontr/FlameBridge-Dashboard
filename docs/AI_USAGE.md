# AI usage

What we used AI for, which tool or model did it, what it is limited to, and what a human or a
test checks. Nothing here is hidden behind the word "AI": each row names the job.

## NASA Space Apps SI disclosure, rule by rule

NASA Space Apps asks teams to state clearly where and how SI (AI) tools were used.

| Rule | Status in this project | Where it is marked |
|---|---|---|
| **Images and videos** made with SI must carry a visible watermark | The [demo video](https://youtu.be/5k1sTZwlpyk) contains SI-generated visual scenes. They are labelled with YouTube's altered or synthetic content label and acknowledged in the video description. The video carries no in-frame watermark. Apart from that video, which is embedded on the landing page, and its two poster frames, the repository and the app contain no SI-generated image or video. Screen mockups made with SI were design references only and are not in the repository. The logo and brand assets were designed by the team by hand. Flame footage and stills are NASA PSI-25 recordings. Screenshots are captures of the running app. Flame outlines and overlays are drawn by deterministic code | YouTube content label, video description, [MEDIA_CREDITS.md](MEDIA_CREDITS.md) |
| **Audio** made with SI must be acknowledged in descriptive text and metadata | The demo video contains SI-generated audio, acknowledged in the video description and in the video's YouTube metadata. The repository contains no audio | Video description, [MEDIA_CREDITS.md](MEDIA_CREDITS.md) |
| **Code** made with SI must be acknowledged in descriptive text and metadata | The code and documentation were written with SI coding agents under human direction | Text: this file and the README. Metadata: the pull-request merge commits made by the agents carry an `Agent:` line, and many also a `Co-authored-by` line naming the model. Documentation commits after the build (from 2026-11-15 23:47 +03:00) were uploaded directly and carry no such line. They were also prepared with SI assistance |
| **Data** made with SI must be acknowledged in descriptive text and metadata | Image-derived data in `public/data/*/vision/` uses two models: overlay telemetry is read by a CNN, and frame similarity uses DINOv2. NASA table values are parsed by rule-based code, with no SI | Text: this file and the vision README. Metadata: each per-video analysis file (`<id>.json`) and `index.json` record the pipeline name and version, `frame-index.json` names the DINOv2 model, and the UI labels these values "image-derived" |
| **Generated content may not use NASA branding** | No NASA logo, insignia, flag or mission identifier is used anywhere | [MEDIA_CREDITS.md](MEDIA_CREDITS.md) |

All data, sources and tools are listed in [RESOURCES.md](../RESOURCES.md).

## 1. At a glance: what for, what we used

| Job | What we used | Where | Limit and check |
|---|---|---|---|
| Answer questions about the dataset and operate the dashboard | OpenAI `gpt-6.1-sol` (default) or Anthropic `claude-opus-5-5` (optional) | Research AI panel, server route `/api/ai` | Reads only through 11 read-only tools. One UI tool, validated on the server. At most 8 tool steps per turn. Tool semantics and action validation are tested in `src/lib/ai/ai.test.ts` |
| Read the telemetry text burned into ISS video (air, fan, radiometer, clock) | A small CNN trained in this repository (`pipeline/vision/train_osd.py`) | Offline pipeline | Trained with no hand labels. 99.98 % character accuracy on 16 404 held-out characters from 26 unseen videos |
| Find frames that look alike, mark image phases | DINOv2 ViT-S/14, pretrained (Oquab et al. 2024, arXiv:2304.07193), through `timm` | Offline pipeline | Visual similarity only. The UI states it is not physical equivalence |
| Write code and documentation | Claude Code, OpenAI Codex, Antigravity (until 2026-11-15) | This repository | Human owner sets scope and decides every merge. Lint, typecheck, tests and build must pass |
| SI-generated visual scenes and audio in the demo video | Scenes labelled with YouTube's altered or synthetic content label | [Demo video](https://youtu.be/5k1sTZwlpyk) | Acknowledged in the video description. Uses no NASA logo, insignia, flag or mission identifier |
| Screen mockups used as design references | OpenAI Codex | Design process ([UX.md](UX.md)) | The shipped UI is code, not generated images |
| Literature search and drafting of the submission text | Claude | Project submission | Every cited claim was checked against its opened source (AI-assisted, reviewed by the team) |

## 2. What AI does not do

- **It does not decide the science.** Matching, the measured-envelope check, pressure handling
  and missing-value handling are plain code in `src/lib/science/`, with tests.
- **It does not predict.** There is no model that forecasts spread rate, extinction or any
  outcome. The What-if Lab retrieves real tests.
- **It does not parse the NASA tables.** Parsing uses explicit per-column rules in
  `pipeline/build_psi25.py`.
- **It does not measure the flame.** Flame segmentation is classical background subtraction
  (`pipeline/vision/segment.py`), not a learned model.
- **No AI-generated media beyond the demo video.** Apart from the demo video (embedded on the
  landing page, with two poster stills in the repository), the repository and the app contain no
  AI-generated images, video, voice-over or music ([MEDIA_CREDITS.md](MEDIA_CREDITS.md)).
  Mockups were design references only.

## 3. The research assistant in detail (`src/lib/ai/`, `/api/ai`)

| | |
|---|---|
| Models | OpenAI `gpt-6.1-sol` through the Responses API (default) or Anthropic `claude-opus-5-5` (optional), switchable per request (ADR-015). Overridable with `OPENAI_MODEL` / `CLAUDE_MODEL` |
| Where it runs | Server only. Keys never reach the browser. Replies stream as NDJSON |
| Read-only tools (11) | `dataset_overview`, `search_experiments`, `get_experiment`, `compare_experiments`, `find_closest_experiments`, `list_sources`, `get_flame_analysis`, `get_flame_at_time`, `find_similar_frames`, `rank_flame_metrics`, `get_learn_modules` |
| UI tool (1) | `dashboard_actions`. The server validates every action with Zod and against known run, video and module ids before the browser applies it. Every applied action is shown in the panel and can be undone, including a whole turn |
| Step limit | At most 8 tool steps per turn |
| Usage limits | 10 questions per visitor IP on the public deployment (ADR-028), plus a burst limit of 20 requests per 5 minutes. Cross-site requests are refused |

**Rules in the system prompt** (`src/lib/ai/system-prompt.ts`):

- Every number, run id, date or condition must come from a tool result in the conversation.
- If the data does not hold the answer, the assistant must say so.
- `null` means missing, never zero.
- General combustion physics may be explained, kept apart from what the dataset shows.
- It cannot predict an experiment that was not flown. "What if" questions go to
  `find_closest_experiments`, and an out-of-envelope query must be called out.
- No run states a pressure, so it must never assume a cabin pressure for a run.
- Image-derived values stay in pixels and are named as image-derived.

**Without an API key** every other feature works. The panel says which provider is off and why.
There is no mock mode: the app never shows canned text as if it were an analysis.

## 4. The vision models in detail (`pipeline/vision/`, offline)

- **Overlay OCR.** Labels come from the NASA test-matrix dates and from clock continuity, so no
  frame was labelled by hand. The held-out set is split by video. Accuracy per character class is
  in `pipeline/vision/assets/osd-glyph-cnn.report.json`. This is the same campaign and overlay
  font, so it is not an independent validation on other footage.
- **Frame similarity.** DINOv2 weights are loaded as safetensors through `timm`, with no remote
  code. Embeddings are computed once. The app only reads the stored results.

## 5. How the repository was built

The code and documentation were written by AI coding agents under the direction of the human
owner and team (see [AGENTS.md](../AGENTS.md)).

| Agent | Role |
|---|---|
| Claude Code (Anthropic) | Tech lead: contracts, AI agent, store, app shell, vision layer, Learn Academy components, docs, reviews and merges |
| OpenAI Codex | Data pipeline, science module, visualisations, Lab, Learn routes |
| Antigravity | UI work until 2026-11-15 (ADR-016) |

Pull-request merge commits made by the agents carry an `Agent:` line. Work runs through GitHub issues and pull requests. Decisions
are logged in [DECISIONS.md](DECISIONS.md), and the hand-offs between agents are kept in
[docs/coordination/](coordination/PROTOCOL.md).

## 6. Human control

| Checked by a human | Not checked by a human |
|---|---|
| Product scope, design direction and every merge decision (owner requests are recorded in the ADRs) | Each line of generated code (reviewed by the lead agent, and the checks must pass) |
| What the demo shows, against the live app | Flame segmentation frame by frame (no hand-labelled ground truth) |
| | Each AI answer at runtime: users verify through the evidence chips and run links |

## 7. Evaluation, and what is still missing

What runs today is listed in [METHODS_AND_VALIDATION.md](METHODS_AND_VALIDATION.md): tool
semantics, action validation against known ids, error handling, rate limiting and the question
quota are tested in `src/lib/ai/ai.test.ts` and `src/lib/ai/quota.test.ts`.

**There is no fixed question set that scores answer quality yet.** It is planned, covering
missing fields, ambiguous units and out-of-scope questions.
