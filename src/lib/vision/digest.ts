/**
 * Pure helpers over the vision layer (client + server): sampling, statistics and the compact
 * digest the AI tools and the HTTP API return. No I/O here.
 */
import type { VisionContours, VisionSeries, VisionVideo } from "@/types/vision";
import { VISION_FLAGS, VISION_FLAG_LABELS } from "@/types/vision";

/** Index of the stored sample at or just before `timeS` (binary search on the time column). */
export function sampleIndexAt(t: readonly number[], timeS: number): number {
  if (!t.length) return -1;
  if (timeS <= t[0]) return 0;
  let lo = 0;
  let hi = t.length - 1;
  if (timeS >= t[hi]) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= timeS) lo = mid;
    else hi = mid;
  }
  return lo;
}

export interface FrameBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box at `timeS`, linearly interpolated between neighbouring samples (source px). */
export function boxAt(series: VisionSeries, timeS: number): FrameBox | null {
  const i = sampleIndexAt(series.t, timeS);
  if (i < 0) return null;
  const at = (k: number): FrameBox | null => {
    const x = series.bboxX[k];
    const y = series.bboxY[k];
    const w = series.bboxW[k];
    const h = series.bboxH[k];
    return x == null || y == null || w == null || h == null || !series.visible[k] ? null : { x, y, w, h };
  };
  const a = at(i);
  const j = Math.min(i + 1, series.t.length - 1);
  const b = at(j);
  if (!a) return null;
  if (!b || j === i) return a;
  const span = series.t[j] - series.t[i];
  const f = span > 0 ? Math.min(1, Math.max(0, (timeS - series.t[i]) / span)) : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, w: a.w + (b.w - a.w) * f, h: a.h + (b.h - a.h) * f };
}

/** Polygons (permille coordinates) of the nearest stored sample at `timeS`. */
export function polygonsAt(contours: VisionContours, series: VisionSeries, timeS: number): number[][] | null {
  const i = sampleIndexAt(contours.t, timeS);
  if (i < 0 || !series.visible[i]) return null;
  const j = Math.min(i + 1, contours.t.length - 1);
  const k = Math.abs(contours.t[j] - timeS) < Math.abs(contours.t[i] - timeS) ? j : i;
  return contours.polygons[k] ?? contours.polygons[i] ?? null;
}

export function flagLabels(flags: number): string[] {
  return (Object.keys(VISION_FLAGS) as (keyof typeof VISION_FLAGS)[])
    .filter((key) => (flags & VISION_FLAGS[key]) !== 0)
    .map((key) => VISION_FLAG_LABELS[key]);
}

export interface Stats {
  n: number;
  min: number;
  max: number;
  mean: number;
}

export function stats(values: readonly (number | null)[], keep?: readonly number[]): Stats | null {
  let n = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v) || (keep && !keep[i])) return;
    n += 1;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  });
  return n ? { n, min, max, mean: sum / n } : null;
}

/** Evenly thinned [t, value] pairs (≤ `points`), nulls kept as null so gaps stay visible. */
export function thin(t: readonly number[], values: readonly (number | null)[], points: number): [number, number | null][] {
  if (!t.length) return [];
  const step = Math.max(1, Math.ceil(t.length / Math.max(2, points)));
  const out: [number, number | null][] = [];
  for (let i = 0; i < t.length; i += step) out.push([t[i], values[i] ?? null]);
  return out;
}

const round = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d;

/**
 * Compact, citation-ready digest of one analysed video for the AI and the HTTP API.
 * `points` controls how many samples of each time series are included (0 = none).
 */
