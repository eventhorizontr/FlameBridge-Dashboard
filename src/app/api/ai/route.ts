import { AiRequestSchema, errorResponse, ndjsonResponse, runAgentTurn } from "@/lib/ai/agent";
import { describeProviders } from "@/lib/ai/providers";
import { clientIp, consumeQuota, quotaHeaders } from "@/lib/ai/quota";
import { rateLimit } from "@/lib/ai/rate-limit";

/** Largest accepted request body (60 messages × 4 000 chars plus context fits well under it). */
const MAX_BODY_BYTES = 512 * 1024;

/** Browser requests must come from this site; other sites cannot spend this deployment's quota. */
function crossSite(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return true;
  }
}

/**
 * POST /api/ai — one assistant turn, streamed as NDJSON `AiStreamEvent`s (src/types/ai.ts).
 * Client: `useAssistant()` in src/lib/ai/client.
 * Guards, in order: same-site, body size, burst limit, schema, then the per-IP question quota
 * (ADR-028), which is counted only for valid requests and before the model runs.
 */
export async function POST(request: Request) {
  if (crossSite(request)) return errorResponse("bad_request", "Requests from other sites are not accepted.", 403);

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return errorResponse("bad_request", "Request is too large.", 413);

  const ip = clientIp(request.headers);
  const burst = rateLimit(ip);
  if (!burst.ok) {
    return errorResponse("rate_limited", `Too many questions at once — try again in ${burst.retryAfterS} s.`, 429);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return errorResponse("bad_request", "Request is too large.", 413);
    body = JSON.parse(text);
  } catch {
    return errorResponse("bad_request", "Request body must be JSON.", 400);
  }
  const parsed = AiRequestSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues.slice(0, 3).map((i) => `${i.path.map(String).join(".")}: ${i.message}`).join("; ");
    return errorResponse("bad_request", `Invalid request — ${detail}`, 400);
  }

  // No assistant configured: the turn only reports that, so it does not use up a question.
  if (!describeProviders().default) return ndjsonResponse(runAgentTurn(parsed.data, request.signal));

  const quota = await consumeQuota(ip);
  if (!quota.ok && quota.reason === "unavailable") {
    return errorResponse("upstream_error", "The usage limit service is unavailable, so the assistant is paused. Try again later.", 503);
  }
  if (!quota.ok) {
    const res = errorResponse(
      "quota_exceeded",
      `You have used all ${quota.limit} questions this deployment allows per visitor${quota.resetsAt ? ` until ${quota.resetsAt.slice(0, 16).replace("T", " ")} UTC` : ""}. The dashboard itself keeps working.`,
      429,
    );
    for (const [k, v] of Object.entries(quotaHeaders(quota))) res.headers.set(k, v);
    return res;
  }

  const res = ndjsonResponse(runAgentTurn(parsed.data, request.signal));
  for (const [k, v] of Object.entries(quotaHeaders(quota))) res.headers.set(k, v);
  return res;
}
