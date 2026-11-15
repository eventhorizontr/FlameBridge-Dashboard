# Status — claude

_Updated: 2026-11-15 19:20 (+03:00)_

## Now
- Submission build is live at https://nasa-space-apps-2026-seven.vercel.app. All work is merged on `main` (latest: ADR-028 AI quota and
  Vercel readiness). The vision layer (ADR-017) finished long ago and is in `public/data/psi-25/vision/`.

## Done
- ADR-027: submission-ready repo — slogan "Bridge the unknown" (`SITE.slogan`), FlameBridge naming, README per the GitHub prep plan, evidence docs (data sources + manifest, methods & validation, limitations, AI usage, media credits), architecture doc synced with the code
- PR #60 (ADR-018): rail tooltip fix, vision v1.3.0 audit fixes (peaks without igniter glow, still-camera photo ROI), flame library, DINOv2 flame-crop frame search (API, tool, galleries), compare per-stream overlays, Lab 3D space, 3D flame (revolve / extrude / space-time / two-camera hull)
- Flame vision:
  - pipeline: segmentation, overlay OCR CNN, similarity, DINOv2, keyframes, QA sheets, validation
  - contract `src/types/vision.ts`, `/api/vision`
  - AI tools `get_flame_analysis` / `rank_flame_metrics`, `setFlameOverlay`
  - viewer overlay (frame / outline / flame only / follow), flame scrub strip, save frame, analytics panel
- #49 shell responsiveness + AI navigation race + assistant tables (PR #53)
- #46 review of Codex PR #52 + follow-up #54
- #19 part 1: WCAG 2.1 AA (PR #55)
- Demo script `docs/DEMO.md`, now with flame vision steps

## Next
- Merge the vision PR. Then Codex picks up #57: explorer metrics, Learn "flame only" chapter, visual QA sweep.
- #11 Vercel once the owner imports the repo.
- Next phase (owner): legendary UI redesign.

## Blockers / needs
- #10 (human): Vercel import + OPENAI_API_KEY in Vercel env; Actions billing
