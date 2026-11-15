# Vision layer — validation against independent sources

Generated from `public/data/psi-25/vision` (algorithm fif-flame-vision 1.3.0). Regenerate with `python pipeline/vision/validate.py`.

## Coverage

| Status | Videos |
|---|---|
| not-instrument-footage | 10 |
| ok | 208 |
| skipped | 120 |
| unreadable | 5 |

Analysed frames (≈10 Hz): 905,053; instrument-camera frames 864,011 (95.5%); frames with a visible flame 302,190.

## Overlay OCR

| Field | Mean read rate | Min read rate | Videos |
|---|---|---|---|
| air | 0.9993 | 0.9330 | 164 |
| fanV | 0.9990 | 0.9630 | 164 |
| fuel | 0.9967 | 0.8530 | 164 |
| rad | 0.9888 | 0.0630 | 164 |

Date audit (overlay date − 1 day vs. test-matrix date): match 161, mismatch 3. Mean clock consistency (reads within 2 s of the per-video clock fit): 0.9924.

A `mismatch` means the overlay date of that recording differs from the matrix date of the test it is filed under (e.g. a recording made on another day); it is reported, not corrected.

## AIR (overlay) vs. air-flow set-points (test matrix)

Primary videos with both: 146. Mean share of set-points that the duct sensor reads (±1 cm/s, ≥ 5 s): **89.5%**; all set-points seen in 121 of 146 videos.

The sensor lags the set-point by ~1 min and some recordings stop before a later set-point, so a set-point can be missing without any OCR error.

| Run | Set-points (cm/s) | AIR values read (cm/s, first 12) | Seen |
|---|---|---|---|
| P5 | 5 | 0 | 0% |
| T21 | 11 → 47 | 11, 12 | 0% |
| T21 | 11 → 47 | 12 | 0% |
| O5a | 5 → 10 → 5 → 2 → 0 | 7, 8, 9 | 20% |
| O5a | 5 → 10 → 5 → 2 → 0 | 7, 8, 9 | 20% |
| T7 | 10 → 5 → 3 → 1 | 9, 10, 11 | 25% |
| M3 | 10 → 20 → 18 | 10 | 33% |
| O13a | 5 → 2 → 0 | 0 | 33% |
| O13a | 5 → 2 → 0 | 3, 4, 5, 6, 7, 8 | 33% |
| O13a | 5 → 2 → 0 | 0 | 33% |
| O13a | 5 → 2 → 0 | 3, 4, 5, 6, 7, 8 | 33% |
| M10 | 10 → 17 → 14 → 10 → 8 | 10, 11 | 40% |
| M10 | 10 → 17 → 14 → 10 → 8 | 10, 11 | 40% |
| O5a | 5 → 10 → 5 → 2 → 0 | 4, 5, 6, 7 | 40% |
| O5a | 5 → 10 → 5 → 2 → 0 | 4, 5, 6, 7 | 40% |
| P12 | 5 → 3 → 2 → 1 → 0.5 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 | 40% |
| P18 | 2 → 0 → 2 → 0 | 0, 1 | 50% |
| P20 | 2 → 0 → 2 → 0 | 0, 1 | 50% |
| T15 | 9 → 29 | 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25 | 50% |
| T21 | 11 → 47 | 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21 | 50% |
| T21 | 11 → 47 | 11, 12 | 50% |
| T22 | 10 → 5 | 8, 9, 10, 11, 12 | 50% |
| M17 | 10 → 5 → 3 → 0 | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | 75% |
| O18 | 5 → 2 → 0 → 11 → 2 → 11 → 2 → 0 | 0, 1, 2, 3, 4, 5, 6 | 75% |
| M5 | 20 → 13 → 10 → 8 → 5 | 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 19 | 80% |

## Flame onset (geometry) vs. DINOv2 phase boundaries

Videos with a flame after 5 s and an embedding: 96. Median distance from the first-flame time to the nearest DINOv2 phase boundary: **1.6 s**; within 5 s in 64 of 96.

Two unrelated methods (thresholded flame mask vs. self-supervised scene embedding) agreeing on when the scene changes is evidence that both track the flame rather than noise.
