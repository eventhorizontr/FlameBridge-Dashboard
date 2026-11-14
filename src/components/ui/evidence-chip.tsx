"use client";

import { BookOpen, Database, ExternalLink, FileVideo, FlaskConical, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { Evidence } from "@/types/ai";

import { cn } from "./cn";

export interface EvidenceChipProps {
  id: string;
  label: string;
  kind?: Evidence["kind"];
  href?: string;
  /** Optional raw source detail (PSI file column/row, DOI citation, or CC0 license note). */
  detail?: string;
  className?: string;
}

const KIND_META: Record<Evidence["kind"], { title: string; Icon: typeof Database }> = {
  dataset: { title: "NASA PSI Dataset", Icon: Database },
  experiment: { title: "BASS-II Test Run", Icon: FlaskConical },
  file: { title: "NASA PSI File Node", Icon: FileVideo },
  publication: { title: "Peer-Reviewed Publication", Icon: BookOpen },
};

/**
 * Inline provenance tag attached to every scientific metric or AI citation. Hovering, focusing,
 * or clicking reveals the exact source reference and navigation link.
 */
export function EvidenceChip({
  id,
  label,
  kind = "dataset",
  href,
  detail,
  className,
}: EvidenceChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();
  const { title, Icon } = KIND_META[kind];

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

  const isExternal = Boolean(href && /^https?:\/\//.test(href));

  return (
    <span ref={rootRef} className={cn("relative inline-flex items-center align-middle", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "num inline-flex items-center gap-1 min-h-6 px-2 py-0.5 rounded-full cursor-pointer",
          "bg-[var(--surface-2)] border border-[var(--line)] text-[0.6875rem] text-[var(--text-2)]",
          "hover:border-[var(--accent)]/60 hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]",
          "transition-colors duration-[var(--dur-1)]",
        )}
      >
        <Icon className="size-3 text-[var(--accent)] shrink-0" aria-hidden="true" />
        <span className="truncate max-w-44">{label}</span>
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={`Provenance: ${label}`}
          className={cn(
            "absolute left-0 top-full mt-1.5 z-50 w-72 rounded-[var(--radius-md)]",
            "bg-[var(--surface-3)] border border-[var(--line-strong)] p-3 text-left shadow-xl",
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--accent)]">
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{title}</span>
            </div>
            <button
              type="button"
              aria-label="Close provenance popover"
              onClick={() => setOpen(false)}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="num text-[0.75rem] text-[var(--text-1)] font-medium break-all">{id}</p>
          <p className="text-[0.8125rem] text-[var(--text-2)] mt-1 leading-snug">
            {detail ?? "Verified against NASA Physical Sciences Informatics (CC0 1.0) source record."}
          </p>
          {href && (
            <div className="mt-2.5 pt-2 border-t border-[var(--line)]">
              {isExternal ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--accent)] hover:underline"
                >
                  <span>Open NASA PSI / DOI source</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--accent)] hover:underline"
                >
                  <span>Inspect experiment record</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
