import { describe, expect, it } from "vitest";

import type { Experiment, ExperimentDataset, InvestigationManifest } from "@/types/experiment";

import {
  characteristicSizeMm,
  computeOverviewStats,
  facetCounts,
  filterExperiments,
  findClosestExperimentsClient,
  fuelFamily,
  lookupExperiment,
  parameterRanges,
  partitionPlottedRuns,
  representativeAirflow,
  sortExperiments,
} from "./dataset-queries";

function makeExperiment(overrides: Partial<Experiment> & { id: string; testId: string }): Experiment {
  return {
    id: overrides.id,
    testId: overrides.testId,
    investigation: "PSI-25",
    principalInvestigator: overrides.principalInvestigator ?? "Bhattacharjee",
    date: overrides.date ?? "2014-07-10",
    gmtDay: overrides.gmtDay ?? 191,
    sampleId: overrides.sampleId ?? "S-1",
    fuel: overrides.fuel ?? {
      raw: "PMMA film 0.3 mm",
      material: "PMMA",
      geometry: "film",
      thicknessMm: 0.3,
      inferred: [],
    },
    conditions: overrides.conditions ?? {
      o2InitialPct: 21.0,
      o2FinalPct: 20.1,
      co2InitialPct: 0.3,
      co2FinalPct: 0.7,
      coInitialPpm: 2,
      coFinalPpm: 120,
      flowRestrictor: 1,
      airflowSetpointsCmS: [4, 6],
      airflowRaw: "4, 6",
      fanDisplayRaw: "30",
      radiometerGainRaw: "1",
    },
    flowConfiguration: overrides.flowConfiguration === undefined ? "opposed" : overrides.flowConfiguration,
    outcomeHints: overrides.outcomeHints ?? [],
    totalFramesShot: overrides.totalFramesShot ?? 2400,
    videos: overrides.videos ?? [],
    qa: overrides.qa ?? { flags: [], parse: "heuristic-v0" },
    raw: overrides.raw ?? {},
  };
}

const SAMPLE_EXPERIMENTS: Experiment[] = [
  makeExperiment({
    id: "PSI-25:B3",
    testId: "B3",
    principalInvestigator: "Bhattacharjee",
    fuel: { raw: "Clear PMMA 0.3 mm", material: "PMMA", geometry: "film", thicknessMm: 0.3, inferred: [] },
    conditions: {
      o2InitialPct: 22.2,
      o2FinalPct: 21.1,
      co2InitialPct: 0.4,
      co2FinalPct: 0.8,
      coInitialPpm: 3,
      coFinalPpm: 140,
      flowRestrictor: 1,
      airflowSetpointsCmS: [3, 5, 7],
      airflowRaw: "3, 5, 7",
      fanDisplayRaw: "28",
      radiometerGainRaw: "1",
    },
    flowConfiguration: "opposed",
    videos: [
      {
        id: "vid-b3",
        fileName: "B3.mp4",
        category: "Video",
        subcategory: null,
        ext: ".mp4",
        sizeBytes: 12_000_000,
        href: "/api/psi/file/PSI-25/vid-b3",
        kind: "primary",
      },
    ],
  }),
  makeExperiment({
    id: "PSI-25:O1",
    testId: "O1",
    principalInvestigator: "Olson",
    fuel: { raw: "SIBAL fabric", material: "SIBAL", geometry: "fabric", thicknessMm: 0.35, inferred: ["thickness from Olson paper"] },
    conditions: {
      o2InitialPct: 18.0,
      o2FinalPct: 17.5,
      co2InitialPct: 0.5,
      co2FinalPct: 0.9,
      coInitialPpm: 5,
      coFinalPpm: 250,
      flowRestrictor: 2,
      airflowSetpointsCmS: [8],
      airflowRaw: "8",
      fanDisplayRaw: "42",
      radiometerGainRaw: "1",
    },
    flowConfiguration: "concurrent",
    videos: [
      {
        id: "vid-o1",
        fileName: "O1.mp4",
        category: "Video",
        subcategory: null,
        ext: ".mp4",
        sizeBytes: 25_000_000,
        href: "/api/psi/file/PSI-25/vid-o1",
        kind: "primary",
      },
    ],
    qa: { flags: ["1-min airflow sensor lag"], parse: "heuristic-v0" },
  }),
  makeExperiment({
    id: "PSI-25:F2",
    testId: "F2",
    principalInvestigator: "Fernandez-Pello",
    fuel: { raw: "Black PMMA rod 6.35 mm", material: "PMMA", geometry: "rod", diameterMm: 6.35, inferred: [] },
    conditions: {
      o2InitialPct: 19.0,
      o2FinalPct: null,
      co2InitialPct: null,
      co2FinalPct: null,
      coInitialPpm: null,
      coFinalPpm: null,
      flowRestrictor: 0,
      airflowSetpointsCmS: [6],
      airflowRaw: "6",
      fanDisplayRaw: "35",
      radiometerGainRaw: "2",
    },
    flowConfiguration: "opposed",
  }),
  makeExperiment({
    id: "PSI-25:M5",
    testId: "M5",
    principalInvestigator: "Miller",
    fuel: { raw: "PMMA slab 10 mm", material: "PMMA", geometry: "slab", thicknessMm: 10, inferred: [] },
    conditions: {
      o2InitialPct: null,
      o2FinalPct: null,
      co2InitialPct: null,
      co2FinalPct: null,
      coInitialPpm: null,
      coFinalPpm: null,
      flowRestrictor: 1,
      airflowSetpointsCmS: [],
      airflowRaw: "",
      fanDisplayRaw: "50",
      radiometerGainRaw: "1",
    },
    flowConfiguration: null,
    outcomeHints: ["ext"],
    qa: { flags: ["o2InitialPct implausible -> null"], parse: "heuristic-v0" },
  }),
];

