import type { Experiment } from "@/types/experiment";

import { getDataset } from "./loaders";
import { getExperiment as lookupExperiment } from "./queries";

export { getDataset, getManifest } from "./loaders";
export { facetCounts, filterExperiments, parameterRanges, representativeAirflow } from "./queries";

/** Look up a bundled experiment by full ID or a short ID in the selected accession. */
export function getExperiment(id: string, accession?: string): Experiment | undefined {
  const embeddedAccession = /^(PSI-\d+):/i.exec(id.trim())?.[1];
  return lookupExperiment(id, getDataset(accession ?? embeddedAccession).experiments);
}
