/**
 * Pressure in the What-if Lab (ADR-021). Pure and client-safe: used by the server matcher
 * (`matching.ts`) and the client matcher (`components/viz/dataset-queries.ts`).
 *
 * What the data says: neither PSI-25 (BASS-II) nor PSI-20 (ACME BRE) records a pressure per run.
 * A pressure query therefore reports *coverage*, never a value: no run is given an assumed ISS
 * cabin pressure, and nothing here changes the ranking until a run actually states a pressure.
 *
 * Formulas
 * - Pressure ratio  r = max(p_query, p_run) / min(p_query, p_run)  (dimensionless, ≥ 1).
 *   Pressures are compared on a ratio (log) scale: 43 ↔ 53.75 kPa and 101.3 ↔ 126.6 kPa are the
 *   same ×1.25 step. This is a retrieval choice, like the weights in `matching.ts`.
 * - Thresholds: matched r ≤ 1.10, near r ≤ 1.30. Retrieval choices, not physics; they mirror the
 *   FlameBridge Layer 4 profiles (tolerance ×1.10, analog tolerance ×1.30).
 * - O₂ partial pressure  p_O2 [kPa] = (O₂ % by volume / 100) × p_total [kPa]  (Dalton's law),
 *   computed only when both values are stated.
 * - Distance term (only when ≥ 1 run states a pressure): w × (|ln r| / ln(p_max / p_min))² with
 *   w = 1, the log span measured over runs that state a pressure; a run without a stated pressure
 *   contributes one normalized unit, like a missing size in `matching.ts`.
 */
import type { PressureCoverage, SeriesPressureStatement } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";

export const PRESSURE_MATCH_RATIO = 1.1;
export const PRESSURE_NEAR_RATIO = 1.3;
export const PRESSURE_WEIGHT = 1;

/** Verbatim statements from the PSI files about pressure (checked 2026-11-15). */
export const SERIES_PRESSURE: readonly SeriesPressureStatement[] = [
  {
    accession: "PSI-25",
    basis: "not-stated",
    quote:
      "Conduct BASS-2 (Burning and Suppression of Solids-2) operations by adding GN2 to the WV to reduce the O2 partial pressure in order to get a stable blue flame for longer periods of time.",
    file: "data/raw/psi-25/PSI-25_Engineering Documents_BASS-II_Ops.docx",
    note:
      "The BASS-II test table and ReadMe give no pressure value; the Ops procedure mentions pressure only as O₂ partial pressure lowered by adding N₂ to the MSG work volume.",
  },
  {
    accession: "PSI-20",
    basis: "not-stated",
    quote: "The chamber pressures were also varied but are not identified in this summary table.",
    file: "data/raw/psi-20/PSI-20_Experimental table_ACME BRE.csv",
    note: "ACME BRE varied chamber pressure, but the PSI summary table does not identify it per test.",
  },
];

/** A run's stated total pressure in kPa, or null when the source states none. */
export function runPressureKpa(e: Experiment): number | null {
  const { pressureKpa, pressureBasis } = e.conditions;
  if (pressureKpa == null || !(pressureKpa > 0)) return null;
  if (pressureBasis !== "recorded" && pressureBasis !== "stated-for-series") return null;
  return pressureKpa;
}

/** max/min ratio of two positive pressures; null if either is missing or non-physical. */
export function pressureRatio(a: number | null, b: number | null): number | null {
  if (a == null || b == null || !(a > 0) || !(b > 0)) return null;
  return Math.max(a, b) / Math.min(a, b);
}

/** O₂ partial pressure in kPa (Dalton's law); null unless both inputs are stated. */
export function o2PartialPressureKpa(o2Pct: number | null, pressureKpa: number | null): number | null {
  if (o2Pct == null || pressureKpa == null || !(pressureKpa > 0) || o2Pct < 0) return null;
  return (o2Pct / 100) * pressureKpa;
}

