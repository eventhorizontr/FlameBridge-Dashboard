import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMemoryQuota } from "@/lib/ai/quota";
import { DEFAULT_LAB_PARAMS } from "@/lib/store/state";
import { EMPTY_FILTERS } from "@/types/dashboard";

// The model is never called: the turn is replaced by a one-line stream.
vi.mock("@/lib/ai/agent", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/agent")>();
  return {
    ...real,
    runAgentTurn: () =>
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(`${JSON.stringify({ type: "done", stopReason: "end" })}\n`));
          c.close();
        },
      }),
  };
});

const { POST } = await import("./route");

const body = JSON.stringify({
  messages: [{ role: "user", content: "hi" }],
  context: {
    mode: "expert",
    route: "/overview",
    filters: EMPTY_FILTERS,
    selection: [],
    openExperimentId: null,
    compareIds: [],
    labParams: DEFAULT_LAB_PARAMS,
  },
});

const req = (headers: Record<string, string> = {}, payload = body) =>
  new Request("http://app.test/api/ai", {
    method: "POST",
    headers: { host: "app.test", "content-type": "application/json", "x-real-ip": "192.0.2.10", ...headers },
    body: payload,
  });

describe("POST /api/ai guards (ADR-028)", () => {
  beforeEach(() => {
    resetMemoryQuota();
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("AI_QUOTA_LIMIT", "2");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("counts questions per IP and refuses once they are used up", async () => {
    const first = await POST(req());
    expect(first.status).toBe(200);
    expect(first.headers.get("x-ai-quota-remaining")).toBe("1");
    expect((await POST(req())).headers.get("x-ai-quota-remaining")).toBe("0");
    const third = await POST(req());
    expect(third.status).toBe(429);
    expect(await third.text()).toContain('"code":"quota_exceeded"');
    expect((await POST(req({ "x-real-ip": "192.0.2.11" }))).status).toBe(200); // another visitor
  });

  it("does not spend a question on invalid requests", async () => {
    expect((await POST(req({}, "{not json"))).status).toBe(400);
    expect((await POST(req({}, JSON.stringify({ messages: [] })))).status).toBe(400);
    expect((await POST(req())).headers.get("x-ai-quota-remaining")).toBe("1");
  });

  it("refuses other sites and oversized bodies", async () => {
    expect((await POST(req({ origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(req({ "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(req({ origin: "http://app.test" }))).status).toBe(200);
    expect((await POST(req({}, "x".repeat(600 * 1024)))).status).toBe(413);
  });
});
