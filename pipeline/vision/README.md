# Flame vision layer (`pipeline/vision/`)

Computer vision over every ISS video of an investigation. The layer adds four kinds of data that
the PSI tables do not contain:

| Layer | What | Units / caveats |
|---|---|---|
| **Flame geometry** | per-frame flame mask → area, luminous-core area, bounding frame, centroid, polygons | pixels of the 720×480 frame; no physical scale in the footage |
| **Overlay telemetry** | AIR (duct flow), FAN (fan volts), RAD (radiometer), clock — read from the text burned into the video | AIR cm/s (slow sensor), FAN V, RAD uncalibrated; per-field OCR read rate + date audit |
| **Frame similarity** | SSIM, colour histogram, flame-mask IoU, optical-flow speed, DINOv2 cosine, recurrence matrix, scene phases | dimensionless; phases are image phases, not physical stages |
| **Keyframes** | 12-frame sprite across the flame-visible span | WebP, 192×128 tiles |

Everything is deterministic and reproducible from the NASA files; nothing is predicted.

## Run it

```bash
# 1. mirror the videos (≈21 GB for PSI-25; resumable)
python -I pipeline/vision/fetch.py --data public/data/psi-25 --cache ../vision-cache/psi-25 --workers 12
# 2. analyse every video (CPU, parallel) -> public/data/psi-25/vision/
python pipeline/vision/build.py --data public/data/psi-25 --cache ../vision-cache/psi-25 --workers 13
# 3. contextual similarity (GPU; needs torch + timm)
python pipeline/vision/embed.py --out public/data/psi-25/vision --frames ../vision-cache/embed-frames/psi-25
python pipeline/vision/build.py --data public/data/psi-25 --cache ../vision-cache/psi-25 --index-only
# visual QA of any result
python pipeline/vision/qa.py public/data/psi-25/vision/<videoId>.json ../vision-cache/psi-25/<videoId>.mp4 qa.png
```

`requirements.txt` lists the CPU dependencies (numpy, opencv). The GPU pass additionally needs
`torch` and `timm`; DINOv2 weights are downloaded as safetensors through `timm` (no remote code).

## Method

**Instrument-frame test.** The static overlay label row ("FUEL AIR FAN RAD") is matched by
normalised cross-correlation over 25 horizontal scales (analogue capture stretches it by up to
1.5 %). Score ≥ 0.6 ⇒ BASS camera frame; loss-of-signal screens, photo reviews and crew cameras
score < 0.35 and are excluded. "2nd view" files film the MSG monitors and are skipped by design.

**Overlay OCR.** Character cells (fixed 28.3 px pitch) are classified by a small CNN
(`train_osd.py` → `assets/osd-glyph-cnn.onnx`, run with OpenCV DNN). It was trained without a
single hand label: date digits are labelled by the test-matrix date (+1 day, the documented overlay
clock error), "/" ":" by position, "-" "." by shape; then clock-continuity labels the HH:MM:SS
digits of other frames from the per-video clock offset. Held-out (by video) accuracy and the class
counts are in `assets/osd-glyph-cnn.report.json`. A field is `null` unless every inked cell is
classified with p ≥ 0.85 and the value persists for two reads. Each video carries a date audit
(overlay date vs. test matrix) and a clock-consistency score.

**Flame segmentation** (`segment.py`). Background = per-pixel 25th percentile of 64 sampled frames;
excess brightness E = max over colour channels of (frame − background) minus the frame median.
Thresholds scale with the robust sensor noise. A region is flame if it holds a luminous core
(E above max(T_hi, 0.35 · P99.9 E)) or it is a large, consistently dim region (the blue zone near
extinction). Inside luminous regions, weak pixels are kept only within 28 px of the core (light on
the chamber walls is dropped and reported as `haloPx`); nearby regions (< 40 px) are grouped and the
brightest group is the flame — remote reflections are reported as `otherPx`. Frames with the cabin
lights on are flagged, not measured. Known bias: the mask includes the ~2 px blurred fringe of bright
edges, so compact flames read up to ~15–20 % large; every run is measured the same way.

