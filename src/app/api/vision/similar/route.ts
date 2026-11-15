import { connection, type NextRequest } from "next/server";

import { loadExperiments } from "@/lib/ai/catalog";
import { similarFrames } from "@/lib/vision/similar";

/**
 * GET /api/vision/similar?video={videoId}&t={seconds}[&k=12&scope=other-runs|all]
 * Frames across the dataset most similar (DINOv2 cosine) to the indexed frame nearest `t`.
 */
export async function GET(request: NextRequest) {
  await connection();
  const q = request.nextUrl.searchParams;
  const video = q.get("video") ?? "";
  const t = Number(q.get("t") ?? NaN);
  if (!/^[0-9a-f]{24}$/i.test(video) || !Number.isFinite(t) || t < 0) {
    return Response.json({ error: "Pass video={24-hex id} and t={seconds >= 0}" }, { status: 400 });
  }
  const k = Math.min(48, Math.max(1, Number(q.get("k") ?? 12) || 12));
  const scope = q.get("scope") === "all" ? "all" : "other-runs";
  const testIds = new Map(loadExperiments().map((e) => [e.id, e.testId]));
  const result = similarFrames(video, t, { k, scope }, (q.get("accession") ?? "PSI-25").toUpperCase(), testIds);
  return Response.json(result, { status: "error" in result ? 404 : 200 });
}
