/**
 * Server-side numbers for the landing page. Every value is computed from the published data
 * (experiments.json, vision/index.json, vision/frame-index.json) — nothing is typed in by hand.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { ExperimentDataset } from "@/types/experiment";

import { getVisionIndex } from "./server";

export interface LandingPoster {
  file: string;
  testId: string;
  experimentId: string;
  pi: string;
}

export interface LandingStats {
  runs: number;
  runsWithVideo: number;
  videos: number;
  pis: { name: string; runs: number }[];
  o2Range: [number, number] | null;
  analysedFrames: number;
  flameFrames: number;
  measuredVideos: number;
  indexedFlames: number;
  ocrAirReadRate: number | null;
  dateAudit: { match: number; total: number };
  posters: LandingPoster[];
}

export function landingStats(dataset: ExperimentDataset): LandingStats {
  const runs = dataset.experiments;
  const byId = new Map(runs.map((e) => [e.id, e]));
  const videoIds = new Set(runs.flatMap((e) => e.videos.map((v) => v.id)));
  const piCounts = new Map<string, number>();
  for (const e of runs) piCounts.set(e.principalInvestigator, (piCounts.get(e.principalInvestigator) ?? 0) + 1);
  const o2 = runs.map((e) => e.conditions.o2InitialPct).filter((v): v is number => v != null);

  const index = getVisionIndex("PSI-25");
  const seen = new Set<string>();
  let analysed = 0;
  let flame = 0;
  let measured = 0;
  const airRates: number[] = [];
  let dateMatch = 0;
  let dateTotal = 0;
  const posters: LandingPoster[] = [];
  for (const v of index?.videos ?? []) {
    if (v.status !== "ok" || seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    measured += 1;
    analysed += v.coverage?.analysedFrames ?? 0;
    flame += v.coverage?.flameFrames ?? 0;
    const air = v.osd?.readRate?.air;
    if (air != null) airRates.push(air);
    if (v.osd?.dateCheck === "match" || v.osd?.dateCheck === "mismatch") {
      dateTotal += 1;
      if (v.osd.dateCheck === "match") dateMatch += 1;
    }
    const e = byId.get(v.experimentId);
    if (v.poster && e && v.kind === "primary") posters.push({ file: v.poster.file, testId: e.testId, experimentId: e.id, pi: e.principalInvestigator });
  }

  let indexed = 0;
  const metaPath = join(process.cwd(), "public", "data", "psi-25", "vision", "frame-index.json");
  if (existsSync(metaPath)) {
    try {
      indexed = (JSON.parse(readFileSync(metaPath, "utf8")) as { count?: number }).count ?? 0;
    } catch {
      indexed = 0;
    }
  }

  return {
    runs: runs.length,
    runsWithVideo: runs.filter((e) => e.videos.length > 0).length,
    videos: videoIds.size,
    pis: [...piCounts.entries()].map(([name, n]) => ({ name, runs: n })).sort((a, b) => b.runs - a.runs),
    o2Range: o2.length ? [Math.min(...o2), Math.max(...o2)] : null,
    analysedFrames: analysed,
    flameFrames: flame,
    measuredVideos: measured,
    indexedFlames: indexed,
    ocrAirReadRate: airRates.length ? airRates.reduce((a, b) => a + b, 0) / airRates.length : null,
    dateAudit: { match: dateMatch, total: dateTotal },
    posters,
  };
}
