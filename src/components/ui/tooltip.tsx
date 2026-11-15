"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "./cn";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** "right" for items on the left edge of the screen (e.g. the navigation rail). */
  side?: "top" | "bottom" | "right";
  className?: string;
}

const SIDE_CLASSES: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "left-1/2 -translate-x-1/2 bottom-full mb-1.5",
  bottom: "left-1/2 -translate-x-1/2 top-full mt-1.5",
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
};

/**
 * Accessible hover/focus tooltip anchored over `--surface-3`. Opens on hover and on keyboard
 * focus (`:focus-visible`) only — a mouse click focuses the control but must not leave the
 * tooltip stuck open. Clicking or pressing Escape closes it.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  if (!content) return <>{children}</>;

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onPointerDown={() => setOpen(false)}
      onFocus={(e) => {
        const target = e.target as HTMLElement;
        if (typeof target.matches === "function" && target.matches(":focus-visible")) setOpen(true);
      }}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <span aria-describedby={open ? tooltipId : undefined} className="inline-flex items-center w-full">
        {children}
      </span>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 w-max max-w-64",
            "rounded-[var(--radius-sm)] bg-[var(--surface-3)] border border-[var(--line-strong)]",
            "px-2.5 py-1.5 text-[0.75rem] leading-snug text-[var(--text-1)] shadow-lg",
            SIDE_CLASSES[side],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
