/**
 * DASHBOARD CONTRACT — filters, lab parameters and the action vocabulary shared by the UI and
 * the AI assistant. Owner: Claude. Change only via a `contract` PR (see AGENTS.md §2.3).
 */
import type { FlameOverlay } from "./vision";
import type { FlowConfiguration, FuelGeometry, FuelMaterial } from "./experiment";

export type UserMode = "expert" | "learn";

/** Closed numeric interval; either bound may be omitted. */
export interface Range {
  min?: number;
  max?: number;
}

export interface ExperimentFilters {
  investigations: string[];
  principalInvestigators: string[];
  materials: FuelMaterial[];
  geometries: FuelGeometry[];
  flowConfigurations: FlowConfiguration[];
  o2InitialPct: Range;
  /** Matches if ANY air-flow set-point of the run falls in range. */
  airflowCmS: Range;
  hasVideo: boolean | null;
  /** true = only runs with QA flags, false = only clean runs, null = all. */
  hasQaFlags: boolean | null;
  text: string;
}

export const EMPTY_FILTERS: ExperimentFilters = {
  investigations: [],
  principalInvestigators: [],
  materials: [],
  geometries: [],
  flowConfigurations: [],
  o2InitialPct: {},
  airflowCmS: {},
  hasVideo: null,
  hasQaFlags: null,
  text: "",
};

/** What-if Lab query. Numeric fields are what the user dials in; nothing here is a result. */
export interface LabParams {
  o2Pct: number;
  airflowCmS: number;
  material: FuelMaterial;
  geometry: FuelGeometry;
  /** Thickness (film/slab) or diameter (rod/sphere), mm. */
  characteristicSizeMm: number | null;
  /** Total pressure in kPa; null = pressure not part of the query (ADR-021). */
  pressureKpa: number | null;
  k: number;
}

export interface LabMatch {
  experimentId: string;
  /** Normalized distance, 0 = identical on all compared features. */
  distance: number;
  /** Per-feature (query − experiment) deltas in source units; null when not comparable. */
  deltas: Record<"o2Pct" | "airflowCmS" | "characteristicSizeMm" | "pressureKpa", number | null>;
  categoricalMismatches: ("material" | "geometry")[];
}

export interface LabResult {
  params: LabParams;
  matches: LabMatch[];
  /** False when the query lies outside the measured envelope — UI must warn, never extrapolate. */
  insideEnvelope: boolean;
  method: string;
  /** Whether any measured run can speak to the queried pressure (ADR-021). */
  pressure: PressureCoverage;
}

/** What the source says about pressure for one investigation (verbatim, with file). */
export interface SeriesPressureStatement {
  accession: string;
  basis: "recorded" | "stated-for-series" | "not-stated";
  /** Verbatim sentence from the PSI file, or null when the files are silent. */
  quote: string | null;
  file: string;
  note: string;
}

/**
 * Pressure coverage of a Lab query (ADR-021).
 * - not-queried: pressureKpa is null.
 * - not-recorded: no run states a pressure → the pressure dimension is untested here.
 * - matched / near / outside: nearest stated pressure within ×1.10 / ×1.30 / beyond.
 */
export interface PressureCoverage {
  status: "not-queried" | "not-recorded" | "matched" | "near" | "outside";
  queryKpa: number | null;
  runsWithPressure: number;
  recordedRangeKpa: [number, number] | null;
  /** max(query, run) / min(query, run) for the closest stated pressure; ≥ 1. */
  nearestRatio: number | null;
  /** O₂ partial pressure of the query, kPa = O₂ fraction × total pressure (Dalton). */
  queryO2PartialPressureKpa: number | null;
  sources: SeriesPressureStatement[];
  note: string;
}

/** Every UI state change, from a click or from the AI, is one of these. */
export type DashboardAction =
  | { type: "setMode"; mode: UserMode }
  | { type: "setFilters"; filters: Partial<ExperimentFilters> }
  | { type: "resetFilters" }
  | { type: "selectExperiments"; ids: string[] }
  | { type: "openExperiment"; id: string }
  | { type: "compare"; ids: string[] }
  | { type: "seekVideo"; experimentId: string; videoId: string; timeS: number }
  | { type: "setLabParams"; params: Partial<LabParams> }
  | { type: "navigate"; route: "/" | "/overview" | "/explore" | "/compare" | "/lab" | "/learn" | `/experiments/${string}` }
  | { type: "highlight"; target: string }
  | { type: "setFlameOverlay"; overlay: Partial<FlameOverlay> };

export type DashboardActionType = DashboardAction["type"];
