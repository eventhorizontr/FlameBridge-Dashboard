/**
 * Dashboard state shape and defaults. Owner: Claude (ADR-007).
 * Everything here changes only through `dispatch(DashboardAction)` — see store.ts.
 */
import { EMPTY_FILTERS, type ExperimentFilters, type LabParams, type UserMode } from "@/types/dashboard";
import type { FlameOverlay } from "@/types/vision";

export interface VideoCursor {
  experimentId: string;
  videoId: string;
  timeS: number;
  /** Bumped on every seek so seeking to the same time twice still fires. */
  seq: number;
}

export interface Highlight {
  target: string;
  seq: number;
}

/** The undoable, URL-shareable part of the dashboard. */
export interface DashboardData {
  mode: UserMode;
  filters: ExperimentFilters;
  selection: string[];
  openExperimentId: string | null;
  compareIds: string[];
  videoCursor: VideoCursor | null;
  labParams: LabParams;
  /** Current pathname (kept in sync with the router by <DashboardRuntime/>). */
  route: string;
  highlight: Highlight | null;
  /** How the flame viewer draws the vision layer over the footage. */
  flameOverlay: FlameOverlay;
}

export type DashboardKey = keyof DashboardData;

/**
 * Lab starting point = the centre of the measured PSI-25 envelope, not a guess:
 * median initial O₂ 18.2 %, median flow set-point 5 cm/s, most-flown fuel PMMA rod Ø 6.35 mm
 * (31 runs). Recompute if the dataset changes materially.
 */
export const DEFAULT_LAB_PARAMS: LabParams = {
  o2Pct: 18.2,
  airflowCmS: 5,
  material: "PMMA",
  geometry: "rod",
  characteristicSizeMm: 6.35,
  k: 5,
};

export const INITIAL_DATA: DashboardData = {
  mode: "expert",
  filters: EMPTY_FILTERS,
  selection: [],
  openExperimentId: null,
  compareIds: [],
  videoCursor: null,
  labParams: DEFAULT_LAB_PARAMS,
  route: "/",
  highlight: null,
  flameOverlay: { mode: "box", follow: false },
};
