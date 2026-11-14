import { describe, expect, it } from "vitest";

import type { Evidence } from "@/types/ai";

import { getSuggestedPrompts, parseMessageSegments } from "./citation-parser";

describe("AI assistant citation parser & prompt suggestions", () => {
  const evidence: Evidence[] = [
    { id: "PSI-25:B3", label: "B3", kind: "experiment", href: "/experiments/PSI-25%3AB3" },
    { id: "doi:10.60555/4qc4-de67", label: "PSI-25 BASS-II dataset (CC0 1.0)", kind: "dataset", href: "https://doi.org/10.60555/4qc4-de67" },
  ];

  it("links bracketed run IDs only when matching evidence exists and keeps unverified tags plain", () => {
    const segments = parseMessageSegments(
      "Run [B3] burned at 22.2 % O₂ while unverified [X99] is kept plain.",
      evidence,
    );
    expect(segments).toEqual([
      { kind: "text", text: "Run " },
      { kind: "evidence", raw: "[B3]", evidence: evidence[0] },
      { kind: "text", text: " burned at 22.2 % O₂ while unverified [X99] is kept plain." },
    ]);
  });

  it("matches full PSI-25:ID citations case-insensitively", () => {
    const segments = parseMessageSegments("See [psi-25:b3] for footage.", evidence);
    expect(segments[1]).toEqual({ kind: "evidence", raw: "[psi-25:b3]", evidence: evidence[0] });
  });

  it("returns route- and mode-aware suggested prompts", () => {
    const expPrompts = getSuggestedPrompts("/experiments/PSI-25%3AO13a", "expert");
    expect(expPrompts.some((p) => p.includes("O13a"))).toBe(true);
    expect(getSuggestedPrompts("/learn", "learn")).toHaveLength(4);
    expect(getSuggestedPrompts("/explore", "expert")).toHaveLength(4);
  });
});
