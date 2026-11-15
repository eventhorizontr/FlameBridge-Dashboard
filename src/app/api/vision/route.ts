import { connection, type NextRequest } from "next/server";

import { getVisionIndex, RANK_METRICS, type RankMetric } from "@/lib/vision/server";

/**
 * GET /api/vision — the flame-vision layer as a queryable API (for the AI agent, scripts and
 * terminals; see pipeline/vision/README.md).
 *
 *   /api/vision                                   counts, algorithm, metric catalogue
 *   /api/vision?experiment=PSI-25:B1              index entries of one run
 *   /api/vision?rank=peakAreaPx&order=desc&limit=10[&kind=primary]
 *   /api/vision?status=not-instrument-footage     entries with a given status
 */
export async function GET(request: NextRequest) {
  await connection();
  const q = request.nextUrl.searchParams;
  const accession = (q.get("accession") ?? "PSI-25").toUpperCase();
  const index = getVisionIndex(accession);
  if (!index) {
    return Response.json({ error: `No vision layer for ${accession}` }, { status: 404 });
  }

  const experiment = q.get("experiment");
  const rank = q.get("rank");
  const status = q.get("status");
  const kind = q.get("kind");
  const limit = Math.min(200, Math.max(1, Number(q.get("limit") ?? 20) || 20));

  if (!experiment && !rank && !status && !kind) {
    return Response.json({
      accession: index.accession,
      generatedAt: index.generatedAt,
      algorithm: index.algorithm,
      counts: index.counts,
      metrics: Object.fromEntries(Object.entries(RANK_METRICS).map(([k, m]) => [k, { label: m.label, unit: m.unit }])),
      endpoints: {
        run: "/api/vision?experiment=PSI-25:B1",
        rank: "/api/vision?rank=peakAreaPx&order=desc&limit=10",
        video: "/api/vision/{videoId}?points=60",
        raw: `/data/${accession.toLowerCase()}/vision/{videoId}.json`,
      },
    });
  }

  let rows = index.videos;
  if (experiment) rows = rows.filter((v) => v.experimentId.toLowerCase() === experiment.toLowerCase());
  if (status) rows = rows.filter((v) => v.status === status);
  if (kind) rows = rows.filter((v) => v.kind === kind);

  if (rank) {
    if (!(rank in RANK_METRICS)) {
      return Response.json({ error: `Unknown metric. Use one of: ${Object.keys(RANK_METRICS).join(", ")}` }, { status: 400 });
    }
    const spec = RANK_METRICS[rank as RankMetric];
    const asc = q.get("order") === "asc";
    const ranked = rows
      .filter((v) => v.status === "ok")
      .map((v) => ({ v, value: spec.get(v) }))
      .filter((r) => r.value != null)
      .sort((a, b) => (asc ? (a.value as number) - (b.value as number) : (b.value as number) - (a.value as number)))
      .slice(0, limit);
    return Response.json({
      metric: rank,
      label: spec.label,
      unit: spec.unit,
      rows: ranked.map((r) => ({ experimentId: r.v.experimentId, videoId: r.v.videoId, kind: r.v.kind, value: r.value })),
    });
  }

  return Response.json({ count: rows.length, videos: rows.slice(0, limit) });
}
