import { describe, expect, it } from "vitest";

import { profileOf, revolveRadius, toPixels } from "./mesh";

describe("3D flame geometry", () => {
  it("converts permille polygons to source pixels", () => {
    expect(toPixels([[0, 0, 500, 1000]], 720, 480)).toEqual([
      [
        [0, 0],
        [360, 480],
      ],
    ]);
  });

  it("recovers the radius of an axisymmetric (elliptic) silhouette", () => {
    // ellipse centred at (300, 200), semi-axes 100 x 40 -> max radius 40 at the centre
    const poly: [number, number][] = [];
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      poly.push([300 + 100 * Math.cos(a), 200 + 40 * Math.sin(a)]);
    }
    const p = profileOf([poly], 200, 40, 1)!;
    expect(p.asymmetry).toBeLessThan(0.08);
    const r = revolveRadius(p, 0);
    const mid = Math.max(...r);
    expect(mid).toBeGreaterThan(36);
    expect(mid).toBeLessThan(41);
    expect(r[0]).toBe(0);
    expect(r[r.length - 1]).toBe(0);
  });

  it("reports asymmetry when the flame sits on one side of the axis", () => {
    const upperOnly: [number, number][] = [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ];
    const p = profileOf([upperOnly], 150, 20, 1)!;
    expect(p.asymmetry).toBeGreaterThan(0.9);
  });

  it("returns null for degenerate input", () => {
    expect(profileOf([], 0)).toBeNull();
    expect(
      profileOf(
        [
          [
            [1, 1],
            [1, 2],
            [1, 3],
          ],
        ],
        2,
      ),
    ).toBeNull();
  });
});
