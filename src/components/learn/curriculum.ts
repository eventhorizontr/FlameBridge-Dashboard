/**
 * Explore & Learn — core concepts track.
 *
 * Five modules of plain-language combustion basics (the team's rule-engine notes, ADR-024):
 * what a flame needs, why gravity matters, the two ways a flame goes out (the U-shaped map),
 * oxygen limits, and what the smoke tells us. Concepts, not coefficients: no fitted constants or
 * threshold values are taught here.
 *
 * Integrity rules (AGENTS.md §2.1):
 *  - Every concept card cites at least one reference below.
 *  - Interactive pieces are illustrations or schematics and say so; real numbers on screen come
 *    only from the PSI-25 catalogue (flight-data lab widgets).
 *  - Bibliographic references without a verified link are plain citations.
 */

export type ReferenceKey =
  | "psi25"
  | "law2006"
  | "quintiere2006"
  | "turns2012"
  | "tien1986"
  | "olsonFerkul2017"
  | "link2018"
  | "nasaTm2021"
  | "nasaFactSheet";

export interface CourseReference {
  readonly label: string;
  /** "doi" → doi.org link; "url" → the given URL; "reference" → citation without a link. */
  readonly kind: "doi" | "url" | "reference";
  readonly doi?: string;
  readonly url?: string;
  readonly detail: string;
}

export const REFERENCES: Readonly<Record<ReferenceKey, CourseReference>> = {
  psi25: {
    label: "NASA PSI-25",
    kind: "doi",
    doi: "10.60555/4qc4-de67",
    detail: "BASS-II Test Matrix, ReadMe, Ops procedure and experiment footage",
  },
  law2006: {
    label: "Law (2006)",
    kind: "reference",
    detail: "C. K. Law, Combustion Physics, Cambridge University Press, 2006 — diffusion flames, buoyancy",
  },
  quintiere2006: {
    label: "Quintiere (2006)",
    kind: "reference",
    detail: "J. G. Quintiere, Fundamentals of Fire Phenomena, Wiley, 2006 — burning of solids, flame spread",
  },
  turns2012: {
    label: "Turns (2012)",
    kind: "reference",
    detail: "S. R. Turns, An Introduction to Combustion, 3rd ed., McGraw-Hill, 2012 — combustion basics, products",
  },
  tien1986: {
    label: "T'ien (1986)",
    kind: "reference",
    detail: "J. S. T'ien, \"Diffusion flame extinction at small stretch rates: the mechanism of radiative loss\", Combustion and Flame 65 (1986) 31–34",
  },
  olsonFerkul2017: {
    label: "Olson & Ferkul (2017)",
    kind: "doi",
    doi: "10.1016/j.combustflame.2017.03.001",
    detail: "Microgravity flammability boundary for PMMA rods in axial stagnation flow",
  },
  link2018: {
    label: "Link et al. (2018)",
    kind: "doi",
    doi: "10.1038/s41598-017-18398-4",
    detail: "The effect of gravity on flame spread over PMMA cylinders",
  },
  nasaTm2021: {
    label: "NASA TM 20210011385",
    kind: "url",
    url: "https://ntrs.nasa.gov/citations/20210011385",
    detail: "NASA Technical Memorandum on the BASS-II PMMA flammability boundary (NTRS 20210011385), cited in the team's rule-engine notes",
  },
  nasaFactSheet: {
    label: "NASA Planetary Fact Sheet",
    kind: "url",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
    detail: "NSSDCA Planetary Fact Sheet — surface gravity of Earth, Moon and Mars",
  },
};

export interface ConceptCard {
  readonly title: string;
  readonly body: string;
  /** Optional word equation, e.g. "fuel + oxygen → CO₂ + water". Mini-syntax `_{}` / `^{}`. */
  readonly formula?: string;
  readonly refs: readonly ReferenceKey[];
}

