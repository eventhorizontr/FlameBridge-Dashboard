import { describe, expect, it } from "vitest";

import { LEARN_CHAPTERS } from "@/components/viz/learn-chapters";

import { LEARN_MODULES, REFERENCES, STARTING_RANK, TOTAL_XP } from "./curriculum";
import { classify, EASIEST_FLOW, needed } from "./u-curve";
import { buoyancyStrength, WORLDS } from "./worlds";
import { formulaTokens } from "./formula";
import {
  completedCount,
  currentRank,
  earnedXp,
  hasPassed,
  isUnlocked,
  nextModuleIndex,
  passThreshold,
  type CompletedMap,
} from "./progress";

const pass = { score: 3, total: 3, passedAt: "2026-11-15T12:00:00.000Z" };

describe("curriculum", () => {
  it("has unique ids and valid flight-note links", () => {
    expect(new Set(LEARN_MODULES.map((m) => m.id)).size).toBe(LEARN_MODULES.length);
    const chapterIds = new Set(LEARN_CHAPTERS.map((c) => c.id));
    for (const m of LEARN_MODULES) {
      if (m.flightNotesChapterId) expect(chapterIds.has(m.flightNotesChapterId)).toBe(true);
      expect(m.featuredRunId).toMatch(/^PSI-25:/);
      expect(m.lab.length).toBeGreaterThan(0);
    }
  });

  it("cites a known reference on every concept card", () => {
    for (const m of LEARN_MODULES) {
      expect(m.cards.length).toBeGreaterThanOrEqual(3);
      for (const card of m.cards) {
        expect(card.refs.length).toBeGreaterThan(0);
        for (const key of card.refs) expect(REFERENCES[key]).toBeDefined();
      }
    }
  });

  it("links only references that carry a DOI or URL", () => {
    for (const ref of Object.values(REFERENCES)) {
      if (ref.kind === "doi") expect(ref.doi).toMatch(/^10\.\d{4,9}\//);
      else expect(ref.doi).toBeUndefined();
      if (ref.kind === "url") expect(ref.url).toMatch(/^https:\/\//);
      else expect(ref.url).toBeUndefined();
    }
  });

  it("has well-formed gate questions", () => {
    for (const m of LEARN_MODULES) {
      expect(m.gate.length).toBeGreaterThanOrEqual(3);
      for (const q of m.gate) {
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
    }
  });

  it("totals the XP of all modules", () => {
    expect(TOTAL_XP).toBe(LEARN_MODULES.reduce((s, m) => s + m.xp, 0));
  });
});

describe("progress rules", () => {
  it("requires 80 % to pass", () => {
    expect(passThreshold(3)).toBe(3);
    expect(passThreshold(4)).toBe(4);
    expect(passThreshold(5)).toBe(4);
    expect(hasPassed(2, 3)).toBe(false);
    expect(hasPassed(3, 3)).toBe(true);
    expect(hasPassed(0, 0)).toBe(false);
  });

  it("unlocks modules sequentially", () => {
    const none: CompletedMap = {};
    expect(isUnlocked(0, none)).toBe(true);
    expect(isUnlocked(1, none)).toBe(false);
    const first: CompletedMap = { [LEARN_MODULES[0].id]: pass };
    expect(isUnlocked(1, first)).toBe(true);
    expect(isUnlocked(2, first)).toBe(false);
  });

  it("computes XP, rank and next module", () => {
    const none: CompletedMap = {};
    expect(earnedXp(none)).toBe(0);
    expect(currentRank(none)).toBe(STARTING_RANK);
    expect(nextModuleIndex(none)).toBe(0);

    const two: CompletedMap = {
      [LEARN_MODULES[0].id]: pass,
      [LEARN_MODULES[1].id]: pass,
    };
    expect(earnedXp(two)).toBe(LEARN_MODULES[0].xp + LEARN_MODULES[1].xp);
    expect(currentRank(two)).toBe(LEARN_MODULES[1].rank);
    expect(completedCount(two)).toBe(2);
    expect(nextModuleIndex(two)).toBe(2);

    const all = Object.fromEntries(LEARN_MODULES.map((m) => [m.id, pass]));
    expect(earnedXp(all)).toBe(TOTAL_XP);
    expect(nextModuleIndex(all)).toBe(-1);
  });
});

describe("formula mini-syntax", () => {
  it("splits subscripts and superscripts", () => {
    expect(formulaTokens("u_{b} ~ x^{1/2}")).toEqual([
      { kind: "text", value: "u" },
      { kind: "sub", value: "b" },
      { kind: "text", value: " ~ x" },
      { kind: "sup", value: "1/2" },
    ]);
  });

  it("leaves plain text alone", () => {
    expect(formulaTokens("y > x")).toEqual([{ kind: "text", value: "y > x" }]);
  });
});

describe("U-curve schematic", () => {
  it("has its minimum at EASIEST_FLOW", () => {
    const min = needed(EASIEST_FLOW);
    expect(needed(EASIEST_FLOW - 0.05)).toBeGreaterThan(min);
    expect(needed(EASIEST_FLOW + 0.05)).toBeGreaterThan(min);
  });

  it("classifies the two extinction sides", () => {
    expect(classify(EASIEST_FLOW, 1)).toBe("burns");
    expect(classify(0.02, 0.2)).toBe("quenching");
    expect(classify(0.95, 0.2)).toBe("blowoff");
  });
});

describe("worlds", () => {
  it("orders buoyancy Earth > Mars > Moon > orbit", () => {
    const b = WORLDS.map((w) => buoyancyStrength(w.gRel));
    expect(WORLDS.map((w) => w.id)).toEqual(["earth", "mars", "moon", "orbit"]);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeLessThan(b[i - 1]);
    expect(b[0]).toBe(1);
    expect(b[3]).toBe(0);
  });
});
