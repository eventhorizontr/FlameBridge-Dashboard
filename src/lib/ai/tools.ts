/**
 * Agent tools — one definition shared by every provider (ADR-012).
 * Read-only over published data; the only "write" is `dashboard_actions`, whose actions are
 * validated here (schema + known ids/videos) and then applied by the client through the store.
 * Rule: no tool ⇒ no number. Every outcome carries evidence for the UI chips.
 */
import { z } from "zod";

import { checkReferences } from "@/lib/store/references";
import type { Evidence } from "@/types/ai";
import type { DashboardAction } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";
import { DashboardActionListSchema, ExperimentFiltersSchema } from "@/types/schemas";

import { catalogIndex, datasetFacts, filterExperiments, getExperiment, loadDataset, loadExperiments } from "./catalog";

export interface ToolOutcome {
  ok: boolean;
  /** JSON-serialisable payload returned to the model. */
  content: unknown;
  /** One line for the assistant timeline ("Found 12 PMMA rod runs"). */
  summary: string;
  evidence: Evidence[];
  /** Validated actions for the client to apply (dashboard_actions only). */
  actions?: DashboardAction[];
}

export interface AgentTool<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  input: S;
  execute: (input: z.infer<S>) => ToolOutcome;
}

const defineTool = <S extends z.ZodType>(tool: AgentTool<S>): AgentTool => tool as unknown as AgentTool;

const ExperimentRef = z
  .string()
  .min(1)
  .describe('Experiment id like "PSI-25:B1" (a bare test id like "B1" is also accepted)');

/* ------------------------------------------------------------------ evidence */

const DATASET_EVIDENCE = (): Evidence => {
  const d = loadDataset();
  return { id: `doi:${d.doi}`, label: `${d.accession} BASS-II dataset (${d.license})`, kind: "dataset", href: `https://doi.org/${d.doi}` };
};

export const experimentEvidence = (e: Experiment): Evidence => ({
  id: e.id,
  label: e.testId,
  kind: "experiment",
  href: `/experiments/${encodeURIComponent(e.id)}`,
});

/* -------------------------------------------------------------- projections */

/** Compact row: enough to reason and cite, small enough to keep context lean. */
export function summarizeExperiment(e: Experiment) {
  const f = e.fuel;
  return {
    id: e.id,
    testId: e.testId,
    principalInvestigator: e.principalInvestigator,
    date: e.date,
    fuel: {
      raw: f.raw,
      material: f.material,
      geometry: f.geometry,
      ...(f.thicknessMm != null ? { thicknessMm: f.thicknessMm } : {}),
      ...(f.diameterMm != null ? { diameterMm: f.diameterMm } : {}),
      ...(f.inferred.length ? { inferred: f.inferred } : {}),
    },
    o2InitialPct: e.conditions.o2InitialPct,
    airflowSetpointsCmS: e.conditions.airflowSetpointsCmS,
    flowConfiguration: e.flowConfiguration,
    outcomeHints: e.outcomeHints,
    videoCount: e.videos.length,
    qaFlags: e.qa.flags,
  };
}

function detailExperiment(e: Experiment) {
  return {
    ...summarizeExperiment(e),
    gmtDay: e.gmtDay,
    sampleId: e.sampleId,
    fuel: e.fuel,
    conditions: e.conditions,
    totalFramesShot: e.totalFramesShot,
    videos: e.videos.map((v) => ({ videoId: v.id, kind: v.kind, fileName: v.fileName, href: v.href })),
    qa: e.qa,
    rawSourceRow: e.raw,
  };
}

const notFound = (id: string): ToolOutcome => ({
  ok: false,
  content: { error: `No experiment "${id}" in the dataset. Use search_experiments to find valid ids.` },
  summary: `No run ${id}`,
  evidence: [],
});

/* -------------------------------------------------------------------- tools */

