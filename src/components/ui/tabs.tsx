"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "./cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  hint?: string;
}

export interface TabsProps<T extends string> {
  value: T;
  items: readonly TabItem<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Prefix for tab/panel ids so panels can reference their tab (`${idBase}-tab-${value}`). */
  idBase: string;
  className?: string;
}

export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
export const tabPanelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

/**
 * Glass tab bar (ADR-020): WAI-ARIA tabs pattern with roving focus (← → Home End) and a
 * motion underline. Pair each panel with `role="tabpanel"` + `aria-labelledby={tabId(...)}`.
 */
export function Tabs<T extends string>({ value, items, onChange, ariaLabel, idBase, className }: TabsProps<T>) {
  const indicator = useId();
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = items.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--surface-1)] p-1 backdrop-blur-xl [scrollbar-width:none]",
        className,
      )}
    >
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={tabId(idBase, item.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId(idBase, item.value)}
            tabIndex={selected ? 0 : -1}
            title={item.hint}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative flex min-h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-medium transition-colors cursor-pointer",
              selected ? "text-[var(--text-1)]" : "text-[var(--text-2)] hover:text-[var(--text-1)]",
            )}
          >
            {selected && (
              <motion.span
                layoutId={indicator}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[var(--surface-3)] shadow-[inset_0_1px_0_var(--glow-line)]"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {item.icon && <span className="relative flex [&>svg]:size-4" aria-hidden="true">{item.icon}</span>}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
