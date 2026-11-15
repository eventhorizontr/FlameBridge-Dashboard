"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

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
  /** Prefix for tab/panel ids so a panel can point at its tab. */
  idBase: string;
  className?: string;
}

export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
export const tabPanelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

/**
 * WAI-ARIA tabs with roving focus (← → Home End). Pair each panel with `role="tabpanel"`,
 * `id={tabPanelId(...)}` and `aria-labelledby={tabId(...)}`.
 */
export function Tabs<T extends string>({ value, items, onChange, ariaLabel, idBase, className }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex max-w-full items-center gap-1.5 overflow-x-auto [scrollbar-width:none]", className)}>
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
              "flex min-h-9 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border px-3.5 text-[0.8125rem] font-medium transition-colors cursor-pointer",
              selected
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text-1)]",
            )}
          >
            {item.icon && (
              <span className="flex [&>svg]:size-4" aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
