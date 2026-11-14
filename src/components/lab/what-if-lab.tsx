"use client";

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Film,
  GitCompareArrows,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

import {
  Badge,
  Button,
  EvidenceChip,
  formatMetricValue,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  QABadge,
  SegmentedControl,
} from "@/components/ui";
import {
  characteristicSizeMm,
  findClosestExperimentsClient,
  lookupExperiment,
  representativeAirflow,
} from "@/components/viz/dataset-queries";
import { FlameViewer } from "@/components/viz/flame-viewer";
import { DEFAULT_LAB_PARAMS, useDashboard, useDispatch } from "@/lib/store";
import type { Experiment, ExperimentDataset, FuelGeometry, FuelMaterial } from "@/types/experiment";

const MATERIALS: FuelMaterial[] = ["PMMA", "SIBAL", "Nomex", "Japan wax"];
const GEOMETRIES: FuelGeometry[] = ["film", "slab", "rod", "spherical-section", "fabric", "candle"];

function formatSigned(delta: number | null, unit: string, precision = 1): string {
  if (delta === null || !Number.isFinite(delta)) return "n/a";
  if (Math.abs(delta) < 1e-6) return `exact (0 ${unit})`;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(precision)} ${unit}`;
}

interface CoverageSliderProps {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  allValues: number[];
  groupValues: number[];
  disabled?: boolean;
  onChange: (next: number) => void;
}

function CoverageSlider({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  allValues,
  groupValues,
  disabled = false,
  onChange,
}: CoverageSliderProps) {
  const trackW = 300;
  const trackH = 26;
  const xScale = scaleLinear().domain([min, max]).range([6, trackW - 6]).clamp(true);
  const [gMin, gMax] = extent(groupValues);
  const hasGroup = gMin !== undefined && gMax !== undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[0.75rem]">
        <label htmlFor={id} className="font-medium text-[var(--text-1)]">
          {label}
        </label>
        <span className="num font-semibold text-[var(--accent)]">
          {disabled ? "Ignored (any)" : `${value.toFixed(step < 0.1 ? 2 : 1)} ${unit}`}
        </span>
      </div>

      {/* Measured coverage density track */}
      <svg
        viewBox={`0 0 ${trackW} ${trackH}`}
        className="w-full h-6 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line)]"
        aria-hidden="true"
      >
        {/* Shaded group span */}
        {hasGroup && (
          <rect
            x={xScale(gMin)}
            y={3}
            width={Math.max(3, xScale(gMax) - xScale(gMin))}
            height={trackH - 6}
            rx={2}
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeOpacity={0.45}
            strokeWidth={0.75}
          />
        )}

        {/* All measured PSI-25 ticks */}
        {allValues.map((v, idx) => (
          <line
            key={`all-${idx}`}
            x1={xScale(v)}
            x2={xScale(v)}
            y1={trackH - 9}
            y2={trackH - 2}
            stroke="var(--text-3)"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ))}

        {/* Same material + geometry measured ticks */}
        {groupValues.map((v, idx) => (
          <line
            key={`grp-${idx}`}
            x1={xScale(v)}
            x2={xScale(v)}
            y1={4}
            y2={trackH - 4}
            stroke="var(--accent)"
            strokeOpacity={0.85}
            strokeWidth={1.6}
          />
        ))}

        {/* Current query crosshair */}
        {!disabled && (
          <g transform={`translate(${xScale(value)},0)`}>
            <line y1={1} y2={trackH - 1} stroke="var(--text-1)" strokeWidth={2} />
            <circle cx={0} cy={trackH / 2} r={3} fill="var(--text-1)" />
          </g>
        )}
      </svg>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)] cursor-pointer disabled:opacity-40"
      />

      <div className="flex items-center justify-between text-[0.6875rem] num text-[var(--text-3)]">
        <span>{min} {unit}</span>
        <span>
          {hasGroup
            ? `Group span: ${gMin}–${gMax} ${unit} (${groupValues.length} runs)`
            : "0 matching group runs"}
        </span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

function physicsNarration(params: typeof DEFAULT_LAB_PARAMS, insideEnvelope: boolean): {
  headline: string;
  body: string;
} {
  const oxygenNote =
    params.o2Pct < 15.5
      ? "Below ~16 % O₂, radiative heat loss from the flame grows comparable to chemical heat release, shrinking the reaction zone toward quenching extinction."
      : params.o2Pct > 21.5
        ? "Elevated oxygen (~22 % vol) raises flame temperature and laminar reaction speed, broadening the steady-burning flammability envelope in microgravity."
        : "Near-cabin oxygen (16–21 % vol) places the flame near intermediate orbital-habitat fire-safety conditions.";

  const flowNote =
    params.airflowCmS <= 1.5
      ? "At quiescent or ultra-low airflow (≤1.5 cm/s), buoyancy is absent and oxidizer reaches the flame primarily by slow molecular diffusion—oxygen starvation limits steady burning."
      : params.airflowCmS >= 25
        ? "High convective velocity (≥25 cm/s) intensifies oxygen transport at first, but excessive residence-time shortening cools the flame tip toward blow-off extinction."
        : "Gentle forced flow (2–20 cm/s) replaces the missing buoyant draft on the ISS, sharpening blue soot-free edges in thin/clear polymers and accelerating opposing spread.";

  const envNote = insideEnvelope
    ? "Because NASA flew complete BASS-II tests sharing this fuel family inside this exact O₂ × flow hull, retrieved neighbors reflect observed ISS flame behavior."
    : "Warning: this combination sits outside NASA PSI-25's measured test matrix, so no extrapolated visuals are rendered; treat the top matches strictly as distant reference analogs.";

  return {
    headline: insideEnvelope
      ? `${params.material} ${params.geometry} in ${params.o2Pct.toFixed(1)}% O₂ @ ${params.airflowCmS} cm/s`
      : `Unmeasured Regime · ${params.material} ${params.geometry} (${params.o2Pct.toFixed(1)}% O₂ @ ${params.airflowCmS} cm/s)`,
    body: `${oxygenNote} ${flowNote} ${envNote}`,
  };
}

export function WhatIfLab({ dataset }: { dataset: ExperimentDataset }) {
  const labParams = useDashboard((s) => s.labParams);
  const mode = useDashboard((s) => s.mode);
  const dispatch = useDispatch();

  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const descId = useId();

  const result = useMemo(
    () => findClosestExperimentsClient(labParams, dataset.experiments),
    [labParams, dataset.experiments],
  );

  const matchedDetails = useMemo(
    () =>
      result.matches
        .map((match) => ({
          match,
          experiment: lookupExperiment(match.experimentId, dataset.experiments),
        }))
        .filter((x): x is { match: (typeof result.matches)[number]; experiment: Experiment } =>
          Boolean(x.experiment),
        ),
    [dataset.experiments, result],
  );

  const activePreview =
    (selectedPreviewId ? lookupExperiment(selectedPreviewId, dataset.experiments) : null) ??
    matchedDetails.find((m) => m.experiment.videos.length > 0)?.experiment ??
    matchedDetails[0]?.experiment ??
    null;

  // Coverage distributions
  const sameGroupRuns = useMemo(
    () =>
      dataset.experiments.filter(
        (e) => e.fuel.material === labParams.material && e.fuel.geometry === labParams.geometry,
      ),
    [dataset.experiments, labParams.geometry, labParams.material],
  );

  const allO2 = dataset.experiments
    .map((e) => e.conditions.o2InitialPct)
    .filter((v): v is number => v !== null);
  const groupO2 = sameGroupRuns
    .map((e) => e.conditions.o2InitialPct)
    .filter((v): v is number => v !== null);

  const allAir = dataset.experiments
    .map((e) => representativeAirflow(e))
    .filter((v): v is number => v !== null);
  const groupAir = sameGroupRuns
    .map((e) => representativeAirflow(e))
    .filter((v): v is number => v !== null);

  const allSizes = dataset.experiments
    .map((e) => characteristicSizeMm(e.fuel))
    .filter((v): v is number => v !== null);
  const groupSizes = sameGroupRuns
    .map((e) => characteristicSizeMm(e.fuel))
    .filter((v): v is number => v !== null);

  // D3 Envelope plot setup
  const svgW = 640;
  const svgH = 340;
  const pad = { t: 20, r: 22, b: 44, l: 52 };
  const plotW = svgW - pad.l - pad.r;
  const plotH = svgH - pad.t - pad.b;

  const xScale = scaleLinear().domain([0, 65]).range([0, plotW]).nice();
  const yScale = scaleLinear().domain([10, 32]).range([plotH, 0]).nice();

  const [grpAirMin, grpAirMax] = extent(groupAir);
  const [grpO2Min, grpO2Max] = extent(groupO2);
  const hasGroupEnvelopeBox =
    grpAirMin !== undefined &&
    grpAirMax !== undefined &&
    grpO2Min !== undefined &&
    grpO2Max !== undefined;

  const narration = physicsNarration(labParams, result.insideEnvelope);

  const materialCounts = useMemo(() => {
    const map = new Map<FuelMaterial, number>();
    for (const m of MATERIALS) {
      map.set(m, dataset.experiments.filter((e) => e.fuel.material === m).length);
    }
    return map;
  }, [dataset.experiments]);

  const geometryCounts = useMemo(() => {
    const map = new Map<FuelGeometry, number>();
    for (const g of GEOMETRIES) {
      map.set(
        g,
        dataset.experiments.filter(
          (e) => e.fuel.material === labParams.material && e.fuel.geometry === g,
        ).length,
      );
    }
    return map;
  }, [dataset.experiments, labParams.material]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
            Measured-Envelope Retrieval · Zero Extrapolation
          </p>
          <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
            Visual What-if Lab
          </h1>
          <p className="text-[0.875rem] text-[var(--text-2)] max-w-3xl">
            {mode === "learn"
              ? "Adjust oxygen concentration, airflow speed, and fuel shape to find the closest real Space Station burns—and immediately see where NASA’s data ends."
              : "Distance-ranked k-nearest-neighbor retrieval over 129 PSI-25 runs with slider density tracks and strict hull guardrails."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EvidenceChip
            id={`doi:${dataset.doi}`}
            label="PSI-25 Measured Hull"
            kind="dataset"
            href={`https://doi.org/${dataset.doi}`}
            detail={result.method}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dispatch({ type: "setLabParams", params: DEFAULT_LAB_PARAMS })}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Reset to center</span>
          </Button>
        </div>
      </div>

      {/* Prominent Envelope Status Banner */}
      <div
        role="status"
        className={`rounded-[var(--radius-lg)] border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          result.insideEnvelope
            ? "border-[var(--good)]/50 bg-[var(--good)]/10"
            : "border-[var(--warning)]/70 bg-[var(--warning)]/12"
        }`}
      >
        <div className="flex items-start gap-3">
          {result.insideEnvelope ? (
            <CheckCircle2 className="size-5 text-[var(--good)] shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-5 text-[var(--warning)] shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={`text-[0.9375rem] font-semibold ${
                  result.insideEnvelope ? "text-[var(--good)]" : "text-[var(--warning)]"
                }`}
              >
                {result.insideEnvelope
                  ? "Inside Measured PSI-25 Envelope"
                  : "Outside Measured Envelope — No Extrapolated Visuals"}
              </h2>
              <Badge variant={result.insideEnvelope ? "good" : "warning"}>
                {sameGroupRuns.length} measured {labParams.material} {labParams.geometry} runs
              </Badge>
            </div>
            <p className="text-[0.8125rem] text-[var(--text-2)]">
              {result.insideEnvelope
                ? "A same-material, same-geometry ISS experiment exists within normalized distance ≤ 0.25 and your query lies inside the measured min–max hull."
                : "Your dialed conditions fall outside NASA BASS-II's measured envelope for this fuel family. Synthetic flames are never fabricated—only nearest measured analog runs and exact parameter deltas are listed."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Controls (left 5 cols) + Envelope Chart & Matches (right 7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Controls Column */}
        <Panel surface="surface-1" className="xl:col-span-5">
          <PanelHeader>
            <PanelTitle eyebrow="Query Parameters" title="Measured-Coverage Sliders" />
          </PanelHeader>
          <PanelBody className="space-y-5">
            <CoverageSlider
              id="lab-o2-slider"
              label="Initial Oxygen Concentration (O₂)"
              unit="% vol"
              value={labParams.o2Pct}
              min={10}
              max={32}
              step={0.1}
              allValues={allO2}
              groupValues={groupO2}
              onChange={(o2Pct) => dispatch({ type: "setLabParams", params: { o2Pct } })}
            />

            <CoverageSlider
              id="lab-airflow-slider"
              label="Representative Airflow Speed"
              unit="cm/s"
              value={labParams.airflowCmS}
              min={0}
              max={65}
              step={0.5}
              allValues={allAir}
              groupValues={groupAir}
              onChange={(airflowCmS) => dispatch({ type: "setLabParams", params: { airflowCmS } })}
            />

            <div className="space-y-2">
              <CoverageSlider
                id="lab-size-slider"
                label="Characteristic Fuel Dimension (thickness or Ø)"
                unit="mm"
                value={labParams.characteristicSizeMm ?? 6.35}
                min={0.05}
                max={15}
                step={0.05}
                allValues={allSizes}
                groupValues={groupSizes}
                disabled={labParams.characteristicSizeMm === null}
                onChange={(characteristicSizeMm) =>
                  dispatch({ type: "setLabParams", params: { characteristicSizeMm } })
                }
              />
              <label className="inline-flex items-center gap-2 text-[0.75rem] text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={labParams.characteristicSizeMm === null}
                  onChange={(e) =>
                    dispatch({
                      type: "setLabParams",
                      params: {
                        characteristicSizeMm: e.target.checked
                          ? null
                          : groupSizes[0] ?? 6.35,
                      },
                    })
                  }
                  className="size-3.5 accent-[var(--accent)]"
                />
                <span>Ignore characteristic dimension (useful for fabrics without thickness)</span>
              </label>
            </div>

            {/* Fuel Material */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                Fuel Material
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fuel Material">
                {MATERIALS.map((mat) => {
                  const active = labParams.material === mat;
                  return (
                    <button
                      key={mat}
                      type="button"
                      aria-pressed={active}
                      onClick={() => dispatch({ type: "setLabParams", params: { material: mat } })}
                      className={`min-h-8 px-2.5 rounded-[var(--radius-sm)] border text-[0.75rem] transition-colors cursor-pointer ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                          : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)]"
                      }`}
                    >
                      <span>{mat}</span>
                      <span className="num ml-1 opacity-75">{materialCounts.get(mat) ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fuel Geometry */}
            <div className="space-y-1.5">
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                Fuel Geometry (counts shown for {labParams.material})
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fuel Geometry">
                {GEOMETRIES.map((geom) => {
                  const active = labParams.geometry === geom;
                  const grpCount = geometryCounts.get(geom) ?? 0;
                  return (
                    <button
                      key={geom}
                      type="button"
                      aria-pressed={active}
                      onClick={() => dispatch({ type: "setLabParams", params: { geometry: geom } })}
                      className={`min-h-8 px-2.5 rounded-[var(--radius-sm)] border text-[0.75rem] transition-colors cursor-pointer ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                          : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)]"
                      }`}
                    >
                      <span className="capitalize">{geom}</span>
                      <span className="num ml-1 opacity-75">{grpCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* k neighbors */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
              <span className="text-[0.75rem] text-[var(--text-2)]">Nearest Neighbors (k)</span>
              <SegmentedControl<string>
                ariaLabel="Number of nearest neighbors k"
                size="sm"
                value={String(labParams.k)}
                onChange={(val) => dispatch({ type: "setLabParams", params: { k: Number(val) } })}
                options={[
                  { value: "3", label: "3" },
                  { value: "5", label: "5" },
                  { value: "8", label: "8" },
                ]}
              />
            </div>

            {/* Sourced Physics Narration */}
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3.5 space-y-1.5">
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--accent)]">
                {mode === "learn" ? "Why These Controls Matter (Sourced)" : "Regime Physical Context"}
              </p>
              <p className="text-[0.8125rem] font-medium text-[var(--text-1)]">{narration.headline}</p>
              <p className="text-[0.75rem] text-[var(--text-2)] leading-relaxed">{narration.body}</p>
            </div>
          </PanelBody>
        </Panel>

        {/* Visualization + Nearest Matches Column */}
        <div className="xl:col-span-7 space-y-5">
          {/* 2D Envelope Map */}
          <Panel surface="surface-1">
            <PanelHeader className="flex-wrap">
              <PanelTitle
                eyebrow="Measured Hull & Distance Vectors"
                title="Query Position vs. PSI-25 Nearest Neighbors"
                actions={
                  <SegmentedControl<"map" | "table">
                    ariaLabel="What-if hull visualization mode"
                    size="sm"
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { value: "map", label: "Envelope Map" },
                      { value: "table", label: "Match Table" },
                    ]}
                  />
                }
              />
            </PanelHeader>
            <PanelBody className="space-y-3">
              <p id={descId} className="sr-only">
                Scatter chart placing the current What-if query at {labParams.airflowCmS} cm/s airflow and{" "}
                {labParams.o2Pct}% oxygen against all measured PSI-25 runs, with dashed lines to the top{" "}
                {labParams.k} closest neighbors.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-[0.75rem] text-[var(--text-2)]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: result.insideEnvelope ? "var(--good)" : "var(--warning)",
                    }}
                  />
                  <span>Your query</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[var(--series-2)]" />
                  <span>Same {labParams.material} {labParams.geometry} hull</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[var(--series-1)]" />
                  <span>Top-{labParams.k} matches</span>
                </span>
              </div>

              {viewMode === "map" ? (
                <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-2">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto"
                    role="img"
                    aria-label="Measured envelope and nearest neighbor vector map"
                    aria-describedby={descId}
                  >
                    <g transform={`translate(${pad.l},${pad.t})`}>
                      {xScale.ticks(7).map((t) => (
                        <g key={`x-${t}`} transform={`translate(${xScale(t)},0)`}>
                          <line y1={0} y2={plotH} stroke="var(--line)" strokeDasharray="2 4" />
                          <text
                            y={plotH + 16}
                            textAnchor="middle"
                            fill="var(--text-3)"
                            fontSize="10"
                            className="num"
                          >
                            {t}
                          </text>
                        </g>
                      ))}
                      {yScale.ticks(6).map((t) => (
                        <g key={`y-${t}`} transform={`translate(0,${yScale(t)})`}>
                          <line x1={0} x2={plotW} stroke="var(--line)" strokeDasharray="2 4" />
                          <text
                            x={-8}
                            dy="0.32em"
                            textAnchor="end"
                            fill="var(--text-3)"
                            fontSize="10"
                            className="num"
                          >
                            {t}
                          </text>
                        </g>
                      ))}

                      <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="var(--line-strong)" />
                      <line x1={0} y1={0} x2={0} y2={plotH} stroke="var(--line-strong)" />
                      <text x={plotW / 2} y={plotH + 34} textAnchor="middle" fill="var(--text-2)" fontSize="11">
                        Representative Airflow (cm/s)
                      </text>
                      <text
                        transform={`translate(-38,${plotH / 2}) rotate(-90)`}
                        textAnchor="middle"
                        fill="var(--text-2)"
                        fontSize="11"
                      >
                        Initial O₂ (% vol)
                      </text>

                      {/* Shaded hull for same material + geometry */}
                      {hasGroupEnvelopeBox && (
                        <rect
                          x={xScale(grpAirMin)}
                          y={yScale(grpO2Max)}
                          width={Math.max(4, xScale(grpAirMax) - xScale(grpAirMin))}
                          height={Math.max(4, yScale(grpO2Min) - yScale(grpO2Max))}
                          fill="var(--accent-soft)"
                          stroke="var(--series-2)"
                          strokeWidth="1.25"
                          strokeDasharray="4 3"
                          rx={4}
                        />
                      )}

                      {/* Background all valid runs */}
                      {dataset.experiments.map((exp) => {
                        const o2 = exp.conditions.o2InitialPct;
                        const air = representativeAirflow(exp);
                        if (o2 === null || air === null) return null;
                        const sameGroup =
                          exp.fuel.material === labParams.material &&
                          exp.fuel.geometry === labParams.geometry;
                        return (
                          <circle
                            key={exp.id}
                            cx={xScale(air)}
                            cy={yScale(o2)}
                            r={sameGroup ? 4 : 2.8}
                            fill={sameGroup ? "var(--series-2)" : "var(--text-3)"}
                            fillOpacity={sameGroup ? 0.85 : 0.3}
                          />
                        );
                      })}

                      {/* Neighbor vector lines */}
                      {matchedDetails.map(({ experiment }) => {
                        const o2 = experiment.conditions.o2InitialPct;
                        const air = representativeAirflow(experiment);
                        if (o2 === null || air === null) return null;
                        const qx = xScale(labParams.airflowCmS);
                        const qy = yScale(labParams.o2Pct);
                        const tx = xScale(air);
                        const ty = yScale(o2);
                        return (
                          <g key={`vec-${experiment.id}`}>
                            <line
                              x1={qx}
                              y1={qy}
                              x2={tx}
                              y2={ty}
                              stroke="var(--series-1)"
                              strokeWidth="1.4"
                              strokeDasharray="3 3"
                            />
                            <circle
                              cx={tx}
                              cy={ty}
                              r={5.5}
                              fill="var(--series-1)"
                              stroke="var(--bg)"
                              strokeWidth="1.25"
                            />
                            <text
                              x={tx + 7}
                              y={ty - 5}
                              fill="var(--text-1)"
                              fontSize="10"
                              className="num font-semibold"
                            >
                              {experiment.testId}
                            </text>
                          </g>
                        );
                      })}

                      {/* Query crosshair */}
                      <g transform={`translate(${xScale(labParams.airflowCmS)},${yScale(labParams.o2Pct)})`}>
                        <circle
                          r={9}
                          fill="none"
                          stroke={result.insideEnvelope ? "var(--good)" : "var(--warning)"}
                          strokeWidth="2"
                        />
                        <circle
                          r={3.5}
                          fill={result.insideEnvelope ? "var(--good)" : "var(--warning)"}
                        />
                      </g>
                    </g>
                  </svg>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--line)]">
                  <table className="w-full text-left border-collapse text-[0.8125rem]">
                    <thead className="bg-[var(--surface-3)] text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)]">
                      <tr>
                        <th className="py-2 px-3">Run</th>
                        <th className="py-2 px-3 text-right">Distance</th>
                        <th className="py-2 px-3 text-right">Δ O₂</th>
                        <th className="py-2 px-3 text-right">Δ Airflow</th>
                        <th className="py-2 px-3">Mismatches</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {matchedDetails.map(({ match, experiment }) => (
                        <tr key={experiment.id}>
                          <td className="py-1.5 px-3 num font-medium text-[var(--text-1)]">{experiment.testId}</td>
                          <td className="py-1.5 px-3 num text-right text-[var(--accent)]">
                            {match.distance.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-3 num text-right text-[var(--text-2)]">
                            {formatSigned(match.deltas.o2Pct, "%")}
                          </td>
                          <td className="py-1.5 px-3 num text-right text-[var(--text-2)]">
                            {formatSigned(match.deltas.airflowCmS, "cm/s")}
                          </td>
                          <td className="py-1.5 px-3 text-[var(--warning)]">
                            {match.categoricalMismatches.join(", ") || "Exact group"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Top-k Match Cards */}
          <Panel surface="surface-1">
            <PanelHeader className="flex-wrap">
              <PanelTitle
                eyebrow="Distance-Ranked Nearest Analogs"
                title={`Top ${matchedDetails.length} Measured Matches`}
                actions={
                  matchedDetails.length >= 2 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        dispatch({
                          type: "compare",
                          ids: matchedDetails.slice(0, 4).map((m) => m.experiment.id),
                        })
                      }
                    >
                      <GitCompareArrows className="size-3.5" aria-hidden="true" />
                      <span>Compare Top {Math.min(4, matchedDetails.length)}</span>
                    </Button>
                  )
                }
              />
            </PanelHeader>
            <PanelBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchedDetails.map(({ match, experiment }, idx) => {
                const isPreviewing = activePreview?.id === experiment.id;
                const repAir = representativeAirflow(experiment);
                const sizeMm = characteristicSizeMm(experiment.fuel);

                return (
                  <div
                    key={experiment.id}
                    className={`rounded-[var(--radius-md)] border p-3.5 space-y-2.5 transition-colors ${
                      isPreviewing
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]/25"
                        : "border-[var(--line)] bg-[var(--surface-2)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="num text-[0.6875rem] font-semibold text-[var(--accent)]">
                            #{idx + 1}
                          </span>
                          <span className="num font-semibold text-[0.9375rem] text-[var(--text-1)]">
                            {experiment.testId}
                          </span>
                          <span className="text-[0.75rem] text-[var(--text-2)]">
                            · {experiment.principalInvestigator}
                          </span>
                        </div>
                        <p className="text-[0.75rem] text-[var(--text-2)] mt-0.5">
                          {experiment.fuel.raw}
                        </p>
                      </div>
                      <Badge variant="accent">d={match.distance.toFixed(3)}</Badge>
                    </div>

                    {/* Signed Deltas */}
                    <div className="flex flex-wrap gap-1.5 text-[0.6875rem]">
                      <Badge>
                        ΔO₂: {formatSigned(match.deltas.o2Pct, "%")} (
                        {formatMetricValue(experiment.conditions.o2InitialPct, { unit: "%" }).text})
                      </Badge>
                      <Badge>
                        ΔFlow: {formatSigned(match.deltas.airflowCmS, "cm/s")} (
                        {formatMetricValue(repAir, { unit: "cm/s" }).text})
                      </Badge>
                      {match.deltas.characteristicSizeMm !== null && (
                        <Badge>
                          ΔSize: {formatSigned(match.deltas.characteristicSizeMm, "mm", 2)} (
                          {sizeMm ?? "—"} mm)
                        </Badge>
                      )}
                    </div>

                    {/* Mismatch & QA Warnings */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {match.categoricalMismatches.map((mm) => (
                        <Badge key={mm} variant="warning">
                          <AlertTriangle className="size-3 mr-1" aria-hidden="true" />
                          {mm} mismatch
                        </Badge>
                      ))}
                      <QABadge flags={experiment.qa.flags} parse={experiment.qa.parse} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
                      <Button
                        size="sm"
                        variant={isPreviewing ? "primary" : "ghost"}
                        onClick={() => setSelectedPreviewId(experiment.id)}
                        disabled={experiment.videos.length === 0}
                      >
                        <Film className="size-3.5" aria-hidden="true" />
                        <span>
                          {experiment.videos.length > 0
                            ? isPreviewing
                              ? "Previewing"
                              : `Preview Footage (${experiment.videos.length})`
                            : "No video"}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dispatch({ type: "openExperiment", id: experiment.id })}
                      >
                        <span>Inspect</span>
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </PanelBody>
          </Panel>

          {/* Embedded Real-Footage Preview of Selected Match */}
          {activePreview && (
            <FlameViewer
              key={activePreview.id}
              experiment={activePreview}
              compact
              titleOverride={
                result.insideEnvelope
                  ? `Closest Measured Match Preview — Run ${activePreview.testId}`
                  : `Nearest Analog Reference ONLY — Run ${activePreview.testId} (Query Outside Hull)`
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
