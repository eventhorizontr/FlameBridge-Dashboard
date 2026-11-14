import type { Experiment } from "@/types/experiment";

import { isRegisteredAccession } from "@/lib/psi/config";

import { getDataset } from "./loaders";
import { getExperiment as lookupExperiment } from "./queries";

export { getDataset, getManifest } from "./loaders";
export { facetCounts, filterExperiments, parameterRanges, representativeAirflow } from "./queries";

/** Look up a bundled experiment by full ID or a short ID in the selected accession. */
export function getExperiment(id: string, accession?: string): Experiment | undefined {
  const embeddedAccession = /^(PSI-\d+):/i.exec(id.trim())?.[1];
  const selected = (accession ?? embeddedAccession ?? "PSI-25").toUpperCase();
  if (!isRegisteredAccession(selected)) return undefined;
  try {
    return lookupExperiment(id, getDataset(selected).experiments);
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return undefined;
    throw error;
  }
}
