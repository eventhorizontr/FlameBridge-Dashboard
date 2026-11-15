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

const GLASS = "backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_var(--glow-line)]";

const SURFACE_CLASSES: Record<PanelSurface, string> = {
  "surface-1": `bg-[var(--surface-1)] border border-[var(--line)] ${GLASS}`,
  "surface-2": `bg-[var(--surface-2)] border border-[var(--line)] ${GLASS}`,
  "surface-3": `bg-[var(--surface-3)] border border-[var(--line-strong)] ${GLASS}`,
  glass: `bg-[var(--surface-1)] border border-[var(--line-strong)] ${GLASS} shadow-[var(--shadow-float)]`,
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
        "rounded-[var(--radius-lg)] text-[var(--text-1)]",
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
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 border-b border-[var(--line)]",
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
    <div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2 w-full min-w-0", className)}>
      <div className="min-w-0 flex-1 basis-40">
        {eyebrow && (
          <div className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)] leading-tight">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[0.9375rem] font-medium text-[var(--text-1)] tracking-[-0.01em] truncate">
          {title}
        </h2>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full *:min-w-0 *:max-w-full">{actions}</div>}
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
