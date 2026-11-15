# UX: information architecture (ADR-022)

**Process.** A planning agent audited the live UI at 1440 and 390 px. Codex generated a mockup for each screen from the planner's briefs. Claude then built the UI from those mockups, keeping the existing tokens and look.

**Loop.** Every screen is one step of: *find a run → understand it → put it in context.*

## Pages

| Route | Rail label | Job | Above the fold | Primary action |
|---|---|---|---|---|
| `/` | Home | Explain and invite | Question headline, real flame posters, computed numbers | Explore the burns → `/explore` |
| `/explore` | Runs | Find runs | Toolbar, filter sidebar, table + side map (≥1400 px) | Open a run / Compare selected |
| `/experiments/[id]` | (Runs) | Understand one burn | Header + actions, conditions strip, video at peak flame, Flame at a glance | Play / Compare / Find runs like this |
| `/compare` | Compare | See what differs | Synced videos at the latest first flame | Play all |
| `/lab` | Lab | "Is there a real burn like this?" | Conditions, verdict, closest runs | Preview footage / Inspect |
| `/learn` | Learn | Guided understanding | Chapter stepper, reading, video | Next chapter |

## Page notes

**Home.**
- Has its own top navigation, with no rail.
- Hero posters are the measured peak frames, picked by burn duration per fuel family.
- Every number on the page is computed in `src/lib/vision/landing.ts`.

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
- The closest runs and their footage come first; the map comes last, with axes on the data range.
- Pressure (ADR-021) sits under "More".
- The physics narration appears in Guided mode only.

## Global

- **Rail:** Home · Runs · Compare · Lab · Learn. A bottom tab bar is used on phones.
- **Top bar:** breadcrumb, filter pill, undo, Expert ⇄ Guided, ⌘K, Research AI.
- **Mode:** "Explore & Learn" is renamed **Guided**. This is a label only; the `UserMode` value stays `learn`.
- **Text budget:**
  - Page headline: ≤ 4 words, plus one sentence.
  - Implementation words are not used in eyebrows.
  - Method text sits behind disclosures.
