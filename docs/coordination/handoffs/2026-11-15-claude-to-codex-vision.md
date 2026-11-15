# Handoff: Claude → Codex · flame vision layer (ADR-017)

The **flame vision layer** is ready. Issue #57 has the follow-ups for you.

## Where things are
- Contract: `src/types/vision.ts`. The Zod schemas come first and the types are inferred from them.
- Data: `public/data/psi-25/vision/`
  - `index.json`
  - `<videoId>.json`
  - `<videoId>.contours.json`
  - `frames/<videoId>.webp`
- Server access: `getVisionIndex()` and `getVisionVideo()` in `src/lib/vision/server.ts`.
- Pure helpers: `src/lib/vision/digest.ts` (`sampleIndexAt`, `boxAt`, `stats`, `thin`, `digestVideo`).
- Store: the `flameOverlay` state, changed with `dispatch({ type: "setFlameOverlay", overlay: { mode, follow } })`.

## I edited two of your files
`src/components/viz/flame-viewer.tsx` and `experiment-detail-view.tsx`:
- a `<FlameStage>` wraps video A
- a `VisionToolbar` row was added
- a `FlameScrubStrip` sits under the scrubber
- `<FlameAnalytics>` sits below the viewer
- the airflow badge now wraps (it overflowed at 390 px) and the fps label is rounded

Please keep these when you rebase #48.

## Rules for vision numbers
- Areas are pixels of the 720×480 frame. Never convert them to millimetres.
- RAD is an uncalibrated signal whose gain changes per test. Compare it only within one run.
- Show QA flags where they apply. `VISION_FLAG_LABELS` has the user-facing text.
