import { connection } from "next/server";

import { describeProviders } from "@/lib/ai/providers";
import { clientIp, readQuota } from "@/lib/ai/quota";

/** GET /api/ai/providers — which assistants this deployment can run (ADR-012) and this visitor's quota (ADR-028). */
export async function GET(request: Request) {
  await connection(); // read env at request time, never at build time
  const quota = await readQuota(clientIp(request.headers));
  return Response.json(
    { ...describeProviders(), ...(quota ? { quota: { limit: quota.limit, remaining: quota.remaining, resetsAt: quota.resetsAt } } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
