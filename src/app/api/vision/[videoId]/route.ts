import { connection, type NextRequest } from "next/server";

import { digestVideo, frameAt } from "@/lib/vision/digest";
import { getVisionVideo } from "@/lib/vision/server";

/**
 * GET /api/vision/{videoId}[?accession=PSI-25&points=60 | t=12.5 | full=1]
 * Digest of one analysed video (events, summary, QA flags, overlay telemetry, context segments);
 * `points` adds thinned time series, `t` returns the measurements at that second, `full=1` the
 * complete stored analysis.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/vision/[videoId]">) {
  await connection();
  const { videoId } = await params;
  const q = request.nextUrl.searchParams;
  const accession = (q.get("accession") ?? "PSI-25").toUpperCase();
  if (!/^[0-9a-f]{24}$/i.test(videoId)) {
    return Response.json({ error: "Malformed video id" }, { status: 400 });
  }
  const video = getVisionVideo(videoId, accession);
  if (!video) {
    return Response.json({ error: `No vision analysis for ${videoId}` }, { status: 404 });
  }
  if (q.get("full") === "1") return Response.json(video);
  const t = q.get("t");
  if (t !== null) {
    const timeS = Number(t);
    if (!Number.isFinite(timeS) || timeS < 0) return Response.json({ error: "t must be seconds >= 0" }, { status: 400 });
    return Response.json(frameAt(video, timeS));
  }
  const points = Math.min(400, Math.max(0, Number(q.get("points") ?? 0) || 0));
  return Response.json(digestVideo(video, points));
}
