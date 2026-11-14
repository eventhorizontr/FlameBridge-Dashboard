"use client";

import { Bot, History, Undo2, User } from "lucide-react";

import { Badge, Button, cn } from "@/components/ui";
import { dashboardStore, useDashboard } from "@/lib/store";

export function ActionTimeline() {
  const log = useDashboard((s) => s.log);
  const recent = [...log].reverse();

  if (recent.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] p-4 text-[0.8125rem] text-[var(--text-2)]">
        <div className="flex items-center gap-2 text-[var(--text-1)] font-medium mb-1">
          <History className="size-4 text-[var(--accent)]" aria-hidden="true" />
          <span>No actions recorded yet</span>
        </div>
        <p className="text-[var(--text-3)] leading-relaxed">
          Every filter, navigation, comparison, and parameter update from you or the AI appears here
          with exact state-snapshot undo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          Store Action History ({recent.length})
        </span>
        {dashboardStore.getState().canUndo() && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dashboardStore.getState().undo()}
          >
            <Undo2 className="size-3" aria-hidden="true" />
            <span>Undo latest</span>
          </Button>
        )}
      </div>

      <ol className="space-y-1.5">
        {recent.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              "rounded-[var(--radius-sm)] border px-3 py-2 flex items-start justify-between gap-2.5",
              entry.undone
                ? "border-[var(--line)] bg-[var(--surface-1)]/40 opacity-55"
                : "border-[var(--line)] bg-[var(--surface-1)]",
            )}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant={entry.source === "ai" ? "accent" : "neutral"}
                  icon={
                    entry.source === "ai" ? (
                      <Bot className="size-2.5" aria-hidden="true" />
                    ) : (
                      <User className="size-2.5" aria-hidden="true" />
                    )
                  }
                >
                  {entry.source === "ai" ? "AI" : "You"}
                </Badge>
                <span className="num text-[0.6875rem] text-[var(--text-3)]">
                  #{entry.seq} · {entry.action.type}
                </span>
                {entry.undone && (
                  <span className="text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)]">
                    Undone
                  </span>
                )}
              </div>
              <p className={cn("text-[0.8125rem] text-[var(--text-1)] leading-snug", entry.undone && "line-through")}>
                {entry.label}
              </p>
            </div>

            {entry.undoable && !entry.undone && (
              <button
                type="button"
                onClick={() => dashboardStore.getState().undoTo(entry.id)}
                title="Revert this action and everything after it"
                className="shrink-0 inline-flex items-center gap-1 min-h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] text-[0.75rem] text-[var(--text-2)] cursor-pointer"
              >
                <Undo2 className="size-3" aria-hidden="true" />
                <span>Undo</span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
