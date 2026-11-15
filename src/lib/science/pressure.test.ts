import { describe, expect, it } from "vitest";

import { findClosestExperimentsClient } from "@/components/viz/dataset-queries";
import { getDataset, getExperiment } from "@/lib/data";
import type { LabParams } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";
import { ExperimentSchema, LabParamsSchema, LabResultSchema } from "@/types/schemas";

import { findClosestExperiments } from "./matching";
import {
  o2PartialPressureKpa,
  pressureCoverage,
  pressureRatio,
  pressureScale,
  pressureTerm,
  runPressureKpa,
  SERIES_PRESSURE,
} from "./pressure";

const exact: LabParams = { o2Pct: 22.2, airflowCmS: 5, material: "PMMA", geometry: "rod", characteristicSizeMm: 6.35, pressureKpa: null, k: 3 };

/** A run with a stated pressure — hypothetical, for exercising the code path only. */
const withPressure = (e: Experiment, kPa: number): Experiment => ({
  ...e,
  conditions: { ...e.conditions, pressureKpa: kPa, pressureBasis: "recorded" },
});

describe("pressure formulas", () => {
  it("compares pressures on a ratio scale", () => {
    expect(pressureRatio(43, 53.75)).toBeCloseTo(1.25);
    expect(pressureRatio(126.625, 101.3)).toBeCloseTo(1.25);
    expect(pressureRatio(0, 101.3)).toBeNull();
    expect(pressureRatio(null, 101.3)).toBeNull();
  });

  it("derives O₂ partial pressure only from two stated values (Dalton)", () => {
    expect(o2PartialPressureKpa(34, 56.5)).toBeCloseTo(19.21);
    expect(o2PartialPressureKpa(21, null)).toBeNull();
    expect(o2PartialPressureKpa(null, 56.5)).toBeNull();
  });

  it("never reads an unstated or non-physical pressure", () => {
    const o1 = getExperiment("O1")!;
    expect(runPressureKpa(o1)).toBeNull();
    expect(runPressureKpa({ ...o1, conditions: { ...o1.conditions, pressureKpa: 101.3 } })).toBeNull(); // no basis
    expect(runPressureKpa({ ...o1, conditions: { ...o1.conditions, pressureKpa: 101.3, pressureBasis: "not-stated" } })).toBeNull();
    expect(runPressureKpa(withPressure(o1, 70))).toBe(70);
  });

  it("adds no distance when no run states a pressure", () => {
    const scale = pressureScale(getDataset().experiments);
    expect(scale.runsWithPressure).toBe(0);
    expect(pressureTerm(56.5, null, scale)).toBe(0);
  });

  it("parses Lab params saved before pressure existed", () => {
    const { pressureKpa: _omit, ...legacy } = exact;
    void _omit;
    expect(LabParamsSchema.parse(legacy).pressureKpa).toBeNull();
    expect(LabParamsSchema.safeParse({ ...exact, pressureKpa: 0 }).success).toBe(false);
  });

  it("accepts a stated pressure in the run contract", () => {
    const o1 = getExperiment("O1")!;
    expect(ExperimentSchema.safeParse(withPressure(o1, 70)).success).toBe(true);
    expect(ExperimentSchema.safeParse({ ...o1, conditions: { ...o1.conditions, pressureKpa: -1 } }).success).toBe(false);
  });
});

describe("pressure coverage", () => {
  it("cites the PSI files that state no pressure", () => {
    const cov = pressureCoverage(56.5, 34, getDataset().experiments);
    expect(cov.status).toBe("not-recorded");
    expect(cov.runsWithPressure).toBe(0);
    expect(cov.queryO2PartialPressureKpa).toBeCloseTo(19.21);
    expect(cov.sources.map((s) => s.accession)).toContain("PSI-25");
    expect(SERIES_PRESSURE.every((s) => s.basis === "not-stated")).toBe(true);
  });

  it("grades a stated pressure as matched / near / outside", () => {
    const o1 = getExperiment("O1")!;
    const runs = [withPressure(o1, 100)];
    expect(pressureCoverage(105, 21, runs).status).toBe("matched"); // ×1.05
    expect(pressureCoverage(80, 21, runs).status).toBe("near"); // ×1.25
    expect(pressureCoverage(56.5, 34, runs).status).toBe("outside"); // ×1.77
    expect(pressureCoverage(null, 21, runs).status).toBe("not-queried");
  });
});

describe("pressure in the What-if Lab", () => {
  it("keeps today's ranking but leaves the envelope on a pressure query", () => {
    const plain = findClosestExperiments(exact);
    const lunar = findClosestExperiments({ ...exact, pressureKpa: 56.5 });
    expect(LabResultSchema.safeParse(lunar).success).toBe(true);
    expect(lunar.matches.map((m) => m.experimentId)).toEqual(plain.matches.map((m) => m.experimentId));
    expect(lunar.matches[0].distance).toBe(0);
    expect(lunar.matches[0].deltas.pressureKpa).toBeNull();
    expect(plain.insideEnvelope).toBe(true);
    expect(lunar.insideEnvelope).toBe(false);
    expect(lunar.pressure.status).toBe("not-recorded");
    expect(plain.pressure.status).toBe("not-queried");
  });

  it("ranks by pressure ratio once runs state one, in both matchers", () => {
    const o1 = getExperiment("O1")!;
    const near = withPressure({ ...o1, id: "PSI-25:P-near" }, 60);
    const far = withPressure({ ...o1, id: "PSI-25:P-far" }, 100);
    for (const match of [findClosestExperiments, findClosestExperimentsClient]) {
      const r = match({ ...exact, pressureKpa: 56.5 }, [far, near]);
      expect(r.matches[0].experimentId).toBe("PSI-25:P-near");
      expect(r.matches[0].deltas.pressureKpa).toBeCloseTo(-3.5);
      expect(r.pressure.status).toBe("matched"); // 60 / 56.5 = ×1.06
      expect(r.insideEnvelope).toBe(true);
      const outside = match({ ...exact, pressureKpa: 30 }, [far, near]);
      expect(outside.pressure.status).toBe("outside");
      expect(outside.insideEnvelope).toBe(false);
    }
  });

  it("server and client matchers agree on pressure coverage for the real data", () => {
    const q = { ...exact, pressureKpa: 56.5 };
    const server = findClosestExperiments(q);
    const client = findClosestExperimentsClient(q, getDataset().experiments);
    expect(client.pressure).toEqual(server.pressure);
    expect(client.insideEnvelope).toBe(server.insideEnvelope);
  });
});
