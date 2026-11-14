"use client";

import { Sparkles, X } from "lucide-react";

import { Badge, cn, IconButton, useHighlightPulse } from "@/components/ui";

import { shellUiStore, useShellUi } from "./shell-state";

/**
 * Right collapsible AI research assistant dock (glass surface per DESIGN_SYSTEM.md §4).
 * Issue #16 replaces the placeholder body with the full streaming <AssistantPanel />.
 */
export function AssistantDock() {
  const open = useShellUi((s) => s.assistantOpen);
  const expanded = useShellUi((s) => s.assistantExpanded);
  const { highlightProps, highlightClassName } = useHighlightPulse("assistant-dock");

  if (!open) return null;

  return (
    <aside
      aria-label="AI Research Assistant"
      {...highlightProps}
      className={cn(
        "fixed xl:sticky top-14 right-0 z-40 h-[calc(100vh-3.5rem)] shrink-0",
        "border-l border-[var(--line-strong)] bg-[rgb(11_16_25/0.82)] backdrop-blur-md",
        "flex flex-col transition-all duration-[var(--dur-2)] ease-[var(--ease-out)]",
        expanded ? "w-full sm:w-[30rem]" : "w-full sm:w-96",
        highlightClassName,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[var(--accent)]" aria-hidden="true" />
          <span className="text-[0.875rem] font-medium text-[var(--text-1)]">
            Research Assistant
          </span>
          <Badge variant="accent">Claude · Gemini</Badge>
        </div>
        <IconButton
          label="Close AI assistant dock"
          size="sm"
          variant="ghost"
          onClick={() => shellUiStore.getState().setAssistantOpen(false)}
        >
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between gap-4 overflow-y-auto">
        <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] p-4 space-y-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
            Assistant Dock Ready
          </p>
          <p className="text-[0.875rem] text-[var(--text-2)] leading-relaxed">
            This docked glass panel connects to <code className="num text-[var(--accent)]">/api/ai</code>{" "}
            through <code className="num text-[var(--text-1)]">useAssistant()</code> to inspect runs,
            cite NASA PSI records, and drive dashboard actions with full undo.
          </p>
        </div>
      </div>
    </aside>
  );
}
