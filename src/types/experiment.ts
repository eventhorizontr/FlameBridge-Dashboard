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

/** Provenance of a run's pressure (ADR-021). */
export type PressureBasis = "recorded" | "stated-for-series" | "not-stated";

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

/**
 * Optional, flat metadata on a video file ref (ADR-014). Every field is absent until it has
 * been measured — never estimated. `durationS`/`fps`/`width`/`height` describe the PSI source
 * file (probed container/stream headers), not the fallback clip.
 */
export interface VideoMetadata {
  durationS?: number;
  fps?: number;
  /** Source frame size in px; `width` and `height` are present together or not at all. */
  width?: number;
  height?: number;
  /**
   * Same-origin transcoded clip in `public/media/` (served as `/media/…`) for when PSI/S3 is
   * unreachable. Shares the source time origin: clip t = source t (it may end early).
   */
  fallbackHref?: string;
}

export interface ExperimentVideo extends PsiFileRef, VideoMetadata {
  kind: VideoKind;
}

/** Manifest entry: any PSI file; `VideoMetadata` is allowed only on `.mp4` files. */
export interface ManifestFileRef extends PsiFileRef, VideoMetadata {}

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
  /**
   * Exclusive lower bound when the cell literally states one (M5 `>500` → 500: true value
   * > 500 ppm). Present only with `coFinalPpm: null`. `OR` cells carry no bound (ADR-014).
   */
  coFinalLowerBoundPpm?: number;
  /** 0 = highest flow / lowest restriction … 2 = lowest flow / highest restriction. */
  flowRestrictor: number | null;
  /** Duct flow speed set-points in run order (cm/s). Sensor lag ≈ 1 min. */
  airflowSetpointsCmS: number[];
  airflowRaw: string;
  /** Fan voltage ×10 on the video overlay (max 122) and/or control-box pot settings (max 10). */
  fanDisplayRaw: string;
  radiometerGainRaw: string;
  /**
   * Total (ambient or chamber) pressure in kPa (ADR-021, ADR-014 optional-field rule). Absent = the
   * source states no value for this run; it is never filled with an assumed cabin pressure.
   */
  pressureKpa?: number;
  /** How `pressureKpa` is known; absent = "not-stated". */
  pressureBasis?: PressureBasis;
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
  groups: Record<string, ManifestFileRef[]>;
  /**
   * PSI file ids of every video not attached to any experiment (crew ops, backups, and
   * footage whose test id has no table row). When present it is exhaustive: each `.mp4` in
   * `groups` is in some experiment's `videos` or here, never both. Metadata lives on the
   * group entry.
   */
  miscVideos?: string[];
}
