import { describe, expect, it } from "vitest";

import * as data from "@/lib/data";
import { findClosestExperiments } from "@/lib/science/matching";
import type { AiRequest, AiStreamEvent } from "@/types/ai";
import { EMPTY_FILTERS, type LabMatch, type LabParams } from "@/types/dashboard";

import { AiRequestSchema, runAgentTurn } from "./agent";
import { catalogIndex, datasetFacts, filterExperiments, getExperiment, loadDataset, loadExperiments } from "./catalog";
import { describeProviders, resolveProvider, type AiProvider } from "./providers";
import { rateLimit } from "./rate-limit";
import { systemPrompt } from "./system-prompt";
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

describe("catalog over @/lib/data", () => {
  it("delegates loading, lookup and filtering to the shared data API", () => {
    expect(loadDataset()).toBe(data.getDataset());
    expect(loadExperiments()).toBe(data.getDataset().experiments);
    expect(filterExperiments).toBe(data.filterExperiments);
    expect(getExperiment("B1")).toBe(data.getExperiment("PSI-25:B1"));
    expect(getExperiment(" psi-25:b1 ")?.id).toBe("PSI-25:B1");
    expect(getExperiment("PSI-20:B1")).toBeUndefined();
    expect(catalogIndex().size).toBe(loadExperiments().length);
  });

  it("keeps the dataset facts the system prompt states", () => {
    const facts = datasetFacts();
    const ex = loadExperiments();
    const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
    const o2 = ex.map((e) => e.conditions.o2InitialPct).filter((v): v is number => v !== null);
    expect(Object.keys(facts)).toEqual([
      "accession",
      "doi",
      "license",
      "runs",
      "runsWithVideo",
      "runsWithQaFlags",
      "parse",
      "o2InitialPct",
      "principalInvestigators",
      "materials",
      "geometries",
      "flowConfigurations",
    ]);
    expect(facts.accession).toBe("PSI-25");
    expect(facts.runs).toBe(ex.length);
    expect(facts.runsWithVideo).toBe(ex.filter((e) => e.videos.length > 0).length);
    expect(facts.runsWithQaFlags).toBe(ex.filter((e) => e.qa.flags.length > 0).length);
    expect(facts.o2InitialPct).toEqual({ min: Math.min(...o2), max: Math.max(...o2) });
    for (const counts of [facts.principalInvestigators, facts.materials, facts.geometries, facts.flowConfigurations]) {
      expect(sum(counts)).toBe(ex.length);
    }
    expect(systemPrompt()).toContain(`It contains ${facts.runs} test runs, of which ${facts.runsWithVideo} have ISS video.`);
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

  const exact: LabParams = { o2Pct: 22.2, airflowCmS: 5, material: "PMMA", geometry: "rod", characteristicSizeMm: 6.35, pressureKpa: null, k: 3 };
  type ToolMatch = LabMatch & { comparedAirflowCmS: number | null; run: { id: string; testId: string } };

  it("find_closest_experiments returns the matching module's measured neighbours with evidence", () => {
    const out = executeTool("find_closest_experiments", exact);
    expect(out.ok).toBe(true);
    const content = out.content as { insideEnvelope: boolean; warning?: string; matches: ToolMatch[] };
    expect(content.insideEnvelope).toBe(true);
    expect(content.warning).toBeUndefined();
    const core = content.matches.map(({ experimentId, distance, deltas, categoricalMismatches }) => ({
      experimentId,
      distance,
      deltas,
      categoricalMismatches,
    }));
    expect(core).toEqual(findClosestExperiments(exact).matches);
    expect(content.matches[0]).toMatchObject({ experimentId: "PSI-25:O1", distance: 0, comparedAirflowCmS: 5, run: { testId: "O1" } });
    expect(content.matches.every((m) => m.run.id === m.experimentId)).toBe(true);
    expect(out.evidence.map((e) => e.id)).toEqual([`doi:${loadDataset().doi}`, ...core.map((m) => m.experimentId)]);
    expect(out.summary).toBe("Matched 3 measured runs · inside measured envelope");
  });

  it("find_closest_experiments applies defaults and warns outside the measured envelope", () => {
    const out = executeTool("find_closest_experiments", { o2Pct: 75, airflowCmS: 200, material: "PMMA", geometry: "rod" });
    expect(out.ok).toBe(true);
    const content = out.content as { query: LabParams; insideEnvelope: boolean; warning?: string; matches: ToolMatch[] };
    expect(content.query).toMatchObject({ characteristicSizeMm: null, k: 5 });
    expect(content.insideEnvelope).toBe(false);
    expect(content.warning).toContain("Outside the measured envelope");
    expect(content.matches).toHaveLength(5);
    expect(content.matches.every((m) => m.deltas.characteristicSizeMm === null)).toBe(true);
    expect(out.summary).toBe("Matched 5 measured runs · outside measured envelope");
  });

  it("find_closest_experiments rejects out-of-bounds and unknown inputs", () => {
    expect(executeTool("find_closest_experiments", { ...exact, o2Pct: 130 }).ok).toBe(false);
    expect(executeTool("find_closest_experiments", { ...exact, k: 0 }).ok).toBe(false);
    expect(executeTool("find_closest_experiments", { ...exact, material: "wood" }).ok).toBe(false);
    expect(executeTool("find_closest_experiments", { ...exact, temperatureK: 300 }).ok).toBe(false);
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
    expect(resolveProvider(undefined, { ANTHROPIC_API_KEY: "y" })?.id).toBe("claude");
    expect(resolveProvider(undefined, { OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y" })?.id).toBe("openai");
    expect(resolveProvider(undefined, { OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y", AI_DEFAULT_PROVIDER: "claude" })?.id).toBe("claude");
    expect(resolveProvider("claude", { OPENAI_API_KEY: "x" })).toBeNull();
    expect(describeProviders({ ANTHROPIC_API_KEY: "y", CLAUDE_MODEL: "claude-opus-5-5" }).providers.find((p) => p.id === "claude")?.model).toBe("claude-opus-5-5");
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
    const req: AiRequest = { provider: "openai", messages: [{ role: "user", content: "hi" }], context };
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const events = await collect(runAgentTurn(req, new AbortController().signal));
    if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    expect(events).toEqual([{ type: "error", code: "provider_unavailable", message: "OpenAI is not configured on this deployment." }]);
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
