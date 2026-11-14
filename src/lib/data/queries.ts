import { median } from "d3-array";

import type { ExperimentFilters, Range } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";

function inRange(value: number | null, range: Range): boolean {
  return value !== null &&
    (range.min === undefined || value >= range.min) &&
    (range.max === undefined || value <= range.max);
}

function activeRange(range: Range | undefined): range is Range {
  return range?.min !== undefined || range?.max !== undefined;
}

function includes<T>(options: readonly T[] | undefined, value: T | null): boolean {
  return !options?.length || (value !== null && options.includes(value));
}

/** Filters are combined with AND. An airflow range matches any measured set-point. */
export function filterExperiments(
  experiments: readonly Experiment[],
  filters: Partial<ExperimentFilters>,
): Experiment[] {
  const text = filters.text?.trim().toLowerCase();
  const { o2InitialPct, airflowCmS, hasVideo, hasQaFlags } = filters;

  return experiments.filter((experiment) =>
    includes(filters.investigations, experiment.investigation) &&
    includes(filters.principalInvestigators, experiment.principalInvestigator) &&
    includes(filters.materials, experiment.fuel.material) &&
    includes(filters.geometries, experiment.fuel.geometry) &&
    includes(filters.flowConfigurations, experiment.flowConfiguration) &&
    (!activeRange(o2InitialPct) || inRange(experiment.conditions.o2InitialPct, o2InitialPct)) &&
    (!activeRange(airflowCmS) ||
      experiment.conditions.airflowSetpointsCmS.some((value) => inRange(value, airflowCmS))) &&
    (hasVideo == null || (experiment.videos.length > 0) === hasVideo) &&
    (hasQaFlags == null || (experiment.qa.flags.length > 0) === hasQaFlags) &&
    (!text || [
      experiment.testId,
      experiment.sampleId,
      experiment.fuel.raw,
      experiment.principalInvestigator,
      ...experiment.outcomeHints,
    ].join(" ").toLowerCase().includes(text)),
  );
}

/** Full IDs and short test IDs both match case insensitively within the supplied collection. */
export function getExperiment(id: string, experiments: readonly Experiment[]): Experiment | undefined {
  const key = id.trim().toLowerCase();
  return experiments.find((experiment) =>
    experiment.id.toLowerCase() === key || experiment.testId.toLowerCase() === key,
  );
}

function counts<T extends string>(values: (T | null)[]): Record<string, number> {
  const tally = new Map<string, number>();
  for (const value of values) {
    const key = value ?? "unknown";
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(tally);
}

export function facetCounts(experiments: readonly Experiment[]) {
  const withVideo = experiments.filter((experiment) => experiment.videos.length > 0).length;
  const withQaFlags = experiments.filter((experiment) => experiment.qa.flags.length > 0).length;

  return {
    investigations: counts(experiments.map((experiment) => experiment.investigation)),
    principalInvestigators: counts(experiments.map((experiment) => experiment.principalInvestigator)),
    materials: counts(experiments.map((experiment) => experiment.fuel.material)),
    geometries: counts(experiments.map((experiment) => experiment.fuel.geometry)),
    flowConfigurations: counts(experiments.map((experiment) => experiment.flowConfiguration)),
    hasVideo: { yes: withVideo, no: experiments.length - withVideo },
    hasQaFlags: { yes: withQaFlags, no: experiments.length - withQaFlags },
  };
}

/** Median of the measured airflow set-points, in cm/s. Missing set-points yield null. */
export function representativeAirflow(experiment: Experiment): number | null {
  return median(experiment.conditions.airflowSetpointsCmS) ?? null;
}

function extent(values: (number | null)[]): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value === null) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return min === Infinity ? null : { min, max };
}

/** Measured filter extents. Airflow uses all set-points to match filter semantics. */
export function parameterRanges(experiments: readonly Experiment[]) {
  return {
    o2InitialPct: extent(experiments.map((experiment) => experiment.conditions.o2InitialPct)),
    airflowCmS: extent(experiments.flatMap((experiment) => experiment.conditions.airflowSetpointsCmS)),
  };
}
