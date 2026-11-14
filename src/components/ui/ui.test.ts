import { describe, expect, it } from "vitest";

import { formatBytes, formatMetricValue, formatNullWithReason, summarizeQaFlags } from "./format";

describe("UI formatting and scientific honesty helpers", () => {
  it("renders null, undefined, and non-finite measurements as em-dash without inventing 0", () => {
    expect(formatMetricValue(null, { unit: "% O₂" })).toEqual({ text: "—", missing: true });
    expect(formatMetricValue(undefined, { unit: "cm/s" })).toEqual({ text: "—", missing: true });
    expect(formatMetricValue(Number.NaN, { unit: "mm" })).toEqual({ text: "—", missing: true });
  });

  it("uses thin space before units in expert mode and standard space in learn mode", () => {
    expect(formatMetricValue(21.0, { unit: "% O₂", mode: "expert", precision: 1 })).toEqual({
      text: "21.0\u2009% O₂",
      missing: false,
    });
    expect(formatMetricValue(5, { unit: "cm/s", mode: "learn" })).toEqual({
      text: "5 cm/s",
      missing: false,
    });
  });

  it("provides explicit default null reasons", () => {
    expect(formatNullWithReason()).toBe("Not measured / unparseable in source");
    expect(formatNullWithReason("O₂ implausible in source")).toBe("O₂ implausible in source");
  });

  it("summarizes QA flags verbatim with parse generation", () => {
    expect(summarizeQaFlags([], "heuristic-v0")).toMatchObject({
      count: 0,
      isClean: true,
      label: "QA verified",
      parseLabel: "parse: heuristic-v0",
    });
    expect(summarizeQaFlags(["o2FinalPct implausible (1.6)"], "heuristic-v0")).toMatchObject({
      count: 1,
      isClean: false,
      label: "QA · 1",
      flags: ["o2FinalPct implausible (1.6)"],
    });
  });

  it("formats archive byte counts clearly", () => {
    expect(formatBytes(512)).toBe("512\u2009B");
    expect(formatBytes(2072492)).toBe("2.0\u2009MB");
    expect(formatBytes(275 * 1024 ** 3)).toBe("275\u2009GB");
  });
});
