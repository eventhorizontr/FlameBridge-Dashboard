/**
 * Best-effort per-IP sliding window (no login, ADR-008). In-memory, so on serverless it limits
 * per warm instance — enough to stop accidental loops and casual abuse during the demo.
 */
const WINDOW_MS = 5 * 60_000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

export function rateLimit(key: string, now = Date.now()): { ok: true } | { ok: false; retryAfterS: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return { ok: false, retryAfterS: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) hits.clear();
  return { ok: true };
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
