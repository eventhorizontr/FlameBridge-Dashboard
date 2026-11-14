import type { ReactNode } from "react";

import { cn } from "./cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--line)] p-6 sm:p-8",
        "flex flex-col items-start gap-3 max-w-xl",
        className,
      )}
    >
      {icon && (
        <div className="size-10 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
          {icon}
        </div>
      )}
      {eyebrow && (
        <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-[1.125rem] font-medium text-[var(--text-1)] tracking-[-0.01em]">{title}</h2>
      <p className="text-[0.875rem] text-[var(--text-2)] leading-relaxed">{description}</p>
      {actions && <div className="flex flex-wrap items-center gap-2.5 pt-1">{actions}</div>}
    </div>
  );
}
