/**
 * Server-side frame similarity search over `public/data/<acc>/vision/frame-index.{bin,json}`
 * (built by `pipeline/vision/frame_index.py`): DINOv2 embeddings, PCA-128, int8, cosine.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { FrameGallery, FrameMatch } from "@/types/ai";

interface IndexMeta {
  dims: number;
  count: number;
  scale: number;
  hz: number;
  pcaVarianceKept: number;
  recallAt10VsFull: number;
  model: string;
  thumbs: { tileW: number; tileH: number; cols: number; rows: number; sheets: string[] };
  videos: { videoId: string; experimentId: string; kind: string | null; frames: number }[];
  rows: [number, number][];
}

interface LoadedIndex {
  meta: IndexMeta;
  vectors: Float32Array;
  byVideo: Map<string, number[]>;
}

const cache = new Map<string, LoadedIndex | null>();

export function loadFrameIndex(accession = "PSI-25"): LoadedIndex | null {
  const key = accession.toUpperCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  const dir = join(process.cwd(), "public", "data", key.toLowerCase(), "vision");
  const metaPath = join(dir, "frame-index.json");
  const binPath = join(dir, "frame-index.bin");
  let value: LoadedIndex | null = null;
  if (existsSync(metaPath) && existsSync(binPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as IndexMeta;
    const raw = readFileSync(binPath);
    const int8 = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    const vectors = new Float32Array(int8.length);
    for (let i = 0; i < int8.length; i++) vectors[i] = int8[i] / meta.scale;
    const byVideo = new Map<string, number[]>();
    meta.rows.forEach(([v], i) => {
      const id = meta.videos[v].videoId;
      const list = byVideo.get(id) ?? [];
      list.push(i);
      byVideo.set(id, list);
    });
    value = { meta, vectors, byVideo };
  }
  cache.set(key, value);
  return value;
}

export interface SimilarOptions {
  k?: number;
  /** Exclude frames from the same run (default) or only from the same video within ±window s. */
  scope?: "other-runs" | "all";
  windowS?: number;
}

function matchOf(idx: LoadedIndex, row: number, similarity: number, testIds: Map<string, string>): FrameMatch {
  const [v, t] = idx.meta.rows[row];
  const video = idx.meta.videos[v];
  const per = idx.meta.thumbs.cols * idx.meta.thumbs.rows;
  return {
    experimentId: video.experimentId,
    testId: testIds.get(video.experimentId) ?? video.experimentId.split(":")[1] ?? video.experimentId,
    videoId: video.videoId,
    kind: video.kind,
    timeS: t,
    similarity: Math.round(similarity * 1000) / 1000,
    thumb: {
      sheet: idx.meta.thumbs.sheets[Math.floor(row / per)],
      index: row % per,
      cols: idx.meta.thumbs.cols,
      rows: idx.meta.thumbs.rows,
      tileW: idx.meta.thumbs.tileW,
      tileH: idx.meta.thumbs.tileH,
    },
  };
}

/** Frames most similar to the indexed frame of `videoId` nearest to `timeS`. */
export function similarFrames(
  videoId: string,
  timeS: number,
  opts: SimilarOptions = {},
  accession = "PSI-25",
  testIds: Map<string, string> = new Map(),
): FrameGallery | { error: string } {
  const idx = loadFrameIndex(accession);
  if (!idx) return { error: "The frame similarity index has not been built." };
  const rows = idx.byVideo.get(videoId);
  if (!rows?.length) return { error: "This video has no indexed flame frames (no measured flame, or not instrument footage)." };
  const q = rows.reduce((best, r) => (Math.abs(idx.meta.rows[r][1] - timeS) < Math.abs(idx.meta.rows[best][1] - timeS) ? r : best), rows[0]);
  const d = idx.meta.dims;
  const qVec = idx.vectors.subarray(q * d, q * d + d);
  const qVideo = idx.meta.videos[idx.meta.rows[q][0]];
  const k = Math.min(Math.max(opts.k ?? 12, 1), 48);
  const scope = opts.scope ?? "other-runs";
  const windowS = opts.windowS ?? 5;
  const scores = new Float32Array(idx.meta.count);
  for (let i = 0; i < idx.meta.count; i++) {
    let s = 0;
    const off = i * d;
    for (let j = 0; j < d; j++) s += idx.vectors[off + j] * qVec[j];
    scores[i] = s;
  }
  const order = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]);
  const picked: number[] = [];
  const perRun = new Map<string, number>();
  for (const i of order) {
    if (i === q) continue;
    const video = idx.meta.videos[idx.meta.rows[i][0]];
    if (scope === "other-runs" && video.experimentId === qVideo.experimentId) continue;
    if (scope === "all" && video.videoId === qVideo.videoId && Math.abs(idx.meta.rows[i][1] - idx.meta.rows[q][1]) < windowS) continue;
    // diversity: at most 3 frames per run so one long burn does not fill the gallery
    const n = perRun.get(video.experimentId) ?? 0;
    if (n >= 3) continue;
    perRun.set(video.experimentId, n + 1);
    picked.push(i);
    if (picked.length >= k) break;
  }
  return {
    title: `Frames most similar to ${testIds.get(qVideo.experimentId) ?? qVideo.experimentId} at ${idx.meta.rows[q][1].toFixed(1)} s`,
    method: `DINOv2 ViT-S/14 cosine similarity (PCA-${d}, int8; recall@10 vs full vectors ${idx.meta.recallAt10VsFull}); ${scope === "other-runs" ? "other runs only" : "all runs"}; max 3 frames per run.`,
    query: matchOf(idx, q, 1, testIds),
    frames: picked.map((i) => matchOf(idx, i, scores[i], testIds)),
  };
}
