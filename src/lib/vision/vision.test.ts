import { describe, expect, it } from "vitest";

import { createDashboardStore } from "@/lib/store/store";
import { DashboardActionSchema } from "@/types/schemas";
import { VisionContoursSchema, VisionVideoSchema, type VisionVideo } from "@/types/vision";

import { boxAt, digestVideo, flagLabels, polygonsAt, sampleIndexAt, stats, thin } from "./digest";

const series = {
  t: [0, 0.2, 0.4, 0.6, 0.8],
  valid: [1, 1, 1, 1, 1],
  visible: [0, 1, 1, 1, 0],
  areaPx: [0, 100, 200, 300, 0],
  corePx: [0, 50, 80, 120, 0],
  bboxX: [null, 10, 20, 30, null],
  bboxY: [null, 10, 10, 10, null],
  bboxW: [null, 100, 120, 140, null],
  bboxH: [null, 40, 40, 40, null],
  cx: [null, 60, 80, 100, null],
  cy: [null, 30, 30, 30, null],
  brightness: [null, 1, 2, 3, null],
  peakExcess: [null, 200, 210, 220, null],
  saturatedPx: [null, 0, 0, 90, null],
  haloPx: [null, 0, 0, 0, null],
  otherPx: [null, 0, 0, 0, null],
  flags: [1, 0, 2, 8, 0],
  ssim: [null, 0.9, 0.95, 0.97, 0.99],
  hist: [null, 0.9, 0.95, 0.97, 0.99],
  iou: [null, null, 0.8, 0.9, null],
  flowPxS: [null, null, 12, 14, null],
};

const video: VisionVideo = VisionVideoSchema.parse({
  schemaVersion: 1,
  accession: "PSI-25",
  experimentId: "PSI-25:B1",
  videoId: "6924803a7f6aa6a8302103cc",
  kind: "primary",
  fileName: "B1.mp4",
  algorithm: { name: "fif-flame-vision", version: "1.0.0" },
  status: "ok",
  source: { fps: 29.97, frameCount: 25, durationS: 0.83, width: 720, height: 480 },
  sampling: { analysisHz: 9.99, storeHz: 4.995, stride: 6 },
  coverage: { analysedFrames: 10, instrumentFrames: 10, instrumentFraction: 1, flameFrames: 6 },
  events: { firstFlameS: 0.2, lastFlameS: 0.6, visibleS: 0.6, episodes: 1, peakAreaS: 0.6, peakAreaPx: 300 },
  summary: {
    meanAreaPx: 200, maxAreaPx: 300, maxBBoxW: 140, maxBBoxH: 40, meanBrightness: 2, saturatedFraction: 0.15,
    meanSsim: 0.95, meanIou: 0.85, meanFlowPxS: 13, dominantFlickerHz: null,
  },
  series,
  osd: {
    fields: [{ key: "rad", label: "RAD", unit: null, meaning: "Uncalibrated radiometer", displayScale: 1 }],
    registration: { score: 0.99, x0: 158, y0: 32, scale: 1 },
    readRate: { rad: 1 },
    dateCheck: { status: "match", expected: "2014-02-19", observed: "2014-02-19", agreement: 1 },
    clock: { clockAtVideoStart: "2014-02-19T10:09:34", consistency: 1 },
    series: { rad: [0.05, 0.4, 1.1, 1.2, 0.3] },
  },
  embedding: null,
  keyframes: null,
});

describe("vision sampling", () => {
  it("finds the sample at or before a time", () => {
    expect(sampleIndexAt(series.t, -1)).toBe(0);
    expect(sampleIndexAt(series.t, 0.3)).toBe(1);
    expect(sampleIndexAt(series.t, 0.4)).toBe(2);
    expect(sampleIndexAt(series.t, 9)).toBe(4);
    expect(sampleIndexAt([], 1)).toBe(-1);
  });

  it("interpolates the bounding frame and hides it where no flame is visible", () => {
    expect(boxAt(video.series!, 0.1)).toBeNull();
    const mid = boxAt(video.series!, 0.3)!;
    expect(mid.x).toBeCloseTo(15);
    expect(mid.w).toBeCloseTo(110);
    // next sample is not visible -> hold the last visible box instead of interpolating to nothing
    expect(boxAt(video.series!, 0.7)).toEqual({ x: 30, y: 10, w: 140, h: 40 });
  });

  it("returns polygons only for visible samples", () => {
    const contours = VisionContoursSchema.parse({
      videoId: video.videoId,
      t: series.t,
      units: "permille",
      polygons: [null, [[0, 0, 10, 0, 10, 10]], [[1, 1, 2, 2, 3, 1]], null, null],
    });
    expect(polygonsAt(contours, video.series!, 0.05)).toBeNull();
    expect(polygonsAt(contours, video.series!, 0.21)).toEqual([[0, 0, 10, 0, 10, 10]]);
  });
});

describe("vision statistics", () => {
  it("ignores nulls and honours a keep mask", () => {
    expect(stats([1, null, 3])).toEqual({ n: 2, min: 1, max: 3, mean: 2 });
    expect(stats([1, 5, 3], [0, 1, 1])?.mean).toBe(4);
    expect(stats([null])).toBeNull();
  });

  it("thins series without inventing values", () => {
    const out = thin([0, 1, 2, 3, 4, 5], [0, null, 2, 3, null, 5], 3);
    expect(out).toEqual([[0, 0], [2, 2], [4, null]]);
  });

  it("labels QA flags", () => {
    expect(flagLabels(0)).toEqual([]);
    expect(flagLabels(1 | 8)).toHaveLength(2);
  });
});

describe("digestVideo", () => {
  it("summarises telemetry while the flame is visible and counts QA flags", () => {
    const d = digestVideo(video, 2) as Extract<ReturnType<typeof digestVideo>, { qaFlagCounts: unknown }>;
    expect(d.events?.peakAreaPx).toBe(300);
    expect(d.qaFlagCounts).toEqual({ lit: 1, transient: 1, saturated: 1 });
    const rad = (d.overlayTelemetry?.fields as Record<string, { whileFlameVisible: { max: number } }>).rad;
    expect(rad.whileFlameVisible.max).toBe(1.2);
    expect(d.series?.areaPx.length).toBeLessThanOrEqual(3);
  });

  it("returns only the status for videos that were not measured", () => {
    const skipped = VisionVideoSchema.parse({
      ...video,
      status: "skipped",
      reason: "screen recording",
      series: undefined,
      source: undefined,
    });
    expect(digestVideo(skipped)).toMatchObject({ status: "skipped", reason: "screen recording" });
  });
});

describe("setFlameOverlay action", () => {
  it("validates and merges overlay settings, undoably", () => {
    expect(DashboardActionSchema.safeParse({ type: "setFlameOverlay", overlay: { mode: "isolate" } }).success).toBe(true);
    expect(DashboardActionSchema.safeParse({ type: "setFlameOverlay", overlay: { mode: "glow" } }).success).toBe(false);
    const store = createDashboardStore();
    expect(store.getState().flameOverlay).toEqual({ mode: "box", follow: false });
    store.getState().dispatch({ type: "setFlameOverlay", overlay: { follow: true } });
    expect(store.getState().flameOverlay).toEqual({ mode: "box", follow: true });
    store.getState().undo();
    expect(store.getState().flameOverlay.follow).toBe(false);
  });
});