A colour test rejects grey, unsaturated regions (hardware that appears when the scene changes):
a flame must be coloured (mean max−min channel ≥ 7 counts) or hold a saturated core.

**Known limits.** Coloured scene light that appears when hardware moves or work lights change
(e.g. F3 at 105–110 s) can still pass for flame for a few seconds; such boxes usually touch the
frame edge and carry flag 16. During long igniter glow the box frames the glowing igniter region,
not only the incipient flame. A last overlay digit clipped by the frame edge (e.g. T5's RAD) is
left unread rather than guessed.

**Per-frame QA flags** (bitmask in `series.flags`): 1 lit chamber · 2 transient (area > 3× the
±3 s median: igniter flash) · 4 other luminous regions · 8 > 25 % of the mask saturated · 16 flame
touches the frame edge. Peaks and summaries exclude transient frames.

**Similarity.** Consecutive analysed frames (overlay blanked): SSIM (Wang et al. 2004,
DOI 10.1109/TIP.2003.819861), 1 − Bhattacharyya distance of HSV histograms, Jaccard index of the
flame masks, Farneback optical flow speed inside the flame. DINOv2 ViT-S/14 (Oquab et al. 2024,
arXiv:2304.07193) embeds 2 Hz frames; consecutive cosine, a 64×64 recurrence matrix and Foote (2000)
checkerboard novelty give time-labelled image phases.

**Area oscillation.** Periodogram of the detrended flame area in the longest visible run (≥ 20 s,
≥ 4 cycles); reported only if the peak holds ≥ 15 % of the variance.

## Frame search, posters, 3D (ADR-018)

```bash
python pipeline/vision/build.py --data public/data/psi-25 --cache ../vision-cache/psi-25 --posters
python pipeline/vision/frame_index.py --out public/data/psi-25/vision --frames ../vision-cache/embed-frames/psi-25
python pipeline/vision/audit.py --data public/data/psi-25 --cache ../vision-cache/psi-25 --out audit/
```

- `frame-index.{bin,json}` + `frames/sim-*.webp`: 1 Hz flame-visible frames, DINOv2 → PCA-128 →
  int8, thumbnail sheets. Queried by `/api/vision/similar` and `find_similar_frames`.
- `frames/<id>.poster.webp`: the steady peak frame cropped around the flame (Overview library).
- The 3D flame (experiment page) is computed in the browser from `<id>.contours.json`: revolve
  (axisymmetric), extrude (planar) or space-time stacks, each labelled with its assumption.
- `audit.py`: one tile per analysed video (peak + mid-burn) for a dataset-wide visual review.

## Outputs (`public/data/<acc>/vision/`)

- `index.json` — status, events, summary and OCR audit of every video (contract: `src/types/vision.ts`)
- `<videoId>.json` — full analysis; series stored at 5 Hz as parallel arrays (`null` = not measured)
- `<videoId>.contours.json` — flame polygons per stored sample, permille of frame width/height
- `frames/<videoId>.webp` — keyframe sprite

## API (for the AI agent, scripts and terminals)

```bash
curl -s localhost:3000/api/vision                                   # counts + metric catalogue
curl -s "localhost:3000/api/vision?experiment=PSI-25:B1"            # one run's videos
curl -s "localhost:3000/api/vision?rank=peakAreaPx&kind=primary&limit=5"
curl -s "localhost:3000/api/vision/6924803a7f6aa6a8302103cc?points=60"  # digest + thinned series
curl -s "localhost:3000/api/vision/6924803a7f6aa6a8302103cc?full=1"     # everything stored
```

The assistant uses the same data through `get_flame_analysis` and `rank_flame_metrics`, and drives
the viewer with the `setFlameOverlay` action (`box` · `outline` · `isolate` · `off`, `follow`).

## Another dataset

Add a `VisionProfile` in `profiles.py` (camera, overlay layout and field meanings, or `osd=None`),
then run `fetch.py` and `build.py` on its `public/data/<acc>/`. Segmentation, similarity, the API
and the UI need no changes. A new overlay font needs its own label template and `train_osd.py` run.
