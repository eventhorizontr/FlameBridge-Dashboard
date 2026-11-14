import { extent, median } from "d3-array";

import type { ExperimentFilters, LabMatch, LabParams, LabResult, Range } from "@/types/dashboard";
import type { Experiment, ExperimentDataset, Fuel, InvestigationManifest } from "@/types/experiment";

export type FuelFamily = "film-slab" | "rod-sphere" | "fabric-other";

function inRange(value: number | null, range: Range): boolean {
  return (
    value !== null &&
    (range.min === undefined || value >= range.min) &&
    (range.max === undefined || value <= range.max)
  );
}

function activeRange(range: Range | undefined): range is Range {
  return range?.min !== undefined || range?.max !== undefined;
}

function includes<T>(options: readonly T[] | undefined, value: T | null): boolean {
  return !options?.length || (value !== null && options.includes(value));
}

export function filterExperiments(
  experiments: readonly Experiment[],
  filters: Partial<ExperimentFilters>,
): Experiment[] {
  const text = filters.text?.trim().toLowerCase();
  const { o2InitialPct, airflowCmS, hasVideo, hasQaFlags } = filters;

  return experiments.filter(
    (e) =>
      includes(filters.investigations, e.investigation) &&
      includes(filters.principalInvestigators, e.principalInvestigator) &&
      includes(filters.materials, e.fuel.material) &&
      includes(filters.geometries, e.fuel.geometry) &&
      includes(filters.flowConfigurations, e.flowConfiguration) &&
      (!activeRange(o2InitialPct) || inRange(e.conditions.o2InitialPct, o2InitialPct)) &&
      (!activeRange(airflowCmS) ||
        e.conditions.airflowSetpointsCmS.some((v) => inRange(v, airflowCmS))) &&
      (hasVideo == null || (e.videos.length > 0) === hasVideo) &&
      (hasQaFlags == null || (e.qa.flags.length > 0) === hasQaFlags) &&
      (!text ||
        [e.testId, e.sampleId, e.fuel.raw, e.principalInvestigator, ...e.outcomeHints]
          .join(" ")
          .toLowerCase()
          .includes(text)),
  );
}

export function representativeAirflow(experiment: Experiment): number | null {
  return median(experiment.conditions.airflowSetpointsCmS) ?? null;
}

export function characteristicSizeMm(fuel: Fuel): number | null {
  if (fuel.geometry === "film" || fuel.geometry === "slab") return fuel.thicknessMm ?? null;
  if (fuel.geometry === "rod" || fuel.geometry === "spherical-section") return fuel.diameterMm ?? null;
  return null;
}

/** Max 3 categorical series for scatter plots per DESIGN_SYSTEM.md §2. */
export function fuelFamily(fuel: Fuel): FuelFamily {
  if (fuel.geometry === "film" || fuel.geometry === "slab") return "film-slab";
  if (fuel.geometry === "rod" || fuel.geometry === "spherical-section") return "rod-sphere";
  return "fabric-other";
}

export function lookupExperiment(id: string, experiments: readonly Experiment[]): Experiment | undefined {
  const key = id.trim().toLowerCase();
  return experiments.find(
    (e) => e.id.toLowerCase() === key || e.testId.toLowerCase() === key,
  );
}

function numericExtent(values: (number | null)[]): { min: number; max: number } | null {
  const [min, max] = extent(values.filter((v): v is number => v !== null && Number.isFinite(v)));
  return min === undefined || max === undefined ? null : { min, max };
}

export function parameterRanges(experiments: readonly Experiment[]) {
  return {
    o2InitialPct: numericExtent(experiments.map((e) => e.conditions.o2InitialPct)),
    airflowCmS: numericExtent(experiments.flatMap((e) => e.conditions.airflowSetpointsCmS)),
    representativeAirflowCmS: numericExtent(experiments.map((e) => representativeAirflow(e))),
    characteristicSizeMm: numericExtent(experiments.map((e) => characteristicSizeMm(e.fuel))),
  };
}

function tally<T extends string>(values: (T | null)[]): Record<string, number> {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v ?? "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(map);
}

export function facetCounts(experiments: readonly Experiment[]) {
  const withVideo = experiments.filter((e) => e.videos.length > 0).length;
  const withQaFlags = experiments.filter((e) => e.qa.flags.length > 0).length;
  return {
    investigations: tally(experiments.map((e) => e.investigation)),
    principalInvestigators: tally(experiments.map((e) => e.principalInvestigator)),
    materials: tally(experiments.map((e) => e.fuel.material)),
    geometries: tally(experiments.map((e) => e.fuel.geometry)),
    flowConfigurations: tally(experiments.map((e) => e.flowConfiguration)),
    hasVideo: { yes: withVideo, no: experiments.length - withVideo },
    hasQaFlags: { yes: withQaFlags, no: experiments.length - withQaFlags },
  };
}

export interface PiSummary {
  name: string;
  runs: number;
  withVideo: number;
  materials: string[];
  geometries: string[];
  flowConfigs: string[];
}

