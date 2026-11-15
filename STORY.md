# The FlameBridge story

*One question, followed from NASA's archive to the edge of what has been measured.*

This page tells how FlameBridge is used, as one scenario. The engineer and the student in it are
illustrative. Every run, number, screen and source is real, and each one can be checked in the
[live app](https://nasa-space-apps-2026-seven.vercel.app), in this repository or in the cited
paper. Numbers in square brackets point to the [sources](#sources) at the end.

## Scene 1 · A question from a future habitat

A fire-safety engineer is reviewing materials for a lunar habitat. The cabin will not hold
sea-level air. NASA's exploration atmosphere is 56.5 kPa (8.2 psia) with 34 % oxygen, chosen as a
compromise between prebreathe time, hypoxia and flammability [8].

Her materials passed NASA-STD-6001 Test 1, the upward-burning test in normal gravity that is
treated as the worst case on Earth. She knows that this assumption has been tested in orbit. The
BASS-II investigation was flown to check whether ventilated materials in microgravity burn as well
as, or better than, the same material on the ground [1]. It found cases where they do. A PMMA rod
kept spreading at 13.6 % oxygen, although its normal-gravity limit was 16 % [2]. Opposed-flow
spread was sustained at 17 % oxygen in microgravity against 18 % on Earth [3].

Her question is simple to state: **what has actually been measured near my conditions, and how
near is it?**

## Scene 2 · The archive

The evidence exists. BASS-II (NASA PSI-25) holds 129 burn tests from the ISS Microgravity Science
Glovebox [1]. It is spread over 695 files, about 275 GB: an experimental table, test matrices, a
ReadMe, operations documents, PDFs, ZIP archives and 296 MP4 videos
([DATA_SOURCES.md](docs/DATA_SOURCES.md), [data-manifest.csv](docs/data-manifest.csv)).

Nothing in that archive answers "which tests are closest to mine". That is the gap FlameBridge
bridges.

## Scene 3 · One real run, with its source

She opens **Explore** and picks run **B3**.

| What she sees | Where it comes from |
|---|---|
| 100 micron film, 2 cm wide | "Fuel Sample Material" cell of the NASA table |
| Initial O₂ 22.2 %, final 21.8 % | calibrated O₂ columns of the NASA table |
| Airflow set-point 2 cm/s | "Air display" cell |
| Tested 2014-02-19 | parsed from the "Date" cell (2/19/2014) |
| DOI chip | [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) |

The parsed value and the raw NASA cell sit side by side. Where a cell could not be read, the app
shows a dash and the reason. Missing is never shown as zero ([DATA.md](docs/DATA.md)).

## Scene 4 · Watching the flame, frame by frame

She opens run **O13a**, a half-inch clear PMMA rod at 15.9 % oxygen in concurrent flow. FlameBridge
parses three airflow set-points from its "Air display" cell: 5, 2 and 0 cm/s. The video is the original NASA
file, streamed from NASA's own storage. FlameBridge does not re-host it. Only three short fallback clips
(B3, O1, T1) are stored for when NASA storage is unreachable.

Under the video are measurements that the NASA tables do not contain. An offline computer-vision
pipeline measured 179 ISS video files. It outlines the flame by background subtraction and reads
back the telemetry burned into the picture (duct airflow, fan voltage, radiometer, clock) with a
small neural network that was trained without a single hand label
([pipeline/vision/README.md](pipeline/vision/README.md)).

Two honest labels stay on screen:

- Flame sizes are in **pixels**. The footage has no physical scale, so nothing is converted to
  millimetres.
- These values are marked **image-derived**. They are kept apart from NASA's own table values.

The literature gives the context for what she is watching. In BASS-II, flames always went out
when the fan was turned off, which supports the ISS practice of stopping ventilation when a fire
is detected [4].

## Scene 5 · "What if?" without inventing an answer

She opens the **What-if Lab** and enters a 10 mm PMMA rod at 16 % oxygen and 8 cm/s.

FlameBridge does not simulate a flame. It retrieves the closest **real** tests, a nearest-neighbour
search [9] with a documented distance on oxygen, airflow and sample size
([METHODS_AND_VALIDATION.md](docs/METHODS_AND_VALIDATION.md)). For each match it shows what differs,
feature by feature.

One of the nearby rods is **P8**: a 3/8 inch black rod (PMMA per the NASA ReadMe) at 16.4 % oxygen in opposed flow. Its
"Air display" cell in the NASA table reads, verbatim, `5   would not stay lit   10   15 ibid`.
FlameBridge shows that cell verbatim next to the parsed set-points (5, 10 and 15 cm/s) and does
not turn it into a measured outcome.

## Scene 6 · The edge of the evidence

Now she enters her real question: 34 % oxygen at 56.5 kPa.

The Lab answers in three parts:

1. The oxygen partial pressure of her query is 19.2 kPa (0.34 × 56.5 kPa, computed only from the
   values she entered).
2. The closest real tests are listed, with their differences.
3. **The query is outside the measured envelope.** BASS-II initial oxygen runs from 13.6 to
   22.2 %, and no BASS-II test records a pressure. FlameBridge does not fill in an assumed cabin
   pressure.

This is the result, not a failure. The literature shows the hazard rising in exactly that
region: at lower pressure and higher oxygen, PMMA ignites sooner [5], and lower pressure did not
offset the added hazard of elevated oxygen for a thin fuel [6]. NASA's own working group
recommended extending flammability testing to the new atmospheres [7]. FlameBridge turns that
into a concrete statement: **the test that would answer her question has not been flown.**

## Scene 7 · The assistant drives, the code decides

She types: *"Filter the explorer to PMMA rods below 17 % oxygen that have video."*

The filters, the URL and the count change by themselves. Each step appears in the panel and can
be undone, including the whole turn. The assistant can read the data through 11 read-only tools
and change the screen through one validated tool. It cannot change a number
([AI_USAGE.md](AI_USAGE.md)).

Matching, envelope checks and missing values are decided by plain, tested code. The assistant
explains their results. When the data does not hold an answer, its instructions require it to say
so.

## Scene 8 · The same data, for a student

A high-school student opens **Guided mode**. The Learn Academy has five missions with quizzes:
What a Flame Needs, Flames Without Weight, Two Ways a Flame Goes Out, Oxygen and the Edge of
Burning, Reading the Smoke. They use the same runs and the same footage, with cited textbooks and
papers [10, 11, 12]. Schematic drawings are labelled as illustrations, not simulations.

## What this story does not claim

- FlameBridge is not a fire simulator or a certification tool. It does not replace testing.
- One investigation is behind the views. Conditions are narrow (initial O₂ 13.6 to 22.2 %).
- Flame segmentation has no hand-labelled ground truth yet.
- AI answers have no fixed evaluation set yet.

The full list is in [LIMITATIONS.md](LIMITATIONS.md).

## Try the story yourself (about 3 minutes)

1. Open [/explore](https://nasa-space-apps-2026-seven.vercel.app/explore) and open run B3.
2. Open run O13a and step through the video with the arrow keys. Switch the flame overlay.
3. Open [/lab](https://nasa-space-apps-2026-seven.vercel.app/lab), set 34 % O₂ and 56.5 kPa.
4. Read the envelope warning.

## Sources

- [1] NASA Physical Sciences Informatics, PSI-25 Burning and Suppression of Solids II (BASS-II), DOI [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67).
- [2] P. V. Ferkul et al., "Combustion of Solids in Microgravity: Results from the BASS-II Experiment", 2014, [NTRS 20160000593](https://ntrs.nasa.gov/api/citations/20160000593/downloads/20160000593.pdf).
- [3] S. Link, X. Huang, C. Fernandez-Pello, S. Olson, P. Ferkul, "The Effect of Gravity on Flame Spread over PMMA Cylinders", Scientific Reports 8, 120 (2018), DOI [10.1038/s41598-017-18398-4](https://doi.org/10.1038/s41598-017-18398-4).
- [4] S. Olson et al., "Flammability Limits from BASS-II Testing in Microgravity Compared to Normal Gravity Limits", ICES-2019-101, [repository record](https://ttu-ir.tdl.org/items/1922ad9f-ef4c-4f52-96a4-980c23debe5e).
- [5] S. McAllister, C. Fernandez-Pello, D. Urban, G. Ruff, "Piloted Ignition Delay of PMMA in Space Exploration Atmospheres", [NTRS 20080013149](https://ntrs.nasa.gov/citations/20080013149).
- [6] S. Olson, G. Ruff, "Microgravity Flame Spread over Non-Charring Materials in Exploration Atmospheres", SAE 2009-01-2489, DOI [10.4271/2009-01-2489](https://doi.org/10.4271/2009-01-2489).
- [7] NASA Exploration Atmospheres Working Group, "Recommendations for Exploration Spacecraft Internal Atmospheres", [NASA/TP-2010-216134](https://www.nasa.gov/wp-content/uploads/2023/03/henninger-8.2-34-atm-tp216134-2010.pdf).
- [8] A. Garbino et al., "NASA Exploration Atmosphere Tests 1 and 2", [NTRS 20230015380](https://ntrs.nasa.gov/citations/20230015380).
- [9] T. M. Cover, P. E. Hart, "Nearest neighbor pattern classification", IEEE Transactions on Information Theory 13 (1967), DOI [10.1109/TIT.1967.1053964](https://doi.org/10.1109/TIT.1967.1053964).
- [10] S. L. Olson, P. V. Ferkul, "Microgravity flammability boundary for PMMA rods in axial stagnation flow", Combustion and Flame 180 (2017), DOI [10.1016/j.combustflame.2017.03.001](https://doi.org/10.1016/j.combustflame.2017.03.001).
- [11] C. K. Law, Combustion Physics, Cambridge University Press, 2006.
- [12] S. L. Olson et al., "Burning and Suppression of Solids II (BASS-II) Summary Report", [NASA TM 20210011385](https://ntrs.nasa.gov/citations/20210011385).
