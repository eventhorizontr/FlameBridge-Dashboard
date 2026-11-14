"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";

import { cn } from "./cn";
import { Tooltip } from "./tooltip";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T | null;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  highlightTarget?: string;
  className?: string;
}

/**
 * Animated pill control for Mode Switch (`Expert ⇄ Explore & Learn`) and AI Provider Switch
 * (`Claude ⇄ Gemini`). Uses Motion layout transitions unless `prefers-reduced-motion` is active.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = "md",
  highlightTarget,
  className,
}: SegmentedControlProps<T>) {
  const pillId = useId();
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-highlight={highlightTarget}
      className={cn(
        "inline-flex items-center p-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line)]",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const btn = (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-[4px] whitespace-nowrap select-none",
              "transition-colors duration-[var(--dur-1)] cursor-pointer",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              size === "sm"
                ? "min-h-6 px-2 py-0.5 text-[0.75rem]"
                : "min-h-7 px-2.5 py-1 text-[0.8125rem]",
              selected ? "text-[var(--text-1)] font-medium" : "text-[var(--text-2)] hover:text-[var(--text-1)]",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`seg-pill-${pillId}`}
                transition={
                  reducedMotion
                    ? { duration: 0.001 }
                    : { type: "spring", stiffness: 460, damping: 36, mass: 0.8 }
                }
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-[4px] bg-[var(--surface-3)] border border-[var(--line-strong)]"
              />
            )}
            {option.icon}
            <span>{option.label}</span>
            {option.badge && (
              <span className="num text-[0.6875rem] text-[var(--accent)]">{option.badge}</span>
            )}
          </button>
        );

        if (option.disabled && option.disabledReason) {
          return (
            <Tooltip key={option.value} content={option.disabledReason} side="bottom">
              {btn}
            </Tooltip>
          );
        }
        return btn;
      })}
    </div>
  );
}
