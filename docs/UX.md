# UX: information architecture (ADR-022, ADR-025)

**Process.** A planning agent audited the live UI at 1440 and 390 px. Codex generated a mockup for each screen from the planner's briefs. Claude then built the UI from those mockups, keeping the existing tokens and look.

**Loop.** Every screen is one step of: *find a run → understand it → put it in context.*

## Pages

| Route | Rail label | Job | Above the fold | Primary action |
|---|---|---|---|---|
| `/` | (landing) | Explain and invite | FlameBridge headline, ISS flame sequence, computed figures | Go to dashboard → `/overview`; Explore runs · Compare · What-if Lab |
| `/overview` | Home | Orient | Hero with real footage at peak flame, dataset figures, apparatus | Explore runs / Lab / Ask the Research AI |
| `/explore` | Runs | Find runs | Toolbar, filter sidebar, table + side map (≥1400 px) | Open a run / Compare selected |
| `/experiments/[id]` | (Runs) | Understand one burn | Header + actions, conditions strip, video at peak flame, Flame at a glance | Play / Compare / Find runs like this |
| `/compare` | Compare | See what differs | Synced videos at the latest first flame | Play all |
| `/lab` | Lab | "Is there a real burn like this?" | Verdict, Conditions + live map side by side | Move a slider, watch the map |
| `/learn`, `/learn/<module>` | Learn (Guided mode only) | Learn Academy for younger learners | Hero, world picker, mission map | Launch mission |

## Page notes

**Landing (`/`).**
- The owner's FlameBridge design (ADR-023), outside the AppShell, with its own bar.
- "Go to dashboard" opens Home; section links open Runs, Compare and the Lab directly.
- Figures are computed in `src/app/page.tsx` from the data.

**Home (`/overview`).**
- The hero clip starts on its measured steady-peak frame.
- The flame gallery shows the top 6 and links to Runs › Gallery.

**Runs.**
- One filter set narrows the runs; Table, Map and Gallery show that same set.
- The current view is kept in `?view=`.
- Runs that cannot be plotted are listed on one line.

**Run.**
- The video opens on the steady-peak frame (vision poster time) instead of the dark pre-ignition frame. A seek from the AI or the store wins.
- The conditions strip sits under the header.
- The image-derived numbers sit beside the video, labelled "px, not mm".
- Details are in tabs: Measurements · Similarity · 3D flame · Source & QA. Only the active tab mounts.

**Compare.**
- "What differs" comes directly under the videos, with differences only shown by default.
- It includes image-derived rows (first flame, visible, peak area, peak time).
- The set-point and O₂ charts appear only when there is something to draw.

**Lab.**
- "Where your query sits" is right of Conditions and stays in view while sliders move (pinned above
  them on phones). A live readout and axis guides follow the query; axes span the data range.
- The closest runs and the footage follow in the next row.
- Pressure (ADR-021) sits under "More".
- The physics narration appears in Guided mode only.

## Global

- **Rail:** Home · Runs · Compare · Lab · Learn (Learn only in Guided mode). The logo returns to the
  landing page. A bottom tab bar is used on phones.
- **Top bar:** breadcrumb (Runs › B1, Learn › M2), filter pill, undo, Expert ⇄ Guided, ⌘K, Research AI.
- **Brand:** FlameBridge, flame mark in `public/brand/`; favicon and app icons in `src/app/`.
- **Mode:** "Explore & Learn" is renamed **Guided**. This is a label only; the `UserMode` value stays `learn`.
- **Text budget:**
  - Page headline: ≤ 4 words, plus one sentence.
  - Implementation words are not used in eyebrows.
  - Method text sits behind disclosures.
