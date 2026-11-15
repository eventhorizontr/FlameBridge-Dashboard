"use client";

import { RotateCcw, Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn, useHighlightPulse } from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";
import type { ExperimentFilters } from "@/types/dashboard";
import type { Experiment, FlowConfiguration, FuelGeometry, FuelMaterial } from "@/types/experiment";

import { facetCounts, parameterRanges } from "./dataset-queries";

const MATERIALS: FuelMaterial[] = ["PMMA", "SIBAL", "Nomex", "Japan wax"];
const GEOMETRIES: FuelGeometry[] = ["film", "slab", "rod", "spherical-section", "fabric", "candle"];
const FLOW_CONFIGS: FlowConfiguration[] = ["opposed", "concurrent"];

function toggle<T extends string>(current: readonly T[], item: T): T[] {
  return current.includes(item) ? current.filter((v) => v !== item) : [...current, item];
}

function parseOptionalNum(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function hasActiveFilters(filters: ExperimentFilters): boolean {
  return (
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
    filters.text.trim().length > 0
  );
}

/** Text search for the Runs toolbar. */
export function RunSearch({ className }: { className?: string }) {
  const text = useDashboard((s) => s.filters.text);
  const dispatch = useDispatch();
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-3)]" aria-hidden="true" />
      <input
        type="search"
        value={text}
        onChange={(e) => dispatch({ type: "setFilters", filters: { text: e.target.value } })}
        placeholder="Search run, sample, fuel…"
        aria-label="Filter runs by text"
        className="min-h-9 w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-9 pr-8 text-[0.8125rem] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none"
      />
      {text && (
        <button
          type="button"
          onClick={() => dispatch({ type: "setFilters", filters: { text: "" } })}
          aria-label="Clear search text"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function Group({ title, children, className, ...rest }: { title: string; children: ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <fieldset className={cn("space-y-1 border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0", className)} {...rest}>
      <legend className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-3)]">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-7 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-1 text-[0.8125rem] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-3.5 accent-[var(--accent)]" />
      <span className={cn("flex-1 truncate", checked && "text-[var(--text-1)]")}>{label}</span>
      <span className="num rounded-full bg-[var(--surface-3)] px-1.5 text-[0.6875rem] text-[var(--text-2)]">{count}</span>
    </label>
  );
}

function Range({
  label,
  unit,
  value,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: { min?: number; max?: number };
  step: number;
  onChange: (next: { min?: number; max?: number }) => void;
}) {
  const input =
    "num min-h-8 w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-2 text-[0.8125rem] text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none";
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" step={step} min={0} placeholder="min" aria-label={`Minimum ${label} ${unit}`} value={value.min ?? ""} onChange={(e) => onChange({ ...value, min: parseOptionalNum(e.target.value) })} className={input} />
      <span className="text-xs text-[var(--text-3)]">–</span>
      <input type="number" step={step} min={0} placeholder="max" aria-label={`Maximum ${label} ${unit}`} value={value.max ?? ""} onChange={(e) => onChange({ ...value, max: parseOptionalNum(e.target.value) })} className={input} />
    </div>
  );
}

function TriState({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: boolean | null;
  options: [string, string, string];
  onChange: (v: boolean | null) => void;
}) {
  const vals: (boolean | null)[] = [null, true, false];
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {vals.map((v, i) => (
        <button
          key={options[i]}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "min-h-7 flex-1 rounded-[var(--radius-sm)] border px-2 text-[0.75rem] cursor-pointer",
            value === v
              ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
              : "border-[var(--line)] text-[var(--text-2)] hover:text-[var(--text-1)]",
          )}
        >
          {options[i]}
        </button>
      ))}
    </div>
  );
}

export interface FacetBarProps {
  experiments: readonly Experiment[];
  className?: string;
}

/** Runs filters as a sidebar: every facet with its count over the full dataset. */
export function FacetBar({ experiments, className }: FacetBarProps) {
  const filters = useDashboard((s) => s.filters);
  const dispatch = useDispatch();
  const materialPulse = useHighlightPulse("filter-material");
  const counts = facetCounts(experiments);
  const ranges = parameterRanges(experiments);
  const piNames = Object.keys(counts.principalInvestigators).sort((a, b) => a.localeCompare(b, "en"));
  const update = (patch: Partial<ExperimentFilters>) => dispatch({ type: "setFilters", filters: patch });

  return (
    <aside aria-label="Filters" className={cn("space-y-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] p-3.5", className)}>
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={() => dispatch({ type: "resetFilters" })}
          className="inline-flex min-h-7 items-center gap-1.5 text-[0.75rem] text-[var(--accent)] hover:underline cursor-pointer"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset filters
        </button>
      )}

      <Group title="Principal investigator">
        {piNames.map((pi) => (
          <Check
            key={pi}
            label={pi}
            count={counts.principalInvestigators[pi] ?? 0}
            checked={filters.principalInvestigators.includes(pi)}
            onChange={() => update({ principalInvestigators: toggle(filters.principalInvestigators, pi) })}
          />
        ))}
      </Group>

      <Group title="Material" {...materialPulse.highlightProps} className={materialPulse.highlightClassName}>
        {MATERIALS.map((m) => (
          <Check key={m} label={m} count={counts.materials[m] ?? 0} checked={filters.materials.includes(m)} onChange={() => update({ materials: toggle(filters.materials, m) })} />
        ))}
      </Group>

      <Group title="Geometry">
        {GEOMETRIES.map((g) => (
          <Check key={g} label={g} count={counts.geometries[g] ?? 0} checked={filters.geometries.includes(g)} onChange={() => update({ geometries: toggle(filters.geometries, g) })} />
        ))}
      </Group>

      <Group title="Flow direction">
        {FLOW_CONFIGS.map((f) => (
          <Check
            key={f}
            label={f[0].toUpperCase() + f.slice(1)}
            count={counts.flowConfigurations[f] ?? 0}
            checked={filters.flowConfigurations.includes(f)}
            onChange={() => update({ flowConfigurations: toggle(filters.flowConfigurations, f) })}
          />
        ))}
      </Group>

      <Group title={`Initial O₂ % ${ranges.o2InitialPct ? `(${ranges.o2InitialPct.min.toFixed(1)}–${ranges.o2InitialPct.max.toFixed(1)})` : ""}`}>
        <Range label="initial O2" unit="percent" step={0.5} value={filters.o2InitialPct} onChange={(o2InitialPct) => update({ o2InitialPct })} />
      </Group>

      <Group title={`Airflow cm/s ${ranges.airflowCmS ? `(${ranges.airflowCmS.min}–${ranges.airflowCmS.max})` : ""}`}>
        <Range label="airflow" unit="cm/s" step={1} value={filters.airflowCmS} onChange={(airflowCmS) => update({ airflowCmS })} />
      </Group>

      <Group title="ISS video">
        <TriState label="Filter by video availability" value={filters.hasVideo} options={["All", "Has video", "None"]} onChange={(hasVideo) => update({ hasVideo })} />
      </Group>

      <Group title="QA">
        <TriState label="Filter by QA status" value={filters.hasQaFlags} options={["All", "Flagged", "Clean"]} onChange={(hasQaFlags) => update({ hasQaFlags })} />
      </Group>
    </aside>
  );
}
