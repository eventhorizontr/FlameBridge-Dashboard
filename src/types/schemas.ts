/**
 * RUNTIME CONTRACT — Zod mirrors of `experiment.ts` and `dashboard.ts`.
 *
 * One source for validating pipeline output (loaders), URL state and AI tool inputs.
 * Owner: Claude. The compile-time checks at the bottom fail the build if a schema and its
 * hand-written interface drift apart — change both in the same `contract` PR.
 *
 * Objects are strict: an undeclared key is a contract violation (and, for AI tool calls,
 * a hallucinated parameter), not something to silently drop.
 */
import { z } from "zod";

import type {
  DashboardAction,
  ExperimentFilters,
  LabMatch,
  LabParams,
  LabResult,
  Range,
  UserMode,
} from "./dashboard";
import type {
  Accession,
  Conditions,
  Experiment,
  ExperimentDataset,
  ExperimentVideo,
  FlowConfiguration,
  Fuel,
  FuelGeometry,
  FuelMaterial,
  InvestigationManifest,
  ManifestFileRef,
  PsiFileRef,
  QualityReport,
  VideoKind,
} from "./experiment";

/* ------------------------------------------------------------------ experiment.ts */

export const AccessionSchema = z.templateLiteral(["PSI-", z.number()]);

export const FuelMaterialSchema = z.enum(["PMMA", "SIBAL", "Nomex", "Japan wax"]);
export const FuelGeometrySchema = z.enum([
  "film",
  "slab",
  "rod",
  "spherical-section",
  "fabric",
  "candle",
]);
export const FlowConfigurationSchema = z.enum(["opposed", "concurrent"]);
export const VideoKindSchema = z.enum(["primary", "second-view", "still-sequence"]);

/** PSI file-node ids are 24-hex ObjectIds (verified against the PSI API). */
export const PsiFileIdSchema = z.string().regex(/^[0-9a-f]{24}$/, "expected a 24-hex PSI file id");

const psiFileRefShape = {
  id: PsiFileIdSchema,
  fileName: z.string().min(1),
  category: z.string(),
  subcategory: z.string().nullable(),
  ext: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  href: z.string().startsWith("/api/psi/file/"),
};

export const PsiFileRefSchema = z.strictObject(psiFileRefShape);

/** Same-origin clip under `public/media/`; path segments cannot start with "." (no traversal). */
export const FallbackHrefSchema = z
  .string()
  .regex(
    /^\/media\/[A-Za-z0-9][\w.-]*(\/[A-Za-z0-9][\w.-]*)*\.(mp4|webm)$/,
    "expected /media/<file>.mp4|webm",
  );

export const VIDEO_METADATA_KEYS = ["durationS", "fps", "width", "height", "fallbackHref"] as const;

const videoMetadataShape = {
  durationS: z.number().finite().positive().optional(),
  fps: z.number().finite().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fallbackHref: FallbackHrefSchema.optional(),
};

const dimensionsPaired = (v: { width?: number; height?: number }) =>
  (v.width === undefined) === (v.height === undefined);
const DIMENSIONS_PAIRED = { message: "width and height must be given together", path: ["height"] };

export const ExperimentVideoSchema = z
  .strictObject({ ...psiFileRefShape, ...videoMetadataShape, kind: VideoKindSchema })
  .refine(dimensionsPaired, DIMENSIONS_PAIRED);

export const ManifestFileRefSchema = z
  .strictObject({ ...psiFileRefShape, ...videoMetadataShape })
  .refine(dimensionsPaired, DIMENSIONS_PAIRED)
  .refine((r) => r.ext === ".mp4" || VIDEO_METADATA_KEYS.every((k) => r[k] === undefined), {
    message: "video metadata is only allowed on .mp4 files",
    path: ["ext"],
  });

const finiteOrNull = z.number().finite().nullable();

export const FuelSchema = z.strictObject({
  raw: z.string(),
  material: FuelMaterialSchema.nullable(),
  geometry: FuelGeometrySchema.nullable(),
  thicknessMm: z.number().positive().nullable().optional(),
  widthCm: z.number().positive().optional(),
  diameterMm: z.number().positive().optional(),
  color: z.enum(["clear", "black"]).nullable().optional(),
  burnSides: z.union([z.literal(1), z.literal(2)]).optional(),
  composition: z.string().optional(),
  inferred: z.array(z.string()),
});

