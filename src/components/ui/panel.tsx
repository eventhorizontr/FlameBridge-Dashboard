"use client";

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";
import { useHighlightPulse } from "./highlight";

export type PanelSurface = "surface-1" | "surface-2" | "surface-3" | "glass";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  surface?: PanelSurface;
  highlightTarget?: string;
  padded?: boolean;
}

const SURFACE_CLASSES: Record<PanelSurface, string> = {
  "surface-1": "bg-[var(--surface-1)] border border-[var(--line)]",
  "surface-2": "bg-[var(--surface-2)] border border-[var(--line)]",
  "surface-3": "bg-[var(--surface-3)] border border-[var(--line-strong)]",
  glass:
    "bg-[rgb(11_16_25/0.72)] backdrop-blur-md border border-[var(--line-strong)]",
};

/**
 * Orbital Instrument panel primitive: elevation by luminance + hairline border, never heavy
 * drop shadows (glass only for overlay panels per DESIGN_SYSTEM.md §4).
 */
export function Panel({
  surface = "surface-1",
  highlightTarget,
  padded = false,
  className,
  children,
  ...props
}: PanelProps) {
  const { highlightProps, highlightClassName } = useHighlightPulse(highlightTarget);

  return (
    <section
      {...highlightProps}
      {...props}
      className={cn(
        "rounded-[var(--radius-md)] text-[var(--text-1)]",
        SURFACE_CLASSES[surface],
        padded && "p-4 sm:p-5",
        highlightClassName,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  eyebrow,
  title,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 w-full", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)] leading-tight">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[0.9375rem] font-medium text-[var(--text-1)] tracking-[-0.01em] truncate">
          {title}
        </h2>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function PanelBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
}