const SAMPLE_DATASET: ExperimentDataset = {
  schemaVersion: "0.1.0",
  accession: "PSI-25",
  doi: "10.60555/4qc4-de67",
  license: "CC0 1.0",
  generatedAt: "2026-11-14T18:00:00Z",
  count: SAMPLE_EXPERIMENTS.length,
  videoTestIdsWithoutTableRow: [],
  experiments: SAMPLE_EXPERIMENTS,
};

const SAMPLE_MANIFEST: InvestigationManifest = {
  schemaVersion: "0.1.0",
  accession: "PSI-25",
  title: "Burning and Suppression of Solids - II",
  acronym: "BASS-II",
  doi: "10.60555/4qc4-de67",
  license: "CC0 1.0",
  generatedAt: "2026-11-14T18:00:00Z",
  source: "https://nasa.gov/psi",
  studyVersion: 1,
  downloadEndpoint: "/api/psi/file/PSI-25/{id}",
  totals: { files: 3, bytes: 37_001_024 },
  groups: {
    Video: [
      {
        id: "vid-b3",
        fileName: "B3.mp4",
        category: "Video",
        subcategory: null,
        ext: ".mp4",
        sizeBytes: 12_000_000,
        href: "/api/psi/file/PSI-25/vid-b3",
      },
      {
        id: "vid-o1",
        fileName: "O1.mp4",
        category: "Video",
        subcategory: null,
        ext: ".mp4",
        sizeBytes: 25_000_000,
        href: "/api/psi/file/PSI-25/vid-o1",
      },
    ],
    Telemetry: [
      {
        id: "csv-1",
        fileName: "summary.csv",
        category: "Telemetry",
        subcategory: null,
        ext: ".csv",
        sizeBytes: 1024,
        href: "/api/psi/file/PSI-25/csv-1",
      },
    ],
  },
};

