/**
 * Places a flame might burn, with surface gravity relative to Earth.
 * Source: NASA NSSDCA Planetary Fact Sheet (Earth 9.80, Moon 1.62, Mars 3.71 m/s²).
 * Orbit/coasting spacecraft are in freefall: buoyancy is nearly absent (shown as 0 here).
 */
export type WorldId = "earth" | "mars" | "moon" | "orbit";

export interface World {
  readonly id: WorldId;
  readonly name: string;
  readonly short: string;
  /** Gravity relative to Earth, used only to shape the illustration. */
  readonly gRel: number;
  readonly gLabel: string;
  readonly blurb: string;
}

export const WORLDS: readonly World[] = [
  {
    id: "earth",
    name: "Earth",
    short: "Earth",
    gRel: 1,
    gLabel: "1 g",
    blurb: "Strong buoyancy: hot gas rises fast and pulls fresh air in from below. Tall, bright teardrop flame.",
  },
  {
    id: "mars",
    name: "Mars",
    short: "Mars",
    gRel: 3.71 / 9.8,
    gLabel: "≈ 0.38 g",
    blurb: "Weaker buoyancy than Earth: the flame still points up but is shorter and wider.",
  },
  {
    id: "moon",
    name: "Moon",
    short: "Moon",
    gRel: 1.62 / 9.8,
    gLabel: "≈ 0.17 g",
    blurb: "Gentle buoyancy: hot gas drifts upward slowly, so the flame is rounder and dimmer.",
  },
  {
    id: "orbit",
    name: "Space Station / coasting rocket",
    short: "Orbit",
    gRel: 0,
    gLabel: "freefall",
    blurb: "Almost no buoyancy: oxygen arrives only by slow diffusion or a fan. Round, dim, bluish flame.",
  },
];

/** 0 (no buoyancy) … 1 (Earth). Square root keeps Moon/Mars visibly distinct. */
export function buoyancyStrength(gRel: number): number {
  return Math.sqrt(Math.max(0, Math.min(1, gRel)));
}
