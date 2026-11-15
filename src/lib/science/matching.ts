import { getDataset } from "@/lib/data";
import type { LabParams, LabResult } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";

import { matchExperiments } from "./match-experiments";

/** Match against the published PSI-25 data unless the caller supplies a catalog. */
export function findClosestExperiments(
  params: LabParams,
  experiments: readonly Experiment[] = getDataset().experiments,
): LabResult {
  return matchExperiments(params, experiments);
}
