import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ExperimentDataset, InvestigationManifest } from "@/types/experiment";
import { validateDataset, validateManifest, type ValidationResult } from "@/types/validate";

import { isRegisteredAccession } from "@/lib/psi/config";

const datasets = new Map<string, ExperimentDataset>();
const manifests = new Map<string, InvestigationManifest>();

function load<T extends { accession: string }>(
  accession: string,
  filename: string,
  cache: Map<string, T>,
  validate: (json: unknown) => ValidationResult<T>,
): T {
  const normalized = accession.toUpperCase();
  if (!isRegisteredAccession(normalized)) throw new Error(`Unknown PSI accession: ${accession}`);

  const cached = cache.get(normalized);
  if (cached) return cached;

  const path = join(process.cwd(), "public", "data", normalized.toLowerCase(), filename);
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    throw new Error(`Cannot read ${normalized}/${filename}`, { cause });
  }

  const result = validate(json);
  if (!result.ok) {
    throw new Error(`${normalized}/${filename} failed validation:\n${result.errors.join("\n")}`);
  }
  if (result.data.accession !== normalized) {
    throw new Error(`${normalized}/${filename} contains accession ${result.data.accession}`);
  }

  cache.set(normalized, result.data);
  return result.data;
}

/** Server-side loaders. Treat their cached return values as read-only. */
export function getDataset(accession = "PSI-25"): ExperimentDataset {
  return load(accession, "experiments.json", datasets, validateDataset);
}

export function getManifest(accession = "PSI-25"): InvestigationManifest {
  return load(accession, "manifest.json", manifests, validateManifest);
}