export interface GateQuestion {
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

export type LabKind =
  | "fire-triangle"
  | "gravity-worlds"
  | "u-curve"
  | "gravity-compare"
  | "wind-tunnel"
  | "oxygen-threshold"
  | "airflow-regime"
  | "geometry-caveats";

export interface LearnModule {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly subtitle: string;
  readonly badge: string;
  readonly rank: string;
  readonly xp: number;
  readonly hook: string;
  readonly objectives: readonly string[];
  readonly cards: readonly ConceptCard[];
  /**
   * One connected "Explore" step instead of separate Concepts and Try-it steps (M1: concepts and
   * the interactive belong together).
   */
  readonly unified?: boolean;
  /** Interactive pieces shown in the lab step, in order. */
  readonly lab: readonly LabKind[];
  /** ISS run shown in the brief. */
  readonly featuredRunId: string;
  /** Optional LEARN_CHAPTERS id whose flight-data notes and citations appear in the brief. */
  readonly flightNotesChapterId?: string;
  readonly gate: readonly GateQuestion[];
}

export const STARTING_RANK = "Cadet";

export const LEARN_MODULES: readonly LearnModule[] = [
  {
    id: "m1-fire-triangle",
    code: "M1",
    title: "What a Flame Needs",
    subtitle: "Fuel, oxygen and heat — and how solids really burn",
    badge: "First Spark",
    rank: "Fire Apprentice",
    xp: 100,
    hook: "Every fire extinguisher ever made works by taking one thing away from a flame. What are the three things a flame cannot live without?",
    objectives: [
      "Name the three ingredients of a flame.",
      "Explain how a solid plastic turns into something that can burn.",
      "Describe where a flame sits: where fuel and oxygen meet.",
    ],
    cards: [
      {
        title: "The fire triangle",
        body: "A flame needs fuel, oxygen and heat at the same time. Take any one away and it goes out. Extinguishers do exactly this: cool the flame, smother it, or cut off the fuel.",
        formula: "fuel + oxygen + heat → flame",
        refs: ["turns2012"],
      },
      {
        title: "Solids burn as vapour",
        body: "Most BASS-II samples were PMMA, the clear acrylic plastic sold as Plexiglas, alongside fabrics and other solids. A solid does not burn directly: heat from the flame turns its surface into fuel vapour, and that vapour burns.",
        refs: ["quintiere2006", "psi25"],
      },
      {
        title: "A flame is a meeting place",
        body: "In a candle or a burning plastic, fuel vapour and oxygen start apart and mix on their way to each other. The flame sits where they meet in the right proportion. Scientists call this a diffusion flame.",
        refs: ["law2006"],
      },
    ],
    unified: true,
    lab: ["fire-triangle"],
    featuredRunId: "PSI-25:B3",
    gate: [
      {
        prompt: "Which three things must be present at the same time for a flame to burn?",
        options: ["Fuel, oxygen and heat", "Fuel, nitrogen and light", "Oxygen, water and heat"],
        correctIndex: 0,
        explanation: "Fuel, oxygen and heat form the fire triangle. Remove one and the flame goes out.",
      },
      {
        prompt: "A CO₂ extinguisher pushes air away from a fire. Which side of the triangle does it remove?",
        options: ["Fuel", "Oxygen", "Heat"],
        correctIndex: 1,
        explanation: "Displacing the air starves the flame of oxygen.",
      },
      {
        prompt: "What actually burns when a PMMA rod is on fire?",
        options: ["The solid plastic itself", "Fuel vapour released from the heated surface", "The metal sample holder"],
        correctIndex: 1,
        explanation: "Heat turns the surface into vapour; the vapour mixes with oxygen and burns.",
      },
    ],
  },
  {
    id: "m2-gravity",
    code: "M2",
    title: "Flames Without Weight",
    subtitle: "Why a flame on the ISS looks nothing like a candle on Earth",
    badge: "Zero-G Initiate",
    rank: "Orbital Observer",
    xp: 150,
    hook: "On Earth a candle burns as a tall yellow teardrop. On the Space Station it becomes a dim, rounded blue glow. What changed — the flame, or the air around it?",
    objectives: [
      "Explain how hot air rising feeds a flame on Earth.",
      "Describe how oxygen reaches a flame when nothing rises.",
      "Compare flames on Earth, the Moon, Mars and in orbit.",
    ],
    cards: [
      {
        title: "On Earth, hot air rises",
        body: "A flame heats the air around it. Hot air is lighter, so it rises, and fresh oxygen-rich air flows in underneath. This is buoyancy: the flame keeps pulling in its own oxygen, which stretches it into a teardrop.",
        refs: ["law2006"],
      },
      {
        title: "In orbit, nothing rises",
        body: "The Space Station is in freefall, so hot air has no 'up' to go to and buoyancy almost vanishes. Oxygen then reaches the flame in only two ways: slow diffusion, where molecules spread on their own, or a fan that blows air past the sample. BASS-II used a fan.",
        refs: ["law2006", "psi25"],
      },
      {
        title: "The Moon and Mars sit in between",
        body: "The Moon and Mars have weaker gravity than Earth, so buoyancy still exists but is gentler. A spacecraft coasting between planets is in freefall like the ISS. Future habitats will need fire-safety rules for each of these places.",
        refs: ["nasaFactSheet", "link2018"],
      },
    ],
    lab: ["gravity-worlds", "gravity-compare"],
    featuredRunId: "PSI-25:B3",
    flightNotesChapterId: "ch-1-round-blue",
    gate: [
      {
        prompt: "On Earth, what keeps feeding fresh oxygen to a candle flame?",
        options: ["Hot air rising and fresh air flowing in (buoyancy)", "Oxygen stored in the wax", "Light from the flame pushing air"],
        correctIndex: 0,
        explanation: "Buoyancy drives a steady flow of fresh air into the flame.",
      },
      {
        prompt: "In BASS-II on the ISS, how did the experimenters control the oxygen supply to the flame?",
        options: ["By tilting the sample", "With a fan that blew air through the test duct", "By heating the cabin"],
        correctIndex: 1,
        explanation: "Without buoyancy, a fan-driven duct flow set how fast fresh air reached the flame.",
      },
      {
        prompt: "Where would buoyancy around a flame be weakest?",
        options: ["On Mars", "On the Moon", "On a spacecraft coasting in orbit"],
        correctIndex: 2,
        explanation: "A coasting spacecraft is in freefall, so buoyancy almost disappears; the Moon and Mars still have some gravity.",
      },
    ],
  },
  {
    id: "m3-two-ways-out",
    code: "M3",
    title: "Two Ways a Flame Goes Out",
    subtitle: "Blowoff, quenching and the U-shaped map between them",
    badge: "U-Curve Navigator",
    rank: "Flame Navigator",
    xp: 200,
    hook: "More air means more oxygen. So how can the same fan both rescue a dying flame and blow it out?",
    objectives: [
      "Tell blowoff and quenching apart.",
      "Read the U-shaped flammability map.",
      "Explain the 'time to react' idea behind both limits.",
    ],
    cards: [
      {
        title: "Blowoff: too much wind",
        body: "If the fan is too strong, the gas rushes past the flame before it has time to react. The flame is blown away even though oxygen is plentiful — just like blowing out a birthday candle.",
        refs: ["olsonFerkul2017", "nasaTm2021"],
      },
      {
        title: "Quenching: too little air",
        body: "If the fan is too weak, oxygen arrives slowly and the flame shrinks. A flame always loses some heat by glowing (radiation). When it loses heat faster than it makes it, it cools and goes out. The problem is the heat balance, not just the oxygen.",
        refs: ["tien1986", "olsonFerkul2017"],
      },
      {
        title: "The U-shaped map",
        body: "Plot airflow across and the oxygen a flame needs upward, and the boundary is shaped like a U. The left arm is quenching, the right arm is blowoff, and the bottom is where burning is easiest. Both limits share one idea: the gas must stay near the flame long enough for the chemistry to happen.",
        formula: "time near the flame  vs  time to react",
        refs: ["olsonFerkul2017", "nasaTm2021"],
      },
    ],
    lab: ["u-curve", "airflow-regime"],
    featuredRunId: "PSI-25:O13a",
    flightNotesChapterId: "ch-4-airflow-regimes",
    gate: [
      {
        prompt: "A flame goes out because the fan is so strong the gas passes before it can react. What is this called?",
        options: ["Quenching", "Blowoff", "Ignition"],
        correctIndex: 1,
        explanation: "Blowoff happens on the fast-flow side of the U.",
      },
      {
        prompt: "Why does a flame quench when the airflow is very weak?",
        options: [
          "It loses heat by radiation faster than it produces heat",
          "The fan blows it away",
          "Oxygen becomes poisonous at low speed",
        ],
        correctIndex: 0,
        explanation: "With little oxygen arriving, heat release falls below the radiative loss and the flame cools out.",
      },
      {
        prompt: "On the U-shaped map, where is burning easiest?",
        options: ["At the far left (very weak flow)", "Near the bottom of the U, at moderate flow", "At the far right (very strong flow)"],
        correctIndex: 1,
        explanation: "The bottom of the U needs the least oxygen: neither too little nor too much flow.",
      },
    ],
  },
  {
    id: "m4-oxygen",
    code: "M4",
    title: "Oxygen and the Edge of Burning",
    subtitle: "Why passing a test on Earth is not enough for space",
    badge: "Limit Seeker",
    rank: "Limit Analyst",
    xp: 250,
    hook: "Spacecraft materials are tested on the ground before they fly. If a material will not burn in a ground test, is it safe in orbit?",
    objectives: [
      "Explain why more oxygen makes a hotter flame.",
      "Describe what BASS-II found about oxygen limits in microgravity.",
      "Tell 'starting a fire' apart from 'keeping a fire going'.",
    ],
    cards: [
      {
        title: "More oxygen, hotter flame",
        body: "Air is mostly nitrogen, which soaks up heat without burning. When the share of oxygen goes up, less nitrogen has to be heated, so the flame gets hotter and spreads more easily.",
        refs: ["turns2012"],
      },
      {
        title: "Space flames can survive on less oxygen",
        body: "BASS-II showed that, with a gentle airflow, some materials keep burning in microgravity at lower oxygen levels than ground tests would suggest. A material that passes an Earth test may still burn in orbit — a key message for spacecraft fire safety.",
        refs: ["olsonFerkul2017", "nasaTm2021"],
      },
      {
        title: "Starting vs keeping a fire",
        body: "Lighting a new fire takes more than keeping an existing one alive. There is a band of oxygen where a new fire will not start but a fire that is already burning can continue. A safety panel should show that difference.",
        refs: ["nasaTm2021"],
      },
      {
        title: "Into the wind or with it",
        body: "Air can flow against the direction a flame spreads (opposed flow) or along with it (concurrent flow). Flying with the wind, the flame preheats the fuel ahead of it; against the wind it creeps forward more slowly.",
        refs: ["quintiere2006", "psi25"],
      },
    ],
    lab: ["oxygen-threshold", "wind-tunnel"],
    featuredRunId: "PSI-25:O4",
    flightNotesChapterId: "ch-3-oxygen-limit",
    gate: [
      {
        prompt: "Why does raising the oxygen share make a flame hotter?",
        options: ["Less nitrogen has to be heated", "Oxygen is itself a fuel", "Oxygen makes the air heavier"],
        correctIndex: 0,
        explanation: "Nitrogen absorbs heat without burning; less of it means a hotter flame.",
      },
      {
        prompt: "What did BASS-II show about materials that do not burn in ground tests?",
        options: [
          "They can never burn anywhere",
          "Some can keep burning in microgravity at lower oxygen than ground tests suggest",
          "They burn only on Mars",
        ],
        correctIndex: 1,
        explanation: "Ground test results are not automatically safe for orbit.",
      },
      {
        prompt: "In the band between the 'start' and 'keep burning' limits, what happens?",
        options: [
          "A new fire will not start, but an existing fire may continue",
          "Any fire goes out immediately",
          "Fires start more easily than they continue",
        ],
        correctIndex: 0,
        explanation: "Keeping a flame alive needs less than lighting a new one.",
      },
    ],
  },
  {
    id: "m5-smoke",
    code: "M5",
    title: "Reading the Smoke",
    subtitle: "What gases and flicker tell us about a flame",
    badge: "Smoke Reader",
    rank: "Fire Safety Officer",
    xp: 300,
    hook: "A sensor reports carbon monoxide after a burn. Was the flame dangerous, or just inefficient — and could we have seen it going out before it did?",
    objectives: [
      "Tell complete and incomplete burning apart.",
      "Explain why a gas ratio is not the same as a danger level.",
      "Describe the flicker some flames show before going out.",
      "Store a reading like '> value' honestly.",
    ],
    cards: [
      {
        title: "Complete vs incomplete burning",
        body: "When burning is complete, the carbon in the fuel leaves as carbon dioxide and the hydrogen as water. When it is incomplete, some carbon leaves as carbon monoxide (CO), a toxic gas.",
        formula: "fuel + O_{2} → CO_{2} + H_{2}O   (+ CO if incomplete)",
        refs: ["turns2012"],
      },
      {
        title: "A ratio is not an alarm",
        body: "Comparing CO to CO₂ shows how complete the burning was, not how dangerous the air is. Even normal BASS-II flames were not perfectly efficient. Toxicity depends on how much CO is in the air you breathe.",
        refs: ["nasaTm2021", "psi25"],
      },
      {
        title: "A flicker before going out",
        body: "Close to quenching, a flame can pulse in brightness a few times before it dies. A light sensor (radiometer) can see this. It was seen in a small number of slow-flow tests, so it is an early-warning candidate, not a proven alarm.",
        refs: ["nasaTm2021"],
      },
      {
        title: "Honest data",
        body: "Some sensor cells read '> value': the true reading is only known to be above that number. Treating it as exact would understate it, so the catalogue keeps the bound and the original cell.",
        refs: ["psi25"],
      },
    ],
    lab: ["geometry-caveats"],
    featuredRunId: "PSI-25:M5",
    flightNotesChapterId: "ch-5-geometry-caveats",
    gate: [
      {
        prompt: "Which gas shows that burning was incomplete?",
        options: ["Carbon monoxide (CO)", "Nitrogen", "Water vapour"],
        correctIndex: 0,
        explanation: "CO appears when some carbon is not fully burned to CO₂.",
      },
      {
        prompt: "Why can't a high CO/CO₂ ratio alone trigger a toxic-gas alarm?",
        options: [
          "The ratio describes burning efficiency, not how much CO is in the air",
          "CO is never toxic in space",
          "CO₂ is more toxic than CO",
        ],
        correctIndex: 0,
        explanation: "Danger depends on CO concentration; the ratio only describes how complete the burning was.",
      },
      {
        prompt: "A sensor cell reads '> value'. How should it be stored?",
        options: ["As a lower bound, keeping the original cell", "As exactly that value", "Deleted as an error"],
        correctIndex: 0,
        explanation: "The true value exceeds the bound; storing it as exact would bias results low.",
      },
    ],
  },
];

export const TOTAL_XP = LEARN_MODULES.reduce((sum, m) => sum + m.xp, 0);
