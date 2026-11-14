import { INVESTIGATIONS, PSI_API_BASE, isRegisteredAccession } from "@/lib/psi/config";

/**
 * GET /api/psi/file/{accession}/{id}
 * Resolves a PSI file node to a short-lived presigned S3 URL and redirects to it.
 * S3 serves `Access-Control-Allow-Origin: *` and byte ranges, so <video crossOrigin="anonymous">
 * streaming and canvas frame extraction both work without re-hosting NASA data.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/psi/file/[accession]/[id]">,
) {
  const { accession, id } = await params;

  if (!isRegisteredAccession(accession) || !/^[0-9a-f]{24}$/.test(id)) {
    return Response.json({ error: "Unknown investigation or malformed file id" }, { status: 400 });
  }

  const { studyVersion } = INVESTIGATIONS[accession];
  const query = new URLSearchParams({ file: id, version: String(studyVersion), redirect: "false" });
  const upstream = await fetch(`${PSI_API_BASE}/studies/${accession}/download?${query}`, {
    cache: "no-store",
  });

  if (!upstream.ok) {
    return Response.json({ error: `PSI responded ${upstream.status}` }, { status: 502 });
  }

  const url = (await upstream.text()).trim().replace(/^"|"$/g, "");
  if (!url.startsWith("https://")) {
    return Response.json({ error: "PSI returned no download URL" }, { status: 502 });
  }

  // Presigned URLs live ~1 h; let browsers reuse the redirect briefly.
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, max-age=600" },
  });
}
