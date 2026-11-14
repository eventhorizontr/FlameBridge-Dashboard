import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateDataset, validateManifest } from "@/types/validate";

describe("published PSI-20", () => {
  it("validates both data bundles against the app contract", () => {
    const read = (name: string): unknown =>
      JSON.parse(readFileSync(`public/data/psi-20/${name}.json`, "utf8"));
    const dataset = validateDataset(read("experiments"));
    const manifest = validateManifest(read("manifest"));
    expect(dataset).toMatchObject({ ok: true, data: { accession: "PSI-20", count: 18 } });
    expect(manifest).toMatchObject({ ok: true, data: { accession: "PSI-20" } });
  });
});
