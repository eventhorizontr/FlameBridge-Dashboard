/**
 * Dashboard store (ADR-007). `dispatch` is the ONLY public mutator; the UI and the AI
 * assistant call it with the same `DashboardAction`s. Every applied action is logged with a
 * human label and a snapshot of the state it touched, so any step (or a whole AI turn) can be
 * undone exactly.
 */
import { createStore, type StoreApi } from "zustand/vanilla";

import type { DashboardAction } from "@/types/dashboard";
import { DashboardActionSchema } from "@/types/schemas";

import { runLabel, specFor } from "./actions";
import { INITIAL_DATA, type DashboardData, type DashboardKey } from "./state";

export type ActionSource = "user" | "ai";

export interface LogEntry {
  id: string;
  seq: number;
  action: DashboardAction;
  label: string;
  source: ActionSource;
  /** Actions dispatched together (one AI turn) share a group and undo together via `undo()`. */
  groupId: string | null;
  at: number;
  undoable: boolean;
  undone: boolean;
  /** Values of the touched keys before the action — restored on undo. */
  before: Partial<DashboardData>;
}

export type DispatchResult =
  | { ok: true; entry: LogEntry }
  | { ok: false; error: string };

export type BatchResult =
  | { ok: true; entries: LogEntry[] }
  | { ok: false; errors: { index: number; error: string }[] };

export interface DispatchOptions {
  source?: ActionSource;
  groupId?: string;
}

/** Known experiment ids → their video file ids. Lets dispatch reject hallucinated references. */
export type Catalog = ReadonlyMap<string, ReadonlySet<string>>;

export interface DashboardStore extends DashboardData {
  log: LogEntry[];
  /** Set when an action changed the route; <DashboardRuntime/> performs the navigation. */
  navigationRequest: { route: string; seq: number } | null;
  catalog: Catalog | null;
  seq: number;

  dispatch: (action: unknown, options?: DispatchOptions) => DispatchResult;
  /** Validate all, then apply all — or apply none. */
  dispatchMany: (actions: readonly unknown[], options?: DispatchOptions) => BatchResult;
  /** Undo the latest step (the whole group if it came from one AI turn). */
  undo: () => number;
  /** Undo this entry and everything after it. Returns the number of entries reverted. */
  undoTo: (entryId: string) => number;
  undoGroup: (groupId: string) => number;
  canUndo: () => boolean;

  /** Runtime plumbing — not actions, not logged. */
  setCatalog: (entries: readonly { id: string; videoIds: readonly string[] }[]) => void;
  hydrate: (data: Partial<DashboardData>) => void;
  syncRoute: (pathname: string) => void;
}

export const LOG_LIMIT = 50;

function formatZodError(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .slice(0, 5)
    .map((i) => `${i.path.length ? i.path.map(String).join(".") : "action"}: ${i.message}`)
    .join("; ");
}

function checkReferences(action: DashboardAction, catalog: Catalog | null): string | null {
  if (!catalog || catalog.size === 0) return null;
  const unknown = (id: string) => (catalog.has(id) ? null : `Unknown experiment ${id}`);
  switch (action.type) {
    case "selectExperiments":
    case "compare":
      return action.ids.map(unknown).find(Boolean) ?? null;
    case "openExperiment":
      return unknown(action.id);
    case "seekVideo": {
      const videos = catalog.get(action.experimentId);
      if (!videos) return `Unknown experiment ${action.experimentId}`;
      return videos.has(action.videoId)
        ? null
        : `Video ${action.videoId} does not belong to run ${runLabel(action.experimentId)}`;
    }
    case "navigate":
      return action.route.startsWith("/experiments/")
        ? unknown(decodeURIComponent(action.route.slice("/experiments/".length)))
        : null;
    default:
      return null;
  }
}

function pick(state: DashboardData, keys: readonly DashboardKey[]): Partial<DashboardData> {
  const out: Partial<Record<DashboardKey, unknown>> = {};
  for (const k of keys) out[k] = state[k];
  return out as Partial<DashboardData>;
}

