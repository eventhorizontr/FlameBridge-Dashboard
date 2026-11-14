/**
 * Server-side read access to the published datasets for the AI tools.
 *
 * Thin layer over Codex's validated data API (`@/lib/data`, #4): loading, caching, validation and
 * filter semantics live there. This module only scopes the assistant to the loaded accession and
 * derives the facts the system prompt states.
 */
import { facetCounts, filterExperiments, getDataset, getExperiment as lookupExperiment, parameterRanges } from "@/lib/data";
import type { Experiment, ExperimentDataset } from "@/types/experiment";

export { filterExperiments };

/** The dataset the assistant answers about (PSI-25 today). Cached and validated by `@/lib/data`. */
export function loadDataset(): ExperimentDataset {
  return getDataset();
}

export function loadExperiments(): Experiment[] {
  return loadDataset().experiments;
}

/**
 * Full id ("PSI-25:B1") or bare test id ("B1"), case-insensitive. Scoped to the loaded accession,
 * so an id from another investigation is "not found" instead of loading or throwing.
 */
export function getExperiment(id: string): Experiment | undefined {
  return lookupExperiment(id, loadDataset().accession);
}

/** Facts the system prompt states about the dataset — computed, never typed by hand. */
export function datasetFacts() {
  const d = loadDataset();
  const ex = d.experiments;
  const facets = facetCounts(ex);
  return {
    accession: d.accession,
    doi: d.doi,
    license: d.license,
    runs: ex.length,
    runsWithVideo: facets.hasVideo.yes,
    runsWithQaFlags: facets.hasQaFlags.yes,
    parse: [...new Set(ex.map((e) => e.qa.parse))],
    o2InitialPct: parameterRanges(ex).o2InitialPct,
    principalInvestigators: facets.principalInvestigators,
    materials: facets.materials,
    geometries: facets.geometries,
    flowConfigurations: facets.flowConfigurations,
  };
}

/** Experiment ids → their video ids, for validating AI-proposed dashboard actions. */
export function catalogIndex(): Map<string, Set<string>> {
  return new Map(loadExperiments().map((e) => [e.id, new Set(e.videos.map((v) => v.id))]));
}
