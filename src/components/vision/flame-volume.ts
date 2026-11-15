/**
 * Emission volumes for the Flame 3D Studio, built in the browser from the measured outline and the
 * footage pixels of the current frame (CORS-enabled NASA stream).
 *
 *  axisymmetric  onion-peeling Abel inversion of every column, per colour channel
 *                (rods, spheres, candles in axial flow; optically thin flame assumed)
 *  twoview       side-view brightness spread across the face-view (Nikon) silhouette so that the
 *                side projection is preserved (planar samples)
 *  planar        side-view brightness extruded through an illustrative depth (planar samples)
 *
 * Pixels are converted from sRGB to linear light and multiplied by the flame mask (background and
 * reflections outside the outline are excluded). Values are relative emission, 8-bit video, not
 * radiometrically calibrated; clipped (saturated) pixels make the core a lower bound.
 */
import { onionPeel, symmetrise } from "@/lib/vision/abel";

import type { ViewMask } from "./two-view";

export type VolumeModel = "axisymmetric" | "twoview" | "planar";

export interface FramePixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface EmissionVolume {
  data: Uint8Array; // RGBA, x fastest
  nx: number;
  ny: number;
  nz: number;
  /** box size in source pixels */
  size: [number, number, number];
  model: VolumeModel;
  usedPixels: boolean;
  saturatedShare: number;
  /** rendering gain: thick planar volumes integrate over more depth than a thin axisymmetric shell */
  gain: number;
}

