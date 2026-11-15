/**
 * AI usage quota (ADR-028): each client IP may send at most `AI_QUOTA_LIMIT` (default 10) questions
 * to the assistant in total. A question is one accepted POST /api/ai.
 *
 * Security model
 * - The counter lives in Redis (Upstash, added on Vercel through the Marketplace), shared by every
 *   serverless instance, and is incremented atomically *before* the model runs, so parallel
 *   requests cannot overshoot the limit.
 * - The key is a salted SHA-256 of the IP, so raw addresses are never stored.
 * - On Vercel the client IP comes from `x-real-ip` / `x-forwarded-for`, which Vercel's edge sets
 *   itself (client-sent values are overwritten), so it cannot be spoofed by a header.
 * - If Redis is configured but fails, requests are refused (fail closed), never let through.
 * - Without Redis (local development) the counter is in memory, per server process.
 *
 * Env: AI_QUOTA_LIMIT (default 10), AI_QUOTA_WINDOW_HOURS (default 0 = never resets),
 * AI_QUOTA_SALT (recommended), KV_REST_API_URL + KV_REST_API_TOKEN or
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 */
import { createHash } from "node:crypto";

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  /** ISO time when the count resets; null = a total that never resets. */
  resetsAt: string | null;
  store: "redis" | "memory";
}

export type QuotaResult = ({ ok: true } & QuotaStatus) | ({ ok: false; reason: "exhausted" } & QuotaStatus) | { ok: false; reason: "unavailable" };

type Env = Record<string, string | undefined>;

const KEY_PREFIX = "fb:ai-quota:v1:";

export function quotaConfig(env: Env = process.env) {
  const limit = Number.parseInt(env.AI_QUOTA_LIMIT ?? "", 10);
  const hours = Number.parseFloat(env.AI_QUOTA_WINDOW_HOURS ?? "");
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    windowS: Number.isFinite(hours) && hours > 0 ? Math.round(hours * 3600) : 0,
    salt: env.AI_QUOTA_SALT || "flamebridge-ai-quota",
    redis: url && token ? { url: url.replace(/\/+$/, ""), token } : null,
  };
}

/** Client IP as set by the platform edge; "local" when there is none (dev server). */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function quotaKey(ip: string, salt: string): string {
  return KEY_PREFIX + createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/* ---------------------------------------------------------------- stores */

const memory = new Map<string, { count: number; expiresAt: number | null }>();

function memoryOp(key: string, windowS: number, increment: boolean, now: number) {
  let entry = memory.get(key);
  if (entry && entry.expiresAt !== null && entry.expiresAt <= now) entry = undefined;
  if (!entry) entry = { count: 0, expiresAt: windowS ? now + windowS * 1000 : null };
  if (increment) entry.count += 1;
  memory.set(key, entry);
  if (memory.size > 50_000) memory.clear();
  return { count: entry.count, expiresAt: entry.expiresAt };
}

async function redisPipeline(redis: { url: string; token: string }, commands: (string | number)[][]) {
  const res = await fetch(`${redis.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  if (!Array.isArray(out) || out.some((r) => r.error)) throw new Error("redis error");
  return out.map((r) => r.result);
}

async function redisOp(redis: { url: string; token: string }, key: string, windowS: number, increment: boolean, now: number) {
  const cmds: (string | number)[][] = increment ? [["INCR", key]] : [["GET", key]];
  if (increment && windowS) cmds.push(["EXPIRE", key, windowS, "NX"]);
  cmds.push(["PTTL", key]);
  const results = await redisPipeline(redis, cmds);
  const count = Number(results[0] ?? 0) || 0;
  const pttl = Number(results.at(-1));
  return { count, expiresAt: pttl > 0 ? now + pttl : null };
}

function status(limit: number, count: number, expiresAt: number | null, store: QuotaStatus["store"]): QuotaStatus {
  const used = Math.min(count, limit);
  return { limit, used, remaining: Math.max(0, limit - count), resetsAt: expiresAt ? new Date(expiresAt).toISOString() : null, store };
}

/** Count one question for this IP. Call only after the request was validated. */
export async function consumeQuota(ip: string, env: Env = process.env, now = Date.now()): Promise<QuotaResult> {
  const cfg = quotaConfig(env);
  const key = quotaKey(ip, cfg.salt);
  try {
    const { count, expiresAt } = cfg.redis
      ? await redisOp(cfg.redis, key, cfg.windowS, true, now)
      : memoryOp(key, cfg.windowS, true, now);
    const s = status(cfg.limit, count, expiresAt, cfg.redis ? "redis" : "memory");
    return count > cfg.limit ? { ok: false, reason: "exhausted", ...s } : { ok: true, ...s };
  } catch (err) {
    console.error("[ai] quota store unavailable", err);
    return { ok: false, reason: "unavailable" };
  }
}

/** Read-only view for the UI ("7 of 10 questions left"). Null when the store cannot be read. */
export async function readQuota(ip: string, env: Env = process.env, now = Date.now()): Promise<QuotaStatus | null> {
  const cfg = quotaConfig(env);
  const key = quotaKey(ip, cfg.salt);
  try {
    const { count, expiresAt } = cfg.redis
      ? await redisOp(cfg.redis, key, cfg.windowS, false, now)
      : memoryOp(key, cfg.windowS, false, now);
    return status(cfg.limit, count, expiresAt, cfg.redis ? "redis" : "memory");
  } catch (err) {
    console.error("[ai] quota store unavailable", err);
    return null;
  }
}

export function quotaHeaders(s: QuotaStatus): Record<string, string> {
  return {
    "X-AI-Quota-Limit": String(s.limit),
    "X-AI-Quota-Remaining": String(s.remaining),
    ...(s.resetsAt ? { "X-AI-Quota-Reset": s.resetsAt } : {}),
  };
}

/** Test hook. */
export function resetMemoryQuota() {
  memory.clear();
}
