# Limitations

FlameBridge helps people read and compare NASA experiments. It is **not** a fire simulator, a
design tool or a safety certification, and it does not replace physical testing.

## Data

- **One campaign.** All views use PSI-25 (BASS-II): 129 runs, 98 of them PMMA, plus SIBAL fabric,
  Nomex and a candle.
- **Narrow conditions.** Initial O₂ 13.6 to 22.2 %, airflow set-points 0 to 47 cm/s. Outside these
  ranges the Lab reports "outside the measured envelope". It does not extrapolate.
- **No pressure.** No PSI-25 or PSI-20 run states a pressure, so pressure can only be shown as a
  gap.
- **Sensors (NASA ReadMe).** The O₂ reading is corrected by a daily constant offset. The duct
  airflow sensor responds in about 1 minute. The radiometer is uncalibrated and is useful for
  relative change only.
- **Unreadable cells** are shown as missing with a flag. They are never guessed.

## Image measurements

- **Flame segmentation is classical image processing.** The flame is measured with OpenCV
  background subtraction and fixed rules. No segmentation model was trained: the footage is large
  and has no hand-labelled flame masks. The overlay text is read by a small CNN and frame
  similarity uses DINOv2, and neither measures the flame.
- **No ground truth.** Flame outlines have not been checked against hand labels. Compact flames
  read up to about 15 to 20 % large.
- **Pixels only.** The footage has no physical scale, so sizes are never converted to millimetres.
- **Coverage.** 179 of 296 unique video files are measured. 102 second-view recordings are
  skipped, 10 are not instrument footage and 5 could not be decoded. The app counts run-video
  links, so it shows 208 measured, because repeated runs share a file.

## AI assistant

- It can only state values returned by its read-only tools, but a language model can still
  phrase things wrongly. Every cited run links to its record.
- There is no fixed evaluation set for its answers yet.

## Method

- The Lab's distance weights are retrieval choices. They have not been tested against expert
  judgement.
- Learn Academy drawings are illustrations, not simulations.

Details: [METHODS_AND_VALIDATION.md](docs/METHODS_AND_VALIDATION.md), [DATA.md](docs/DATA.md),
[AI_USAGE.md](AI_USAGE.md).
