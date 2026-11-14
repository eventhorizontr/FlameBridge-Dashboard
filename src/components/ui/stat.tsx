"use client";

import { AlertCircle } from "lucide-react";

import { useDashboard } from "@/lib/store";
import type { Evidence } from "@/types/ai";

import { cn } from "./cn";
import { EvidenceChip } from "./evidence-chip";
import { formatMetricValue, formatNullWithReason } from "./format";
import { useHighlightPulse } from "./highlight";
import { Tooltip } from "./tooltip";

export interface StatProps {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  precision?: number;
  nullReason?: string;
  delta?: string;
  evidence?: {
    id: string;
    label: string;
    kind?: Evidence["kind"];
    href?: string;
    detail?: string;
  };
  highlightTarget?: string;
  size?: "md" | "lg";
  className?: string;
}

/**
 * Scientific readout primitive (value + unit + source). Enforces tabular numerals, thin-space
 * unit formatting in Expert mode, and honest "—" rendering when a measurement is missing.
 */
export function Stat({
  label,
  value,
  unit,
  precision,
  nullReason,
  delta,
  evidence,
  highlightTarget,
  size = "md",
  className,
}: StatProps) {
  const mode = useDashboard((s) => s.mode);
  const { highlightProps, highlightClassName } = useHighlightPulse(highlightTarget);
  const formatted = formatMetricValue(value, { unit, mode, precision });

  return (
    <div
      {...highlightProps}
      className={cn(
        "rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--line)] p-3.5 sm:p-4 flex flex-col gap-2",
        highlightClassName,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          {label}
        </span>
        {delta && <span className="num text-[0.75rem] text-[var(--text-2)]">{delta}</span>}
      </div>

      <div className="flex items-baseline gap-2 min-h-8">
        {formatted.missing ? (
          <Tooltip content={formatNullWithReason(nullReason)}>
            <span className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
              <span className={cn("num font-medium", size === "lg" ? "text-[1.75rem]" : "text-[1.375rem]")}>
                —
              </span>
              <AlertCircle className="size-3.5 text-[var(--warning)] shrink-0" aria-hidden="true" />
              <span className="text-[0.75rem] text-[var(--text-3)] truncate max-w-40">
                {formatNullWithReason(nullReason)}
              </span>
            </span>
          </Tooltip>
        ) : (
          <span
            className={cn(
              "num font-medium text-[var(--text-1)] tracking-[-0.02em] leading-none",
              size === "lg" ? "text-[1.75rem] sm:text-[2rem]" : "text-[1.375rem] sm:text-[1.5rem]",
            )}
          >
            {formatted.text}
          </span>
        )}
      </div>

      {evidence && (
        <div className="pt-1">
          <EvidenceChip
            id={evidence.id}
            label={evidence.label}
            kind={evidence.kind}
            href={evidence.href}
            detail={evidence.detail}
          />
        </div>
      )}
    </div>
  );
}
