import { connection } from "next/server";

import { describeProviders } from "@/lib/ai/providers";

/** GET /api/ai/providers — which assistants this deployment can run (ADR-012). */
export async function GET() {
  await connection(); // read env at request time, never at build time
  return Response.json(describeProviders(), { headers: { "Cache-Control": "no-store" } });
}