export function createDashboardStore(initial: Partial<DashboardData> = {}): StoreApi<DashboardStore> {
  return createStore<DashboardStore>()((set, get) => {
    const validate = (raw: unknown): { action: DashboardAction } | { error: string } => {
      const parsed = DashboardActionSchema.safeParse(raw);
      if (!parsed.success) return { error: formatZodError(parsed.error.issues) };
      const refError = checkReferences(parsed.data, get().catalog);
      return refError ? { error: refError } : { action: parsed.data };
    };

    const apply = (action: DashboardAction, options: DispatchOptions): LogEntry => {
      const state = get();
      const seq = state.seq + 1;
      const spec = specFor(action.type);
      const before = pick(state, spec.touches);
      // `specFor` narrows by type at the call site; the registry is exhaustive over the union.
      const patch = (spec.reduce as (s: DashboardData, a: DashboardAction, q: number) => Partial<DashboardData>)(
        state,
        action,
        seq,
      );
      const label = (spec.label as (a: DashboardAction, b: DashboardData) => string)(action, state);
      const entry: LogEntry = {
        id: `a${seq}`,
        seq,
        action,
        label,
        source: options.source ?? "user",
        groupId: options.groupId ?? null,
        at: Date.now(),
        undoable: spec.undoable,
        undone: false,
        before,
      };
      const routeChanged = patch.route !== undefined && patch.route !== state.route;
      set({
        ...patch,
        seq,
        log: [...state.log, entry].slice(-LOG_LIMIT),
        ...(routeChanged ? { navigationRequest: { route: patch.route as string, seq } } : {}),
      });
      return entry;
    };

    const revertFrom = (fromSeq: number): number => {
      const state = get();
      const targets = state.log
        .filter((e) => e.seq >= fromSeq && !e.undone && e.undoable)
        .sort((a, b) => b.seq - a.seq);
      if (targets.length === 0) return 0;
      let restored: Partial<DashboardData> = {};
      for (const e of targets) restored = { ...restored, ...e.before };
      const ids = new Set(targets.map((e) => e.id));
      const seq = state.seq + 1;
      const routeChanged = restored.route !== undefined && restored.route !== state.route;
      set({
        ...restored,
        seq,
        log: state.log.map((e) => (ids.has(e.id) ? { ...e, undone: true } : e)),
        ...(routeChanged ? { navigationRequest: { route: restored.route as string, seq } } : {}),
      });
      return targets.length;
    };

    return {
      ...INITIAL_DATA,
      ...initial,
      log: [],
      navigationRequest: null,
      catalog: null,
      seq: 0,

      dispatch: (raw, options = {}) => {
        const v = validate(raw);
        if ("error" in v) return { ok: false, error: v.error };
        return { ok: true, entry: apply(v.action, options) };
      },

      dispatchMany: (raws, options = {}) => {
        const validated = raws.map(validate);
        const errors = validated.flatMap((v, index) => ("error" in v ? [{ index, error: v.error }] : []));
        if (errors.length) return { ok: false, errors };
        const entries = validated.map((v) => apply((v as { action: DashboardAction }).action, options));
        return { ok: true, entries };
      },

      undo: () => {
        const last = [...get().log].reverse().find((e) => !e.undone && e.undoable);
        if (!last) return 0;
        return last.groupId ? get().undoGroup(last.groupId) : revertFrom(last.seq);
      },

      undoTo: (entryId) => {
        const entry = get().log.find((e) => e.id === entryId);
        return entry ? revertFrom(entry.seq) : 0;
      },

      undoGroup: (groupId) => {
        const first = get().log.find((e) => e.groupId === groupId);
        return first ? revertFrom(first.seq) : 0;
      },

      canUndo: () => get().log.some((e) => !e.undone && e.undoable),

      setCatalog: (entries) =>
        set({ catalog: new Map(entries.map((e) => [e.id, new Set(e.videoIds)] as const)) }),

      hydrate: (data) => set(data),

      syncRoute: (pathname) => {
        const state = get();
        if (state.route === pathname) return;
        const openExperimentId = pathname.startsWith("/experiments/")
          ? decodeURIComponent(pathname.slice("/experiments/".length))
          : state.openExperimentId;
        set({ route: pathname, openExperimentId });
      },
    };
  });
}

/** App-wide singleton (client). Server components never read it. */
export const dashboardStore = createDashboardStore();
