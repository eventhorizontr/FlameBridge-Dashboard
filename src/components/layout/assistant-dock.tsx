"use client";

import { AssistantPanel } from "@/components/ai";
import { cn, useHighlightPulse } from "@/components/ui";

import { useShellUi } from "./shell-state";

/**
 * Right collapsible AI research assistant dock (glass surface per DESIGN_SYSTEM.md §4).
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
        "border-l border-[var(--line-strong)] bg-[rgb(11_16_25/0.86)] backdrop-blur-md",
        "flex flex-col transition-all duration-[var(--dur-2)] ease-[var(--ease-out)]",
        expanded ? "w-full sm:w-[32rem]" : "w-full sm:w-96",
        highlightClassName,
      )}
    >
      <AssistantPanel />
    </aside>
  );
}
