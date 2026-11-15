"use client";

import { ArrowUpRight } from "lucide-react";

import { useDashboardShallow } from "@/lib/store";

import { getSuggestedPrompts } from "./citation-parser";

export function SuggestedPrompts({
  onSelect,
  disabled = false,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  const { route, mode } = useDashboardShallow((s) => ({ route: s.route, mode: s.mode }));
  const prompts = getSuggestedPrompts(route, mode);

  return (
    <div className="space-y-2">
      <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
        Suggested for this view ({mode === "learn" ? "Guided" : "Expert"})
      </p>
      <div className="flex flex-col gap-1.5">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="group w-full text-left flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] hover:border-[var(--accent)]/50 px-3 py-2 text-[0.8125rem] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer disabled:opacity-45"
          >
            <span className="leading-snug">{prompt}</span>
            <ArrowUpRight
              className="size-3.5 shrink-0 mt-0.5 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
