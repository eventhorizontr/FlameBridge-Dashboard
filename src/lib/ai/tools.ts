/**
 * Agent tools — one definition shared by every provider (ADR-012).
 * Read-only over published data; the only "write" is `dashboard_actions`, whose actions are
 * validated here (schema + known ids/videos) and then applied by the client through the store.
 * Rule: no tool ⇒ no number. Every outcome carries evidence for the UI chips.
 */
import { z } from "zod";

import { LEARN_MODULES, REFERENCES, type CourseReference } from "@/components/learn/curriculum";
import { representativeAirflow } from "@/lib/data";
import { findClosestExperiments } from "@/lib/science/matching";
import { checkReferences } from "@/lib/store/references";
import type { Evidence, FrameGallery } from "@/types/ai";
import type { DashboardAction } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";
import { DashboardActionListSchema, DashboardActionSchema, ExperimentFiltersSchema, LabParamsSchema } from "@/types/schemas";

import { digestVideo, frameAt } from "@/lib/vision/digest";
import { getVisionIndex, getVisionVideo, RANK_METRICS, visionEntriesFor, type RankMetric } from "@/lib/vision/server";
import { similarFrames } from "@/lib/vision/similar";

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
  /** Frames to show as a gallery in the assistant message. */
  gallery?: FrameGallery;
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

const lab = LabParamsSchema.shape;
/** `LabParams` with model-friendly defaults; the parsed value is a complete `LabParams`. */
const LabQuery = z.strictObject({
  o2Pct: lab.o2Pct.describe("Initial O₂, % by volume"),
  airflowCmS: lab.airflowCmS.describe("Duct air-flow speed, cm/s"),
  material: lab.material,
  geometry: lab.geometry,
  characteristicSizeMm: lab.characteristicSizeMm
    .default(null)
    .describe("Thickness (film/slab) or diameter (rod/spherical-section) in mm; null or omitted = size not compared"),
  pressureKpa: lab.pressureKpa
    .default(null)
    .describe("Total pressure in kPa (e.g. 56.5 for the 34 % O₂ exploration atmosphere); null or omitted = pressure not compared. No measured run states a pressure today, so any value is reported as untested."),
  k: lab.k.default(5).describe("Number of measured runs to return"),
});

