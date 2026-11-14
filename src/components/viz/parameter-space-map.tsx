"use client";

import { extent } from "d3-array";
import { scaleLinear, scaleSqrt } from "d3-scale";
import { ExternalLink, Filter, Table2, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  Badge,
  Button,
  formatMetricValue,
  formatNullWithReason,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  QABadge,
  SegmentedControl,
  Tooltip,
  useHighlightPulse,
} from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

import {
  type FuelFamily,
  partitionPlottedRuns,
  type PlottedExperimentPoint,
} from "./dataset-queries";

const SERIES_META: Record<FuelFamily, { label: string; colorVar: string }> = {
  "film-slab": { label: "Film / Slab", colorVar: "var(--series-1)" },
  "rod-sphere": { label: "Rod / Sphere", colorVar: "var(--series-2)" },
  "fabric-other": { label: "Fabric / Candle", colorVar: "var(--series-3)" },
};

const SVG_W = 700;
const SVG_H = 380;
const MARGIN = { top: 22, right: 24, bottom: 48, left: 56 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

interface BrushBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ParameterSpaceMapProps {
  allExperiments: readonly Experiment[];
  filteredExperiments: readonly Experiment[];
}

export function ParameterSpaceMap({
  allExperiments,
  filteredExperiments,
}: ParameterSpaceMapProps) {
  const mode = useDashboard((s) => s.mode);
  const selection = useDashboard((s) => s.selection);
  const dispatch = useDispatch();

  const o2Pulse = useHighlightPulse("o2-axis");
  const airflowPulse = useHighlightPulse("airflow-axis");

  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [hovered, setHovered] = useState<PlottedExperimentPoint | null>(null);
  const [brushDrag, setBrushDrag] = useState<BrushBox | null>(null);
  const [lastBrushDomain, setLastBrushDomain] = useState<{
    o2Min: number;
    o2Max: number;
    airMin: number;
    airMax: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const descId = useId();

  // Keep axis domains anchored to the full dataset so filtered transitions remain spatially comparable.
  const fullPartition = partitionPlottedRuns(allExperiments);
  const { plotted, unplotted } = partitionPlottedRuns(filteredExperiments);

  const [airMinRaw, airMaxRaw] = extent(fullPartition.plotted, (d) => d.airflowCmS);
  const [o2MinRaw, o2MaxRaw] = extent(fullPartition.plotted, (d) => d.o2InitialPct);
  const [sizeMinRaw, sizeMaxRaw] = extent(
    fullPartition.plotted.map((d) => d.sizeMm).filter((v): v is number => v !== null),
  );

  const xScale = scaleLinear()
    .domain([Math.max(0, (airMinRaw ?? 0) - 2), (airMaxRaw ?? 62) + 3])
    .range([0, PLOT_W])
    .nice();

  const yScale = scaleLinear()
    .domain([Math.max(10, (o2MinRaw ?? 13.6) - 0.8), (o2MaxRaw ?? 22.2) + 0.8])
    .range([PLOT_H, 0])
    .nice();

  const rScale = scaleSqrt()
    .domain([sizeMinRaw ?? 0.1, sizeMaxRaw ?? 15])
    .range([4.5, 9.5]);

  const xTicks = xScale.ticks(7);
  const yTicks = yScale.ticks(6);

  const toPlotCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    const px = Math.max(0, Math.min(PLOT_W, transformed.x - MARGIN.left));
    const py = Math.max(0, Math.min(PLOT_H, transformed.y - MARGIN.top));
    return { x: px, y: py };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.button !== 0) return;
    const pt = toPlotCoords(e.clientX, e.clientY);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setBrushDrag({ x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!brushDrag) return;
    const pt = toPlotCoords(e.clientX, e.clientY);
    if (!pt) return;
    setBrushDrag((prev) => (prev ? { ...prev, x1: pt.x, y1: pt.y } : null));
  };

  const handlePointerUp = () => {
    if (!brushDrag) return;
    const minX = Math.min(brushDrag.x0, brushDrag.x1);
    const maxX = Math.max(brushDrag.x0, brushDrag.x1);
    const minY = Math.min(brushDrag.y0, brushDrag.y1);
    const maxY = Math.max(brushDrag.y0, brushDrag.y1);
    setBrushDrag(null);

    if (maxX - minX < 6 && maxY - minY < 6) {
      return;
    }

    const hits = plotted.filter((p) => {
      const cx = xScale(p.airflowCmS);
      const cy = yScale(p.o2InitialPct);
      return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
    });

    dispatch({ type: "selectExperiments", ids: hits.map((h) => h.experiment.id) });
    setLastBrushDomain({
      airMin: Number(xScale.invert(minX).toFixed(1)),
      airMax: Number(xScale.invert(maxX).toFixed(1)),
      o2Min: Number(yScale.invert(maxY).toFixed(1)),
      o2Max: Number(yScale.invert(minY).toFixed(1)),
    });
  };

  const togglePointSelection = (expId: string, additive: boolean) => {
    if (additive) {
      const next = selection.includes(expId)
        ? selection.filter((id) => id !== expId)
        : [...selection, expId];
      dispatch({ type: "selectExperiments", ids: next });
    } else {
      dispatch({
        type: "selectExperiments",
        ids: selection.length === 1 && selection[0] === expId ? [] : [expId],
      });
    }
  };

  return (
    <Panel surface="surface-1">
      <PanelHeader className="flex-wrap">
        <PanelTitle
          eyebrow="Parameter Space · D3 Linked Scatter"
          title={
            mode === "learn"
              ? "Oxygen vs. Airflow Map Across Space Station Burns"
              : "Initial O₂ × Representative Airflow (Median Set-Point)"
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {lastBrushDomain && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dispatch({
                      type: "setFilters",
                      filters: {
                        o2InitialPct: { min: lastBrushDomain.o2Min, max: lastBrushDomain.o2Max },
                        airflowCmS: { min: lastBrushDomain.airMin, max: lastBrushDomain.airMax },
                      },
                    });
                    setLastBrushDomain(null);
                  }}
                >
                  <Filter className="size-3.5" aria-hidden="true" />
                  <span>Filter to brushed box</span>
                </Button>
              )}
              {selection.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dispatch({ type: "selectExperiments", ids: [] });
                    setLastBrushDomain(null);
                  }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span>Clear ({selection.length})</span>
                </Button>
              )}
              <SegmentedControl<"chart" | "table">
                ariaLabel="Parameter-space visualization mode"
                size="sm"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: "chart", label: "Scatter" },
                  { value: "table", label: "Table" },
                ]}
              />
            </div>
          }
        />
      </PanelHeader>

      <PanelBody className="space-y-3">
        {/* Legend: Strictly max 3 fuel-family series + size cue */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[0.75rem] text-[var(--text-2)]">
          <div className="flex flex-wrap items-center gap-4">
            {(Object.entries(SERIES_META) as [FuelFamily, { label: string; colorVar: string }][]).map(
              ([family, meta]) => (
                <span key={family} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: meta.colorVar }}
                  />
                  <span>{meta.label}</span>
                </span>
              ),
            )}
            <span className="text-[var(--text-3)]">
              Radius ∝ fuel thickness / diameter · Drag plot to brush-select runs
            </span>
          </div>
          <span className="num text-[var(--text-3)]">
            Plotted: {plotted.length} · Unplotted nulls: {unplotted.length}
          </span>
        </div>

        <p id={descId} className="sr-only">
          Scatter plot mapping representative duct airflow in centimeters per second on the horizontal axis against
          initial oxygen concentration percentage on the vertical axis for {plotted.length} PSI-25 BASS-II runs.
          Points are colored into three fuel families (Film or Slab, Rod or Sphere, Fabric or Candle) and sized by
          characteristic fuel thickness or diameter. {unplotted.length} matching runs lack valid O2 or airflow telemetry
          and are listed separately below without being plotted at zero.
        </p>

        {viewMode === "chart" ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <div className="xl:col-span-9 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-2 sm:p-3 overflow-hidden">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-auto select-none"
                role="img"
                aria-label="Initial O2 vs. representative airflow scatter plot"
                aria-describedby={descId}
              >
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  {/* Gridlines */}
                  {xTicks.map((t) => (
                    <line
                      key={`gx-${t}`}
                      x1={xScale(t)}
                      x2={xScale(t)}
                      y1={0}
                      y2={PLOT_H}
                      stroke="var(--line)"
                      strokeDasharray="2 4"
                    />
                  ))}
                  {yTicks.map((t) => (
                    <line
                      key={`gy-${t}`}
                      x1={0}
                      x2={PLOT_W}
                      y1={yScale(t)}
                      y2={yScale(t)}
                      stroke="var(--line)"
                      strokeDasharray="2 4"
                    />
                  ))}

                  {/* Brush background surface */}
                  <rect
                    x={0}
                    y={0}
                    width={PLOT_W}
                    height={PLOT_H}
                    fill="transparent"
                    className="cursor-crosshair"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  />

                  {/* Y-axis (O₂) highlight target */}
                  <g {...o2Pulse.highlightProps}>
                    <line x1={0} y1={0} x2={0} y2={PLOT_H} stroke="var(--line-strong)" />
                    {yTicks.map((t) => (
                      <g key={`yt-${t}`} transform={`translate(0,${yScale(t)})`}>
                        <line x1={-4} x2={0} stroke="var(--line-strong)" />
                        <text
                          x={-8}
                          dy="0.32em"
                          textAnchor="end"
                          fill="var(--text-3)"
                          fontSize="11"
                          className="num"
                        >
                          {t.toFixed(1)}
                        </text>
                      </g>
                    ))}
                    <text
                      transform={`translate(-40,${PLOT_H / 2}) rotate(-90)`}
                      textAnchor="middle"
                      fill={o2Pulse.isHighlighted ? "var(--accent)" : "var(--text-2)"}
                      fontSize="11"
                      fontWeight="500"
                    >
                      Initial O₂ (% vol)
                    </text>
                  </g>

                  {/* X-axis (Airflow) highlight target */}
                  <g {...airflowPulse.highlightProps} transform={`translate(0,${PLOT_H})`}>
                    <line x1={0} y1={0} x2={PLOT_W} y2={0} stroke="var(--line-strong)" />
                    {xTicks.map((t) => (
                      <g key={`xt-${t}`} transform={`translate(${xScale(t)},0)`}>
                        <line y1={0} y2={4} stroke="var(--line-strong)" />
                        <text
                          y={16}
                          textAnchor="middle"
                          fill="var(--text-3)"
                          fontSize="11"
                          className="num"
                        >
                          {t}
                        </text>
                      </g>
                    ))}
                    <text
                      x={PLOT_W / 2}
                      y={36}
                      textAnchor="middle"
                      fill={airflowPulse.isHighlighted ? "var(--accent)" : "var(--text-2)"}
                      fontSize="11"
                      fontWeight="500"
                    >
                      Representative Airflow (cm/s · median set-point)
                    </text>
                  </g>

                  {/* Data points */}
                  {plotted.map((pt) => {
                    const cx = xScale(pt.airflowCmS);
                    const cy = yScale(pt.o2InitialPct);
                    const r = pt.sizeMm !== null ? rScale(pt.sizeMm) : 5.5;
                    const isSelected = selection.includes(pt.experiment.id);
                    const isHovered = hovered?.experiment.id === pt.experiment.id;
                    const colorVar = SERIES_META[pt.family].colorVar;

                    return (
                      <g key={pt.experiment.id} transform={`translate(${cx},${cy})`}>
                        {isSelected && (
                          <circle
                            r={r + 4}
                            fill="none"
                            stroke="var(--text-1)"
                            strokeWidth="1.75"
                          />
                        )}
                        <circle
                          r={r}
                          fill={colorVar}
                          fillOpacity={isSelected || isHovered ? 0.95 : 0.72}
                          stroke={isHovered ? "var(--text-1)" : "var(--bg)"}
                          strokeWidth={isHovered ? 1.5 : 1}
                          role="button"
                          tabIndex={0}
                          aria-label={`Run ${pt.experiment.testId}: ${pt.experiment.principalInvestigator}, ${pt.o2InitialPct}% O2, ${pt.airflowCmS} cm/s`}
                          className="cursor-pointer transition-opacity focus:outline-none"
                          onMouseEnter={() => setHovered(pt)}
                          onFocus={() => setHovered(pt)}
                          onMouseLeave={() => setHovered((cur) => (cur?.experiment.id === pt.experiment.id ? null : cur))}
                          onClick={(e) => togglePointSelection(pt.experiment.id, e.shiftKey || e.metaKey || e.ctrlKey)}
                          onDoubleClick={() => dispatch({ type: "openExperiment", id: pt.experiment.id })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              dispatch({ type: "openExperiment", id: pt.experiment.id });
                            } else if (e.key === " ") {
                              e.preventDefault();
                              togglePointSelection(pt.experiment.id, true);
                            }
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Active brush rectangle */}
                  {brushDrag && (
                    <rect
                      x={Math.min(brushDrag.x0, brushDrag.x1)}
                      y={Math.min(brushDrag.y0, brushDrag.y1)}
                      width={Math.abs(brushDrag.x1 - brushDrag.x0)}
                      height={Math.abs(brushDrag.y1 - brushDrag.y0)}
                      fill="var(--accent-soft)"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      pointerEvents="none"
                    />
                  )}
                </g>
              </svg>
            </div>

            {/* Readout & Selection Inspector Card */}
            <div className="xl:col-span-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3.5 space-y-3">
              {hovered ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="accent">Run {hovered.experiment.testId}</Badge>
                    <span className="num text-[0.75rem] text-[var(--text-3)]">
                      {hovered.experiment.sampleId}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[0.875rem] font-medium text-[var(--text-1)]">
                      {hovered.experiment.principalInvestigator}
                    </p>
                    <p className="text-[0.75rem] text-[var(--text-2)]">{hovered.experiment.fuel.raw}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-[0.75rem] border-t border-[var(--line)] pt-2">
                    <div>
                      <dt className="text-[var(--text-3)]">Initial O₂</dt>
                      <dd className="num font-medium text-[var(--text-1)]">
                        {formatMetricValue(hovered.o2InitialPct, { unit: "%", precision: 1 }).text}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-3)]">Rep. Airflow</dt>
                      <dd className="num font-medium text-[var(--text-1)]">
                        {formatMetricValue(hovered.airflowCmS, { unit: "cm/s", precision: 1 }).text}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-3)]">Char. Size</dt>
                      <dd className="num text-[var(--text-2)]">
                        {hovered.sizeMm !== null
                          ? formatMetricValue(hovered.sizeMm, { unit: "mm" }).text
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-3)]">Videos</dt>
                      <dd className="num text-[var(--text-2)]">{hovered.experiment.videos.length}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <QABadge flags={hovered.experiment.qa.flags} parse={hovered.experiment.qa.parse} showClean />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => dispatch({ type: "openExperiment", id: hovered.experiment.id })}
                    >
                      <span>Open Run</span>
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-[0.8125rem] text-[var(--text-2)]">
                  <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                    Point Inspector
                  </p>
                  <p>
                    Hover or focus any plotted point to inspect its telemetry, click to select, Shift-click to
                    multi-select, or double-click / press Enter to open the Flame Viewer.
                  </p>
                  <p className="text-[0.75rem] text-[var(--text-3)]">
                    Selected runs ({selection.length}) sync across the matrix below and can be launched into Compare.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Accessible Table View of Plotted Data */
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] overflow-x-auto max-h-[380px]">
            <table className="w-full text-left border-collapse text-[0.8125rem]">
              <thead className="sticky top-0 bg-[var(--surface-3)] text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)] border-b border-[var(--line)]">
                <tr>
                  <th className="py-2 px-3">
                    <span className="inline-flex items-center gap-1">
                      <Table2 className="size-3" aria-hidden="true" />
                      Run
                    </span>
                  </th>
                  <th className="py-2 px-3">PI</th>
                  <th className="py-2 px-3">Fuel Family</th>
                  <th className="py-2 px-3 text-right">Initial O₂ (%)</th>
                  <th className="py-2 px-3 text-right">Rep. Airflow (cm/s)</th>
                  <th className="py-2 px-3 text-right">Char. Size (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {plotted.map((p) => (
                  <tr
                    key={p.experiment.id}
                    className="hover:bg-[var(--surface-3)] cursor-pointer"
                    onClick={() => dispatch({ type: "openExperiment", id: p.experiment.id })}
                  >
                    <td className="py-1.5 px-3 num font-medium text-[var(--text-1)]">{p.experiment.testId}</td>
                    <td className="py-1.5 px-3 text-[var(--text-2)]">{p.experiment.principalInvestigator}</td>
                    <td className="py-1.5 px-3 text-[var(--text-2)]">{SERIES_META[p.family].label}</td>
                    <td className="py-1.5 px-3 num text-right text-[var(--text-1)]">{p.o2InitialPct.toFixed(1)}</td>
                    <td className="py-1.5 px-3 num text-right text-[var(--text-1)]">{p.airflowCmS.toFixed(1)}</td>
                    <td className="py-1.5 px-3 num text-right text-[var(--text-2)]">
                      {p.sizeMm !== null ? p.sizeMm : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Explicit Unplotted Runs Strip (zero fabricated coordinates) */}
        {unplotted.length > 0 && (
          <div className="rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--warning)]/5 px-3.5 py-2.5 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.75rem] font-medium text-[var(--warning)]">
                {unplotted.length} matching run{unplotted.length === 1 ? "" : "s"} excluded from scatter coordinates
                (missing valid Initial O₂ or airflow set-points — never plotted at 0):
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unplotted.map((exp) => {
                const reason =
                  exp.conditions.o2InitialPct === null
                    ? formatNullWithReason("Initial O₂ is null (missing or flagged implausible in source)")
                    : formatNullWithReason("Airflow set-points empty");
                return (
                  <Tooltip key={exp.id} content={`${exp.principalInvestigator}: ${reason}`}>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "openExperiment", id: exp.id })}
                      className="num min-h-6 px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--warning)]/40 bg-[var(--surface-2)] text-[0.75rem] text-[var(--text-1)] hover:border-[var(--accent)] cursor-pointer"
                    >
                      {exp.testId}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
