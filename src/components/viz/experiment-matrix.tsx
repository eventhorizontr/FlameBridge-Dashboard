"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Film,
  GitCompareArrows,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import {
  Badge,
  Button,
  EmptyState,
  formatMetricValue,
  formatNullWithReason,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  QABadge,
  Tooltip,
} from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

import {
  characteristicSizeMm,
  type ExperimentSortKey,
  sortExperiments,
} from "./dataset-queries";
import { FlowSparkline } from "./flow-sparkline";

const ROW_HEIGHT = 48;
const VIEWPORT_HEIGHT = 480;
const OVERSCAN = 6;

const COLUMNS: Array<{ key: ExperimentSortKey; label: string; align?: "right" }> = [
  { key: "testId", label: "Test" },
  { key: "pi", label: "PI" },
  { key: "material", label: "Fuel" },
  { key: "geometry", label: "Geometry" },
  { key: "size", label: "Size (mm)", align: "right" },
  { key: "o2InitialPct", label: "O₂ Init (%)", align: "right" },
  { key: "airflow", label: "Flow Set-points" },
  { key: "videos", label: "Videos", align: "right" },
  { key: "qa", label: "QA" },
];

export interface ExperimentMatrixProps {
  experiments: readonly Experiment[];
}

export function ExperimentMatrix({ experiments }: ExperimentMatrixProps) {
  const mode = useDashboard((s) => s.mode);
  const selection = useDashboard((s) => s.selection);
  const dispatch = useDispatch();

  const [sortKey, setSortKey] = useState<ExperimentSortKey>("testId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [scrollTop, setScrollTop] = useState(0);
  const [virtualize, setVirtualize] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = sortExperiments(experiments, sortKey, sortDir);

  const toggleSort = (key: ExperimentSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setScrollTop(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  const toggleRowSelection = (id: string) => {
    const next = selection.includes(id)
      ? selection.filter((v) => v !== id)
      : [...selection, id];
    dispatch({ type: "selectExperiments", ids: next });
  };

  const startIdx = virtualize
    ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    : 0;
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx = virtualize ? Math.min(sorted.length, startIdx + visibleCount) : sorted.length;

  const visibleRows = sorted.slice(startIdx, endIdx);
  const topPad = virtualize ? startIdx * ROW_HEIGHT : 0;
  const bottomPad = virtualize ? Math.max(0, (sorted.length - endIdx) * ROW_HEIGHT) : 0;

  const canCompare = selection.length >= 2 && selection.length <= 4;

  return (
    <Panel surface="surface-1">
      <PanelHeader className="flex-wrap">
        <PanelTitle
          eyebrow="Experiment Matrix · Sortable & Windowed"
          title={`${sorted.length} Measured Test Runs`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {selection.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-1">
                  <span className="num text-[0.75rem] font-medium text-[var(--accent)]">
                    {selection.length} selected
                  </span>
                  {canCompare ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => dispatch({ type: "compare", ids: selection })}
                    >
                      <GitCompareArrows className="size-3.5" aria-hidden="true" />
                      <span>Compare ({selection.length})</span>
                    </Button>
                  ) : (
                    <span className="text-[0.6875rem] text-[var(--text-2)]">
                      Select 2–4 runs to compare
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "selectExperiments", ids: [] })}
                    aria-label="Clear selected runs"
                    className="p-0.5 text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setVirtualize((v) => !v)}
              >
                <span>{virtualize ? "Expand full table" : "Windowed scroll"}</span>
              </Button>
            </div>
          }
        />
      </PanelHeader>

      <PanelBody className="p-0 sm:p-0">
        {sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              eyebrow="Zero Matching Runs"
              title="No runs match the active filters"
              description="Broaden your O₂, airflow, or fuel facets to inspect PSI-25 test rows."
              actions={
                <Button size="sm" variant="primary" onClick={() => dispatch({ type: "resetFilters" })}>
                  Reset all filters
                </Button>
              }
            />
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={(e) => {
              if (virtualize) setScrollTop(e.currentTarget.scrollTop);
            }}
            className={`overflow-x-auto ${virtualize ? "max-h-[480px] overflow-y-auto" : ""}`}
          >
            <table className="w-full min-w-[820px] border-collapse text-left text-[0.8125rem]">
              <thead className="sticky top-0 z-10 bg-[var(--surface-3)] border-b border-[var(--line-strong)] text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)]">
                <tr>
                  <th className="w-10 py-2.5 pl-4 pr-2">
                    <span className="sr-only">Select</span>
                  </th>
                  {COLUMNS.map((col) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        aria-sort={
                          active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                        }
                        className={`py-2.5 px-2.5 whitespace-nowrap ${
                          col.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={`inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text-1)] ${
                            col.align === "right" ? "flex-row-reverse" : ""
                          } ${active ? "text-[var(--accent)] font-semibold" : ""}`}
                        >
                          <span>{col.label}</span>
                          {active ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="size-3" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="size-3" aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-50" aria-hidden="true" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                  <th className="py-2.5 pl-2 pr-4 text-right">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {topPad > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={COLUMNS.length + 2} style={{ height: `${topPad}px`, padding: 0 }} />
                  </tr>
                )}
                {visibleRows.map((exp) => {
                  const isSelected = selection.includes(exp.id);
                  const sizeMm = characteristicSizeMm(exp.fuel);
                  const sizeFmt = formatMetricValue(sizeMm, { mode, precision: 2 });
                  const o2Fmt = formatMetricValue(exp.conditions.o2InitialPct, {
                    mode,
                    precision: 1,
                  });

                  return (
                    <tr
                      key={exp.id}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className={`transition-colors ${
                        isSelected ? "bg-[var(--accent-soft)]/50" : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <td className="py-1.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(exp.id)}
                          aria-label={`Select run ${exp.testId} for comparison`}
                          className="size-4 accent-[var(--accent)] cursor-pointer rounded"
                        />
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "openExperiment", id: exp.id })}
                          className="text-left group cursor-pointer"
                        >
                          <span className="num font-semibold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
                            {exp.testId}
                          </span>
                          <span className="block num text-[0.6875rem] text-[var(--text-3)]">
                            {exp.sampleId}
                          </span>
                        </button>
                      </td>
                      <td className="py-1.5 px-2.5 text-[var(--text-2)] whitespace-nowrap">
                        {exp.principalInvestigator}
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        {exp.fuel.material ? (
                          <Badge>{exp.fuel.material}</Badge>
                        ) : (
                          <Tooltip content={formatNullWithReason("Material could not be parsed cleanly from raw fuel cell")}>
                            <span className="text-[var(--text-3)]">—</span>
                          </Tooltip>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-[var(--text-2)] whitespace-nowrap capitalize">
                        {exp.fuel.geometry ?? "—"}
                      </td>
                      <td className="py-1.5 px-2.5 num text-right text-[var(--text-2)] whitespace-nowrap">
                        {sizeFmt.missing ? (
                          <Tooltip content={formatNullWithReason("No thickness/diameter recorded for this geometry")}>
                            <span className="text-[var(--text-3)] cursor-help">—</span>
                          </Tooltip>
                        ) : (
                          sizeFmt.text
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 num text-right whitespace-nowrap">
                        {o2Fmt.missing ? (
                          <Tooltip content={formatNullWithReason("Initial O₂ is null (missing or flagged implausible)")}>
                            <span className="text-[var(--text-3)] cursor-help">—</span>
                          </Tooltip>
                        ) : (
                          <span className="text-[var(--text-1)] font-medium">{o2Fmt.text}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FlowSparkline setpoints={exp.conditions.airflowSetpointsCmS} />
                          <span className="num text-[0.6875rem] text-[var(--text-3)]">
                            {exp.conditions.airflowSetpointsCmS.length > 0
                              ? `${exp.conditions.airflowSetpointsCmS[0]}… cm/s`
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 num text-right whitespace-nowrap">
                        <span className="inline-flex items-center justify-end gap-1 text-[var(--text-2)]">
                          <Film className="size-3 text-[var(--text-3)]" aria-hidden="true" />
                          {exp.videos.length}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <QABadge flags={exp.qa.flags} parse={exp.qa.parse} />
                      </td>
                      <td className="py-1.5 pl-2 pr-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Open run ${exp.testId}`}
                          onClick={() => dispatch({ type: "openExperiment", id: exp.id })}
                        >
                          <span className="hidden sm:inline">Inspect</span>
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {bottomPad > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={COLUMNS.length + 2} style={{ height: `${bottomPad}px`, padding: 0 }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
