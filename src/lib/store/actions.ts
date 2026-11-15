/**
 * Action registry: for every `DashboardAction` type — its reducer, the state keys it touches
 * (used for snapshot-based undo), whether undo is meaningful, and a human label for the
 * assistant timeline. Validation lives in `@/types/schemas` (DashboardActionSchema).
 */
import type { DashboardAction, ExperimentFilters, Range } from "@/types/dashboard";
import { EMPTY_FILTERS } from "@/types/dashboard";

import type { DashboardData, DashboardKey } from "./state";

type ActionOf<T extends DashboardAction["type"]> = Extract<DashboardAction, { type: T }>;

interface ActionSpec<T extends DashboardAction["type"]> {
  /** State keys this action may change — snapshotted before applying, restored on undo. */
  touches: readonly DashboardKey[];
  undoable: boolean;
  reduce: (state: DashboardData, action: ActionOf<T>, seq: number) => Partial<DashboardData>;
  label: (action: ActionOf<T>, before: DashboardData) => string;
}

type Registry = { [T in DashboardAction["type"]]: ActionSpec<T> };

const ROUTE_NAMES: Record<string, string> = {
  "/": "Landing page",
  "/overview": "Mission overview",
  "/explore": "Experiment explorer",
  "/compare": "Compare",
  "/lab": "What-if Lab",
  "/learn": "Explore & Learn",
};

/** "PSI-25:O13a" → "O13a" for labels. */
export const runLabel = (id: string): string => id.split(":").slice(1).join(":") || id;

const fmtRange = (r: Range, unit: string): string | null => {
  if (r.min === undefined && r.max === undefined) return null;
  if (r.min !== undefined && r.max !== undefined) return `${r.min}–${r.max} ${unit}`;
  return r.min !== undefined ? `≥ ${r.min} ${unit}` : `≤ ${r.max} ${unit}`;
};

const fmtTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${rest}`;
};

const OVERLAY_LABELS = {
  off: "off",
  box: "bounding frame",
  outline: "flame outline",
  isolate: "flame only",
} as const;

const isExperimentRoute = (route: string) => route.startsWith("/experiments/");

export const routeForExperiment = (id: string) => `/experiments/${encodeURIComponent(id)}` as const;

/** Short description of a (partial) filter set, e.g. "PMMA · rod · O₂ 15–18 %". */
export function describeFilters(f: Partial<ExperimentFilters>): string {
  const parts: string[] = [];
  if (f.materials?.length) parts.push(f.materials.join(", "));
  if (f.geometries?.length) parts.push(f.geometries.join(", "));
  if (f.flowConfigurations?.length) parts.push(`${f.flowConfigurations.join(", ")} flow`);
  if (f.principalInvestigators?.length) parts.push(`PI ${f.principalInvestigators.join(", ")}`);
  if (f.investigations?.length) parts.push(f.investigations.join(", "));
  const o2 = f.o2InitialPct && fmtRange(f.o2InitialPct, "% O₂");
  if (o2) parts.push(o2);
  const air = f.airflowCmS && fmtRange(f.airflowCmS, "cm/s");
  if (air) parts.push(air);
  if (f.hasVideo === true) parts.push("with video");
  if (f.hasVideo === false) parts.push("without video");
  if (f.hasQaFlags === true) parts.push("QA-flagged only");
  if (f.hasQaFlags === false) parts.push("clean rows only");
  if (f.text) parts.push(`“${f.text}”`);
  return parts.join(" · ");
}

export const ACTIONS: Registry = {
  setMode: {
    touches: ["mode"],
    undoable: true,
    reduce: (_s, a) => ({ mode: a.mode }),
    label: (a) => (a.mode === "learn" ? "Switched to Explore & Learn" : "Switched to Expert mode"),
  },
  setFilters: {
    touches: ["filters"],
    undoable: true,
    reduce: (s, a) => ({ filters: { ...s.filters, ...a.filters } }),
    label: (a) => {
      const d = describeFilters(a.filters);
      return d ? `Filtered to ${d}` : "Cleared some filters";
    },
  },
  resetFilters: {
    touches: ["filters"],
    undoable: true,
    reduce: () => ({ filters: EMPTY_FILTERS }),
    label: () => "Reset all filters",
  },
  selectExperiments: {
    touches: ["selection"],
    undoable: true,
    reduce: (_s, a) => ({ selection: [...new Set(a.ids)] }),
    label: (a) =>
      a.ids.length === 0
        ? "Cleared selection"
        : a.ids.length <= 3
          ? `Selected ${a.ids.map(runLabel).join(", ")}`
          : `Selected ${a.ids.length} runs`,
  },
  openExperiment: {
    touches: ["openExperimentId", "route"],
    undoable: true,
    reduce: (_s, a) => ({ openExperimentId: a.id, route: routeForExperiment(a.id) }),
    label: (a) => `Opened run ${runLabel(a.id)}`,
  },
  compare: {
    touches: ["compareIds", "route"],
    undoable: true,
    reduce: (_s, a) => ({ compareIds: [...new Set(a.ids)], route: "/compare" }),
    label: (a) => `Comparing ${a.ids.map(runLabel).join(" vs ")}`,
  },
  seekVideo: {
    touches: ["videoCursor"],
    undoable: true,
    reduce: (_s, a, seq) => ({
      videoCursor: { experimentId: a.experimentId, videoId: a.videoId, timeS: a.timeS, seq },
    }),
    label: (a) => `Jumped to ${fmtTime(a.timeS)} in ${runLabel(a.experimentId)}`,
  },
  setLabParams: {
    touches: ["labParams"],
    undoable: true,
    reduce: (s, a) => ({ labParams: { ...s.labParams, ...a.params } }),
    label: (a) => {
      const p = a.params;
      const parts: string[] = [];
      if (p.o2Pct !== undefined) parts.push(`O₂ ${p.o2Pct} %`);
      if (p.airflowCmS !== undefined) parts.push(`flow ${p.airflowCmS} cm/s`);
      if (p.material) parts.push(p.material);
      if (p.geometry) parts.push(p.geometry);
      if (p.characteristicSizeMm !== undefined)
        parts.push(p.characteristicSizeMm === null ? "any size" : `${p.characteristicSizeMm} mm`);
      if (p.k !== undefined) parts.push(`${p.k} matches`);
      return `Set What-if Lab: ${parts.join(", ") || "no change"}`;
    },
  },
  navigate: {
    touches: ["route", "openExperimentId"],
    undoable: true,
    reduce: (s, a) => ({
      route: a.route,
      openExperimentId: isExperimentRoute(a.route)
        ? decodeURIComponent(a.route.slice("/experiments/".length))
        : s.openExperimentId,
    }),
    label: (a) =>
      isExperimentRoute(a.route)
        ? `Opened run ${runLabel(decodeURIComponent(a.route.slice("/experiments/".length)))}`
        : `Went to ${ROUTE_NAMES[a.route] ?? a.route}`,
  },
  highlight: {
    touches: ["highlight"],
    undoable: false,
    reduce: (_s, a, seq) => ({ highlight: { target: a.target, seq } }),
    label: (a) => `Highlighted ${a.target}`,
  },
  setFlameOverlay: {
    touches: ["flameOverlay"],
    undoable: true,
    reduce: (s, a) => ({ flameOverlay: { ...s.flameOverlay, ...a.overlay } }),
    label: (a) => {
      const parts: string[] = [];
      if (a.overlay.mode) parts.push(OVERLAY_LABELS[a.overlay.mode]);
      if (a.overlay.follow !== undefined) parts.push(a.overlay.follow ? "follow flame on" : "follow flame off");
      return `Flame overlay: ${parts.join(", ") || "unchanged"}`;
    },
  },
};

export function specFor<T extends DashboardAction["type"]>(type: T): ActionSpec<T> {
  return ACTIONS[type] as ActionSpec<T>;
}
