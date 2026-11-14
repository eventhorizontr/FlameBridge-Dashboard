import { AiRequestSchema, errorResponse, ndjsonResponse, runAgentTurn } from "@/lib/ai/agent";
import { clientKey, rateLimit } from "@/lib/ai/rate-limit";

/**
 * POST /api/ai — one assistant turn, streamed as NDJSON `AiStreamEvent`s (src/types/ai.ts).
 * Client: `useAssistant()` in src/lib/ai/client.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request.headers));
  if (!limit.ok) {
    return errorResponse("rate_limited", `Too many questions — try again in ${limit.retryAfterS} s.`, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("bad_request", "Request body must be JSON.", 400);
  }
  const parsed = AiRequestSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues.slice(0, 3).map((i) => `${i.path.map(String).join(".")}: ${i.message}`).join("; ");
    return errorResponse("bad_request", `Invalid request — ${detail}`, 400);
  }

  return ndjsonResponse(runAgentTurn(parsed.data, request.signal));
}
