import { connection, type NextRequest } from "next/server";

import { digestVideo } from "@/lib/vision/digest";
import { getVisionVideo } from "@/lib/vision/server";

/**
 * GET /api/vision/{videoId}[?accession=PSI-25&points=60&full=1]
 * Digest of one analysed video (events, summary, QA flags, overlay telemetry, context segments);
 * `points` adds thinned time series, `full=1` returns the complete stored analysis.
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
  const points = Math.min(400, Math.max(0, Number(q.get("points") ?? 0) || 0));
  return Response.json(digestVideo(video, points));
}
