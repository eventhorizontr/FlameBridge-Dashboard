"use client";

import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { preferencesStore, type Preferences } from "./preferences";
import { dashboardStore, type DashboardStore } from "./store";

/**
 * Subscribe to a slice of the dashboard. Return primitives or stable references; when you
 * must return a new object/array, use `useDashboardShallow` to avoid re-render loops.
 */
export function useDashboard<T>(selector: (s: DashboardStore) => T): T {
  return useStore(dashboardStore, selector);
}

export function useDashboardShallow<T extends object>(selector: (s: DashboardStore) => T): T {
  return useStore(dashboardStore, useShallow(selector));
}

/** Stable dispatch — the only way components change dashboard state. */
export function useDispatch(): DashboardStore["dispatch"] {
  return useStore(dashboardStore, (s) => s.dispatch);
}

export function usePreferences<T>(selector: (s: Preferences) => T): T {
  return useStore(preferencesStore, selector);
}