export const TOOLS: AgentTool[] = [
  defineTool({
    name: "dataset_overview",
    description:
      "Summary of the loaded NASA PSI dataset: run counts, O₂ range, PIs, fuel materials/geometries, video and QA coverage, DOI and licence. Call this first when the user asks a general question about the data, its size or its coverage.",
    input: z.strictObject({}),
    execute: () => ({
      ok: true,
      content: datasetFacts(),
      summary: "Read dataset overview",
      evidence: [DATASET_EVIDENCE()],
    }),
  }),

  defineTool({
    name: "search_experiments",
    description:
      "Find experiments (test runs) matching filters. Call this whenever the user asks which/how many runs match a condition, or before naming specific runs. Empty filters return all runs. airflowCmS matches if ANY set-point of a run is in range. Returns the total match count and compact rows.",
    input: z.strictObject({
      filters: ExperimentFiltersSchema.partial().describe("Same filter shape the dashboard uses"),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    execute: ({ filters, limit }) => {
      const hits = filterExperiments(loadExperiments(), filters);
      return {
        ok: true,
        content: { total: hits.length, returned: Math.min(limit, hits.length), runs: hits.slice(0, limit).map(summarizeExperiment) },
        summary: `Found ${hits.length} run${hits.length === 1 ? "" : "s"}`,
        evidence: [DATASET_EVIDENCE(), ...hits.slice(0, 8).map(experimentEvidence)],
      };
    },
  }),

  defineTool({
    name: "get_experiment",
    description:
      "Full record of one run: parsed fuel and conditions, QA flags, inferred values with their justification, every video (videoId for seekVideo), and the verbatim source row. Call this before stating any specific value of a run.",
    input: z.strictObject({ id: ExperimentRef }),
    execute: ({ id }) => {
      const e = getExperiment(id);
      if (!e) return notFound(id);
      return { ok: true, content: detailExperiment(e), summary: `Read run ${e.testId}`, evidence: [experimentEvidence(e)] };
    },
  }),

  defineTool({
    name: "compare_experiments",
    description:
      "Side-by-side conditions of 2–4 runs plus the list of fields that differ. Call this when the user asks how runs differ or which conditions changed between them.",
    input: z.strictObject({ ids: z.array(ExperimentRef).min(2).max(4) }),
    execute: ({ ids }) => {
      const runs = ids.map((id) => getExperiment(id));
      const missing = ids.filter((_, i) => !runs[i]);
      if (missing.length) return notFound(missing.join(", "));
      const rows = (runs as Experiment[]).map(summarizeExperiment);
      const fields = ["principalInvestigator", "fuel", "o2InitialPct", "airflowSetpointsCmS", "flowConfiguration", "outcomeHints"] as const;
      const differences = fields.filter((k) => new Set(rows.map((r) => JSON.stringify(r[k]))).size > 1);
      return {
        ok: true,
        content: { runs: rows, differences },
        summary: `Compared ${rows.map((r) => r.testId).join(", ")}`,
        evidence: (runs as Experiment[]).map(experimentEvidence),
      };
    },
  }),

  defineTool({
    name: "list_sources",
    description:
      "Provenance: dataset DOI/licence and, for a run, its NASA PSI source files (videos) with links. Call this when the user asks where data comes from or wants to cite it.",
    input: z.strictObject({ id: ExperimentRef.optional() }),
    execute: ({ id }) => {
      const d = loadDataset();
      const dataset = {
        accession: d.accession,
        doi: d.doi,
        doiUrl: `https://doi.org/${d.doi}`,
        license: d.license,
        repository: `https://psi.nasa.gov/physci/repo/data/investigations/${d.accession}`,
      };
      if (!id) return { ok: true, content: { dataset }, summary: "Listed dataset sources", evidence: [DATASET_EVIDENCE()] };
      const e = getExperiment(id);
      if (!e) return notFound(id);
      return {
        ok: true,
        content: { dataset, run: e.id, files: e.videos.map((v) => ({ fileName: v.fileName, kind: v.kind, href: v.href })) },
        summary: `Listed sources for ${e.testId}`,
        evidence: [
          DATASET_EVIDENCE(),
          experimentEvidence(e),
          ...e.videos.map((v): Evidence => ({ id: `psi-file:${v.id}`, label: v.fileName, kind: "file", href: v.href })),
        ],
      };
    },
  }),

  defineTool({
    name: "dashboard_actions",
    description:
      "Operate the dashboard the user is looking at: switch mode, set/reset filters, select or open runs, compare 2–4 runs, seek a video, set What-if Lab parameters, navigate, highlight an element. Call this whenever the user asks to show, open, filter, compare, play or go somewhere — do not just describe it. Actions apply in order and the user can undo them. Use only ids returned by other tools.",
    input: z.strictObject({ actions: DashboardActionListSchema }),
    execute: ({ actions }) => {
      const catalog = catalogIndex();
      const errors = actions.flatMap((a, i) => {
        const err = checkReferences(a, catalog);
        return err ? [`actions.${i}: ${err}`] : [];
      });
      if (errors.length) return { ok: false, content: { error: errors.join("; ") }, summary: "Rejected invalid actions", evidence: [] };
      return {
        ok: true,
        content: { applied: actions.length, note: "Actions are being applied in the user's dashboard and are undoable." },
        summary: `Applied ${actions.length} dashboard action${actions.length === 1 ? "" : "s"}`,
        evidence: [],
        actions,
      };
    },
  }),
];

export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

/** JSON Schema for a tool's input, as both providers expect it (object at the root). */
export function toolJsonSchema(tool: AgentTool): Record<string, unknown> {
  const schema = { ...(z.toJSONSchema(tool.input, { io: "input", unrepresentable: "any" }) as Record<string, unknown>) };
  delete schema.$schema;
  return schema;
}

const MAX_RESULT_CHARS = 24_000;

/** Validate and run a tool call. Never throws — failures become `ok:false` outcomes for the model. */
export function executeTool(name: string, rawInput: unknown): ToolOutcome {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) return { ok: false, content: { error: `Unknown tool ${name}` }, summary: `Unknown tool ${name}`, evidence: [] };
  const parsed = tool.input.safeParse(rawInput ?? {});
  if (!parsed.success) {
    const error = parsed.error.issues.slice(0, 5).map((i) => `${i.path.map(String).join(".") || "input"}: ${i.message}`).join("; ");
    return { ok: false, content: { error: `Invalid input — ${error}` }, summary: `Invalid input for ${name}`, evidence: [] };
  }
  try {
    const outcome = tool.execute(parsed.data);
    const text = JSON.stringify(outcome.content);
    return text.length > MAX_RESULT_CHARS
      ? { ...outcome, content: { truncated: true, partial: text.slice(0, MAX_RESULT_CHARS) } }
      : outcome;
  } catch (err) {
    console.error(`[ai] tool ${name} failed`, err);
    return { ok: false, content: { error: "Tool failed internally." }, summary: `${name} failed`, evidence: [] };
  }
}
