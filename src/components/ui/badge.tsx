import { AlertOctagon, AlertTriangle, CheckCircle2, Flame } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export type BadgeVariant = "neutral" | "accent" | "good" | "warning" | "serious" | "critical";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--line)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/35",
  good: "bg-[var(--good)]/12 text-[var(--good)] border-[var(--good)]/40",
  warning: "bg-[var(--warning)]/12 text-[var(--warning)] border-[var(--warning)]/45",
  serious: "bg-[var(--serious)]/12 text-[var(--serious)] border-[var(--serious)]/45",
  critical: "bg-[var(--critical)]/15 text-[var(--critical)] border-[var(--critical)]/45",
};

function defaultStatusIcon(variant: BadgeVariant): ReactNode {
  switch (variant) {
    case "good":
      return <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />;
    case "warning":
      return <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />;
    case "serious":
      return <Flame className="size-3 shrink-0" aria-hidden="true" />;
    case "critical":
      return <AlertOctagon className="size-3 shrink-0" aria-hidden="true" />;
    default:
      return null;
  }
}

/**
 * Compact metadata or status pill. Status variants (`good`, `warning`, `serious`, `critical`)
 * always display an icon alongside the label (DESIGN_SYSTEM.md §2).
 */
export function Badge({
  variant = "neutral",
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  const renderedIcon = icon ?? defaultStatusIcon(variant);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.75rem] font-medium leading-tight whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {renderedIcon}
      <span>{children}</span>
    </span>
  );
}