const NX = 96;
const NY = 64;
const NZ = 64;
const LIN = new Float32Array(256).map((_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

interface Inputs {
  model: VolumeModel;
  side: ViewMask; // rasterised flame mask of the side (video) view, source px
  frame: FramePixels | null; // full frame pixels of the side view, or null
  source: { width: number; height: number };
  bbox: { x: number; y: number; w: number; h: number };
  axisY: number;
  fallback: [number, number, number]; // linear RGB used when pixels are unavailable
  face?: { mask: ViewMask; mirrored: boolean } | null;
}

/** Linear RGB of the side view at source pixel (x, y), zero outside the flame mask. */
function sampler(inp: Inputs) {
  const { frame, side, source, fallback } = inp;
  let saturated = 0;
  let total = 0;
  const get = (x: number, y: number, out: number[]) => {
    if (!side.at(x, y)) {
      out[0] = out[1] = out[2] = 0;
      return;
    }
    total += 1;
    if (!frame) {
      out[0] = fallback[0];
      out[1] = fallback[1];
      out[2] = fallback[2];
      return;
    }
    const px = Math.min(frame.width - 1, Math.max(0, Math.round((x / source.width) * frame.width)));
    const py = Math.min(frame.height - 1, Math.max(0, Math.round((y / source.height) * frame.height)));
    const k = (py * frame.width + px) * 4;
    const r = frame.data[k];
    const g = frame.data[k + 1];
    const b = frame.data[k + 2];
    if (r >= 254 || g >= 254 || b >= 254) saturated += 1;
    out[0] = LIN[r];
    out[1] = LIN[g];
    out[2] = LIN[b];
  };
  return { get, stats: () => ({ saturated, total }) };
}

/** Separable box blur (radius r voxels) on an RGB field: softens silhouette-hull edges. */
function blur3(field: Float32Array, r: number) {
  const tmp = new Float32Array(field.length);
  const pass = (src: Float32Array, dst: Float32Array, stride: number, len: number, count: (i: number) => number) => {
    for (let v = 0; v < NX * NY * NZ; v++) {
      const pos = count(v);
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let n = 0;
        for (let d = -r; d <= r; d++) {
          const q = pos + d;
          if (q < 0 || q >= len) continue;
          sum += src[(v + d * stride) * 3 + c];
          n += 1;
        }
        dst[v * 3 + c] = sum / n;
      }
    }
  };
  pass(field, tmp, 1, NX, (v) => v % NX);
  pass(tmp, field, NX, NY, (v) => Math.floor(v / NX) % NY);
  pass(field, tmp, NX * NY, NZ, (v) => Math.floor(v / (NX * NY)));
  field.set(tmp);
}

function pack(field: Float32Array, size: [number, number, number], model: VolumeModel, usedPixels: boolean, saturatedShare: number): EmissionVolume {
  // normalise at the 99.5th percentile of the brightest channel so hot pixels do not flatten the rest
  const peaks: number[] = [];
  for (let i = 0; i < field.length; i += 3) {
    const m = Math.max(field[i], field[i + 1], field[i + 2]);
    if (m > 0) peaks.push(m);
  }
  peaks.sort((a, b) => a - b);
  const norm = peaks.length ? peaks[Math.floor(peaks.length * 0.995)] || peaks[peaks.length - 1] : 1;
  const n = field.length / 3;
  const data = new Uint8Array(n * 4);
  for (let v = 0; v < n; v++) {
    const r = Math.min(1, field[v * 3] / norm);
    const g = Math.min(1, field[v * 3 + 1] / norm);
    const b = Math.min(1, field[v * 3 + 2] / norm);
    // store display-encoded colour (sqrt keeps faint blue zones visible) and emission strength in alpha
    data[v * 4] = Math.round(Math.sqrt(r) * 255);
    data[v * 4 + 1] = Math.round(Math.sqrt(g) * 255);
    data[v * 4 + 2] = Math.round(Math.sqrt(b) * 255);
    data[v * 4 + 3] = Math.round(Math.min(1, Math.max(r, g, b)) * 255);
  }
  return { data, nx: NX, ny: NY, nz: NZ, size, model, usedPixels, saturatedShare, gain: model === "axisymmetric" ? 1 : 0.3 };
}

export function buildVolume(inp: Inputs): EmissionVolume {
  const { bbox, axisY, model } = inp;
  const s = sampler(inp);
  const px = [0, 0, 0];
  const padX = bbox.w * 0.06;
  const x0 = bbox.x - padX;
  const lx = bbox.w + 2 * padX;
  const field = new Float32Array(NX * NY * NZ * 3);

  if (model === "axisymmetric") {
    const radius = Math.max(axisY - bbox.y, bbox.y + bbox.h - axisY, 4) * 1.08;
    const nr = NY / 2;
    const step = radius / nr;
    const rings: Float64Array[][] = [];
    for (let ix = 0; ix < NX; ix++) {
      const x = x0 + ((ix + 0.5) / NX) * lx;
      const columns: number[][] = [[], [], []];
      const rows = Math.ceil((2 * radius) / step) + 1;
      for (let k = 0; k < rows; k++) {
        const y = axisY - radius + k * step;
        s.get(x, y, px);
        columns[0].push(px[0]);
        columns[1].push(px[1]);
        columns[2].push(px[2]);
      }
      const axisRow = radius / step;
      rings.push(columns.map((col) => onionPeel(symmetrise(col, axisRow, nr, 1), step)));
    }
    for (let iz = 0; iz < NZ; iz++) {
      const z = ((iz + 0.5) / NZ - 0.5) * 2 * radius;
      for (let iy = 0; iy < NY; iy++) {
        const y = ((iy + 0.5) / NY - 0.5) * 2 * radius;
        const ring = Math.floor(Math.sqrt(y * y + z * z) / step);
        if (ring >= nr) continue;
        for (let ix = 0; ix < NX; ix++) {
          const v = (ix + iy * NX + iz * NX * NY) * 3;
          field[v] = rings[ix][0][ring];
          field[v + 1] = rings[ix][1][ring];
          field[v + 2] = rings[ix][2][ring];
        }
      }
    }
    const st = s.stats();
    return pack(field, [lx, 2 * radius, 2 * radius], model, Boolean(inp.frame), st.total ? st.saturated / st.total : 0);
  }

  // planar models: y from the side view, z = depth across the sample
  const halfY = Math.max(axisY - bbox.y, bbox.y + bbox.h - axisY, 4) * 1.1;
  const face = model === "twoview" ? inp.face : null;
  const halfZ = face ? 0.6 * lx : 0.22 * lx; // two-view depth spans the face silhouette; planar is illustrative
  for (let ix = 0; ix < NX; ix++) {
    const u = (ix + 0.5) / NX;
    const x = x0 + u * lx;
    // depth weights: face-view silhouette at this position (two-view) or a flat slab (planar)
    const weights = new Float32Array(NZ);
    let wsum = 0;
    for (let iz = 0; iz < NZ; iz++) {
      const zf = ((iz + 0.5) / NZ - 0.5) * 2 * halfZ; // side-view px
      let w = 0;
      if (face) {
        const uf = face.mirrored ? 1 - u : u;
        const fx = face.mask.x0 + uf * face.mask.length;
        const fy = face.mask.yc + (zf / lx) * face.mask.length;
        w = face.mask.at(fx, fy) ? 1 : 0;
      } else {
        w = Math.abs(zf) <= halfZ ? 1 : 0;
      }
      weights[iz] = w;
      wsum += w;
    }
    if (!wsum) continue;
    // preserve the side projection, but never concentrate a column into a sliver at the tips
    wsum = Math.max(wsum, NZ * 0.12);
    for (let iy = 0; iy < NY; iy++) {
      const y = axisY + ((iy + 0.5) / NY - 0.5) * 2 * halfY;
      s.get(x, y, px);
      if (!(px[0] || px[1] || px[2])) continue;
      for (let iz = 0; iz < NZ; iz++) {
        if (!weights[iz]) continue;
        const v = (ix + (NY - 1 - iy) * NX + iz * NX * NY) * 3; // image rows grow downwards
        field[v] = px[0] / wsum;
        field[v + 1] = px[1] / wsum;
        field[v + 2] = px[2] / wsum;
      }
    }
  }
  blur3(field, 1);
  const st = s.stats();
  return pack(field, [lx, 2 * halfY, 2 * halfZ], model, Boolean(inp.frame), st.total ? st.saturated / st.total : 0);
}