const OUTSIDE_ENVELOPE =
  "Outside the measured envelope: no run of the same material and geometry is close on every compared input. These are the nearest real runs, not a prediction — tell the user and do not extrapolate.";

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
    name: "find_closest_experiments",
    description:
      "What-if Lab retrieval: rank the measured runs closest to hypothetical conditions (O₂, air-flow, fuel material and geometry, optional size) and report whether the query lies inside the measured envelope. Returns only real runs with per-input differences — it never predicts an outcome. Call this for every 'what if' / 'what happens at …' question; dashboard_state.labParams holds the Lab's current inputs.",
    input: LabQuery,
    execute: (params) => {
      const experiments = loadExperiments();
      const byId = new Map(experiments.map((e) => [e.id, e]));
      const result = findClosestExperiments(params, experiments);
      const hits = result.matches.flatMap((m) => {
        const e = byId.get(m.experimentId);
        return e ? [{ m, e }] : [];
      });
      const matches = hits.map(({ m, e }) => ({ ...m, comparedAirflowCmS: representativeAirflow(e), run: summarizeExperiment(e) }));
      const runs = matches.length === 1 ? "run" : "runs";
      return {
        ok: true,
        content: {
          query: result.params,
          insideEnvelope: result.insideEnvelope,
          ...(result.insideEnvelope ? {} : { warning: OUTSIDE_ENVELOPE }),
          pressure: result.pressure,
          method: result.method,
          deltaConvention:
            "deltas = query − run in source units (O₂ percentage points, cm/s, mm, kPa); airflow is compared with the run's median set-point (comparedAirflowCmS); null = not comparable.",
          matches,
        },
        summary: `Matched ${matches.length} measured ${runs} · ${result.insideEnvelope ? "inside" : "outside"} measured envelope${result.pressure.status === "not-queried" ? "" : ` · pressure ${result.pressure.status}`}`,
        evidence: [DATASET_EVIDENCE(), ...hits.map(({ e }) => experimentEvidence(e))],
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

  defineTool({
    name: "get_flame_analysis",
    description:
      "Computer-vision measurements of a run's ISS footage (pipeline/vision): when the flame was visible, its area and bounding frame in pixels, brightness, motion, frame-to-frame similarity (SSIM, mask IoU, DINOv2 contextual similarity and scene segments), QA flags, and the telemetry read from the camera overlay (AIR duct flow cm/s, FAN volts, uncalibrated RAD radiometer) with an OCR date audit. Pass an experiment id (uses its analysed primary footage) or a videoId. points > 0 adds thinned time series. Call this before stating any image-derived number.",
    input: z.strictObject({
      id: ExperimentRef.optional(),
      videoId: z.string().regex(/^[0-9a-f]{24}$/i).optional().describe("A specific video (from get_experiment)"),
      points: z.number().int().min(0).max(120).default(0).describe("Samples per time series to include (0 = summary only)"),
    }),
    execute: ({ id, videoId, points }) => {
      if (!getVisionIndex()) {
        return { ok: false, content: { error: "The vision layer has not been built for this dataset." }, summary: "No vision layer", evidence: [] };
      }
      let e: Experiment | undefined;
      let targetVideo = videoId;
      if (id) {
        e = getExperiment(id);
        if (!e) return notFound(id);
        if (!targetVideo) {
          const entries = visionEntriesFor(e.id);
          const best = entries.find((x) => x.status === "ok") ?? entries[0];
          if (!best) {
            return { ok: false, content: { error: `Run ${e.testId} has no analysed video.` }, summary: `No vision data for ${e.testId}`, evidence: [experimentEvidence(e)] };
          }
          targetVideo = best.videoId;
        }
      }
      if (!targetVideo) return { ok: false, content: { error: "Pass id or videoId." }, summary: "Missing id", evidence: [] };
      const v = getVisionVideo(targetVideo);
      if (!v) return { ok: false, content: { error: `No vision analysis for video ${targetVideo}.` }, summary: "No vision data", evidence: [] };
      e = e ?? getExperiment(v.experimentId);
      const others = visionEntriesFor(v.experimentId)
        .filter((x) => x.videoId !== v.videoId)
        .map((x) => ({ videoId: x.videoId, kind: x.kind, status: x.status }));
      return {
        ok: true,
        content: { ...digestVideo(v, points), otherVideosOfRun: others },
        summary: `Read flame vision for ${e?.testId ?? v.experimentId}${v.status === "ok" ? "" : ` (${v.status})`}`,
        evidence: [
          ...(e ? [experimentEvidence(e)] : []),
          { id: `vision:${v.videoId}`, label: `Vision ${e?.testId ?? ""} ${v.kind ?? ""}`.trim(), kind: "file", href: `/api/vision/${v.videoId}` },
        ],
      };
    },
  }),

  defineTool({
    name: "get_flame_at_time",
    description:
      "What the vision layer measured at one moment of a video: flame visible or not, area, luminous core and bounding frame (px), centroid, motion, similarity to the previous frame, overlay telemetry (AIR, FAN, RAD) at that second, QA flags and the DINOv2 image phase. Use dashboard_state.video (videoId + timeS) for questions about 'now' / 'this frame'.",
    input: z.strictObject({
      videoId: z.string().regex(/^[0-9a-f]{24}$/i),
      timeS: z.number().finite().nonnegative().describe("Seconds from the start of the video"),
    }),
    execute: ({ videoId, timeS }) => {
      const v = getVisionVideo(videoId);
      if (!v) return { ok: false, content: { error: `No vision analysis for video ${videoId}.` }, summary: "No vision data", evidence: [] };
      const e = getExperiment(v.experimentId);
      const at = frameAt(v, timeS);
      return {
        ok: true,
        content: at,
        summary: `Read the flame at ${timeS.toFixed(1)} s in ${e?.testId ?? v.experimentId}`,
        evidence: e ? [experimentEvidence(e)] : [],
      };
    },
  }),

  defineTool({
    name: "find_similar_frames",
    description:
      "Contextual frame search: the frames across all ISS videos whose DINOv2 embedding is most similar to a given moment (videoId + timeS), e.g. 'show me frames that look like this one'. Returns runs, times and similarity, and the client shows them as a clickable thumbnail gallery. scope 'other-runs' (default) excludes the query's own run. Use dashboard_state.video for 'this frame'. Similarity is visual likeness, not a physical equivalence — say so.",
    input: z.strictObject({
      videoId: z.string().regex(/^[0-9a-f]{24}$/i),
      timeS: z.number().finite().nonnegative(),
      k: z.number().int().min(1).max(24).default(12),
      scope: z.enum(["other-runs", "all"]).default("other-runs"),
    }),
    execute: ({ videoId, timeS, k, scope }) => {
      const testIds = new Map(loadExperiments().map((e) => [e.id, e.testId]));
      const result = similarFrames(videoId, timeS, { k, scope }, "PSI-25", testIds);
      if ("error" in result) return { ok: false, content: { error: result.error }, summary: "No similar frames", evidence: [] };
      const runs = [...new Set(result.frames.map((f) => f.experimentId))];
      return {
        ok: true,
        content: {
          query: { testId: result.query.testId, timeS: result.query.timeS },
          method: result.method,
          frames: result.frames.map((f) => ({ testId: f.testId, experimentId: f.experimentId, videoId: f.videoId, timeS: f.timeS, similarity: f.similarity })),
        },
        summary: `Found ${result.frames.length} similar frames in ${runs.length} runs`,
        evidence: runs.map((id) => getExperiment(id)).filter((e): e is Experiment => Boolean(e)).map(experimentEvidence),
        gallery: result,
      };
    },
  }),

  defineTool({
    name: "rank_flame_metrics",
    description:
      "Rank analysed videos across the dataset by an image-derived metric (flame-visible time, peak/mean flame area, bounding-frame size, brightness, optical-flow motion, shape stability, dominant area oscillation, peak radiometer signal, first-flame time). Optional filters by principal investigator or run ids. Returns run ids with values and units — use it for 'which runs had the largest/longest/most stable flame' questions.",
    input: z.strictObject({
      metric: z.enum(Object.keys(RANK_METRICS) as [RankMetric, ...RankMetric[]]),
      order: z.enum(["desc", "asc"]).default("desc"),
      limit: z.number().int().min(1).max(30).default(10),
      principalInvestigator: z.string().optional().describe("Exact PI surname, e.g. Olson"),
      ids: z.array(ExperimentRef).max(40).optional().describe("Restrict to these runs"),
    }),
    execute: ({ metric, order, limit, principalInvestigator, ids }) => {
      const index = getVisionIndex();
      if (!index) return { ok: false, content: { error: "The vision layer has not been built for this dataset." }, summary: "No vision layer", evidence: [] };
      const spec = RANK_METRICS[metric];
      const allowed = ids?.map((x) => getExperiment(x)?.id).filter((x): x is string => Boolean(x));
      const rows = index.videos
        .filter((v) => v.status === "ok" && v.kind === "primary")
        .map((v) => ({ v, e: getExperiment(v.experimentId), value: spec.get(v) }))
        .filter((r) => r.e && r.value != null)
        .filter((r) => !principalInvestigator || r.e!.principalInvestigator.toLowerCase() === principalInvestigator.toLowerCase())
        .filter((r) => !allowed || allowed.includes(r.e!.id))
        .sort((a, b) => (order === "desc" ? (b.value as number) - (a.value as number) : (a.value as number) - (b.value as number)))
        .slice(0, limit);
      return {
        ok: true,
        content: {
          metric: spec.label,
          unit: spec.unit,
          note: "Image-derived from the primary ISS camera view; pixels of the 720×480 frame, not physical lengths. Camera gain differs between tests, so brightness and radiometer values compare only loosely across runs.",
          rows: rows.map((r) => ({ id: r.e!.id, testId: r.e!.testId, principalInvestigator: r.e!.principalInvestigator, videoId: r.v.videoId, value: r.value })),
        },
        summary: `Ranked ${rows.length} runs by ${spec.label.toLowerCase()}`,
        evidence: rows.map((r) => experimentEvidence(r.e!)),
      };
    },
  }),
  defineTool({
    name: "get_learn_modules",
    description:
      "The Learn Academy curriculum (/learn): five plain-language modules on how flames behave without gravity, each with its concept cards, the cited references, the featured ISS run and the quiz size. Call this before explaining a concept the Academy teaches or before opening a module. Open one with dashboard_actions navigate to /learn/<id>; the Academy shows only in Guided mode (mode value learn), so send setMode learn first when the user is in Expert mode. Modules unlock in order and progress is stored in the viewer's browser, so a locked module opens on its overview card. The interactive pieces are illustrations, not simulations.",
    input: z.strictObject({
      id: z.string().optional().describe('One module id such as "m3-two-ways-out"; omit to list all five'),
    }),
    execute: ({ id }) => {
      const cite = (r: CourseReference) => ({
        label: r.label,
        detail: r.detail,
        ...(r.kind === "doi" && r.doi ? { href: `https://doi.org/${r.doi}` } : {}),
        ...(r.kind === "url" && r.url ? { href: r.url } : {}),
      });
      const modules = id ? LEARN_MODULES.filter((m) => m.id === id) : LEARN_MODULES;
      if (id && modules.length === 0) {
        return {
          ok: false,
          content: { error: `No Learn module "${id}". Valid ids: ${LEARN_MODULES.map((m) => m.id).join(", ")}` },
          summary: `No Learn module ${id}`,
          evidence: [],
        };
      }
      const detailed = Boolean(id);
      return {
        ok: true,
        content: {
          note: "Concepts, not coefficients: the Academy teaches no fitted constants or thresholds. Interactives are labelled illustrations.",
          modules: modules.map((m) => ({
            id: m.id,
            code: m.code,
            route: `/learn/${m.id}`,
            title: m.title,
            subtitle: m.subtitle,
            objectives: m.objectives,
            featuredRunId: m.featuredRunId,
            quizQuestions: m.gate.length,
            cards: m.cards.map((c) =>
              detailed
                ? { title: c.title, body: c.body, ...(c.formula ? { formula: c.formula } : {}), refs: c.refs.map((k) => cite(REFERENCES[k])) }
                : c.title,
            ),
          })),
        },
        summary: id ? `Read Learn module ${modules[0].code} · ${modules[0].title}` : `Listed ${modules.length} Learn modules`,
        evidence: [
          ...new Set(modules.flatMap((m) => m.cards.flatMap((c) => c.refs))),
        ].flatMap((k): Evidence[] => {
          const r = REFERENCES[k];
          const href = r.kind === "doi" && r.doi ? `https://doi.org/${r.doi}` : r.kind === "url" ? r.url : undefined;
          return href ? [{ id: `ref:${k}`, label: r.label, kind: "publication", href }] : [];
        }),
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
    const hint =
      name === "dashboard_actions"
        ? ` Valid action types: ${DashboardActionSchema.options.map((o) => o.shape.type.value).join(", ")}. Check the tool schema for each shape.`
        : "";
    return { ok: false, content: { error: `Invalid input — ${error}.${hint}` }, summary: `Invalid input for ${name}`, evidence: [] };
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
