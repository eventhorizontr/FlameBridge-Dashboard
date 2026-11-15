# Demo walkthrough — FlameBridge (Event Horizon)

*Bridge the unknown.* NASA Space Apps Challenge 2026 · Flame in Freefall.

## Guided example (one real scenario, ~1 min)

Source → condition → reasoning → validation need. Every step uses real PSI-25 data.

1. **Open the source.** `/explore` → open run **B3** (its footage also has a local fallback
   clip, so it plays even if NASA's video server is slow). The conditions strip shows its O₂,
   airflow and sample; the DOI chip opens the NASA PSI-25 record; the raw cell is one click away.
2. **Change the condition.** Open the **What-if Lab** (`/lab`) and choose *exploration
   atmosphere (34 % O₂ · 56.5 kPa, NASA/TP-2010-216134)* from the command palette (⌘K / Ctrl K).
3. **See the reasoning.** The Lab lists the closest *real* runs with per-feature differences
   (O₂, airflow, size, material, geometry) and plots the query on the measured O₂ × airflow map.
4. **Find the validation need.** The query is outside the measured envelope: no run went that
   high in O₂, and no PSI-25 run states a pressure. The Lab says so — this is the gap a new test
   would have to close, not an answer.

## Full demo script


Target: **3 minutes**, live on the deployed site, one presenter driving, one narrating.
Everything shown is real NASA PSI-25 (BASS-II) data or footage; say so once, early.

## 0 · Before you go on (T−10 min)

- [ ] Open the production URL in a fresh window, 1440 × 900, browser zoom 100 %.
- [ ] `/api/ai/providers` shows OpenAI `available: true`.
- [ ] Warm the AI once: ask "How many runs are in the dataset?" and wait for the answer.
- [ ] Open `/experiments/PSI-25%3AO13a` once so the NASA video URL is warm.
- [ ] Close the assistant, clear its conversation (trash icon), return to `/`.
- [ ] Backup tab: same flow on `http://localhost:3000` (`pnpm build && pnpm start`).

## 1 · The problem (0:00–0:25) — `/` → `/overview`

> "NASA flew 129 solid-fuel fires on the Space Station. The evidence sits in spreadsheets,
> PDFs and 296 videos. Engineers can't compare conditions and students can't see why
> fire behaves differently in space. FlameBridge turns that archive into one instrument."

Start on the landing page, click **Go to dashboard**, then point at the live ISS footage and the stat strip on Home (129 runs, 6 PIs, O₂ envelope, 123 with video).
Mention the DOI chip: *every number on screen traces to the NASA source.*

## 2 · Explore real experiments (0:25–1:05) — `/explore`

1. Click **Explore 129 runs**. Facet: **PMMA** → **rod**. The scatter and matrix update together.
2. Drag-brush a cluster in the O₂ × airflow scatter, then point at a QA chip:
   > "We never hide bad data: implausible cells become '—' with the reason, and the raw cell
   > is one click away."
3. Double-click **O13a** → the flame viewer. Press **→** a few times: frame-by-frame NASA footage
   with the recorded airflow sequence 5 → 2 → 0 cm/s underneath.
4. **Flame vision** (toolbar above the video): *Frame* → *Outline* → *Flame only* → *Follow flame*.
   > "179 of the 296 ISS video files were measured by computer vision: the flame is framed,
   > measured in pixels, and the telemetry burned into the picture — duct airflow, fan, radiometer —
   > was read back by a small neural network trained only on labels the data itself provides."
   Point at the flame strip under the timeline, then scroll to **Flame Geometry, Telemetry & Frame
   Similarity**: area, RAD and AIR in sync with the playhead, the DINOv2 similarity map and its phases.

## 3 · The AI drives the dashboard (1:05–1:55) — assistant panel

Open **Research AI** (⌘K → "Ask AI" also works). Type, in this order:

1. *"Filter the explorer to PMMA rods below 17% oxygen that have video."*
   → watch the filters, URL and count change by themselves; the timeline shows each step.
2. *"Compare B3 and O13a side by side."* → it opens `/compare` with synchronized footage.
   *(Alternative, 20 s)* *"When was the flame in M2 largest and what did the radiometer read? Show only
   the flame."* → `get_flame_analysis` + open run, seek to the peak, *Flame only* overlay.
3. Click **Undo turn** → the dashboard rewinds. > "Every AI action is visible and reversible."

Point at the evidence chips: answers cite the exact runs; the model badge shows `gpt-6.1-sol`.

## 4 · What-if, without fabricating science (1:55–2:35) — `/lab`

Ask: *"What would happen to a 10 mm PMMA rod at 16 % oxygen and 8 cm/s? Set up the Lab."*

> "Most tools would invent an answer. We refuse to. The Lab finds the closest **real** ISS runs,
> shows exactly how they differ, and warns when you leave the measured envelope."

Show the envelope map and the top matches (P8's operator note "would not stay lit" is real).
Drag O₂ to 30 % → the **outside measured envelope** warning appears.

## 5 · Guided mode (2:35–2:55) — `/learn`

Switch to **Guided**. The Learn Academy opens; show mission 1 and one quiz answer.
> "Same data, explained for students — every claim cites a peer-reviewed paper or the run itself."

## 6 · Close (2:55–3:00)

> "Real NASA data end to end, an AI that operates the instrument instead of making things up,
> and a pipeline that already ingests a second investigation (PSI-20). FlameBridge — bridge the unknown."

## If something fails

| Symptom | Do this |
|---|---|
| NASA video does not load | Run B3, O1 and T1 have local fallback clips. Open B3 from `/learn`. Say the footage streams live from NASA S3. |
| AI slow (> 20 s) or rate-limited | Keep talking through the timeline. If the error card appears, switch the provider or show the pre-warmed conversation in the backup tab. |
| Production site down | Switch to the backup localhost tab. Nothing in the flow needs a login. |

## Judging criteria → where it shows

| Criterion | Evidence in the demo |
|---|---|
| Impact & clarity | Step 1 problem statement, Learn mode |
| Scientific rigour | QA chips, raw cells, envelope warning, citations with DOIs; vision QA flags, OCR audit (AIR vs. test-matrix set-points), pixels never shown as mm |
| Design excellence | Orbital Instrument UI, responsive, WCAG 2.1 AA (axe: 0 violations) |
| Working AI agent operating the UI | Step 3: filters, navigation, compare, undo, What-if setup |
| Real NASA data end to end | PSI API → pipeline → validated JSON → live S3 footage |
