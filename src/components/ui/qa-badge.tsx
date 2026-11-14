"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "./cn";
import { summarizeQaFlags } from "./format";

export interface QABadgeProps {
  flags: readonly string[];
  parse?: string;
  /** When false (default), returns null when there are zero flags so dense tables stay clean. */
  showClean?: boolean;
  className?: string;
}

/**
 * Quality-assurance badge (DESIGN_SYSTEM.md §6): amber outline + flag count when flags exist;
 * popover lists every QA flag verbatim alongside parser generation.
 */
export function QABadge({ flags, parse, showClean = false, className }: QABadgeProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();
  const summary = summarizeQaFlags(flags, parse);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (summary.isClean) {
    if (!showClean) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--good)]/40 bg-[var(--good)]/10 px-2 py-0.5 text-[0.75rem] text-[var(--good)]",
          className,
        )}
      >
        <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
        <span>QA clean</span>
      </span>
    );
  }

  return (
    <span ref={rootRef} className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "num inline-flex items-center gap-1 min-h-6 px-2 py-0.5 rounded-full cursor-pointer",
          "border border-[var(--warning)]/60 bg-[var(--warning)]/10 text-[0.75rem] font-medium text-[var(--warning)]",
          "hover:bg-[var(--warning)]/20 transition-colors duration-[var(--dur-1)]",
        )}
      >
        <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
        <span>{summary.label}</span>
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Data quality assurance flags"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-0 top-full mt-1.5 z-50 w-80 max-w-[90vw] rounded-[var(--radius-md)]",
            "bg-[var(--surface-3)] border border-[var(--warning)]/50 p-3 text-left shadow-xl",
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--warning)]">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Verbatim QA Flags ({summary.count})</span>
            </div>
            <button
              type="button"
              aria-label="Close QA flags"
              onClick={() => setOpen(false)}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <ul className="space-y-1.5 text-[0.8125rem] text-[var(--text-1)]">
            {summary.flags.map((flag, idx) => (
              <li
                key={`${idx}-${flag}`}
                className="rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line)] px-2.5 py-1.5 leading-snug"
              >
                {flag}
              </li>
            ))}
          </ul>
          <p className="num text-[0.6875rem] text-[var(--text-3)] mt-2">{summary.parseLabel}</p>
        </div>
      )}
    </span>
  );
}