export const ConditionsSchema = z
  .strictObject({
    o2InitialPct: finiteOrNull,
    o2FinalPct: finiteOrNull,
    co2InitialPct: finiteOrNull,
    co2FinalPct: finiteOrNull,
    coInitialPpm: finiteOrNull,
    coFinalPpm: finiteOrNull,
    coFinalLowerBoundPpm: z.number().finite().nonnegative().optional(),
    flowRestrictor: finiteOrNull,
    airflowSetpointsCmS: z.array(z.number().finite().nonnegative()),
    airflowRaw: z.string(),
    fanDisplayRaw: z.string(),
    radiometerGainRaw: z.string(),
  })
  .refine((c) => c.coFinalLowerBoundPpm === undefined || c.coFinalPpm === null, {
    message: "a lower bound replaces the value: coFinalPpm must be null",
    path: ["coFinalLowerBoundPpm"],
  });

export const QualityReportSchema = z.strictObject({
  flags: z.array(z.string()),
  parse: z.string().min(1),
});

const isoDate = z.iso.date();

export const ExperimentSchema = z.strictObject({
  id: z.string().regex(/^PSI-\d+:.+$/, "expected `${accession}:${testId}`"),
  testId: z.string().min(1),
  investigation: AccessionSchema,
  principalInvestigator: z.string(),
  date: isoDate.nullable(),
  gmtDay: z.number().finite().nullable(),
  sampleId: z.string(),
  fuel: FuelSchema,
  conditions: ConditionsSchema,
  flowConfiguration: FlowConfigurationSchema.nullable(),
  outcomeHints: z.array(z.string()),
  totalFramesShot: z.number().finite().nonnegative().nullable(),
  videos: z.array(ExperimentVideoSchema),
  qa: QualityReportSchema,
  raw: z.record(z.string(), z.string()),
});

export const ExperimentDatasetSchema = z.strictObject({
  schemaVersion: z.string(),
  accession: AccessionSchema,
  doi: z.string(),
  license: z.string(),
  generatedAt: z.string(),
  count: z.number().int().nonnegative(),
  videoTestIdsWithoutTableRow: z.array(z.string()),
  experiments: z.array(ExperimentSchema),
});

export const InvestigationManifestSchema = z.strictObject({
  schemaVersion: z.string(),
  accession: AccessionSchema,
  title: z.string(),
  acronym: z.string(),
  doi: z.string(),
  license: z.string(),
  generatedAt: z.string(),
  source: z.string(),
  studyVersion: z.number().int().positive(),
  downloadEndpoint: z.string(),
  totals: z.strictObject({
    files: z.number().int().nonnegative(),
    bytes: z.number().nonnegative(),
  }),
  groups: z.record(z.string(), z.array(ManifestFileRefSchema)),
  miscVideos: z.array(PsiFileIdSchema).optional(),
});

/* ------------------------------------------------------------------- dashboard.ts */

export const UserModeSchema = z.enum(["expert", "learn"]);

