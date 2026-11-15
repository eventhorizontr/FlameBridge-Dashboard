import { describe, expect, it } from "vitest";

import { onionPeel, symmetrise } from "./abel";

/** Forward Abel projection of a ring-wise emission profile (same discretisation). */
function project(eps: number[]): number[] {
  const n = eps.length;
  return eps.map((_, j) => {
    let s = 0;
    for (let i = j; i < n; i++) s += 2 * (Math.sqrt((i + 1) ** 2 - j ** 2) - Math.sqrt(Math.max(0, i ** 2 - j ** 2))) * eps[i];
    return s;
  });
}

describe("onion-peeling Abel inversion", () => {
  it("recovers a uniform disc", () => {
    const eps = Array.from({ length: 24 }, (_, i) => (i < 16 ? 1 : 0));
    const back = onionPeel(project(eps));
    back.forEach((v, i) => expect(v).toBeCloseTo(eps[i], 6));
  });

  it("recovers a hollow shell (flame sheet around a dark core)", () => {
    const eps = Array.from({ length: 30 }, (_, i) => (i >= 10 && i < 14 ? 3 : 0.2 * (i < 20 ? 1 : 0)));
    const back = onionPeel(project(eps));
    back.forEach((v, i) => expect(v).toBeCloseTo(eps[i], 6));
    expect(back[12]).toBeGreaterThan(back[2] * 5);
  });

  it("never returns negative emission for noisy input", () => {
    const p = [5, 4.9, 6, 2, 3, 0.5, 0.8, 0];
    expect(Math.min(...onionPeel(p))).toBeGreaterThanOrEqual(0);
  });

  it("symmetrises a column about the axis", () => {
    const col = [0, 1, 2, 3, 4, 5, 6];
    expect(Array.from(symmetrise(col, 3, 3))).toEqual([3, 3, 3]);
  });
});
