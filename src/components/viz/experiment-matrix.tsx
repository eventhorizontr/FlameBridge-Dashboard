"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Film } from "lucide-react";
import { useRef, useState } from "react";

import {
  Button,
  EmptyState,
  formatMetricValue,
  formatNullWithReason,
  Panel,
  PanelBody,
  QABadge,
  Tooltip,
} from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

import {
  characteristicSizeMm,
  type ExperimentSortKey,
  representativeAirflow,
  sortExperiments,
} from "./dataset-queries";
import { FlowSparkline } from "./flow-sparkline";

const ROW_HEIGHT = 48;
const VIEWPORT_HEIGHT = 640;
const OVERSCAN = 6;

const COLUMNS: Array<{ key: ExperimentSortKey; label: string; align?: "right" }> = [
  { key: "testId", label: "Run" },
  { key: "pi", label: "PI" },
  { key: "material", label: "Fuel" },
  { key: "size", label: "Size mm", align: "right" },
  { key: "o2InitialPct", label: "O₂ %", align: "right" },
  { key: "airflow", label: "Airflow" },
  { key: "videos", label: "Video", align: "right" },
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
  const virtualize = true;
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

  return (
    <Panel surface="surface-1">
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
            className={`overflow-x-auto ${virtualize ? "max-h-[640px] overflow-y-auto" : ""}`}
          >
            <table className="w-full min-w-[600px] border-collapse text-left text-[0.8125rem]">
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
                        className={`py-2.5 px-2 whitespace-nowrap ${
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

                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {topPad > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={COLUMNS.length + 1} style={{ height: `${topPad}px`, padding: 0 }} />
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
                      <td className="py-1.5 px-2 whitespace-nowrap">
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
                      <td className="py-1.5 px-2 text-[var(--text-2)] whitespace-nowrap">
                        {exp.principalInvestigator}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap" title={exp.fuel.raw}>
                        {exp.fuel.material ? (
                          <span className="text-[var(--text-1)]">{exp.fuel.material}</span>
                        ) : (
                          <Tooltip content={formatNullWithReason("Material could not be parsed cleanly from raw fuel cell")}>
                            <span className="text-[var(--text-3)]">—</span>
                          </Tooltip>
                        )}
                        <span className="block text-[0.6875rem] text-[var(--text-3)]">{exp.fuel.geometry ?? "—"}</span>
                      </td>
                      <td className="py-1.5 px-2 num text-right text-[var(--text-2)] whitespace-nowrap">
                        {sizeFmt.missing ? (
                          <Tooltip content={formatNullWithReason("No thickness/diameter recorded for this geometry")}>
                            <span className="text-[var(--text-3)] cursor-help">—</span>
                          </Tooltip>
                        ) : (
                          sizeFmt.text
                        )}
                      </td>
                      <td className="py-1.5 px-2 num text-right whitespace-nowrap">
                        {o2Fmt.missing ? (
                          <Tooltip content={formatNullWithReason("Initial O₂ is null (missing or flagged implausible)")}>
                            <span className="text-[var(--text-3)] cursor-help">—</span>
                          </Tooltip>
                        ) : (
                          <span className="text-[var(--text-1)] font-medium">{o2Fmt.text}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-2" title={exp.conditions.airflowSetpointsCmS.length ? `Set-points ${exp.conditions.airflowSetpointsCmS.join(" → ")} cm/s (median shown)` : "No airflow set-points recorded"}>
                          {exp.conditions.airflowSetpointsCmS.length > 1 && <FlowSparkline setpoints={exp.conditions.airflowSetpointsCmS} width={48} height={18} />}
                          <span className="num text-[var(--text-1)]">
                            {representativeAirflow(exp) != null ? `${representativeAirflow(exp)} cm/s` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 num text-right whitespace-nowrap">
                        <span className="inline-flex items-center justify-end gap-1 text-[var(--text-2)]">
                          <Film className="size-3 text-[var(--text-3)]" aria-hidden="true" />
                          {exp.videos.length}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <QABadge flags={exp.qa.flags} parse={exp.qa.parse} />
                      </td>

                    </tr>
                  );
                })}
                {bottomPad > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={COLUMNS.length + 1} style={{ height: `${bottomPad}px`, padding: 0 }} />
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
