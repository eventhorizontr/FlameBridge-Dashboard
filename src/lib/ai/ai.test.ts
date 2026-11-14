import { describe, expect, it } from "vitest";

import type { AiRequest, AiStreamEvent } from "@/types/ai";
import { EMPTY_FILTERS } from "@/types/dashboard";

import { AiRequestSchema, runAgentTurn } from "./agent";
import { filterExperiments, loadExperiments } from "./catalog";
import { describeProviders, resolveProvider, type AiProvider } from "./providers";
import { rateLimit } from "./rate-limit";
import { executeTool, TOOLS, toolJsonSchema } from "./tools";
import { DEFAULT_LAB_PARAMS } from "@/lib/store/state";

const context: AiRequest["context"] = {
  mode: "expert",
  route: "/explore",
  filters: EMPTY_FILTERS,
  selection: [],
  openExperimentId: null,
  compareIds: [],
  labParams: DEFAULT_LAB_PARAMS,
};

describe("tool definitions", () => {
  it.each(TOOLS.map((t) => [t.name, t] as const))("%s exports an object JSON schema", (_name, tool) => {
    const schema = toolJsonSchema(tool);
    expect(schema.type).toBe("object");
    expect(schema).not.toHaveProperty("$schema");
    expect(tool.description.length).toBeGreaterThan(60);
  });
});

describe("tools over PSI-25", () => {
  it("search_experiments applies the documented filter semantics", () => {
    const out = executeTool("search_experiments", { filters: { materials: ["PMMA"], geometries: ["rod"] } });
    expect(out.ok).toBe(true);
    const content = out.content as { total: number; runs: { fuel: { material: string; geometry: string } }[] };
    expect(content.total).toBe(filterExperiments(loadExperiments(), { materials: ["PMMA"], geometries: ["rod"] }).length);
    expect(content.total).toBeGreaterThan(0);
    expect(content.runs.every((r) => r.fuel.material === "PMMA" && r.fuel.geometry === "rod")).toBe(true);
  });

  it("airflow range matches any set-point; null O₂ never matches an O₂ range", () => {
    const all = loadExperiments();
    const hits = filterExperiments(all, { airflowCmS: { min: 0, max: 0 }, o2InitialPct: { min: 0 } });
    expect(hits.every((e) => e.conditions.airflowSetpointsCmS.includes(0) && e.conditions.o2InitialPct !== null)).toBe(true);
  });

  it("get_experiment accepts bare test ids and refuses unknown runs", () => {
    expect(executeTool("get_experiment", { id: "B1" }).ok).toBe(true);
    const missing = executeTool("get_experiment", { id: "PSI-25:Z99" });
    expect(missing.ok).toBe(false);
    expect(JSON.stringify(missing.content)).toContain("No experiment");
  });

  it("dashboard_actions validates schema and references", () => {
    const ok = executeTool("dashboard_actions", { actions: [{ type: "openExperiment", id: "PSI-25:B1" }] });
    expect(ok.ok).toBe(true);
    expect(ok.actions).toHaveLength(1);
    expect(executeTool("dashboard_actions", { actions: [{ type: "openExperiment", id: "PSI-25:Z99" }] }).ok).toBe(false);
    expect(executeTool("dashboard_actions", { actions: [{ type: "launchRocket" }] }).ok).toBe(false);
  });

  it("unknown tools and bad inputs become error outcomes, not exceptions", () => {
    expect(executeTool("rm_rf", {}).ok).toBe(false);
    expect(executeTool("compare_experiments", { ids: ["B1"] }).ok).toBe(false);
  });
});

describe("providers", () => {
  it("reports availability from env and resolves defaults", () => {
    const none = describeProviders({});
    expect(none.default).toBeNull();
    expect(none.providers.every((p) => !p.available && p.reason)).toBe(true);
    expect(resolveProvider(undefined, { GEMINI_API_KEY: "x" })?.id).toBe("gemini");
    expect(resolveProvider(undefined, { GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "y" })?.id).toBe("claude");
    expect(resolveProvider("claude", { GEMINI_API_KEY: "x" })).toBeNull();
    expect(describeProviders({ ANTHROPIC_API_KEY: "y", CLAUDE_MODEL: "claude-opus-5-5" }).providers[0]?.model).toBe("claude-opus-5-5");
  });
});

async function collect(stream: ReadableStream<Uint8Array>): Promise<AiStreamEvent[]> {
  const text = await new Response(stream).text();
  return text.trim().split("\n").map((l) => JSON.parse(l) as AiStreamEvent);
}

describe("agent turn", () => {
  const fake: AiProvider = {
    id: "claude",
    label: "Fake",
    model: "fake-1",
    available: true,
    async run(opts) {
      expect(opts.messages.at(-1)?.content).toContain("<dashboard_state>");
      opts.runTool("c1", "search_experiments", { filters: { materials: ["SIBAL"] }, limit: 3 });
      opts.runTool("c2", "dashboard_actions", { actions: [{ type: "setFilters", filters: { materials: ["SIBAL"] } }] });
      opts.emit({ type: "text", delta: "Done." });
      return "end";
    },
  };

  it("streams start → tool events → actions → text → done", async () => {
    const req: AiRequest = { messages: [{ role: "user", content: "Show SIBAL runs" }], context };
    const events = await collect(runAgentTurn(req, new AbortController().signal, fake));
    expect(events.map((e) => e.type)).toEqual(["start", "tool_call", "tool_result", "tool_call", "tool_result", "actions", "text", "done"]);
    const actions = events.find((e) => e.type === "actions");
    expect(actions && actions.type === "actions" && actions.actions[0]?.type).toBe("setFilters");
  });

  it("reports an unavailable provider as an error event", async () => {
    const req: AiRequest = { provider: "gemini", messages: [{ role: "user", content: "hi" }], context };
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const events = await collect(runAgentTurn(req, new AbortController().signal));
    process.env.GEMINI_API_KEY = prev;
    expect(events).toEqual([{ type: "error", code: "provider_unavailable", message: "Gemini is not configured on this deployment." }]);
  });

  it("request schema requires a trailing user message and a valid context", () => {
    expect(AiRequestSchema.safeParse({ messages: [{ role: "user", content: "x" }], context }).success).toBe(true);
    expect(AiRequestSchema.safeParse({ messages: [{ role: "assistant", content: "x" }], context }).success).toBe(false);
    expect(AiRequestSchema.safeParse({ messages: [{ role: "user", content: "x" }], context: {} }).success).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows 20 requests per 5 minutes per key", () => {
    const t = 1_000_000;
    for (let i = 0; i < 20; i++) expect(rateLimit("k", t + i).ok).toBe(true);
    const blocked = rateLimit("k", t + 30);
    expect(blocked.ok).toBe(false);
    expect(rateLimit("k", t + 5 * 60_000 + 1).ok).toBe(true);
  });
});
