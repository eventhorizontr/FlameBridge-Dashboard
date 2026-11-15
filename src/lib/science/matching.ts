import { extent } from "d3-array";

import { getDataset, representativeAirflow } from "@/lib/data";
import type { LabMatch, LabParams, LabResult } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";

import { pressureActive, pressureCoverage, pressureInsideEnvelope, pressureScale, pressureTerm, runPressureKpa } from "./pressure";

const numericFeatures = ["o2Pct", "airflowCmS", "characteristicSizeMm"] as const;
type Feature = (typeof numericFeatures)[number];
type Features = Record<Feature, number | null>;
type Row = { experiment: Experiment; values: Features };

// O₂ and flow each carry twice the weight of size. A categorical mismatch costs
// as much as one full-range O₂ or flow change. These are retrieval choices.
const weights: Record<Feature, number> = { o2Pct: 1, airflowCmS: 1, characteristicSizeMm: 0.5 };
const envelopeThreshold = 0.25;
const method = "Range-normalized weighted Euclidean distance on measured O₂, median airflow and optional size. " +
  "Unit penalties for material and geometry mismatch. The measured envelope requires a same-material, " +
  "same-geometry complete neighbor within 0.25 normalized distance and in-range inputs in that group. " +
  "Pressure (ADR-021) is compared on a ratio scale and enters the distance only when a run states it; " +
  "a pressure query with no stated run pressure is outside the envelope on pressure.";

function characteristicSize({ geometry, thicknessMm, diameterMm }: Experiment["fuel"]): number | null {
  if (geometry === "film" || geometry === "slab") return thicknessMm ?? null;
  if (geometry === "rod" || geometry === "spherical-section") return diameterMm ?? null;
  return null;
}

function measuredRange(rows: readonly { values: Features }[], feature: Feature) {
  return extent(rows, ({ values }) => values[feature] ?? undefined);
}

function delta(query: number | null, measured: number | null): number | null {
  return query === null || measured === null ? null : query - measured;
}

/**
 * Retrieve measured PSI-25 runs (dataset DOI 10.60555/4qc4-de67).
 * d = sqrt(sum(wᵢ × (Δᵢ / spanᵢ)²) + number of categorical mismatches).
 * Δ units are O₂ percentage points, cm/s and mm; d is dimensionless. A zero
 * span gives one normalized unit to any nonzero delta. The size span is
 * measured within the requested geometry. A missing or incomparable size
 * contributes one normalized unit and keeps the displayed delta null.
 * Nearest-neighbor method reference: DOI 10.1109/TIT.1967.1053964.
 */
export function findClosestExperiments(
  params: LabParams,
  experiments: readonly Experiment[] = getDataset().experiments,
): LabResult {
  const rows: Row[] = experiments.map((experiment) => ({
    experiment,
    values: {
      o2Pct: experiment.conditions.o2InitialPct,
      airflowCmS: representativeAirflow(experiment),
      characteristicSizeMm: characteristicSize(experiment.fuel),
    },
  })).filter(({ values }) => values.o2Pct !== null && values.airflowCmS !== null);

  const active = numericFeatures.filter((feature) => params[feature] !== null);
  const pScale = pressureScale(rows.map(({ experiment }) => experiment));
  const pActive = pressureActive(params.pressureKpa, pScale);
  const spans = Object.fromEntries(active.map((feature) => {
    const scaleRows = feature === "characteristicSizeMm"
      ? rows.filter(({ experiment }) => experiment.fuel.geometry === params.geometry)
      : rows;
    const [min, max] = measuredRange(scaleRows, feature);
    return [feature, min === undefined || max === undefined ? 0 : max - min];
  }));

  const ranked = rows.map(({ experiment, values }) => {
    const categoricalMismatches = (["material", "geometry"] as const)
      .filter((feature) => experiment.fuel[feature] !== params[feature]);
    const deltas = {
      o2Pct: delta(params.o2Pct, values.o2Pct),
      airflowCmS: delta(params.airflowCmS, values.airflowCmS),
      characteristicSizeMm: experiment.fuel.geometry === params.geometry
        ? delta(params.characteristicSizeMm, values.characteristicSizeMm)
        : null,
      pressureKpa: delta(params.pressureKpa, runPressureKpa(experiment)),
    };
    const squared = active.reduce((sum, feature) => {
      const difference = deltas[feature];
      const span = spans[feature];
      const normalized = difference === 0 ? 0 : difference === null || span === 0 ? 1 : difference / span;
      return sum + weights[feature] * normalized ** 2;
    }, categoricalMismatches.length + pressureTerm(params.pressureKpa, runPressureKpa(experiment), pScale));

    const match: LabMatch = {
      experimentId: experiment.id,
      distance: Math.sqrt(squared),
      deltas,
      categoricalMismatches,
    };
    return { values, match };
  }).sort((a, b) => a.match.distance - b.match.distance ||
    a.match.experimentId.localeCompare(b.match.experimentId, "en"));

  const completeGroup = ranked.filter(({ match }) =>
    match.categoricalMismatches.length === 0 && active.every((feature) => match.deltas[feature] !== null) &&
    (!pActive || match.deltas.pressureKpa !== null),
  );
  const pressure = pressureCoverage(params.pressureKpa, params.o2Pct, experiments);
  const nearest = completeGroup[0];
  const insideEnvelope = nearest !== undefined && nearest.match.distance <= envelopeThreshold &&
    pressureInsideEnvelope(pressure) &&
    active.every((feature) => {
      const [min, max] = measuredRange(completeGroup, feature);
      const value = params[feature];
      return value !== null && min !== undefined && max !== undefined && value >= min && value <= max;
    });

  return { params, matches: ranked.slice(0, params.k).map(({ match }) => match), insideEnvelope, method, pressure };
}
