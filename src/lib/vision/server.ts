/**
 * Server-side access to the vision layer (`public/data/<acc>/vision/`). Files are validated with
 * the contract schemas on first read and cached. Missing layer ⇒ `null`, never an exception, so
 * the dashboard keeps working before `pipeline/vision/build.py` has run.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { VisionIndexSchema, VisionVideoSchema, type VisionIndex, type VisionIndexEntry, type VisionVideo } from "@/types/vision";

const VIDEO_ID = /^[0-9a-f]{24}$/i;
const ACCESSION = /^PSI-\d+$/i;

const indexes = new Map<string, VisionIndex | null>();
const videos = new Map<string, VisionVideo | null>();
const MAX_CACHED_VIDEOS = 48;

const dir = (accession: string) => join(process.cwd(), "public", "data", accession.toLowerCase(), "vision");

export function getVisionIndex(accession = "PSI-25"): VisionIndex | null {
  if (!ACCESSION.test(accession)) return null;
  const key = accession.toUpperCase();
  if (indexes.has(key)) return indexes.get(key) ?? null;
  const path = join(dir(key), "index.json");
  let value: VisionIndex | null = null;
  if (existsSync(path)) {
    const parsed = VisionIndexSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    value = parsed.success ? parsed.data : null;
  }
  indexes.set(key, value);
  return value;
}

export function getVisionVideo(videoId: string, accession = "PSI-25"): VisionVideo | null {
  if (!VIDEO_ID.test(videoId) || !ACCESSION.test(accession)) return null;
  const key = `${accession.toUpperCase()}/${videoId.toLowerCase()}`;
  if (videos.has(key)) return videos.get(key) ?? null;
  const path = join(dir(accession), `${videoId.toLowerCase()}.json`);
  let value: VisionVideo | null = null;
  if (existsSync(path)) {
    const parsed = VisionVideoSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    value = parsed.success ? parsed.data : null;
  }
  if (videos.size >= MAX_CACHED_VIDEOS) videos.delete(videos.keys().next().value as string);
  videos.set(key, value);
  return value;
}

/** Index entries for one experiment, analysed primary footage first. */
export function visionEntriesFor(experimentId: string, accession = "PSI-25"): VisionIndexEntry[] {
  const index = getVisionIndex(accession);
  if (!index) return [];
  const rank = (e: VisionIndexEntry) => (e.status === "ok" ? 0 : 1) * 10 + (e.kind === "primary" ? 0 : 1);
  return index.videos.filter((v) => v.experimentId === experimentId).sort((a, b) => rank(a) - rank(b));
}

export const RANK_METRICS = {
  visibleS: { label: "Flame-visible time", unit: "s", get: (e: VisionIndexEntry) => e.events?.visibleS ?? null },
  peakAreaPx: { label: "Peak flame area", unit: "px", get: (e: VisionIndexEntry) => e.events?.peakAreaPx ?? null },
  meanAreaPx: { label: "Mean flame area", unit: "px", get: (e: VisionIndexEntry) => e.summary?.meanAreaPx ?? null },
  maxBBoxW: { label: "Widest bounding frame", unit: "px", get: (e: VisionIndexEntry) => e.summary?.maxBBoxW ?? null },
  maxBBoxH: { label: "Tallest bounding frame", unit: "px", get: (e: VisionIndexEntry) => e.summary?.maxBBoxH ?? null },
  meanBrightness: { label: "Mean integrated brightness", unit: "counts·px/1000", get: (e: VisionIndexEntry) => e.summary?.meanBrightness ?? null },
  meanFlowPxS: { label: "Mean flame motion (optical flow)", unit: "px/s", get: (e: VisionIndexEntry) => e.summary?.meanFlowPxS ?? null },
  meanIou: { label: "Shape stability (mean mask IoU)", unit: "0–1", get: (e: VisionIndexEntry) => e.summary?.meanIou ?? null },
  flickerHz: { label: "Dominant area oscillation", unit: "Hz", get: (e: VisionIndexEntry) => e.summary?.dominantFlickerHz?.hz ?? null },
  radMax: { label: "Peak radiometer signal (uncalibrated)", unit: "display units", get: (e: VisionIndexEntry) => e.osd?.radMax ?? null },
  firstFlameS: { label: "First flame in video", unit: "s", get: (e: VisionIndexEntry) => e.events?.firstFlameS ?? null },
} as const;

export type RankMetric = keyof typeof RANK_METRICS;
