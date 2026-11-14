/**
 * DASHBOARD CONTRACT — filters, lab parameters and the action vocabulary shared by the UI and
 * the AI assistant. Owner: Claude. Change only via a `contract` PR (see AGENTS.md §2.3).
 */
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
  k: number;
}

export interface LabMatch {
  experimentId: string;
  /** Normalized distance, 0 = identical on all compared features. */
  distance: number;
  /** Per-feature (query − experiment) deltas in source units; null when not comparable. */
  deltas: Record<"o2Pct" | "airflowCmS" | "characteristicSizeMm", number | null>;
  categoricalMismatches: ("material" | "geometry")[];
}

export interface LabResult {
  params: LabParams;
  matches: LabMatch[];
  /** False when the query lies outside the measured envelope — UI must warn, never extrapolate. */
  insideEnvelope: boolean;
  method: string;
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
  | { type: "navigate"; route: "/" | "/explore" | "/compare" | "/lab" | "/learn" | `/experiments/${string}` }
  | { type: "highlight"; target: string };

export type DashboardActionType = DashboardAction["type"];
