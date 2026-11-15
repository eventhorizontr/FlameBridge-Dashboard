/**
 * Vision layer contract (ADR-017): what `pipeline/vision/build.py` writes to
 * `public/data/<acc>/vision/`. The Zod schemas are the single source of truth; the types are
 * inferred from them. Every number is an image measurement (pixels / 8-bit counts) or a value read
 * from the camera overlay — never a physical length (no scale is visible in most footage).
 */
import { z } from "zod";

const num = z.number();
const nullableNum = z.number().nullable();
const series = z.array(nullableNum);

export const VisionStatusSchema = z.enum(["ok", "skipped", "unreadable", "not-instrument-footage", "missing"]);

export const VisionSourceSchema = z.object({
  fps: num,
  frameCount: num,
  durationS: num,
  width: num,
  height: num,
});

export const VisionEventsSchema = z.object({
  firstFlameS: nullableNum,
  lastFlameS: nullableNum,
  visibleS: num,
  episodes: num,
  peakAreaS: nullableNum,
  peakAreaPx: nullableNum,
  transientFrames: num.optional(),
  edgeFrames: num.optional(),
  litFrames: num.optional(),
});

export const FlickerSchema = z.object({ hz: num, powerShare: num, windowS: num });

export const VisionSummarySchema = z.object({
  meanAreaPx: nullableNum,
  maxAreaPx: nullableNum,
  maxBBoxW: nullableNum,
  maxBBoxH: nullableNum,
  meanBrightness: nullableNum,
  saturatedFraction: nullableNum,
  meanSsim: nullableNum,
  meanIou: nullableNum,
  meanFlowPxS: nullableNum,
  dominantFlickerHz: FlickerSchema.nullable(),
});

export const VisionSeriesSchema = z.object({
  t: z.array(num),
  valid: z.array(num),
  visible: z.array(num),
  areaPx: series,
  corePx: series,
  bboxX: series,
  bboxY: series,
  bboxW: series,
  bboxH: series,
  cx: series,
  cy: series,
  brightness: series,
  peakExcess: series,
  saturatedPx: series,
  haloPx: series.optional(),
  otherPx: series.optional(),
  flags: z.array(num).optional(),
  ssim: series,
  hist: series,
  iou: series,
  flowPxS: series,
});

export const OsdFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string().nullable(),
  meaning: z.string(),
  displayScale: num,
});

export const OsdSchema = z.object({
  fields: z.array(OsdFieldSchema),
  registration: z.object({ score: num, x0: num, y0: num, scale: num }),
  readRate: z.record(z.string(), num),
  dateCheck: z.object({
    status: z.enum(["match", "mismatch", "unknown", "no-clock"]),
    expected: z.string().nullable(),
    observed: z.string().nullable(),
    agreement: num.optional(),
  }),
  clock: z.object({ clockAtVideoStart: z.string(), consistency: num }).nullable(),
  series: z.record(z.string(), series),
});

export const EmbeddingSchema = z.object({
  model: z.string(),
  hz: num,
  t: z.array(num),
  cosPrev: z.array(num),
  recurrence: z.object({
    size: num,
    min: num,
    binStartS: z.array(num),
    values: z.array(num),
  }),
  novelty: z.array(num),
  segments: z.array(z.object({ startS: num, endS: num })),
});

export const KeyframesSchema = z.object({
  file: z.string(),
  tileW: num,
  tileH: num,
  cols: num,
  rows: num,
  t: z.array(num),
});

export const VisionVideoSchema = z.object({
  schemaVersion: z.literal(1),
  accession: z.string(),
  experimentId: z.string(),
  videoId: z.string(),
  kind: z.string().nullable(),
  fileName: z.string().nullable(),
  algorithm: z.object({ name: z.string(), version: z.string() }),
  status: VisionStatusSchema,
  reason: z.string().optional(),
  source: VisionSourceSchema.optional(),
  sampling: z.object({ analysisHz: num, storeHz: num, stride: num }).optional(),
  coverage: z
    .object({ analysedFrames: num, instrumentFrames: num, instrumentFraction: num, flameFrames: num })
    .optional(),
  segmentation: z
    .object({
      photoRoi: z.object({ layout: z.string(), box: z.array(num) }).nullable().optional(),
      noiseSigma: num,
      weakThreshold: num,
      strongThreshold: num,
      workScale: num,
      overlayBox: z.array(num).nullable(),
    })
    .optional(),
  events: VisionEventsSchema.optional(),
  summary: VisionSummarySchema.optional(),
  series: VisionSeriesSchema.optional(),
  osd: OsdSchema.nullable().optional(),
  embedding: EmbeddingSchema.nullable().optional(),
  keyframes: KeyframesSchema.nullable().optional(),
});

