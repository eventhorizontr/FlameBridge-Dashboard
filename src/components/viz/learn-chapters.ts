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
  readonly doi?: string;
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

const datasetSource: LearnCitation = {
  label: "NASA PSI-25",
  kind: "doi",
  doi: "10.60555/4qc4-de67",
  detail: "BASS-II Test Matrix, ReadMe, and experiment footage",
};

const rodStudy: LearnCitation = {
  label: "Olson & Ferkul (2017)",
  kind: "doi",
  doi: "10.1016/j.combustflame.2017.03.001",
  detail: "Microgravity flammability boundary for PMMA rods in axial stagnation flow",
};

const gravityStudy: LearnCitation = {
  label: "Link et al. (2018)",
  kind: "doi",
  doi: "10.1038/s41598-017-18398-4",
  detail: "The effect of gravity on flame spread over PMMA cylinders",
};

function runSource(runId: string): LearnCitation {
  return { label: runId, kind: "experiment", runId, detail: "Open the experiment record and footage" };
}

export const LEARN_CHAPTERS: readonly LearnChapter[] = [
  {
    id: "ch-1-round-blue",
    number: 1,
    title: "How Gravity Moves Air Around a Flame",
    subtitle: "Compare buoyant airflow with weak buoyancy in orbit",
    summary: "See how gravity changes the movement of gases around a flame.",
    featuredRunId: "PSI-25:B3",
    relatedRunIds: ["PSI-25:B3", "PSI-25:O1"],
    interactiveKind: "gravity-compare",
    paragraphs: [
      "On Earth, hot gas is less dense than the cooler surrounding air. Buoyancy drives it upward and creates a flow around the flame.",
      "In orbital freefall, buoyancy is much weaker. Molecular diffusion and imposed airflow still transport gases.",
      "In the B3 footage, look for the position of the visible flame relative to the sample as the video plays.",
    ],
    takeaway: "Buoyancy contributes to gas transport on Earth. The tunnel fan supplies forced airflow in BASS-II.",
    citations: [gravityStudy, datasetSource, runSource("PSI-25:B3"), runSource("PSI-25:O1")],
    quiz: {
      question: "Which source of airflow becomes much weaker in orbital freefall?",
      options: ["The tunnel fan", "Buoyancy-driven airflow", "Airflow imposed by ventilation"],
      correctIndex: 1,
      explanation: "Freefall weakens buoyant airflow. A fan can still move gases through the tunnel.",
    },
  },
  {
    id: "ch-2-wind-tunnel",
    number: 2,
    title: "Inside the Space Station Glovebox Wind Tunnel",
    subtitle: "Airflow direction relative to flame spread",
    summary: "Use the BASS-II setup to compare concurrent and opposed flow.",
    featuredRunId: "PSI-25:P1",
    relatedRunIds: ["PSI-25:P1", "PSI-25:O1"],
    interactiveKind: "wind-tunnel",
    paragraphs: [
      "BASS-II placed solid fuel samples in a flow duct inside the Microgravity Science Glovebox. Operators used a fan and flow restrictors to change air speed.",
      "Concurrent flow moves in the direction of flame spread. Opposed flow moves against the direction of flame spread.",
      "Compare the airflow and flame-spread arrows in the schematic, then look for where the flame begins on each specimen in the footage.",
    ],
    takeaway: "Flow direction describes the relationship between tunnel airflow and the direction of flame spread.",
    citations: [datasetSource, rodStudy, gravityStudy, runSource("PSI-25:P1"), runSource("PSI-25:O1")],
    quiz: {
      question: "Which direction does air move relative to flame spread in an opposed-flow test?",
      options: ["Along the direction of spread", "Perpendicular to the direction of spread", "Against the direction of spread"],
      correctIndex: 2,
      explanation: "In opposed flow, the air moves against the advancing flame front.",
    },
  },
  {
    id: "ch-3-oxygen-limit",
    number: 3,
    title: "Oxygen and the Edge of Burning",
    subtitle: "Browse experiments by recorded initial oxygen",
    summary: "Find runs with similar initial oxygen and compare the rest of their conditions.",
    featuredRunId: "PSI-25:O4",
    relatedRunIds: ["PSI-25:O4", "PSI-25:O13a"],
    interactiveKind: "oxygen-threshold",
    paragraphs: [
      "Use the slider to browse PSI-25 runs by their recorded initial oxygen percentage by volume.",
      "Published measurements on PMMA rods show that flammability boundaries depend on both oxygen and airflow for the tested configurations. Compare the sample and flow fields when you open nearby runs.",
    ],
    takeaway: "Use the recorded initial oxygen as one condition when comparing runs.",
    citations: [datasetSource, rodStudy, gravityStudy, runSource("PSI-25:O4"), runSource("PSI-25:O13a")],
    quiz: {
      question: "What does selecting an oxygen value in the slider return?",
      options: ["Runs with recorded initial oxygen near that value", "A predicted flame temperature for every material", "A single oxygen cutoff shared by all fuels"],
      correctIndex: 0,
      explanation: "The slider looks up existing runs by the initial oxygen field. Open a run to see its other recorded conditions.",
    },
  },
  {
    id: "ch-4-airflow-regimes",
    number: 4,
    title: "Airflow and Flame Stability",
    subtitle: "Read the recorded duct air speeds in order",
    summary: "Compare recorded airflow sequences and inspect any operator notes.",
    featuredRunId: "PSI-25:O13a",
    relatedRunIds: ["PSI-25:O13a", "PSI-25:O1", "PSI-25:T1"],
    interactiveKind: "airflow-regime",
    paragraphs: [
      "Some BASS-II runs record several duct air speeds. The Test Matrix uses a separate column for fan voltage and control settings.",
      "Published concurrent-flow rod tests observed low-flow quenching and high-flow blowoff under different conditions. When you watch a run, look for changes in the flame outline as the displayed air speed changes.",
    ],
    takeaway: "Read the Air display series alongside the run notes before interpreting changes in footage.",
    citations: [datasetSource, rodStudy, runSource("PSI-25:O13a"), runSource("PSI-25:O1"), runSource("PSI-25:T1")],
    quiz: {
      question: "Which Test Matrix field reports duct air speed in cm/s?",
      options: ["Fan display", "Air display", "Radiometer gain"],
      correctIndex: 1,
      explanation: "Air display reports duct air speed. Fan display records voltage or control settings.",
    },
  },
  {
    id: "ch-5-geometry-caveats",
    number: 5,
    title: "Fuel Geometry and Sensor Readings",
    subtitle: "Compare specimens and interpret a reported lower bound",
    summary: "Compare sample shapes and learn how the catalog records a bounded CO reading.",
    featuredRunId: "PSI-25:M5",
    relatedRunIds: ["PSI-25:M5", "PSI-25:B1", "PSI-25:O1", "PSI-25:T1"],
    interactiveKind: "geometry-caveats",
    paragraphs: [
      "The PSI-25 records include films, rods, fabrics, and slabs. Published opposed-flow tests of black PMMA rods found that rod diameter affected flame spread under their tested conditions.",
      "Open M5 and inspect the raw final CO cell. A greater-than sign specifies an exclusive lower bound. The ReadMe uses a separate OR marker for sensor over-range.",
    ],
    takeaway: "Preserve the reporting limit and the raw cell when a reading is only known to exceed a value.",
    citations: [datasetSource, gravityStudy, runSource("PSI-25:M5"), runSource("PSI-25:B1")],
    quiz: {
      question: "How should a final CO reading with a greater-than sign be stored?",
      options: ["As an exclusive lower bound plus the original source cell", "As an exact reading equal to the displayed limit", "As a value interpolated from another run"],
      correctIndex: 0,
      explanation: "The bound gives a threshold that the reading exceeds. The exact CO value is unavailable.",
    },
  },
];
