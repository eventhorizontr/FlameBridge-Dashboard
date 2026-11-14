import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ExperimentSchema } from "@/types/schemas";

import fixtureJson from "./fixtures/psi-25.json";
import { getDataset, getExperiment, getManifest } from "./index";
import { facetCounts, filterExperiments, parameterRanges, representativeAirflow } from "./queries";

vi.mock("node:fs", { spy: true });

const fixtures = ExperimentSchema.array().parse(fixtureJson);
const run = (id: string) => fixtures.find((experiment) => experiment.testId === id)!;
const ids = (rows: typeof fixtures) => rows.map((experiment) => experiment.testId);

afterEach(() => vi.restoreAllMocks());

describe("validated server-side data", () => {
  it("loads and caches the published dataset and manifest by canonical accession", () => {
    expect(getDataset().count).toBeGreaterThan(100);
    expect(getDataset("psi-25")).toBe(getDataset());
    expect(getManifest().doi).toBe(getDataset().doi);
    expect(getManifest("psi-25")).toBe(getManifest());
    expect(getExperiment(" psi-25:o1 ")?.testId).toBe("O1");
    expect(getExperiment("unknown")).toBeUndefined();
    expect(() => getDataset("../psi-25")).toThrow("Unknown PSI accession");
  });

  it("reports bad files and permits a later retry after failure", () => {
    vi.mocked(readFileSync).mockReturnValueOnce("{");
    expect(() => getDataset("PSI-20")).toThrow("Cannot read PSI-20/experiments.json");
    vi.mocked(readFileSync).mockReturnValueOnce("{}");
    expect(() => getDataset("PSI-20")).toThrow(/failed validation:[\s\S]+schemaVersion/);
    vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify(getDataset()));
    expect(() => getDataset("PSI-20")).toThrow("contains accession PSI-25");
  });
});

describe("experiment queries", () => {
  it("combines facets and applies inclusive ranges to every airflow set-point", () => {
    expect(filterExperiments(fixtures, { geometries: [], o2InitialPct: {} })).toEqual(fixtures);
    expect(ids(filterExperiments(fixtures, {
      investigations: ["PSI-25"],
      principalInvestigators: ["Olson"],
      materials: ["PMMA"],
      geometries: ["rod"],
      flowConfigurations: ["concurrent"],
      o2InitialPct: { min: 22.2 },
      airflowCmS: { min: 1, max: 1 },
      hasVideo: true,
      hasQaFlags: false,
    }))).toEqual(["O1"]);
    expect(ids(filterExperiments(fixtures, { airflowCmS: { max: 2 }, hasQaFlags: true }))).toEqual([]);
  });

  it("supports text and both states of the video and QA filters", () => {
    expect(ids(filterExperiments(fixtures, { text: " EXT " }))).toContain("P1");
    expect(ids(filterExperiments(fixtures, { text: "ferkul", hasVideo: false }))).toEqual(["F2"]);
    expect(ids(filterExperiments(fixtures, { hasQaFlags: true }))).toEqual(["B2"]);
    expect(ids(filterExperiments(fixtures, { hasVideo: null, hasQaFlags: null }))).toEqual(ids(fixtures));
  });

  it("excludes missing measurements from active ranges and preserves true zeros", () => {
    const unmeasured = {
      ...run("O1"),
      conditions: { ...run("O1").conditions, o2InitialPct: null, airflowSetpointsCmS: [] },
    };
    const zero = { ...run("M1"), conditions: { ...run("M1").conditions, airflowSetpointsCmS: [0] } };
    expect(filterExperiments([unmeasured], { o2InitialPct: { max: 22.2 } })).toEqual([]);
    expect(filterExperiments([unmeasured, zero], { airflowCmS: { max: 0 } })).toEqual([zero]);
    expect(parameterRanges([unmeasured])).toEqual({ o2InitialPct: null, airflowCmS: null });
    expect(parameterRanges([unmeasured, zero])).toEqual({
      o2InitialPct: { min: 22.2, max: 22.2 },
      airflowCmS: { min: 0, max: 0 },
    });
    expect(representativeAirflow(unmeasured)).toBeNull();
    expect(representativeAirflow(zero)).toBe(0);
    expect(representativeAirflow(run("M1"))).toBe(9);
    expect(representativeAirflow(run("O1"))).toBe(5);
    expect(run("O1").conditions.airflowSetpointsCmS).toEqual([20, 10, 5, 2, 1]);
  });

  it("counts facets and their unknown categories", () => {
    const facets = facetCounts(fixtures);
    expect(facets.investigations).toEqual({ "PSI-25": 8 });
    expect(facets.materials).toEqual({ PMMA: 6, Nomex: 1, SIBAL: 1 });
    expect(facets.flowConfigurations.unknown).toBeGreaterThan(0);
    expect(facets.hasVideo).toEqual({ yes: 6, no: 2 });
    expect(facets.hasQaFlags).toEqual({ yes: 1, no: 7 });
    expect(facetCounts([]).hasVideo).toEqual({ yes: 0, no: 0 });
  });
});
