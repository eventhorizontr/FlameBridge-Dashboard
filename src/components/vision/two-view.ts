/**
 * Two-view silhouette hull (shape-from-silhouette; Laurentini 1994, IEEE TPAMI 16(2):150-162,
 * DOI 10.1109/34.273735) from the BASS-II video camera (edge-on side view) and the Nikon still
 * camera (face-on view of planar samples). Both views share the horizontal flow axis.
 *
 * Registration: each view is normalised by its own flame length along the flow axis (no physical
 * scale exists), leading/trailing edges aligned; the face view may be mirrored relative to the side
 * view, which is decided by correlating the two thickness profiles. The hull is the set of voxels
 * inside both extruded silhouettes — an upper bound of the true flame volume.
 */

export interface ViewMask {
  /** occupancy lookup in source pixels */
  at: (x: number, y: number) => boolean;
  x0: number;
  length: number;
  yc: number;
}

/** Rasterise polygons (source px) into a mask (browser canvas). */
export function rasterise(polygons: [number, number][][], width: number, height: number): ViewMask | null {
  const pts = polygons.flat();
  if (pts.length < 3) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  for (const poly of polygons) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    poly.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }
  const data = ctx.getImageData(0, 0, width, height).data;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const length = Math.max(1, Math.max(...xs) - x0);
  const yc = (Math.min(...ys) + Math.max(...ys)) / 2;
  return {
    x0,
    length,
    yc,
    at: (x, y) => {
      const xi = Math.round(x);
      const yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= width || yi >= height) return false;
      return data[(yi * width + xi) * 4] > 127;
    },
  };
}

function thickness(view: ViewMask, u: number): number {
  let n = 0;
  for (let v = -0.6; v <= 0.6; v += 0.01) if (view.at(view.x0 + u * view.length, view.yc + v * view.length)) n += 1;
  return n;
}

function correlation(a: number[], b: number[]): number {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  a.forEach((x, i) => {
    num += (x - ma) * (b[i] - mb);
    da += (x - ma) ** 2;
    db += (b[i] - mb) ** 2;
  });
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

export interface Hull {
  /** occupancy field n^3 (x fastest, then y, then z), 0..1 after smoothing */
  field: Float32Array;
  n: number;
  mirrored: boolean;
  /** profile agreement after registration (Pearson r of thickness profiles) */
  agreement: number;
  /** half-extent of the grid in flame lengths for x and y/z */
  extent: { u: [number, number]; v: number };
  filled: number;
}

export function visualHull(side: ViewMask, face: ViewMask, n = 56): Hull {
  const us = Array.from({ length: 40 }, (_, i) => (i + 0.5) / 40);
  const ts = us.map((u) => thickness(side, u));
  const tf = us.map((u) => thickness(face, u));
  const direct = correlation(ts, tf);
  const reversed = correlation(ts, [...tf].reverse());
  const mirrored = reversed > direct;
  const u0 = -0.08;
  const u1 = 1.08;
  const vMax = 0.6;
  const raw = new Uint8Array(n * n * n);
  let filled = 0;
  for (let i = 0; i < n; i++) {
    const u = u0 + ((i + 0.5) / n) * (u1 - u0);
    const uf = mirrored ? 1 - u : u;
    const sideCol: boolean[] = [];
    const faceCol: boolean[] = [];
    for (let j = 0; j < n; j++) {
      const v = -vMax + ((j + 0.5) / n) * 2 * vMax;
      sideCol.push(side.at(side.x0 + u * side.length, side.yc - v * side.length));
      faceCol.push(face.at(face.x0 + uf * face.length, face.yc + v * face.length));
    }
    for (let j = 0; j < n; j++) {
      if (!sideCol[j]) continue;
      for (let k = 0; k < n; k++) {
        if (!faceCol[k]) continue;
        raw[i + j * n + k * n * n] = 1;
        filled += 1;
      }
    }
  }
  // one pass of a 3x3x3 box filter so the isosurface is smooth instead of voxel-stepped
  const field = new Float32Array(n * n * n);
  for (let k = 1; k < n - 1; k++) {
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        let s = 0;
        for (let dz = -1; dz <= 1; dz++)
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) s += raw[i + dx + (j + dy) * n + (k + dz) * n * n];
        field[i + j * n + k * n * n] = s / 27;
      }
    }
  }
  return { field, n, mirrored, agreement: Math.max(direct, reversed), extent: { u: [u0, u1], v: vMax }, filled };
}
