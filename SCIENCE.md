# The science behind FlameBridge

What the literature says, how FlameBridge applies the scientific method, what result it produces,
and how that result was checked. Numbers in square brackets point to the
[references](#references).

## 1. What the literature shows

- **The ground test is not always the worst case.** NASA screens spacecraft materials with
  NASA-STD-6001 Test 1, an upward-burning test in normal gravity. BASS-II was flown to test the
  hypothesis that ventilated materials in microgravity burn as well as, or better than, the same
  material in normal gravity [1].
- **Materials can burn at lower oxygen in orbit.** In 24 concurrent-flow tests with PMMA rods,
  BASS-II mapped the lower microgravity flammability boundary against oxygen and flow stretch
  rate, with a blowoff branch and a quenching branch [2, 4]. A quarter-inch rod spread steadily at
  13.6 % O₂ although its normal-gravity blowoff limit was 16 % [3]. In opposed flow, spread was
  sustained at 17 % O₂ in microgravity against 18 % in normal gravity [5]. A later comparison
  across BASS-II rods, sheets, slabs and fabric reached the same conclusion [6].
- **Future habitats move toward more oxygen and less pressure.** NASA recommends 56.5 kPa
  (8.2 psia) with 34 % O₂ for Moon and Mars missions [10]. For PMMA, lowering the pressure to
  58.6 kPa at 21 % O₂ shortened the piloted ignition time by about 17 %, and raising O₂ to 32 %
  shortened it by another 10 % [7]. For a thin non-charring fuel, lower pressure did not offset
  the added hazard of elevated oxygen [8]. NASA's Exploration Atmospheres Working Group
  recommended modifying the standard flammability test to cover the new atmospheres [9].
- **Ventilation and detection depend on the same variables.** In BASS-II, flames always went out
  when the fan was turned off, which supports the ISS practice of stopping ventilation when a
  fire is detected [6]. Without buoyancy, smoke is not carried up to a detector, and the effects
  of oxygen and pressure on fire signatures in reduced gravity still have to be measured [12].

**What follows for the design.** Microgravity flammability depends on oxygen and on the
ventilation flow [2, 3, 4, 5]. So the What-if Lab matches on measured O₂ and airflow, plus sample
size and geometry, and keeps flow direction visible as a filter. The hazard rises with higher O₂
at lower pressure [7, 8, 9], which is where BASS-II has no data. So the most useful answer to a
habitat question is often "outside the measured envelope".

## 2. The method

Every what-if question follows the same four steps.

| Step | What FlameBridge does |
|---|---|
| 1. State the condition | The user sets O₂, airflow, material, geometry, sample size and optionally pressure |
| 2. Retrieve the measured evidence | Nearest-neighbour retrieval [11] over real tests, never a simulation |
| 3. Measure the distance | Range-normalized weighted Euclidean distance on initial O₂, median airflow and characteristic size (weights 1, 1 and 0.5), plus one unit per material or geometry mismatch |
| 4. Name the missing test | A query is inside the measured envelope only when a complete test of the same material and geometry lies within 0.25 normalized distance and every input is inside that group's range |

Four kinds of information are kept apart in the data and in the interface: source findings (NASA
tables), image measurements (computer vision, in pixels), documented calculations, and AI
explanations. The weights are stated as retrieval choices, not fitted physics. Film thickness is
never compared with rod diameter.

## 3. A concrete result

Set the Lab to NASA's exploration atmosphere, 34 % O₂ at 56.5 kPa [10].

- The query's O₂ partial pressure is 19.2 kPa, computed by Dalton's law only from the values the
  user entered.
- The closest real tests are listed with their differences.
- The query is **outside the measured envelope**. BASS-II covers initial O₂ from 13.6 to 22.2 %
  and recorded airflow set-points from 0 to 47 cm/s. No test records a pressure, and FlameBridge
  never fills in an assumed cabin pressure.

The missing evidence lies in the region where the literature shows the hazard rising [7, 8, 9].
That is the validation need a new test would have to fill.

## 4. How it was checked

| Check | Result |
|---|---|
| Automated tests | 150 TypeScript tests in 18 files and 27 pipeline tests: data contracts, matching, pressure handling, AI tool semantics, rejection of invalid dashboard actions, exact undo |
| Overlay OCR, tested on 26 videos it never saw | 99.98 % character accuracy on 16 404 overlay characters. Trained with no hand labels |
| Telemetry reading against the NASA test matrix, 125 primary video files | The airflow read from the overlay reached 89.9 % of the listed set-points on average, and every set-point in 104 files |
| Cross-method check of the vision layer, 85 video files | The first flame found by segmentation lies a median of 1.6 s from the nearest scene-change boundary found independently by DINOv2 embeddings (within 5 s in 59 of 85) |
| Data quality | 40 of the 129 tests carry at least one QA flag. Flags are shown, never hidden |

Details: [METHODS_AND_VALIDATION.md](docs/METHODS_AND_VALIDATION.md).

## 5. What is not validated

- The Lab weights have not been tuned or tested against expert judgement.
- Flame segmentation has no hand-labelled ground truth yet. Compact flames read up to about 15 to
  20 % large.
- The records hold no calibrated outcome variables such as spread rate in mm/s.
- AI answers have no fixed evaluation set yet.
- One investigation is behind the views, and no test records a pressure.

Full list: [LIMITATIONS.md](LIMITATIONS.md).

## References

- [1] NASA Physical Sciences Informatics, PSI-25 Burning and Suppression of Solids II (BASS-II), DOI [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67).
- [2] S. L. Olson, P. V. Ferkul, "Microgravity Flammability of PMMA Rods in Concurrent Flow", 9th U.S. National Combustion Meeting, 2015, [NTRS 20150008961](https://ntrs.nasa.gov/api/citations/20150008961/downloads/20150008961.pdf).
- [3] P. V. Ferkul et al., "Combustion of Solids in Microgravity: Results from the BASS-II Experiment", 2014, [NTRS 20160000593](https://ntrs.nasa.gov/api/citations/20160000593/downloads/20160000593.pdf).
- [4] S. L. Olson, P. V. Ferkul, "Microgravity flammability boundary for PMMA rods in axial stagnation flow: experimental results and energy balance analyses", Combustion and Flame 180 (2017) 217 to 229, DOI [10.1016/j.combustflame.2017.03.001](https://doi.org/10.1016/j.combustflame.2017.03.001).
- [5] S. Link, X. Huang, C. Fernandez-Pello, S. Olson, P. Ferkul, "The Effect of Gravity on Flame Spread over PMMA Cylinders", Scientific Reports 8, 120 (2018), DOI [10.1038/s41598-017-18398-4](https://doi.org/10.1038/s41598-017-18398-4).
- [6] S. Olson et al., "Flammability Limits from BASS-II Testing in Microgravity Compared to Normal Gravity Limits", ICES-2019-101, [repository record](https://ttu-ir.tdl.org/items/1922ad9f-ef4c-4f52-96a4-980c23debe5e).
- [7] S. McAllister, C. Fernandez-Pello, D. Urban, G. Ruff, "Piloted Ignition Delay of PMMA in Space Exploration Atmospheres", [NTRS 20080013149](https://ntrs.nasa.gov/citations/20080013149).
- [8] S. Olson, G. Ruff, "Microgravity Flame Spread over Non-Charring Materials in Exploration Atmospheres", SAE 2009-01-2489, DOI [10.4271/2009-01-2489](https://doi.org/10.4271/2009-01-2489).
- [9] NASA Exploration Atmospheres Working Group, "Recommendations for Exploration Spacecraft Internal Atmospheres", [NASA/TP-2010-216134](https://www.nasa.gov/wp-content/uploads/2023/03/henninger-8.2-34-atm-tp216134-2010.pdf).
- [10] A. Garbino et al., "NASA Exploration Atmosphere Tests 1 and 2", [NTRS 20230015380](https://ntrs.nasa.gov/citations/20230015380).
- [11] T. M. Cover, P. E. Hart, "Nearest neighbor pattern classification", IEEE Transactions on Information Theory 13 (1967) 21 to 27, DOI [10.1109/TIT.1967.1053964](https://doi.org/10.1109/TIT.1967.1053964).
- [12] C. Fortenberry et al., "Research Questions and Challenges for Improved Spacecraft Fire Detection", [NTRS 20210022143](https://ntrs.nasa.gov/api/citations/20210022143/downloads/Fire%20detection%20white%20paper%20final%20211031.pdf).
