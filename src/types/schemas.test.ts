import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ConditionsSchema,
  DashboardActionListSchema,
  DashboardActionSchema,
  ExperimentVideoSchema,
  LabParamsSchema,
  ManifestFileRefSchema,
} from "./schemas";
import { validateDataset, validateManifest, validateMediaLinks } from "./validate";

const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), rel), "utf8"));

/** Fresh, validated copies of the published PSI-25 files (safe to mutate per test). */
function published() {
  const d = validateDataset(readJson("public/data/psi-25/experiments.json"));
  const m = validateManifest(readJson("public/data/psi-25/manifest.json"));
  if (!d.ok || !m.ok) throw new Error("published PSI-25 data is invalid");
  return { dataset: d.data, manifest: m.data };
}

const fileId = (n: number) => n.toString(16).padStart(24, "0");
const fileRef = (n: number, ext = ".mp4") => ({
  id: fileId(n),
  fileName: `file-${n}${ext}`,
  category: "Raw Data",
  subcategory: null,
  ext,
  sizeBytes: 1,
  href: `/api/psi/file/PSI-25/${fileId(n)}`,
});

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

describe("CO lower bound (ADR-014)", () => {
  const base = { ...published().dataset.experiments[0].conditions, coFinalPpm: null };

  it("accepts an exclusive lower bound with a null value", () => {
    expect(ConditionsSchema.safeParse({ ...base, coFinalLowerBoundPpm: 500 }).success).toBe(true);
  });

  it.each([
    [{ coFinalPpm: 520, coFinalLowerBoundPpm: 500 }],
    [{ coFinalLowerBoundPpm: -1 }],
    [{ coInitialLowerBoundPpm: 500 }],
  ])("rejects %j", (patch) => {
    expect(ConditionsSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
});

describe("video metadata (ADR-014)", () => {
  const meta = { durationS: 61.5, fps: 29.97, width: 720, height: 480, fallbackHref: "/media/psi-25/b1.mp4" };

  it("accepts optional metadata on experiment videos and .mp4 manifest refs", () => {
    expect(ExperimentVideoSchema.safeParse({ ...fileRef(1), ...meta, kind: "primary" }).success).toBe(true);
    expect(ManifestFileRefSchema.safeParse({ ...fileRef(1), ...meta }).success).toBe(true);
    expect(ManifestFileRefSchema.safeParse({ ...fileRef(1), durationS: 12 }).success).toBe(true);
  });

  it.each([
    [{ width: 720 }],
    [{ fps: 0 }],
    [{ fallbackHref: "/media/../secrets.mp4" }],
    [{ fallbackHref: "https://cdn.example/b1.mp4" }],
    [{ fallbackHref: "/media/b1.mov" }],
    [{ codec: "h264" }],
  ])("rejects %j", (patch) => {
    expect(ExperimentVideoSchema.safeParse({ ...fileRef(1), kind: "primary", ...patch }).success).toBe(false);
  });

  it("rejects video metadata on non-video files", () => {
    expect(ManifestFileRefSchema.safeParse({ ...fileRef(2, ".pdf"), durationS: 3 }).success).toBe(false);
  });
});

describe("validateMediaLinks", () => {
  it("passes on the published PSI-25 pair", () => {
    const { dataset, manifest } = published();
    expect(validateMediaLinks(dataset, manifest)).toEqual([]);
  });

  it("requires identical metadata on an experiment video and its manifest ref", () => {
    const { dataset, manifest } = published();
    const videoId = dataset.experiments.find((e) => e.videos.length > 0)?.videos[0].id;
    const ref = Object.values(manifest.groups)
      .flat()
      .find((f) => f.id === videoId);
    if (!videoId || !ref) throw new Error("expected a published experiment video");
    // Split runs share footage, so every copy of the video must carry the metadata.
    for (const e of dataset.experiments) {
      for (const v of e.videos) if (v.id === videoId) v.durationS = 61.5;
    }
    expect(validateMediaLinks(dataset, manifest).length).toBeGreaterThan(0);
    ref.durationS = 61.5;
    expect(validateMediaLinks(dataset, manifest)).toEqual([]);
  });

  it("treats miscVideos as an exhaustive, disjoint index", () => {
    const { dataset, manifest } = published();
    const fixture = {
      dataset: {
        ...dataset,
        experiments: [{ ...dataset.experiments[0], videos: [{ ...fileRef(1), kind: "primary" as const }] }],
      },
      manifest: { ...manifest, groups: { "Raw Data": [fileRef(1), fileRef(2), fileRef(3, ".pdf")] } },
    };
    const check = (miscVideos: string[]) =>
      validateMediaLinks(fixture.dataset, { ...fixture.manifest, miscVideos });

    expect(check([fileId(2)])).toEqual([]);
    expect(check([]).some((e) => e.includes(fileId(2)))).toBe(true);
    expect(check([fileId(1), fileId(2)]).some((e) => e.includes("also attached"))).toBe(true);
    expect(validateMediaLinks(fixture.dataset, { ...fixture.manifest, miscVideos: undefined })).toEqual([]);
  });

  it("validateManifest rejects unknown, duplicate or non-video miscVideos ids", () => {
    const { manifest } = published();
    const files = Object.values(manifest.groups).flat();
    const pdf = files.find((f) => f.ext === ".pdf");
    const mp4 = files.find((f) => f.ext === ".mp4");
    if (!pdf || !mp4) throw new Error("expected a published PDF and MP4");
    expect(validateManifest({ ...manifest, miscVideos: [mp4.id] }).ok).toBe(true);
    for (const miscVideos of [[fileId(9)], [pdf.id], [mp4.id, mp4.id]]) {
      expect(validateManifest({ ...manifest, miscVideos }).ok).toBe(false);
    }
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