export const VisionContoursSchema = z.object({
  videoId: z.string(),
  t: z.array(num),
  units: z.string(),
  /** Per stored frame: null (no flame) or polygons as flat [x, y, ...] in permille of the frame. */
  polygons: z.array(z.array(z.array(num)).nullable()),
});

export const VisionIndexEntrySchema = z.object({
  videoId: z.string(),
  experimentId: z.string(),
  kind: z.string().nullable(),
  status: VisionStatusSchema,
  reason: z.string().nullable().optional(),
  durationS: nullableNum.optional(),
  hasContours: z.boolean(),
  hasKeyframes: z.boolean(),
  hasEmbedding: z.boolean(),
  coverage: VisionVideoSchema.shape.coverage,
  events: VisionEventsSchema.optional(),
  summary: VisionSummarySchema.optional(),
  osd: z
    .object({
      readRate: z.record(z.string(), num).nullable().optional(),
      dateCheck: z.string().nullable().optional(),
      clockAtVideoStart: z.string().nullable().optional(),
      radMax: nullableNum.optional(),
      airValues: z.array(num).optional(),
    })
    .nullable()
    .optional(),
  segments: nullableNum.optional(),
});

export const VisionIndexSchema = z.object({
  schemaVersion: z.literal(1),
  accession: z.string(),
  generatedAt: z.string(),
  algorithm: z.object({ name: z.string(), version: z.string() }),
  profile: z.record(z.string(), z.unknown()),
  counts: z.record(z.string(), num),
  videos: z.array(VisionIndexEntrySchema),
});

export type VisionStatus = z.infer<typeof VisionStatusSchema>;
export type VisionVideo = z.infer<typeof VisionVideoSchema>;
export type VisionSeries = z.infer<typeof VisionSeriesSchema>;
export type VisionEvents = z.infer<typeof VisionEventsSchema>;
export type VisionSummary = z.infer<typeof VisionSummarySchema>;
export type VisionOsd = z.infer<typeof OsdSchema>;
export type VisionEmbedding = z.infer<typeof EmbeddingSchema>;
export type VisionKeyframes = z.infer<typeof KeyframesSchema>;
export type VisionContours = z.infer<typeof VisionContoursSchema>;
export type VisionIndex = z.infer<typeof VisionIndexSchema>;
export type VisionIndexEntry = z.infer<typeof VisionIndexEntrySchema>;

/** Per-frame QA flags (bitmask) written by `analyze.py`. */
export const VISION_FLAGS = {
  lit: 1,
  transient: 2,
  otherLight: 4,
  saturated: 8,
  edge: 16,
} as const;

export const VISION_FLAG_LABELS: Record<keyof typeof VISION_FLAGS, string> = {
  lit: "Chamber lights on — flame not measured",
  transient: "Area spike vs. the surrounding ±3 s (igniter flash or scene lighting)",
  otherLight: "Other luminous regions outside the flame (reflections, debris)",
  saturated: "Over 25 % of the flame clipped at full brightness — brightness is a lower bound",
  edge: "Flame region touches the frame edge — it may extend out of view",
};

export const FLAME_OVERLAY_MODES = ["off", "box", "outline", "isolate"] as const;
export type FlameOverlayMode = (typeof FLAME_OVERLAY_MODES)[number];

export interface FlameOverlay {
  /** off · box (bounding frame) · outline (flame contour) · isolate (only the flame visible). */
  mode: FlameOverlayMode;
  /** Crop and follow the flame (digital zoom on its bounding box). */
  follow: boolean;
}
