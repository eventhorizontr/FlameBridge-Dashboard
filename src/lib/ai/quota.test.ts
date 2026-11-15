import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIp, consumeQuota, quotaConfig, quotaKey, readQuota, resetMemoryQuota } from "./quota";

const MEMORY = { AI_QUOTA_SALT: "test" };

describe("AI quota (ADR-028)", () => {
  beforeEach(() => resetMemoryQuota());
  afterEach(() => vi.unstubAllGlobals());

  it("allows 10 questions per IP in total, then refuses the 11th", async () => {
    for (let i = 1; i <= 10; i++) {
      const r = await consumeQuota("203.0.113.7", MEMORY);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.remaining).toBe(10 - i);
    }
    const blocked = await consumeQuota("203.0.113.7", MEMORY);
    expect(blocked).toMatchObject({ ok: false, reason: "exhausted", remaining: 0, limit: 10, resetsAt: null });
    expect((await consumeQuota("203.0.113.8", MEMORY)).ok).toBe(true); // other visitors are unaffected
    expect(await readQuota("203.0.113.7", MEMORY)).toMatchObject({ used: 10, remaining: 0 });
  });

  it("honours a configured limit and window", async () => {
    const env = { ...MEMORY, AI_QUOTA_LIMIT: "2", AI_QUOTA_WINDOW_HOURS: "1" };
    const t = 1_000_000;
    expect((await consumeQuota("a", env, t)).ok).toBe(true);
    expect((await consumeQuota("a", env, t)).ok).toBe(true);
    expect((await consumeQuota("a", env, t + 1000)).ok).toBe(false);
    expect((await consumeQuota("a", env, t + 3_600_001)).ok).toBe(true); // window passed
  });

  it("never stores the raw IP and ignores invalid settings", () => {
    const key = quotaKey("198.51.100.4", "salt");
    expect(key).not.toContain("198.51.100.4");
    expect(key).toMatch(/^fb:ai-quota:v1:[0-9a-f]{64}$/);
    expect(quotaConfig({ AI_QUOTA_LIMIT: "-3" }).limit).toBe(10);
    expect(quotaConfig({}).windowS).toBe(0);
  });

  it("uses Redis atomically when configured and fails closed when Redis fails", async () => {
    const env = { AI_QUOTA_SALT: "s", KV_REST_API_URL: "https://redis.example/", KV_REST_API_TOKEN: "t" };
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const cmds = JSON.parse(String(init.body)) as string[][];
      expect(cmds[0][0]).toBe("INCR");
      return new Response(JSON.stringify([{ result: 11 }, { result: -1 }]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const over = await consumeQuota("1.2.3.4", env);
    expect(over).toMatchObject({ ok: false, reason: "exhausted", store: "redis" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://redis.example/pipeline");
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe("Bearer t");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    expect(await consumeQuota("1.2.3.4", env)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("reads the client IP the platform edge sets", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" }))).toBe("8.8.8.8");
    expect(clientIp(new Headers())).toBe("local");
  });
});
