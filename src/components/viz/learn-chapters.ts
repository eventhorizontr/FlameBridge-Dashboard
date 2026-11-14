export type LearnInteractiveKind =
  | "gravity-compare"
  | "wind-tunnel"
  | "oxygen-threshold"
  | "airflow-regime"
  | "geometry-caveats";

export interface LearnCitation {
  readonly label: string;
  readonly kind: "doi" | "experiment";
  readonly runId?: string;
  readonly detail: string;
}

export interface LearnQuiz {
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

export interface LearnChapter {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly featuredRunId: string;
  readonly relatedRunIds: readonly string[];
  readonly interactiveKind: LearnInteractiveKind;
  readonly paragraphs: readonly string[];
  readonly takeaway: string;
  readonly citations: readonly LearnCitation[];
  readonly quiz: LearnQuiz;
}

export const LEARN_CHAPTERS: readonly LearnChapter[] = [
  {
    id: "ch-1-round-blue",
    number: 1,
    title: "Why Space Flames Are Round and Blue",
    subtitle: "Freefall removes buoyant convection, revealing diffusion-controlled burning",
    summary:
      "Compare buoyant teardrop flames on Earth with slower, diffusion-fed orbital flames captured in BASS-II.",
    featuredRunId: "PSI-25:B3",
    relatedRunIds: ["PSI-25:B3", "PSI-25:O1"],
    interactiveKind: "gravity-compare",
    paragraphs: [
      "On Earth (1g), hot exhaust gases expand, become less dense than surrounding room air, and shoot upward. That buoyant plume pulls cool oxygen in from the base, stretches the flame into a narrow teardrop, and produces glowing yellow soot particles as fuel vapor cracks in oxygen-lean pockets.",
      "In orbital freefall (microgravity), hot and cold gas share the same effective weight, so buoyancy disappears. Oxygen reaches the burning surface primarily through slow molecular diffusion or a gentle cabin ventilation draft—yielding lower peak temperatures, suppressed soot formation, and a rounder, dimmer blue flame edge, as seen in PSI-25:B3 (100 micron PMMA film at 2 cm/s airflow and 22.2% initial O2)."
    ],
    takeaway:
      "Without buoyancy lifting hot exhaust away, flame shape, color, and oxygen supply depend directly on diffusion and forced ventilation.",
    citations: [
      {
        label: "PSI-25:B3",
        kind: "experiment",
        runId: "PSI-25:B3",
        detail: "Bhattacharjee 100 micron PMMA film at 22.2% O2 and 2 cm/s"
      },
      {
        label: "PSI-25:O1",
        kind: "experiment",
        runId: "PSI-25:O1",
        detail: "Olson 1/4 in clear PMMA rod at 22.2% O2"
      },
      {
        label: "doi:10.60555/4qc4-de67",
        kind: "doi",
        detail: "NASA Physical Sciences Informatics BASS-II dataset (129 runs)"
      }
    ],
    quiz: {
      question:
        "Why does a flame on the International Space Station often look rounder and bluer than the same material burning on Earth?",
      options: [
        "Spacecraft nitrogen is heavier than oxygen, pushing the flame downward into a sphere.",
        "Microgravity eliminates buoyant plumes, slowing oxygen transport and reducing yellow soot radiation.",
        "Zero-gravity increases radiative heat gain so combustion finishes instantaneously."
      ],
      correctIndex: 1,
      explanation:
        "Without gravity-driven buoyancy lifting hot products upward, combustion products surround the fuel and limit soot formation, making the blue reaction zone visible (observable in thin-film runs like PSI-25:B3)."
    }
  },
  {
    id: "ch-2-wind-tunnel",
    number: 2,
    title: "Inside the Space Station Glovebox Wind Tunnel",
    subtitle: "Controlled MSG airflow creates concurrent and opposed flame-spread tests",
    summary:
      "Explore how BASS-II used the Microgravity Science Glovebox duct and flow direction to test solid spacecraft fuels.",
    featuredRunId: "PSI-25:P1",
    relatedRunIds: ["PSI-25:P1", "PSI-25:O1"],
    interactiveKind: "wind-tunnel",
    paragraphs: [
      "Inside a sealed spacecraft, crew safety demands studying combustion inside double-containment hardware. BASS-II mounted test samples inside a compact flow duct within the Microgravity Science Glovebox (MSG), adjusting fan voltage and a manual flow restrictor (positions 0 to 2) to establish steady low-speed airflow.",
      "Flow direction relative to flame spread changes the physics fundamentally. In concurrent flow (like PSI-25:O1 on a 1/4 in clear PMMA rod across 20 -> 1 cm/s), airflow blows heat and radical species ahead of the pyrolysis zone. In opposed flow (like PSI-25:P1 on a 1/4 in black PMMA rod at 17.7% initial O2 across 5 -> 2 cm/s), air rushes directly against the advancing flame front until extinction."
    ],
    takeaway:
      "Opposed and concurrent airflow test distinct spacecraft ventilation hazards inside the same enclosed MSG wind tunnel.",
    citations: [
      {
        label: "PSI-25:P1",
        kind: "experiment",
        runId: "PSI-25:P1",
        detail: "Fernandez-Pello opposed-flow 1/4 in black rod (17.7% O2, ext)"
      },
      {
        label: "PSI-25:O1",
        kind: "experiment",
        runId: "PSI-25:O1",
        detail: "Olson concurrent-flow 1/4 in clear rod (22.2% O2)"
      },
      {
        label: "doi:10.60555/4qc4-de67",
        kind: "doi",
        detail: "BASS-II MSG apparatus & flow configuration metadata"
      }
    ],
    quiz: {
      question:
        "In an opposed-flow BASS-II test such as PSI-25:P1, which direction does tunnel air move relative to flame propagation?",
      options: [
        "Air moves in the same direction as the flame spreads along the sample.",
        "Air is completely shut off before ignition on every test.",
        "Air blows directly into the advancing flame front from the unburned side."
      ],
      correctIndex: 2,
      explanation:
        "In opposed-flow combustion (such as PSI-25:P1), incoming oxidizer approaches from the unburned fuel side directly opposing flame spread."
    }
  },
  {
    id: "ch-3-oxygen-limit",
    number: 3,
    title: "Oxygen and the Edge of Burning",
    subtitle: "Tuning tunnel O2 between 13.6% and 22.2% maps radiative quenching",
    summary:
      "Scrub across the measured PSI-25 oxygen range to see which real test runs ignite, weaken, or extinguish.",
    featuredRunId: "PSI-25:O4",
    relatedRunIds: ["PSI-25:O4", "PSI-25:O13a"],
    interactiveKind: "oxygen-threshold",
    paragraphs: [
      "Future exploration habitats balance crew physiology against fire suppression by tuning cabin oxygen concentration. Across all 129 runs in BASS-II, initial tunnel oxygen spans 13.6% to 22.2%, allowing investigators to pinpoint where sustained spread transitions into extinction.",
      "Near 22.2% O2, thick rods and thin films sustain bright combustion even at very low tunnel speeds. Stepping down into the 14.8% to 15.9% O2 regime—such as PSI-25:O4 (3/8 in clear rod at 14.8% O2, 5 cm/s) and PSI-25:O13a (1/2 in clear PMMA rod at 15.9% O2)—pushes chemical heat release closer to radiative heat loss until flames contract or extinguish."
    ],
    takeaway:
      "Reducing oxygen below air-like ~21% sharply narrows the stable burning window in microgravity.",
    citations: [
      {
        label: "PSI-25:O4",
        kind: "experiment",
        runId: "PSI-25:O4",
        detail: "Olson 3/8 in clear rod at 14.8% initial O2, 5 cm/s"
      },
      {
        label: "PSI-25:O13a",
        kind: "experiment",
        runId: "PSI-25:O13a",
        detail: "Olson 1/2 in clear PMMA rod at 15.9% initial O2"
      },
      {
        label: "doi:10.60555/4qc4-de67",
        kind: "doi",
        detail: "PSI-25 initial and final O2 measurements"
      }
    ],
    quiz: {
      question:
        "Across the 129 recorded BASS-II tests in PSI-25, what is the measured range of initial tunnel oxygen concentrations?",
      options: [
        "13.6% to 22.2% initial O2",
        "21.0% to 45.0% initial O2",
        "5.0% to 10.0% initial O2"
      ],
      correctIndex: 0,
      explanation:
        "The PSI-25 test matrix spans 13.6% to 22.2% initial tunnel O2, bracketing sub-atmospheric exploration atmospheres through standard Earth-like air."
    }
  },
  {
    id: "ch-4-airflow-regimes",
    number: 4,
    title: "Airflow: Starvation vs. Blow-Off",
    subtitle: "Why both too little and too much ventilation can extinguish a space flame",
    summary:
      "Inspect step-down velocity sequences across PSI-25 runs to distinguish oxygen starvation from convective blow-off.",
    featuredRunId: "PSI-25:O13a",
    relatedRunIds: ["PSI-25:O13a", "PSI-25:O1", "PSI-25:T1"],
    interactiveKind: "airflow-regime",
    paragraphs: [
      "On Earth, natural buoyancy imposes roughly ~30 cm/s of upward airflow around any open flame. In microgravity, investigators varied forced tunnel velocity all the way from 0 to 62 cm/s—and often stepped flow down within a single burn so one sample revealed multiple combustion regimes.",
      "Look at PSI-25:O13a (stepped across [49, 44, 42, 41, 41, 40.5, 5, 2, 0] cm/s), PSI-25:O1 (20 -> 1 cm/s), and PSI-25:T1 (steady 10 cm/s on 2 cm SIBAL fabric): turning airflow toward 0 cm/s suffocates a flame behind accumulated CO2 and CO, gentle ventilation (5–20 cm/s) intensifies burning, and excessive flow (40+ cm/s) can sweep heat away faster than reaction chemistry replaces it."
    ],
    takeaway:
      "Microgravity flames follow a non-monotonic ventilation curve: extinguished by suffocation near 0 cm/s and threatened by blow-off at high speed.",
    citations: [
      {
        label: "PSI-25:O13a",
        kind: "experiment",
        runId: "PSI-25:O13a",
        detail: "9-step velocity sequence from 49 cm/s down to 0 cm/s"
      },
      {
        label: "PSI-25:T1",
        kind: "experiment",
        runId: "PSI-25:T1",
        detail: "T'ien 2 cm SIBAL fabric at 10 cm/s, 18.5% O2"
      },
      {
        label: "PSI-25:O1",
        kind: "experiment",
        runId: "PSI-25:O1",
        detail: "5-step concurrent flow down to 1 cm/s"
      }
    ],
    quiz: {
      question:
        "What happens when tunnel airflow is dropped close to 0 cm/s during a microgravity test without buoyant convection?",
      options: [
        "Buoyancy automatically restarts once temperature rises above ambient.",
        "Exhaust gases linger around the flame and starve it of fresh oxygen.",
        "Flame temperature doubles due to supersonic flow acceleration."
      ],
      correctIndex: 1,
      explanation:
        "In freefall there is no natural buoyant updraft, so dropping forced airflow toward 0 cm/s leaves combustion products blanketing the fuel and limits oxygen diffusion."
    }
  },
  {
    id: "ch-5-geometry-caveats",
    number: 5,
    title: "Fuel Geometry & Spacecraft Telemetry Caveats",
    subtitle: "Sample thickness shifts burning behavior—and real sensors saturate",
    summary:
      "Compare films, rods, fabrics, and thick slabs alongside authentic PSI-25 sensor saturation and log caveats.",
    featuredRunId: "PSI-25:M5",
    relatedRunIds: ["PSI-25:M5", "PSI-25:B1", "PSI-25:O1", "PSI-25:T1"],
    interactiveKind: "geometry-caveats",
    paragraphs: [
      "Fuel thickness governs how fast heat soaks into a sample. Thermally thin 100 micron PMMA films (PSI-25:B1) and 2 cm SIBAL cotton-fiberglass fabrics (PSI-25:T1) ignite and spread rapidly under modest drafts, whereas thermally thick 1/4 in rods (PSI-25:O1) or 3 mm 2-sided PMMA slabs (PSI-25:M5) act as heat sinks that alter surface pyrolysis and soot output.",
      "Honest data science also preserves instrument boundaries rather than smoothing them away. During PSI-25:M5 (22.2% O2, airflow [20, 13, 10, 8, 5] cm/s), carbon monoxide exceeded the sensor ceiling and was logged as over-range ('>500 ppm', recorded as CO OR = >1000 ppm per the BASS-II ReadMe). Throughout this dashboard, missing fields stay null and native QA flags stay attached."
    ],
    takeaway:
      "Thermally thin films vs. thick rods/slabs behave differently, and scientific honesty requires flagging saturated sensors (>500 ppm) and missing values verbatim.",
    citations: [
      {
        label: "PSI-25:M5",
        kind: "experiment",
        runId: "PSI-25:M5",
        detail: "Miller 3 mm 2-sided PMMA slab with CO over-range QA flag"
      },
      {
        label: "PSI-25:B1",
        kind: "experiment",
        runId: "PSI-25:B1",
        detail: "Bhattacharjee 100 micron PMMA film at 5 cm/s"
      },
      {
        label: "doi:10.60555/4qc4-de67",
        kind: "doi",
        detail: "BASS-II ReadMe & raw CSV quality annotations"
      }
    ],
    quiz: {
      question:
        "How should an analyzer treat PSI-25:M5 when its final carbon monoxide readout hits '>500'?",
      options: [
        "Preserve the null numeric value and display the verbatim QA over-range caveat ('>500 ppm' / CO OR = >1000 ppm).",
        "Replace '>500' with 500 ppm so charts stay clean without warnings.",
        "Interpolate the CO value linearly from PSI-25:O1."
      ],
      correctIndex: 0,
      explanation:
        "Saturated sensor readings must never be fabricated or clamped silently; preserving null and surfacing the source ReadMe QA flag avoids false precision."
    }
  }
];