export const RangeSchema = z
  .strictObject({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .refine((r) => r.min === undefined || r.max === undefined || r.min <= r.max, {
    message: "min must be ≤ max",
  });

export const ExperimentFiltersSchema = z.strictObject({
  investigations: z.array(z.string()),
  principalInvestigators: z.array(z.string()),
  materials: z.array(FuelMaterialSchema),
  geometries: z.array(FuelGeometrySchema),
  flowConfigurations: z.array(FlowConfigurationSchema),
  o2InitialPct: RangeSchema,
  airflowCmS: RangeSchema,
  hasVideo: z.boolean().nullable(),
  hasQaFlags: z.boolean().nullable(),
  text: z.string().max(200),
});

/**
 * Bounds are UI/agent guard-rails, not physics: O₂ 0–100 % by volume, flow ≥ 0 cm/s,
 * k = 1–12 matches. Values outside the measured envelope are allowed — the Lab must warn.
 */
export const LabParamsSchema = z.strictObject({
  o2Pct: z.number().min(0).max(100),
  airflowCmS: z.number().min(0).max(1000),
  material: FuelMaterialSchema,
  geometry: FuelGeometrySchema,
  characteristicSizeMm: z.number().positive().max(1000).nullable(),
  k: z.number().int().min(1).max(12),
});

export const LabMatchSchema = z.strictObject({
  experimentId: z.string(),
  distance: z.number().nonnegative(),
  deltas: z.strictObject({
    o2Pct: finiteOrNull,
    airflowCmS: finiteOrNull,
    characteristicSizeMm: finiteOrNull,
  }),
  categoricalMismatches: z.array(z.enum(["material", "geometry"])),
});

export const LabResultSchema = z.strictObject({
  params: LabParamsSchema,
  matches: z.array(LabMatchSchema),
  insideEnvelope: z.boolean(),
  method: z.string(),
});

const ExperimentIdSchema = z.string().regex(/^PSI-\d+:.+$/, "expected an experiment id like PSI-25:B1");

export const RouteSchema = z.union([
  z.literal("/"),
  z.literal("/explore"),
  z.literal("/compare"),
  z.literal("/lab"),
  z.literal("/learn"),
  z.templateLiteral(["/experiments/", z.string()]),
]);

export const DashboardActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("setMode"), mode: UserModeSchema }),
  z.strictObject({ type: z.literal("setFilters"), filters: ExperimentFiltersSchema.partial() }),
  z.strictObject({ type: z.literal("resetFilters") }),
  z.strictObject({ type: z.literal("selectExperiments"), ids: z.array(ExperimentIdSchema).max(200) }),
  z.strictObject({ type: z.literal("openExperiment"), id: ExperimentIdSchema }),
  z.strictObject({ type: z.literal("compare"), ids: z.array(ExperimentIdSchema).min(2).max(4) }),
  z.strictObject({
    type: z.literal("seekVideo"),
    experimentId: ExperimentIdSchema,
    videoId: PsiFileIdSchema,
    timeS: z.number().finite().nonnegative(),
  }),
  z.strictObject({ type: z.literal("setLabParams"), params: LabParamsSchema.partial() }),
  z.strictObject({ type: z.literal("navigate"), route: RouteSchema }),
  z.strictObject({ type: z.literal("highlight"), target: z.string().min(1).max(120) }),
]);

export const DashboardActionListSchema = z.array(DashboardActionSchema).min(1).max(12);

/* ------------------------------------------------------- compile-time drift checks */

type Exact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

/* eslint-disable @typescript-eslint/no-unused-vars -- type-level assertions only */
type _Contract = [
  Assert<Exact<z.infer<typeof AccessionSchema>, Accession>>,
  Assert<Exact<z.infer<typeof FuelMaterialSchema>, FuelMaterial>>,
  Assert<Exact<z.infer<typeof FuelGeometrySchema>, FuelGeometry>>,
  Assert<Exact<z.infer<typeof FlowConfigurationSchema>, FlowConfiguration>>,
  Assert<Exact<z.infer<typeof VideoKindSchema>, VideoKind>>,
  Assert<Exact<z.infer<typeof PsiFileRefSchema>, PsiFileRef>>,
  Assert<Exact<z.infer<typeof ExperimentVideoSchema>, ExperimentVideo>>,
  Assert<Exact<z.infer<typeof ManifestFileRefSchema>, ManifestFileRef>>,
  Assert<Exact<z.infer<typeof FuelSchema>, Fuel>>,
  Assert<Exact<z.infer<typeof ConditionsSchema>, Conditions>>,
  Assert<Exact<z.infer<typeof QualityReportSchema>, QualityReport>>,
  Assert<Exact<z.infer<typeof ExperimentSchema>, Experiment>>,
  Assert<Exact<z.infer<typeof ExperimentDatasetSchema>, ExperimentDataset>>,
  Assert<Exact<z.infer<typeof InvestigationManifestSchema>, InvestigationManifest>>,
  Assert<Exact<z.infer<typeof UserModeSchema>, UserMode>>,
  Assert<Exact<z.infer<typeof RangeSchema>, Range>>,
  Assert<Exact<z.infer<typeof ExperimentFiltersSchema>, ExperimentFilters>>,
  Assert<Exact<z.infer<typeof LabParamsSchema>, LabParams>>,
  Assert<Exact<z.infer<typeof LabMatchSchema>, LabMatch>>,
  Assert<Exact<z.infer<typeof LabResultSchema>, LabResult>>,
  Assert<Exact<z.infer<typeof DashboardActionSchema>, DashboardAction>>,
];
/* eslint-enable @typescript-eslint/no-unused-vars */
