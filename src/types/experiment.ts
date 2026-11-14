/**
 * DATA CONTRACT — the single shape shared by pipeline (Python), UI and AI tools.
 *
 * Owner: Claude (lead). Changes require an ADR entry in docs/DECISIONS.md and a
 * `contract` label on the PR. Producers: pipeline/build_psi25.py. Mirrors docs/DATA.md.
 *
 * Integrity rule: a `null` means "not measured / not parseable / implausible".
 * The UI must render null as "—" with the QA reason, never as 0 and never interpolated.
 */

export type Accession = `PSI-${number}`;

export type FuelMaterial = "PMMA" | "SIBAL" | "Nomex" | "Japan wax";
export type FuelGeometry =
  | "film"
  | "slab"
  | "rod"
  | "spherical-section"
  | "fabric"
  | "candle";

/** Flow direction relative to flame spread, when the source states it. */
export type FlowConfiguration = "opposed" | "concurrent";

export type VideoKind = "primary" | "second-view" | "still-sequence";

export interface PsiFileRef {
  /** PSI file-node id; resolve with GET /api/psi/file/{accession}/{id} (302 → S3, CORS *, Range OK). */
  id: string;
  fileName: string;
  category: string;
  subcategory: string | null;
  ext: string;
  sizeBytes: number;
  /** App-relative URL that resolves to a fresh presigned URL. Never persist the S3 URL itself. */
  href: string;
}

export interface ExperimentVideo extends PsiFileRef {
  kind: VideoKind;
}

export interface Fuel {
  /** Verbatim "Fuel Sample Material" cell. */
  raw: string;
  material: FuelMaterial | null;
  geometry: FuelGeometry | null;
  thicknessMm?: number | null;
  widthCm?: number;
  diameterMm?: number;
  color?: "clear" | "black" | null;
  burnSides?: 1 | 2;
  composition?: string;
  /** Every value not literally in the source cell, with its justification/source. */
  inferred: string[];
}

export interface Conditions {
  o2InitialPct: number | null;
  o2FinalPct: number | null;
  co2InitialPct: number | null;
  co2FinalPct: number | null;
  coInitialPpm: number | null;
  coFinalPpm: number | null;
  /** 0 = highest flow / lowest restriction … 2 = lowest flow / highest restriction. */
  flowRestrictor: number | null;
  /** Duct flow speed set-points in run order (cm/s). Sensor lag ≈ 1 min. */
  airflowSetpointsCmS: number[];
  airflowRaw: string;
  /** Fan voltage ×10 on the video overlay (max 122) and/or control-box pot settings (max 10). */
  fanDisplayRaw: string;
  radiometerGainRaw: string;
}

export interface QualityReport {
  flags: string[];
  /** Parser generation; "heuristic-v0" = seed, must be reconciled with the Test Matrix. */
  parse: string;
}

export interface Experiment {
  /** Globally unique: `${accession}:${testId}` */
  id: string;
  testId: string;
  investigation: Accession;
  principalInvestigator: string;
  /** ISO date (actual test date; on-board video overlay is +1 day — leap-year bug, per ReadMe). */
  date: string | null;
  gmtDay: number | null;
  sampleId: string;
  fuel: Fuel;
  conditions: Conditions;
  flowConfiguration: FlowConfiguration | null;
  /** Keywords found in the operator notes ("ext", "blowoff", "no ign"). Hints, not outcomes. */
  outcomeHints: string[];
  totalFramesShot: number | null;
  videos: ExperimentVideo[];
  qa: QualityReport;
  /** Verbatim source row, header → cell. */
  raw: Record<string, string>;
}

export interface ExperimentDataset {
  schemaVersion: string;
  accession: Accession;
  doi: string;
  license: string;
  generatedAt: string;
  count: number;
  videoTestIdsWithoutTableRow: string[];
  experiments: Experiment[];
}

export interface InvestigationManifest {
  schemaVersion: string;
  accession: Accession;
  title: string;
  acronym: string;
  doi: string;
  license: string;
  generatedAt: string;
  source: string;
  studyVersion: number;
  downloadEndpoint: string;
  totals: { files: number; bytes: number };
  groups: Record<string, PsiFileRef[]>;
}
