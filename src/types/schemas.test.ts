import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DashboardActionListSchema, DashboardActionSchema, LabParamsSchema } from "./schemas";
import { validateDataset, validateManifest } from "./validate";

const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), rel), "utf8"));

describe("published PSI-25 data", () => {
  it("experiments.json satisfies the contract", () => {
    const result = validateDataset(readJson("public/data/psi-25/experiments.json"));
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.data.experiments.length).toBe(result.data.count);
  });

  it("manifest.json satisfies the contract", () => {
    const result = validateManifest(readJson("public/data/psi-25/manifest.json"));
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.data.accession).toBe("PSI-25");
  });
});

describe("validateDataset", () => {
  it("reports readable paths instead of throwing", () => {
    const result = validateDataset({ accession: "PSI-25", experiments: [{}] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.startsWith("schemaVersion"))).toBe(true);
  });

  it("rejects undeclared keys (contract drift)", () => {
    const data = readJson("public/data/psi-25/experiments.json") as {
      experiments: Record<string, unknown>[];
    };
    data.experiments[0] = { ...data.experiments[0], spreadRateMmS: 1.2 };
    const result = validateDataset(data);
    expect(result.ok).toBe(false);
  });
});

describe("DashboardActionSchema", () => {
  it("accepts every action shape", () => {
    const ok = DashboardActionListSchema.safeParse([
      { type: "setMode", mode: "learn" },
      { type: "setFilters", filters: { materials: ["PMMA"], o2InitialPct: { min: 15, max: 18 } } },
      { type: "resetFilters" },
      { type: "selectExperiments", ids: ["PSI-25:B1"] },
      { type: "openExperiment", id: "PSI-25:O13a" },
      { type: "compare", ids: ["PSI-25:B1", "PSI-25:B2"] },
      { type: "seekVideo", experimentId: "PSI-25:B1", videoId: "6924803a7f6aa6a8302103cc", timeS: 12.5 },
      { type: "setLabParams", params: { o2Pct: 17, k: 3 } },
      { type: "navigate", route: "/experiments/PSI-25:B1" },
      { type: "highlight", target: "o2-axis" },
    ]);
    expect(ok.success).toBe(true);
  });

  it.each([
    [{ type: "deleteEverything" }],
    [{ type: "setMode", mode: "god" }],
    [{ type: "compare", ids: ["PSI-25:B1"] }],
    [{ type: "navigate", route: "https://evil.example" }],
    [{ type: "setFilters", filters: { o2InitialPct: { min: 20, max: 10 } } }],
    [{ type: "setFilters", filters: { colour: "red" } }],
    [{ type: "openExperiment", id: "B1" }],
  ])("rejects invalid or hallucinated action %j", (action) => {
    expect(DashboardActionSchema.safeParse(action).success).toBe(false);
  });
});

describe("LabParamsSchema", () => {
  it("guards ranges but allows out-of-envelope queries", () => {
    const base = { airflowCmS: 5, material: "PMMA", geometry: "rod", characteristicSizeMm: 9.525, k: 3 };
    expect(LabParamsSchema.safeParse({ ...base, o2Pct: 30 }).success).toBe(true);
    expect(LabParamsSchema.safeParse({ ...base, o2Pct: 130 }).success).toBe(false);
    expect(LabParamsSchema.safeParse({ ...base, o2Pct: 17, k: 0 }).success).toBe(false);
  });
});