describe("dataset-queries helpers", () => {
  it("computes representative airflow, characteristic size, and max-3 fuel families", () => {
    expect(representativeAirflow(SAMPLE_EXPERIMENTS[0])).toBe(5);
    expect(representativeAirflow(SAMPLE_EXPERIMENTS[3])).toBeNull();

    expect(characteristicSizeMm(SAMPLE_EXPERIMENTS[0].fuel)).toBe(0.3);
    expect(characteristicSizeMm(SAMPLE_EXPERIMENTS[2].fuel)).toBe(6.35);
    expect(characteristicSizeMm(SAMPLE_EXPERIMENTS[1].fuel)).toBeNull();

    expect(fuelFamily(SAMPLE_EXPERIMENTS[0].fuel)).toBe("film-slab");
    expect(fuelFamily(SAMPLE_EXPERIMENTS[2].fuel)).toBe("rod-sphere");
    expect(fuelFamily(SAMPLE_EXPERIMENTS[1].fuel)).toBe("fabric-other");
  });

  it("filters experiments by PI, material, ranges, video/QA flags, and text without inventing values", () => {
    expect(filterExperiments(SAMPLE_EXPERIMENTS, { principalInvestigators: ["Olson"] })).toHaveLength(1);
    expect(filterExperiments(SAMPLE_EXPERIMENTS, { materials: ["PMMA"], hasVideo: true })).toHaveLength(1);
    expect(filterExperiments(SAMPLE_EXPERIMENTS, { o2InitialPct: { min: 18, max: 20 } }).map((e) => e.testId)).toEqual([
      "O1",
      "F2",
    ]);
    expect(filterExperiments(SAMPLE_EXPERIMENTS, { hasQaFlags: true }).map((e) => e.testId)).toEqual([
      "O1",
      "M5",
    ]);
    expect(filterExperiments(SAMPLE_EXPERIMENTS, { text: "blowoff" })).toHaveLength(0);
    expect(filterExperiments(SAMPLE_EXPERIMENTS, { text: "ext" }).map((e) => e.testId)).toEqual(["M5"]);
  });

  it("resolves experiment lookup case-insensitively and computes parameter extents and counts", () => {
    expect(lookupExperiment("b3", SAMPLE_EXPERIMENTS)?.id).toBe("PSI-25:B3");
    expect(lookupExperiment("PSI-25:f2", SAMPLE_EXPERIMENTS)?.testId).toBe("F2");
    expect(lookupExperiment("missing", SAMPLE_EXPERIMENTS)).toBeUndefined();

    const ranges = parameterRanges(SAMPLE_EXPERIMENTS);
    expect(ranges.o2InitialPct).toEqual({ min: 18, max: 22.2 });
    expect(ranges.airflowCmS).toEqual({ min: 3, max: 8 });
    expect(ranges.characteristicSizeMm).toEqual({ min: 0.3, max: 10 });

    const counts = facetCounts(SAMPLE_EXPERIMENTS);
    expect(counts.hasVideo).toEqual({ yes: 2, no: 2 });
    expect(counts.hasQaFlags).toEqual({ yes: 2, no: 2 });
    expect(counts.materials.PMMA).toBe(3);
  });

  it("computes overview stats selecting O1 primary hero video and summing MP4 manifest sizes", () => {
    const stats = computeOverviewStats(SAMPLE_DATASET, SAMPLE_MANIFEST);
    expect(stats.totalRuns).toBe(4);
    expect(stats.piCount).toBe(4);
    expect(stats.runsWithVideo).toBe(2);
    expect(stats.mp4Count).toBe(2);
    expect(stats.mp4Bytes).toBe(37_000_000);
    expect(stats.heroRun?.testId).toBe("O1");
    expect(stats.heroVideo?.id).toBe("vid-o1");
  });

  it("flags measured envelope membership honestly in client What-if matching", () => {
    const inside = findClosestExperimentsClient(
      {
        o2Pct: 19.0,
        airflowCmS: 6,
        material: "PMMA",
        geometry: "rod",
        characteristicSizeMm: 6.35,
        k: 3,
      },
      SAMPLE_EXPERIMENTS,
    );
    expect(inside.insideEnvelope).toBe(true);
    expect(inside.matches[0]?.experimentId).toBe("PSI-25:F2");
    expect(inside.matches[0]?.distance).toBe(0);

    const outside = findClosestExperimentsClient(
      {
        o2Pct: 35.0,
        airflowCmS: 25,
        material: "PMMA",
        geometry: "rod",
        characteristicSizeMm: 6.35,
        k: 3,
      },
      SAMPLE_EXPERIMENTS,
    );
    expect(outside.insideEnvelope).toBe(false);
    expect(outside.matches).toHaveLength(3);
  });

  it("excludes missing O2 or airflow runs from plotted coordinates and sorts missing values last", () => {
    const { plotted, unplotted } = partitionPlottedRuns(SAMPLE_EXPERIMENTS);
    expect(plotted.map((p) => p.experiment.testId)).toEqual(["B3", "O1", "F2"]);
    expect(unplotted.map((e) => e.testId)).toEqual(["M5"]);

    const asc = sortExperiments(SAMPLE_EXPERIMENTS, "o2InitialPct", "asc").map((e) => e.testId);
    expect(asc).toEqual(["O1", "F2", "B3", "M5"]);
    const desc = sortExperiments(SAMPLE_EXPERIMENTS, "o2InitialPct", "desc").map((e) => e.testId);
    expect(desc).toEqual(["B3", "F2", "O1", "M5"]);
  });
});