export function digestVideo(v: VisionVideo, points = 0) {
  const base = {
    videoId: v.videoId,
    experimentId: v.experimentId,
    kind: v.kind,
    status: v.status,
    ...(v.reason ? { reason: v.reason } : {}),
    algorithm: `${v.algorithm.name} ${v.algorithm.version}`,
  };
  if (v.status !== "ok" || !v.series || !v.source) return base;
  const s = v.series;
  const visible = s.visible;
  const osd = v.osd;
  const osdStats = osd
    ? Object.fromEntries(
        osd.fields.map((f) => {
          const values = osd.series[f.key] ?? [];
          const during = stats(values, visible);
          const all = stats(values);
          return [
            f.key,
            {
              label: f.label,
              unit: f.unit,
              meaning: f.meaning,
              readRate: osd.readRate[f.key] ?? null,
              wholeVideo: all && { min: round(all.min), max: round(all.max), mean: round(all.mean) },
              whileFlameVisible: during && { min: round(during.min), max: round(during.max), mean: round(during.mean) },
            },
          ];
        }),
      )
    : null;
  const flags = s.flags ?? [];
  const flagged: Record<string, number> = {};
  for (const key of Object.keys(VISION_FLAGS) as (keyof typeof VISION_FLAGS)[]) {
    const count = flags.filter((f) => (f & VISION_FLAGS[key]) !== 0).length;
    if (count) flagged[key] = count;
  }
  const peakIndex = v.events?.peakAreaS != null ? sampleIndexAt(s.t, v.events.peakAreaS) : -1;
  const atPeak =
    peakIndex >= 0
      ? {
          timeS: s.t[peakIndex],
          areaPx: s.areaPx[peakIndex],
          bboxPx: s.bboxW[peakIndex] != null ? { w: s.bboxW[peakIndex], h: s.bboxH[peakIndex] } : null,
          ...(osd ? Object.fromEntries(osd.fields.map((f) => [f.key, osd.series[f.key]?.[peakIndex] ?? null])) : {}),
          qaFlags: flagLabels(flags[peakIndex] ?? 0),
        }
      : null;
  return {
    ...base,
    atPeak,
    units: {
      areaPx: "pixels of the 720×480 source frame (no physical scale in the footage)",
      brightness: "integrated excess brightness, 8-bit counts × px / 1000 (camera-gain dependent)",
      flowPxS: "mean optical-flow speed inside the flame, px/s",
      similarity: "SSIM / histogram / mask IoU in [0,1]; DINOv2 cosine in [-1,1]",
    },
    source: v.source,
    coverage: v.coverage,
    events: v.events,
    summary: v.summary,
    qaFlagCounts: flagged,
    overlayTelemetry: osd && {
      fields: osdStats,
      dateCheck: osd.dateCheck,
      clockAtVideoStart: osd.clock?.clockAtVideoStart ?? null,
    },
    contextSegments: v.embedding?.segments ?? null,
    ...(points > 0
      ? {
          series: {
            areaPx: thin(s.t, s.areaPx, points),
            brightness: thin(s.t, s.brightness, points),
            ...(osd?.series.rad ? { rad: thin(s.t, osd.series.rad, points) } : {}),
            ...(osd?.series.air ? { airCmS: thin(s.t, osd.series.air, points) } : {}),
            iou: thin(s.t, s.iou, points),
          },
        }
      : {}),
  };
}

export type VisionDigest = ReturnType<typeof digestVideo>;

/** Everything measured at the stored sample nearest `timeS` (for "what is the flame doing now?"). */
export function frameAt(v: VisionVideo, timeS: number) {
  if (v.status !== "ok" || !v.series) return { videoId: v.videoId, status: v.status, reason: v.reason ?? null };
  const s = v.series;
  const i = sampleIndexAt(s.t, timeS);
  const flags = s.flags?.[i] ?? 0;
  const segment = v.embedding?.segments.findIndex((g) => s.t[i] >= g.startS && s.t[i] < g.endS) ?? -1;
  const osd = v.osd
    ? Object.fromEntries(v.osd.fields.map((f) => [f.key, { value: v.osd!.series[f.key]?.[i] ?? null, unit: f.unit }]))
    : null;
  return {
    videoId: v.videoId,
    experimentId: v.experimentId,
    requestedS: timeS,
    sampleS: s.t[i],
    measured: s.valid[i] === 1 && (flags & 1) === 0,
    flameVisible: s.visible[i] === 1,
    areaPx: s.areaPx[i],
    luminousCorePx: s.corePx[i],
    bboxPx: s.bboxX[i] != null ? { x: s.bboxX[i], y: s.bboxY[i], w: s.bboxW[i], h: s.bboxH[i] } : null,
    centroidPx: s.cx[i] != null ? { x: s.cx[i], y: s.cy[i] } : null,
    brightness: s.brightness[i],
    motionPxS: s.flowPxS[i],
    similarityToPrevious: { ssim: s.ssim[i], maskIou: s.iou[i] },
    overlayTelemetry: osd,
    qaFlags: flagLabels(flags),
    imagePhase: segment >= 0 ? { index: segment + 1, of: v.embedding!.segments.length, ...v.embedding!.segments[segment] } : null,
    vsVideo: {
      areaShareOfPeak: s.areaPx[i] != null && v.events?.peakAreaPx ? Math.round((s.areaPx[i]! / v.events.peakAreaPx) * 1000) / 1000 : null,
      firstFlameS: v.events?.firstFlameS ?? null,
      peakAreaS: v.events?.peakAreaS ?? null,
    },
  };
}
