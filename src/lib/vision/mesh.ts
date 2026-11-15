/**
 * Geometry for the 3D flame views, computed from the stored flame polygons (pure, testable).
 *
 * Models (each one states its assumption in the UI):
 *  - revolve:   solid of revolution about the horizontal flow axis through the flame centroid.
 *               Physically motivated for rods, spheres and candles in axial flow (axisymmetric
 *               flames); for an axisymmetric object the projected half-width at x equals r(x).
 *  - extrude:   the side-view silhouette extruded across the sample width — planar samples
 *               (films, slabs, fabrics) burn as near-2D sheets. Depth is illustrative (no scale).
 *  - spacetime: the measured outline at successive times stacked along a time axis (x, y, t).
 *               No assumption at all: every vertex is a measured contour point.
 */

export type MeshModel = "revolve" | "extrude" | "spacetime";

export interface Profile {
  /** x positions (source px) of the sampled columns, left to right */
  x: number[];
  /** upper and lower extent from the axis (px, >= 0) */
  upper: number[];
  lower: number[];
  /** axis row (source px) */
  axisY: number;
  /** relative asymmetry |upper-lower| / (upper+lower), averaged over columns */
  asymmetry: number;
}

/** Polygons (flat permille lists) -> source-pixel point lists. */
export function toPixels(polygons: number[][], width: number, height: number): [number, number][][] {
  return polygons.map((flat) => {
    const pts: [number, number][] = [];
    for (let k = 0; k + 1 < flat.length; k += 2) pts.push([(flat[k] / 1000) * width, (flat[k + 1] / 1000) * height]);
    return pts;
  });
}

/** Even-odd point-in-polygon. */
function inside(px: number, py: number, poly: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi) c = !c;
  }
  return c;
}

/**
 * Upper/lower extent of the flame around a horizontal axis, column by column.
 * Each column is scanned at `rowStep` px; the flame is the union of the polygons.
 */
export function profileOf(polys: [number, number][][], axisY: number, columns = 72, rowStep = 1): Profile | null {
  const all = polys.flat();
  if (all.length < 3) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of all) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX - minX < 2) return null;
  const xs: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];
  let asym = 0;
  let asymN = 0;
  for (let c = 0; c < columns; c++) {
    const x = minX + ((c + 0.5) / columns) * (maxX - minX);
    let top = Infinity;
    let bottom = -Infinity;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += rowStep) {
      if (polys.some((p) => p.length > 2 && inside(x, y, p))) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    xs.push(x);
    const u = Number.isFinite(top) ? Math.max(0, axisY - top) : 0;
    const l = Number.isFinite(bottom) ? Math.max(0, bottom - axisY) : 0;
    upper.push(u);
    lower.push(l);
    if (u + l > 0) {
      asym += Math.abs(u - l) / (u + l);
      asymN += 1;
    }
  }
  return { x: xs, upper, lower, axisY, asymmetry: asymN ? asym / asymN : 0 };
}

/** Axisymmetric radius r(x) = mean of the two half-widths, lightly smoothed; ends closed. */
export function revolveRadius(profile: Profile, smoothing = 2): number[] {
  const raw = profile.upper.map((u, i) => (u + profile.lower[i]) / 2);
  const out = raw.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, i - smoothing); k <= Math.min(raw.length - 1, i + smoothing); k++) {
      s += raw[k];
      n += 1;
    }
    return s / n;
  });
  out[0] = 0;
  out[out.length - 1] = 0;
  return out;
}
