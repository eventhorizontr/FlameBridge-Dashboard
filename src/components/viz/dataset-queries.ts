import { extent } from "d3-array";

import { representativeAirflow } from "@/lib/data/queries";
import { characteristicSizeMm } from "@/lib/science/match-experiments";
import type { Experiment, ExperimentDataset, Fuel, InvestigationManifest } from "@/types/experiment";

export type FuelFamily = "film-slab" | "rod-sphere" | "fabric-other";

export { facetCounts, filterExperiments, getExperiment as lookupExperiment, representativeAirflow } from "@/lib/data/queries";
export { characteristicSizeMm, matchExperiments as findClosestExperimentsClient } from "@/lib/science/match-experiments";

/** Max 3 categorical series for scatter plots per DESIGN_SYSTEM.md §2. */
export function fuelFamily(fuel: Fuel): FuelFamily {
  if (fuel.geometry === "film" || fuel.geometry === "slab") return "film-slab";
  if (fuel.geometry === "rod" || fuel.geometry === "spherical-section") return "rod-sphere";
  return "fabric-other";
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

export interface PlottedExperimentPoint {
  experiment: Experiment;
  o2InitialPct: number;
  airflowCmS: number;
  family: FuelFamily;
  sizeMm: number | null;
}

export function partitionPlottedRuns(experiments: readonly Experiment[]): {
  plotted: PlottedExperimentPoint[];
  unplotted: Experiment[];
} {
  const plotted: PlottedExperimentPoint[] = [];
  const unplotted: Experiment[] = [];
  for (const experiment of experiments) {
    const o2 = experiment.conditions.o2InitialPct;
    const air = representativeAirflow(experiment);
    if (o2 !== null && Number.isFinite(o2) && air !== null && Number.isFinite(air)) {
      plotted.push({
        experiment,
        o2InitialPct: o2,
        airflowCmS: air,
        family: fuelFamily(experiment.fuel),
        sizeMm: characteristicSizeMm(experiment.fuel),
      });
    } else {
      unplotted.push(experiment);
    }
  }
  return { plotted, unplotted };
}

export type ExperimentSortKey =
  | "testId"
  | "pi"
  | "material"
  | "geometry"
  | "size"
  | "o2InitialPct"
  | "airflow"
  | "videos"
  | "qa";

export function sortExperiments(
  experiments: readonly Experiment[],
  key: ExperimentSortKey,
  direction: "asc" | "desc",
): Experiment[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...experiments].sort((a, b) => {
    const cmpNullNum = (x: number | null, y: number | null) => {
      if (x === null && y === null) return 0;
      if (x === null) return 1; // keep missing values at bottom regardless of sort direction
      if (y === null) return -1;
      return (x - y) * dir;
    };
    const cmpNullStr = (x: string | null, y: string | null) => {
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return x.localeCompare(y, "en", { numeric: true }) * dir;
    };

    let delta = 0;
    switch (key) {
      case "testId":
        delta = a.testId.localeCompare(b.testId, "en", { numeric: true }) * dir;
        break;
      case "pi":
        delta = a.principalInvestigator.localeCompare(b.principalInvestigator, "en") * dir;
        break;
      case "material":
        delta = cmpNullStr(a.fuel.material, b.fuel.material);
        break;
      case "geometry":
        delta = cmpNullStr(a.fuel.geometry, b.fuel.geometry);
        break;
      case "size":
        delta = cmpNullNum(characteristicSizeMm(a.fuel), characteristicSizeMm(b.fuel));
        break;
      case "o2InitialPct":
        delta = cmpNullNum(a.conditions.o2InitialPct, b.conditions.o2InitialPct);
        break;
      case "airflow":
        delta = cmpNullNum(representativeAirflow(a), representativeAirflow(b));
        break;
      case "videos":
        delta = (a.videos.length - b.videos.length) * dir;
        break;
      case "qa":
        delta = (a.qa.flags.length - b.qa.flags.length) * dir;
        break;
    }
    return delta !== 0 ? delta : a.testId.localeCompare(b.testId, "en", { numeric: true });
  });
}
