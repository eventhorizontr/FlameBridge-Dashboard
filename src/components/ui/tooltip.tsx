"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "./cn";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/** Accessible hover/focus tooltip anchored over `--surface-3`. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  if (!content) return <>{children}</>;

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? tooltipId : undefined} className="inline-flex items-center">
        {children}
      </span>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 w-max max-w-64",
            "rounded-[var(--radius-sm)] bg-[var(--surface-3)] border border-[var(--line-strong)]",
            "px-2.5 py-1.5 text-[0.75rem] leading-snug text-[var(--text-1)] shadow-lg",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
