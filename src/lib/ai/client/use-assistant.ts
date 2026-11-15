"use client";

import { useCallback, useEffect } from "react";
import { useStore } from "zustand";
import { playbackStore } from "@/lib/vision/playback";

import { dashboardStore } from "@/lib/store/store";
import { preferencesStore } from "@/lib/store/preferences";
import type { AiChatMessage, AiClientContext, AiProviderId, AiProvidersResponse, AiStreamEvent } from "@/types/ai";

import { assistantStore, mergeEvidence, updateMessage, type AssistantMessage, type AssistantState } from "./assistant-store";

let controller: AbortController | null = null;
let providersRequested = false;
const newId = () => crypto.randomUUID();

function snapshotContext(): AiClientContext {
  const s = dashboardStore.getState();
  const p = playbackStore.getState();
  const onVideo = p.videoId && p.experimentId && s.route.startsWith("/experiments/");
  return {
    mode: s.mode,
    route: s.route,
    filters: s.filters,
    selection: s.selection,
    openExperimentId: s.openExperimentId,
    compareIds: s.compareIds,
    labParams: s.labParams,
    video: onVideo
      ? { experimentId: p.experimentId!, videoId: p.videoId!, timeS: Math.round(p.timeS * 100) / 100, overlay: s.flameOverlay.mode }
      : null,
  };
}

async function loadProviders() {
  if (providersRequested) return;
  providersRequested = true;
  try {
    const res = await fetch("/api/ai/providers", { cache: "no-store" });
    if (res.ok) assistantStore.setState({ providers: (await res.json()) as AiProvidersResponse });
  } catch {
    providersRequested = false;
  }
}

/** Apply one stream event to the assistant message `id`. Exported for tests. */
export function applyEvent(id: string, event: AiStreamEvent, turn: { groupId: string }) {
  switch (event.type) {
    case "start":
      turn.groupId = event.turnId;
      updateMessage(id, (m) => ({ ...m, provider: event.provider, model: event.model, turnId: event.turnId }));
      break;
    case "text":
      updateMessage(id, (m) => ({ ...m, content: m.content + event.delta }));
      break;
    case "tool_call":
      updateMessage(id, (m) => ({
        ...m,
        steps: [...m.steps, { callId: event.callId, tool: event.name, status: "running", summary: "", logEntryIds: [] }],
      }));
      break;
    case "tool_result":
      updateMessage(id, (m) => ({
        ...m,
        evidence: mergeEvidence(m.evidence, event.evidence),
        ...(event.gallery ? { galleries: [...(m.galleries ?? []), event.gallery] } : {}),
        steps: m.steps.map((st) =>
          st.callId === event.callId ? { ...st, status: event.ok ? "ok" : "error", summary: event.summary } : st,
        ),
      }));
      break;
    case "actions": {
      const result = dashboardStore.getState().dispatchMany(event.actions, { source: "ai", groupId: turn.groupId });
      updateMessage(id, (m) => ({
        ...m,
        steps: m.steps.map((st) =>
          st.callId !== event.callId
            ? st
            : result.ok
              ? { ...st, logEntryIds: result.entries.map((e) => e.id), summary: result.entries.map((e) => e.label).join(" · ") }
              : { ...st, status: "error", summary: `Could not apply: ${result.errors.map((e) => e.error).join("; ")}` },
        ),
      }));
      break;
    }
    case "done":
      updateMessage(id, (m) => ({ ...m, status: event.stopReason === "aborted" ? "stopped" : "done" }));
      break;
    case "error":
      updateMessage(id, (m) => ({ ...m, status: "error", error: { code: event.code, message: event.message } }));
      break;
  }
}

async function send(text: string) {
  const content = text.trim();
  if (!content || assistantStore.getState().busy) return;

  const history: AiChatMessage[] = assistantStore
    .getState()
    .messages.filter((m) => m.status !== "error" && m.content)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4_000) }));
  const user: AssistantMessage = { id: newId(), role: "user", content, steps: [], evidence: [], status: "done" };
  const reply: AssistantMessage = { id: newId(), role: "assistant", content: "", steps: [], evidence: [], status: "streaming" };
  assistantStore.setState((s) => ({ messages: [...s.messages, user, reply], busy: true }));

  controller = new AbortController();
  const provider = preferencesStore.getState().aiProvider ?? undefined;
  const turn = { groupId: `turn-${reply.id}` };

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, messages: [...history, { role: "user", content }], context: snapshotContext() }),
      signal: controller.signal,
    });
    if (!res.body) throw new Error("empty response");
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const raw = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (raw) applyEvent(reply.id, JSON.parse(raw) as AiStreamEvent, turn);
      }
    }
    updateMessage(reply.id, (m) => (m.status === "streaming" ? { ...m, status: "done" } : m));
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    updateMessage(reply.id, (m) =>
      aborted
        ? { ...m, status: "stopped" }
        : { ...m, status: "error", error: { code: "upstream_error", message: "Connection to the assistant was lost." } },
    );
  } finally {
    controller = null;
    assistantStore.setState({ busy: false });
  }
}

function stop() {
  controller?.abort();
}

function clear() {
  stop();
  assistantStore.setState({ messages: [] });
}

/** Undo everything the assistant did in one reply (all its dashboard actions). */
function undoTurn(messageId: string) {
  const turnId = assistantStore.getState().messages.find((m) => m.id === messageId)?.turnId;
  return turnId ? dashboardStore.getState().undoGroup(turnId) : 0;
}

/** Undo one step of a reply (and everything after it — history semantics). */
function undoStep(logEntryId: string) {
  return dashboardStore.getState().undoTo(logEntryId);
}

function setProvider(id: AiProviderId | null) {
  preferencesStore.getState().setAiProvider(id);
}

/**
 * The assistant API for the UI (#16):
 * `const { messages, busy, providers, provider, send, stop, clear, undoTurn, undoStep, setProvider } = useAssistant()`
 */
export function useAssistant() {
  const state = useStore(assistantStore, (s: AssistantState) => s);
  const chosen = useStore(preferencesStore, (p) => p.aiProvider);
  useEffect(() => {
    void loadProviders();
  }, []);
  const provider: AiProviderId | null = chosen ?? state.providers?.default ?? null;
  return {
    ...state,
    provider,
    send: useCallback((text: string) => send(text), []),
    stop,
    clear,
    undoTurn,
    undoStep,
    setProvider,
  };
}
