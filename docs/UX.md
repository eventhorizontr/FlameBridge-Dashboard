# UX — Information architecture (ADR-020)

One question drives every screen: **which burn, and what did it do?** The product is built
around that loop — *find a run → read it → put it in context* — and every page is one step of it.
Nothing appears on a page unless it serves that page's step.

```
            Landing  /
               │  "Open the Atlas" · "Ask the research AI"
               ▼
  ┌──────── Atlas  /explore ────────┐        ⌘K global search (runs, PIs, fuels, commands)
  │ facets → one filtered set       │        Ask AI (dock, every page, sees current run + time)
  │ lenses: Gallery · Map · Table   │
  └───────────────┬─────────────────┘
                  │ open a run
                  ▼
        Run  /experiments/[id]
        header: identity + glance strip + actions
        viewer: footage with flame-vision overlays
        tabs:   Signals · 3D Studio · Conditions & source
           │                 │
           │ Compare vs …    │ Open in What-if Lab
           ▼                 ▼
   Compare  /compare     Lab  /lab           Learn  /learn (guided chapters on real runs)
```

## Pages

| Page | Job | Contents (and only these) | Exits |
|---|---|---|---|
| **Landing** `/` | Say what this is in 5 s, prove it is real, route people in | Hero over drifting real flame posters; 4 live counts (runs, frames analysed, flames indexed, OCR read rate) computed from the data; three ways in; the pipeline; "science you can check" (audits, DOIs, limits); the experiment & PIs | Atlas, Run, Lab, Compare, Learn, AI |
| **Atlas** `/explore` | Find a run | Facets (PI, material, geometry, flow direction, O₂, airflow, video, QA, text) filter one set; three lenses on it: **Gallery** (real peak flame per measured run, default), **Map** (O₂ × airflow, brush to select), **Table** (all telemetry, sortable, compare checkboxes). Lens kept in `?view=` | Run, Compare |
| **Run** `/experiments/[id]` | Understand one burn | Glass header: run id, PI, sample, QA, date, DOI chip, actions (Compare, What-if, Ask AI) and a *glance strip* (fuel, O₂, airflow, size, footage). Viewer always on screen. Tabs instead of a long scroll: **Signals** (vision KPIs, keyframes, time series, similarity map, similar frames), **3D Studio**, **Conditions & source** (gas readings, fuel, hardware, QA flags, verbatim PSI row) | Compare, Lab, AI, Atlas |
| **Compare** `/compare` | Put 2–4 runs side by side | Slots, curated presets, synced footage with per-video overlays, condition differences | Run |
| **Lab** `/lab` | "What if…?" without inventing results | Sliders inside the measured envelope, nearest real runs, envelope map / 3D space / table | Run, Compare |
| **Learn** `/learn` | Teach the physics on real footage | 5 chapters, quizzes, featured run viewer | Run, Compare |

## Global

- **Top navigation** (glass, sticky): Atlas · Compare · Lab · Learn, search pill (⌘K), active filter
  summary, undo, Expert/Learn mode, *Ask AI*. Phones get a 4-tab bottom bar.
- **⌘K** searches the run directory (test id, PI, fuel) as well as commands, so any run is two
  keystrokes away from any page.
- **AI dock** is global and context-aware (current run and video time travel with each request); it
  drives the same store the UI uses, so every answer can become a view.

## Audiences

- *Academics*: Expert mode default; Table and Conditions tab expose verbatim source cells and QA
  flags; units and provenance on every number; methods behind disclosure triangles, never hidden.
- *Public*: Learn mode rewrites copy in plain language; the Gallery and the landing lead with the
  footage itself; Learn chapters are one click from every run.