export type PressureScale = { runsWithPressure: number; minKpa: number | null; maxKpa: number | null; logSpan: number };

/** Range of stated pressures across the runs (log span 0 when fewer than two distinct values). */
export function pressureScale(experiments: readonly Experiment[]): PressureScale {
  const values = experiments.map(runPressureKpa).filter((v): v is number => v !== null);
  if (!values.length) return { runsWithPressure: 0, minKpa: null, maxKpa: null, logSpan: 0 };
  const minKpa = Math.min(...values);
  const maxKpa = Math.max(...values);
  return { runsWithPressure: values.length, minKpa, maxKpa, logSpan: Math.log(maxKpa / minKpa) };
}

/**
 * Squared, weighted distance contribution of pressure for one run. 0 when pressure is not part of
 * the query or no run states one (so the ranking is unchanged on today's data).
 */
export function pressureTerm(queryKpa: number | null, runKpa: number | null, scale: PressureScale): number {
  if (queryKpa === null || scale.runsWithPressure === 0) return 0;
  const r = pressureRatio(queryKpa, runKpa);
  if (r === null) return PRESSURE_WEIGHT;
  if (r === 1) return 0;
  const normalized = scale.logSpan > 0 ? Math.log(r) / scale.logSpan : 1;
  return PRESSURE_WEIGHT * normalized ** 2;
}

/** Whether pressure takes part in the distance and the envelope for this query. */
export function pressureActive(queryKpa: number | null, scale: PressureScale): boolean {
  return queryKpa !== null && scale.runsWithPressure > 0;
}

/** Pressure coverage of a query over the given runs. */
export function pressureCoverage(
  queryKpa: number | null,
  o2Pct: number | null,
  experiments: readonly Experiment[],
): PressureCoverage {
  const scale = pressureScale(experiments);
  const accessions = new Set<string>(experiments.map((e) => e.investigation));
  const sources = SERIES_PRESSURE.filter((s) => accessions.has(s.accession));
  const base = {
    queryKpa,
    runsWithPressure: scale.runsWithPressure,
    recordedRangeKpa:
      scale.minKpa !== null && scale.maxKpa !== null ? ([scale.minKpa, scale.maxKpa] as [number, number]) : null,
    queryO2PartialPressureKpa: o2PartialPressureKpa(o2Pct, queryKpa),
    sources,
  };
  if (queryKpa === null)
    return { ...base, status: "not-queried", nearestRatio: null, note: "Pressure is not part of this query." };
  if (scale.runsWithPressure === 0)
    return {
      ...base,
      status: "not-recorded",
      nearestRatio: null,
      note:
        `No measured run states a pressure, so ${queryKpa} kPa is outside the measured envelope on pressure. ` +
        "The closest runs are matched on the other inputs only; no cabin pressure is assumed.",
    };
  const nearestRatio = Math.min(
    ...experiments.map((e) => pressureRatio(queryKpa, runPressureKpa(e))).filter((v): v is number => v !== null),
  );
  const status =
    nearestRatio <= PRESSURE_MATCH_RATIO + 1e-12 ? "matched" : nearestRatio <= PRESSURE_NEAR_RATIO + 1e-12 ? "near" : "outside";
  const step = `×${nearestRatio.toFixed(2)}`;
  const note =
    status === "matched"
      ? `A run states a pressure within ×${PRESSURE_MATCH_RATIO} of the query (${step}).`
      : status === "near"
        ? `The closest stated pressure differs by ${step} (within ×${PRESSURE_NEAR_RATIO}, beyond ×${PRESSURE_MATCH_RATIO}).`
        : `The closest stated pressure differs by ${step} (beyond ×${PRESSURE_NEAR_RATIO}).`;
  return { ...base, status, nearestRatio, note };
}

/** A pressure query is inside the envelope only when a stated pressure matches it. */
export function pressureInsideEnvelope(coverage: PressureCoverage): boolean {
  return coverage.status === "not-queried" || coverage.status === "matched";
}
