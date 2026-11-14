import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getExperiment as getCatalogExperiment, loadDataset } from "@/lib/ai/catalog";
import type { Experiment, ExperimentDataset, InvestigationManifest } from "@/types/experiment";
import { validateManifest } from "@/types/validate";

let cachedManifest: InvestigationManifest | null = null;

/**
 * Server-side validated bridge over PSI-25 dataset and manifest. Keeps components decoupled
 * from raw JSON imports and swaps cleanly to `@/lib/data` once PR #27 merges.
 */
export function loadPsi25Dataset(): ExperimentDataset {
  return loadDataset();
}

export function loadPsi25Experiment(id: string): Experiment | undefined {
  return getCatalogExperiment(id);
}

export function loadPsi25Manifest(): InvestigationManifest {
  if (cachedManifest) return cachedManifest;
  const path = join(process.cwd(), "public", "data", "psi-25", "manifest.json");
  const json: unknown = JSON.parse(readFileSync(path, "utf8"));
  const result = validateManifest(json);
  if (!result.ok) {
    throw new Error(`PSI-25 manifest failed validation:\n${result.errors.slice(0, 10).join("\n")}`);
  }
  cachedManifest = result.data;
  return cachedManifest;
}
