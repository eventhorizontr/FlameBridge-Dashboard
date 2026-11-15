import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";

import type { RunDirectoryEntry } from "./run-directory";

/** Server-side: the run directory for the global search (⌘K). */
export function runDirectory(): RunDirectoryEntry[] {
  return loadPsi25Dataset().experiments.map((e) => ({
    id: e.id,
    testId: e.testId,
    pi: e.principalInvestigator,
    fuel: e.fuel.raw,
    o2: e.conditions.o2InitialPct,
    video: e.videos.length > 0,
  }));
}
