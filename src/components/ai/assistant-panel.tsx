"use client";

import { History, Maximize2, Minimize2, Send, Square, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { shellUiStore, useShellUi } from "@/components/layout/shell-state";
import { cn, IconButton, Kbd } from "@/components/ui";
import { useAssistant } from "@/lib/ai/client/use-assistant";
import { useDashboard } from "@/lib/store";

import { ActionTimeline } from "./action-timeline";
import { AssistantMessageCard } from "./assistant-message-card";
import { ProviderSwitch } from "./provider-switch";
import { SuggestedPrompts } from "./suggested-prompts";

export function AssistantPanel() {
  const {
    messages,
    busy,
    providers,
    send,
    stop,
    clear,
    undoTurn,
    undoStep,
    setProvider,
  } = useAssistant();
  const expanded = useShellUi((s) => s.assistantExpanded);
  const logCount = useDashboard((s) => s.log.length);

  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"chat" | "timeline">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastContent]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || busy) return;
    setDraft("");
    setTab("chat");
    void send(trimmed);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--line)] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/flamebridge-mark-128.png" alt="" className="size-5 shrink-0" />
            <h2 className="text-[0.875rem] font-medium text-[var(--text-1)] truncate">
              Research Assistant
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              label={tab === "timeline" ? "Back to chat" : "Show store action timeline"}
              size="sm"
              variant="ghost"
              active={tab === "timeline"}
              badgeCount={tab === "chat" ? logCount : undefined}
              onClick={() => setTab((t) => (t === "chat" ? "timeline" : "chat"))}
            >
              <History className="size-3.5" />
            </IconButton>

            <IconButton
              label={expanded ? "Restore panel width" : "Expand assistant panel"}
              size="sm"
              variant="ghost"
              onClick={() => shellUiStore.getState().setAssistantExpanded(!expanded)}
              className="hidden sm:inline-flex"
            >
              {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </IconButton>

            {messages.length > 0 && (
              <IconButton
                label="Clear conversation"
                size="sm"
                variant="ghost"
                onClick={() => clear()}
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            )}

            <IconButton
              label="Close AI assistant dock"
              size="sm"
              variant="ghost"
              onClick={() => shellUiStore.getState().setAssistantOpen(false)}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <ProviderSwitch />
          <span className="num text-[0.6875rem] text-[var(--text-3)]">
            Ground truth · Undoable
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "timeline" ? (
          <ActionTimeline />
        ) : messages.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] p-3.5 space-y-1.5">
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--accent)]">
                Zero-Fabrication Agent
              </p>
              <p className="text-[0.8125rem] text-[var(--text-2)] leading-relaxed">
                Ask about PSI-25 test conditions, QA caveats, or microgravity flame physics. I cite
                NASA evidence chips and drive the dashboard through undoable store actions.
              </p>
            </div>
            <SuggestedPrompts onSelect={(prompt) => void send(prompt)} disabled={busy} />
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <AssistantMessageCard
                key={message.id}
                message={message}
                availableProviders={providers?.providers ?? []}
                onUndoTurn={undoTurn}
                onUndoStep={undoStep}
                onSwitchProvider={(id) => setProvider(id)}
              />
            ))}
            {!busy && (
              <div className="pt-2">
                <SuggestedPrompts onSelect={(prompt) => void send(prompt)} disabled={busy} />
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--line)] p-3 bg-[var(--surface-1)]/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--surface-2)] focus-within:border-[var(--accent)] transition-colors p-2 space-y-2"
        >
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about PSI-25 runs, or say “Filter to PMMA rods below 18% O₂”…"
            className="w-full resize-none bg-transparent text-[0.875rem] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none leading-snug"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.6875rem] text-[var(--text-3)] flex items-center gap-1.5">
              <Kbd>Enter</Kbd> send · <Kbd>⌘K</Kbd> commands
            </span>
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                className="inline-flex items-center gap-1.5 min-h-7 px-2.5 rounded-[var(--radius-sm)] bg-[var(--critical)]/15 border border-[var(--critical)]/45 text-[0.75rem] font-medium text-[var(--critical)] hover:bg-[var(--critical)]/25 cursor-pointer"
              >
                <Square className="size-3" aria-hidden="true" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                className={cn(
                  "inline-flex items-center gap-1.5 min-h-7 px-3 rounded-[var(--radius-sm)] text-[0.75rem] font-medium cursor-pointer transition-all",
                  draft.trim()
                    ? "bg-[var(--accent)] text-[var(--bg)] hover:brightness-110"
                    : "bg-[var(--surface-3)] text-[var(--text-3)] cursor-not-allowed",
                )}
              >
                <Send className="size-3" aria-hidden="true" />
                <span>Send</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
