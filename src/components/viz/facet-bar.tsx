"use client";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import { Badge, Button, Panel, PanelBody, useHighlightPulse } from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";
import type { ExperimentFilters } from "@/types/dashboard";
import type { Experiment, FlowConfiguration, FuelGeometry, FuelMaterial } from "@/types/experiment";

import { facetCounts, parameterRanges } from "./dataset-queries";

const MATERIALS: FuelMaterial[] = ["PMMA", "SIBAL", "Nomex", "Japan wax"];
const GEOMETRIES: FuelGeometry[] = ["film", "slab", "rod", "spherical-section", "fabric", "candle"];
const FLOW_CONFIGS: FlowConfiguration[] = ["opposed", "concurrent"];

function toggleArrayValue<T extends string>(current: readonly T[], item: T): T[] {
  return current.includes(item) ? current.filter((v) => v !== item) : [...current, item];
}

function parseOptionalNum(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface FacetBarProps {
  experiments: readonly Experiment[];
  filteredCount: number;
}

export function FacetBar({ experiments, filteredCount }: FacetBarProps) {
  const filters = useDashboard((s) => s.filters);
  const dispatch = useDispatch();
  const materialPulse = useHighlightPulse("filter-material");

  const counts = facetCounts(experiments);
  const ranges = parameterRanges(experiments);
  const piNames = Object.keys(counts.principalInvestigators).sort((a, b) => a.localeCompare(b, "en"));

  const hasActiveFilters =
    filters.principalInvestigators.length > 0 ||
    filters.materials.length > 0 ||
    filters.geometries.length > 0 ||
    filters.flowConfigurations.length > 0 ||
    filters.o2InitialPct.min !== undefined ||
    filters.o2InitialPct.max !== undefined ||
    filters.airflowCmS.min !== undefined ||
    filters.airflowCmS.max !== undefined ||
    filters.hasVideo !== null ||
    filters.hasQaFlags !== null ||
    filters.text.trim().length > 0;

  const updateFilters = (patch: Partial<ExperimentFilters>) => {
    dispatch({ type: "setFilters", filters: patch });
  };

  return (
    <Panel surface="surface-1">
      <PanelBody className="space-y-4">
        {/* Top row: Search + status summary + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search
              className="size-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.text}
              onChange={(e) => updateFilters({ text: e.target.value })}
              placeholder="Search run ID, sample, fuel raw text, outcome hints…"
              aria-label="Filter runs by text"
              className="w-full min-h-9 pl-9 pr-8 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] text-[0.8125rem] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]"
            />
            {filters.text && (
              <button
                type="button"
                onClick={() => updateFilters({ text: "" })}
                aria-label="Clear search text"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--text-2)]">
              <SlidersHorizontal className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
              <span className="num font-medium text-[var(--text-1)]">{filteredCount}</span>
              <span>of</span>
              <span className="num">{experiments.length}</span>
              <span>runs matching</span>
            </span>

            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dispatch({ type: "resetFilters" })}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>Reset filters</span>
              </Button>
            )}
          </div>
        </div>

        {/* Facet grids */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 border-t border-[var(--line)]">
          {/* Principal Investigator */}
          <div className="lg:col-span-4 space-y-1.5">
            <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              Principal Investigator
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by Principal Investigator">
              {piNames.map((pi) => {
                const active = filters.principalInvestigators.includes(pi);
                return (
                  <button
                    key={pi}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      updateFilters({
                        principalInvestigators: toggleArrayValue(filters.principalInvestigators, pi),
                      })
                    }
                    className={`min-h-7 px-2.5 py-0.5 rounded-[var(--radius-sm)] border text-[0.75rem] transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    <span>{pi}</span>
                    <span className="num ml-1 text-[0.6875rem]">
                      {counts.principalInvestigators[pi] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fuel Material (AI highlight target: filter-material) */}
          <div
            {...materialPulse.highlightProps}
            className={`lg:col-span-4 space-y-1.5 rounded-[var(--radius-sm)] p-1 -m-1 ${materialPulse.highlightClassName ?? ""}`}
          >
            <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              Fuel Material
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by Fuel Material">
              {MATERIALS.map((mat) => {
                const active = filters.materials.includes(mat);
                return (
                  <button
                    key={mat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateFilters({ materials: toggleArrayValue(filters.materials, mat) })}
                    className={`min-h-7 px-2.5 py-0.5 rounded-[var(--radius-sm)] border text-[0.75rem] transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    <span>{mat}</span>
                    <span className="num ml-1 text-[0.6875rem]">
                      {counts.materials[mat] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geometry */}
          <div className="lg:col-span-4 space-y-1.5">
            <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              Fuel Geometry
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by Fuel Geometry">
              {GEOMETRIES.map((geom) => {
                const active = filters.geometries.includes(geom);
                const count = counts.geometries[geom] ?? 0;
                return (
                  <button
                    key={geom}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateFilters({ geometries: toggleArrayValue(filters.geometries, geom) })}
                    className={`min-h-7 px-2 py-0.5 rounded-[var(--radius-sm)] border text-[0.75rem] transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    <span>{geom}</span>
                    <span className="num ml-1 text-[0.6875rem]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Second row: Flow, O₂ range, Airflow range, Video & QA flags */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 pt-2 border-t border-[var(--line)] items-end">
          {/* Flow Configuration */}
          <div className="xl:col-span-3 space-y-1.5">
            <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              Flow Direction
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by Flow Direction">
              {FLOW_CONFIGS.map((flow) => {
                const active = filters.flowConfigurations.includes(flow);
                return (
                  <button
                    key={flow}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      updateFilters({
                        flowConfigurations: toggleArrayValue(filters.flowConfigurations, flow),
                      })
                    }
                    className={`min-h-7 px-2.5 py-0.5 rounded-[var(--radius-sm)] border text-[0.75rem] capitalize transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    {flow} ({counts.flowConfigurations[flow] ?? 0})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initial O₂ Range */}
          <div className="xl:col-span-3 space-y-1.5">
            <label className="block text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              Initial O₂ (% vol · {ranges.o2InitialPct ? `${ranges.o2InitialPct.min.toFixed(1)}–${ranges.o2InitialPct.max.toFixed(1)}` : "—"})
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min={0}
                max={100}
                placeholder="Min %"
                aria-label="Minimum initial O2 percentage"
                value={filters.o2InitialPct.min ?? ""}
                onChange={(e) =>
                  updateFilters({
                    o2InitialPct: { ...filters.o2InitialPct, min: parseOptionalNum(e.target.value) },
                  })
                }
                className="num w-full min-h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] text-[0.8125rem] text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[var(--text-3)] text-xs">–</span>
              <input
                type="number"
                step="0.5"
                min={0}
                max={100}
                placeholder="Max %"
                aria-label="Maximum initial O2 percentage"
                value={filters.o2InitialPct.max ?? ""}
                onChange={(e) =>
                  updateFilters({
                    o2InitialPct: { ...filters.o2InitialPct, max: parseOptionalNum(e.target.value) },
                  })
                }
                className="num w-full min-h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] text-[0.8125rem] text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Airflow Range */}
          <div className="xl:col-span-3 space-y-1.5">
            <label className="block text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
              Airflow Set-points (cm/s · {ranges.airflowCmS ? `${ranges.airflowCmS.min}–${ranges.airflowCmS.max}` : "—"})
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="1"
                min={0}
                max={100}
                placeholder="Min cm/s"
                aria-label="Minimum airflow cm/s"
                value={filters.airflowCmS.min ?? ""}
                onChange={(e) =>
                  updateFilters({
                    airflowCmS: { ...filters.airflowCmS, min: parseOptionalNum(e.target.value) },
                  })
                }
                className="num w-full min-h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] text-[0.8125rem] text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[var(--text-3)] text-xs">–</span>
              <input
                type="number"
                step="1"
                min={0}
                max={100}
                placeholder="Max cm/s"
                aria-label="Maximum airflow cm/s"
                value={filters.airflowCmS.max ?? ""}
                onChange={(e) =>
                  updateFilters({
                    airflowCmS: { ...filters.airflowCmS, max: parseOptionalNum(e.target.value) },
                  })
                }
                className="num w-full min-h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] text-[0.8125rem] text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Video & QA Flags */}
          <div className="xl:col-span-3 flex flex-wrap gap-3">
            <div className="space-y-1.5">
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                ISS Video
              </p>
              <div className="flex gap-1" role="group" aria-label="Filter by video availability">
                {[
                  { label: "All", val: null },
                  { label: "Has video", val: true },
                  { label: "No video", val: false },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={filters.hasVideo === opt.val}
                    onClick={() => updateFilters({ hasVideo: opt.val })}
                    className={`min-h-7 px-2 py-0.5 rounded-[var(--radius-sm)] border text-[0.75rem] transition-colors cursor-pointer ${
                      filters.hasVideo === opt.val
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                QA Status
              </p>
              <div className="flex gap-1" role="group" aria-label="Filter by QA status">
                {[
                  { label: "All", val: null },
                  { label: "Flagged", val: true },
                  { label: "Clean", val: false },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={filters.hasQaFlags === opt.val}
                    onClick={() => updateFilters({ hasQaFlags: opt.val })}
                    className={`min-h-7 px-2 py-0.5 rounded-[var(--radius-sm)] border text-[0.75rem] transition-colors cursor-pointer ${
                      filters.hasQaFlags === opt.val
                        ? "border-[var(--warning)] bg-[var(--warning)]/15 text-[var(--warning)] font-medium"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active filter summary pills if narrowed */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[0.75rem]">
            <span className="text-[var(--text-3)]">Active:</span>
            {filters.principalInvestigators.map((p) => (
              <Badge key={`pi-${p}`} variant="accent">PI: {p}</Badge>
            ))}
            {filters.materials.map((m) => (
              <Badge key={`mat-${m}`} variant="accent">Material: {m}</Badge>
            ))}
            {filters.geometries.map((g) => (
              <Badge key={`geom-${g}`} variant="accent">Geometry: {g}</Badge>
            ))}
            {filters.flowConfigurations.map((f) => (
              <Badge key={`flow-${f}`} variant="accent">Flow: {f}</Badge>
            ))}
            {(filters.o2InitialPct.min !== undefined || filters.o2InitialPct.max !== undefined) && (
              <Badge variant="accent">
                O₂: {filters.o2InitialPct.min ?? "min"}–{filters.o2InitialPct.max ?? "max"}%
              </Badge>
            )}
            {(filters.airflowCmS.min !== undefined || filters.airflowCmS.max !== undefined) && (
              <Badge variant="accent">
                Airflow: {filters.airflowCmS.min ?? "min"}–{filters.airflowCmS.max ?? "max"} cm/s
              </Badge>
            )}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
