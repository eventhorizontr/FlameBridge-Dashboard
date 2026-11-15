"use client";

import { createContext, useContext } from "react";

/** Compact run list for global search (built server-side, passed through the shell). */
export interface RunDirectoryEntry {
  id: string;
  testId: string;
  pi: string;
  fuel: string;
  o2: number | null;
  video: boolean;
}

export const RunDirectoryContext = createContext<RunDirectoryEntry[]>([]);

export function useRunDirectory(): RunDirectoryEntry[] {
  return useContext(RunDirectoryContext);
}
