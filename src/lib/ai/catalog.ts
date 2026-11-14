/**
 * Server-side read access to the published datasets for the AI tools.
 *
 * INTERIM (#9): reads the bundled JSON directly and implements the documented filter semantics
 * of `ExperimentFilters`. When Codex's `src/lib/data` query API (#4) lands, `filterExperiments`
 * and `loadExperiments` delegate to it — the tool layer does not change.
 */
import experimentsJson from "../../../public/data/psi-25/experiments.json";

import type { ExperimentFilters } from "@/types/dashboard";
import type { Experiment, ExperimentDataset } from "@/types/experiment";
import { validateDataset } from "@/types/validate";

let cached: ExperimentDataset | null = null;

export function loadDataset(): ExperimentDataset {
  if (cached) return cached;
  const result = validateDataset(experimentsJson);
  if (!result.ok) {
    throw new Error(`PSI-25 dataset failed validation:\n${result.errors.slice(0, 10).join("\n")}`);
  }
  cached = result.data;
  return cached;
}

export function loadExperiments(): Experiment[] {
  return loadDataset().experiments;
}

export function getExperiment(id: string): Experiment | undefined {
  return loadExperiments().find((e) => e.id === id || e.testId.toLowerCase() === id.toLowerCase());
}

const inRange = (v: number | null, r: { min?: number; max?: number }) =>
  v !== null && (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max);
const rangeSet = (r: { min?: number; max?: number }) => r.min !== undefined || r.max !== undefined;

/** Semantics documented on `ExperimentFilters` (src/types/dashboard.ts). Empty = no constraint. */
export function filterExperiments(all: readonly Experiment[], f: Partial<ExperimentFilters>): Experiment[] {
  const text = f.text?.trim().toLowerCase();
  return all.filter((e) => {
    if (f.investigations?.length && !f.investigations.includes(e.investigation)) return false;
    if (f.principalInvestigators?.length && !f.principalInvestigators.includes(e.principalInvestigator)) return false;
    if (f.materials?.length && (!e.fuel.material || !f.materials.includes(e.fuel.material))) return false;
    if (f.geometries?.length && (!e.fuel.geometry || !f.geometries.includes(e.fuel.geometry))) return false;
    if (f.flowConfigurations?.length && (!e.flowConfiguration || !f.flowConfigurations.includes(e.flowConfiguration)))
      return false;
    if (f.o2InitialPct && rangeSet(f.o2InitialPct) && !inRange(e.conditions.o2InitialPct, f.o2InitialPct)) return false;
    if (
      f.airflowCmS &&
      rangeSet(f.airflowCmS) &&
      !e.conditions.airflowSetpointsCmS.some((v) => inRange(v, f.airflowCmS as { min?: number; max?: number }))
    )
      return false;
    if (f.hasVideo === true && e.videos.length === 0) return false;
    if (f.hasVideo === false && e.videos.length > 0) return false;
    if (f.hasQaFlags === true && e.qa.flags.length === 0) return false;
    if (f.hasQaFlags === false && e.qa.flags.length > 0) return false;
    if (text) {
      const hay = [e.testId, e.sampleId, e.fuel.raw, e.principalInvestigator, ...e.outcomeHints].join(" ").toLowerCase();
      if (!hay.includes(text)) return false;
    }
    return true;
  });
}

/** Facts the system prompt states about the dataset — computed, never typed by hand. */
export function datasetFacts() {
  const d = loadDataset();
  const ex = d.experiments;
  const o2 = ex.map((e) => e.conditions.o2InitialPct).filter((v): v is number => v !== null);
  const count = <K extends string>(keys: (K | null)[]) =>
    keys.reduce<Record<string, number>>((acc, k) => ((acc[k ?? "unknown"] = (acc[k ?? "unknown"] ?? 0) + 1), acc), {});
  return {
    accession: d.accession,
    doi: d.doi,
    license: d.license,
    runs: ex.length,
    runsWithVideo: ex.filter((e) => e.videos.length > 0).length,
    runsWithQaFlags: ex.filter((e) => e.qa.flags.length > 0).length,
    parse: [...new Set(ex.map((e) => e.qa.parse))],
    o2InitialPct: o2.length ? { min: Math.min(...o2), max: Math.max(...o2) } : null,
    principalInvestigators: count(ex.map((e) => e.principalInvestigator)),
    materials: count(ex.map((e) => e.fuel.material)),
    geometries: count(ex.map((e) => e.fuel.geometry)),
    flowConfigurations: count(ex.map((e) => e.flowConfiguration)),
  };
}

/** Experiment ids → their video ids, for validating AI-proposed dashboard actions. */
export function catalogIndex(): Map<string, Set<string>> {
  return new Map(loadExperiments().map((e) => [e.id, new Set(e.videos.map((v) => v.id))]));
}