export function computeOverviewStats(dataset: ExperimentDataset, manifest: InvestigationManifest) {
  const experiments = dataset.experiments;
  const ranges = parameterRanges(experiments);

  const allFiles = Object.values(manifest.groups).flat();
  const mp4Files = allFiles.filter((f) => f.ext.toLowerCase() === ".mp4");
  const mp4Bytes = mp4Files.reduce((acc, f) => acc + f.sizeBytes, 0);

  const byPi = new Map<string, Experiment[]>();
  for (const exp of experiments) {
    const list = byPi.get(exp.principalInvestigator) ?? [];
    list.push(exp);
    byPi.set(exp.principalInvestigator, list);
  }

  const piSummaries: PiSummary[] = [...byPi.entries()].map(([name, runs]) => ({
    name,
    runs: runs.length,
    withVideo: runs.filter((r) => r.videos.length > 0).length,
    materials: [...new Set(runs.map((r) => r.fuel.material).filter((v): v is NonNullable<typeof v> => v !== null))],
    geometries: [...new Set(runs.map((r) => r.fuel.geometry).filter((v): v is NonNullable<typeof v> => v !== null))],
    flowConfigs: [...new Set(runs.map((r) => r.flowConfiguration).filter((v): v is NonNullable<typeof v> => v !== null))],
  }));

  const heroCandidate =
    experiments.find((e) => e.testId === "O1" && e.videos.some((v) => v.kind === "primary")) ??
    experiments.find((e) => e.videos.some((v) => v.kind === "primary")) ??
    experiments.find((e) => e.videos.length > 0);
  const heroVideo =
    heroCandidate?.videos.find((v) => v.kind === "primary") ?? heroCandidate?.videos[0] ?? null;

  return {
    totalRuns: experiments.length,
    piCount: piSummaries.length,
    piSummaries,
    o2Range: ranges.o2InitialPct,
    airflowRange: ranges.airflowCmS,
    runsWithVideo: experiments.filter((e) => e.videos.length > 0).length,
    runsWithQaFlags: experiments.filter((e) => e.qa.flags.length > 0).length,
    parseVersions: [...new Set(experiments.map((e) => e.qa.parse))],
    totalManifestFiles: manifest.totals.files,
    totalManifestBytes: manifest.totals.bytes,
    mp4Count: mp4Files.length,
    mp4Bytes,
    heroRun: heroCandidate ?? null,
    heroVideo,
  };
}

/* ----------------------------------------------------- What-if matching (client-safe) */

const NUMERIC_FEATURES = ["o2Pct", "airflowCmS", "characteristicSizeMm"] as const;
type FeatureKey = (typeof NUMERIC_FEATURES)[number];
const WEIGHTS: Record<FeatureKey, number> = { o2Pct: 1, airflowCmS: 1, characteristicSizeMm: 0.5 };
const ENVELOPE_THRESHOLD = 0.25;
const MATCH_METHOD =
  "Range-normalized weighted Euclidean distance on measured O₂, median airflow and optional size. " +
  "Unit penalties for material and geometry mismatch. The measured envelope requires a same-material, " +
  "same-geometry complete neighbor within 0.25 normalized distance and in-range inputs in that group.";

export function findClosestExperimentsClient(
  params: LabParams,
  experiments: readonly Experiment[],
): LabResult {
  const rows = experiments
    .map((experiment) => ({
      experiment,
      values: {
        o2Pct: experiment.conditions.o2InitialPct,
        airflowCmS: representativeAirflow(experiment),
        characteristicSizeMm: characteristicSizeMm(experiment.fuel),
      },
    }))
    .filter(({ values }) => values.o2Pct !== null && values.airflowCmS !== null);

  const active = NUMERIC_FEATURES.filter((feature) => params[feature] !== null);
  const spans = Object.fromEntries(
    active.map((feature) => {
      const [min, max] = extent(rows, ({ values }) => values[feature] ?? undefined);
      return [feature, min === undefined || max === undefined ? 0 : max - min];
    }),
  ) as Record<FeatureKey, number>;

  const ranked = rows
    .map(({ experiment, values }) => {
      const categoricalMismatches = (["material", "geometry"] as const).filter(
        (feature) => experiment.fuel[feature] !== params[feature],
      );
      const deltas = {
        o2Pct: values.o2Pct === null ? null : params.o2Pct - values.o2Pct,
        airflowCmS: values.airflowCmS === null ? null : params.airflowCmS - values.airflowCmS,
        characteristicSizeMm:
          params.characteristicSizeMm === null || values.characteristicSizeMm === null
            ? null
            : params.characteristicSizeMm - values.characteristicSizeMm,
      };
      const squared = active.reduce((sum, feature) => {
        const diff = deltas[feature];
        const span = spans[feature];
        const normalized = diff === 0 ? 0 : diff === null || span === 0 ? 1 : diff / span;
        return sum + WEIGHTS[feature] * normalized ** 2;
      }, categoricalMismatches.length);

      const match: LabMatch = {
        experimentId: experiment.id,
        distance: Math.sqrt(squared),
        deltas,
        categoricalMismatches,
      };
      return { values, match };
    })
    .sort(
      (a, b) =>
        a.match.distance - b.match.distance ||
        a.match.experimentId.localeCompare(b.match.experimentId, "en"),
    );

  const completeGroup = ranked.filter(
    ({ match }) =>
      match.categoricalMismatches.length === 0 &&
      active.every((feature) => match.deltas[feature] !== null),
  );
  const nearest = completeGroup[0];
  const insideEnvelope =
    nearest !== undefined &&
    nearest.match.distance <= ENVELOPE_THRESHOLD &&
    active.every((feature) => {
      const [min, max] = extent(completeGroup, ({ values }) => values[feature] ?? undefined);
      const val = params[feature];
      return val !== null && min !== undefined && max !== undefined && val >= min && val <= max;
    });

  return {
    params,
    matches: ranked.slice(0, params.k).map(({ match }) => match),
    insideEnvelope,
    method: MATCH_METHOD,
  };
}
