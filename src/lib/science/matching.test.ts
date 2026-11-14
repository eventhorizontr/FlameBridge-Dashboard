import { describe, expect, it } from "vitest";

import { getExperiment } from "@/lib/data";
import type { LabParams } from "@/types/dashboard";
import { LabResultSchema } from "@/types/schemas";

import { findClosestExperiments } from "./matching";

const exact: LabParams = { o2Pct: 22.2, airflowCmS: 5, material: "PMMA", geometry: "rod", characteristicSizeMm: 6.35, k: 3 };

describe("What-if Lab matching", () => {
  it("ranks the exact measured run first with zero source-unit deltas", () => {
    const result = findClosestExperiments(exact);
    expect(LabResultSchema.safeParse(result).success).toBe(true);
    expect(result.insideEnvelope).toBe(true);
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0]).toEqual({
      experimentId: "PSI-25:O1",
      distance: 0,
      deltas: { o2Pct: 0, airflowCmS: 0, characteristicSizeMm: 0 },
      categoricalMismatches: [],
    });
    expect(result.matches.every((match) => getExperiment(match.experimentId))).toBe(true);
  });

  it("reports out-of-envelope inputs while still identifying measured neighbors", () => {
    const result = findClosestExperiments({ ...exact, o2Pct: 75, airflowCmS: 200 });
    expect(result.insideEnvelope).toBe(false);
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0].distance).toBeGreaterThan(0);
    expect(findClosestExperiments({ ...exact, material: "SIBAL" }).insideEnvelope).toBe(false);
  });

  it("excludes unavailable O₂ or airflow and leaves unavailable size deltas null", () => {
    const source = getExperiment("O1")!;
    const sizeMissing = { ...source, fuel: { ...source.fuel, diameterMm: undefined } };
    const flowMissing = { ...source, conditions: { ...source.conditions, airflowSetpointsCmS: [] } };
    const result = findClosestExperiments(exact, [sizeMissing, flowMissing]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].deltas.characteristicSizeMm).toBeNull();
    expect(result.matches[0].distance).toBeCloseTo(Math.sqrt(0.5));
    expect(result.insideEnvelope).toBe(false);
    const withoutSize = findClosestExperiments({ ...exact, characteristicSizeMm: null }, [sizeMissing]);
    expect(withoutSize.matches[0].distance).toBe(0);
    expect(withoutSize.insideEnvelope).toBe(true);
    expect(findClosestExperiments(exact, []).matches).toEqual([]);
  });
});
