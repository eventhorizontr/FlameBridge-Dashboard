/**
 * Client-side conversation state for the assistant panel and ⌘K. Owner: Claude.
 * The panel (Antigravity, #16) renders this; it never parses the stream itself.
 */
import { createStore } from "zustand/vanilla";

import type { AiErrorCode, AiProviderId, AiProvidersResponse, Evidence, FrameGallery } from "@/types/ai";

export interface AssistantStep {
  callId: string;
  tool: string;
  status: "running" | "ok" | "error";
  summary: string;
  /** Log entry ids created by this step's dashboard actions (for per-step undo). */
  logEntryIds: string[];
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Assistant only. */
  provider?: AiProviderId;
  model?: string;
  turnId?: string;
  steps: AssistantStep[];
  evidence: Evidence[];
  /** Frame galleries returned by tools (find_similar_frames). */
  galleries?: FrameGallery[];
  status: "streaming" | "done" | "error" | "stopped";
  error?: { code: AiErrorCode; message: string };
}

export interface AssistantState {
  messages: AssistantMessage[];
  busy: boolean;
  providers: AiProvidersResponse | null;
}

export const assistantStore = createStore<AssistantState>()(() => ({
  messages: [],
  busy: false,
  providers: null,
}));

export function updateMessage(id: string, patch: (m: AssistantMessage) => AssistantMessage) {
  assistantStore.setState((s) => ({ messages: s.messages.map((m) => (m.id === id ? patch(m) : m)) }));
}

export function mergeEvidence(list: Evidence[], add: Evidence[]): Evidence[] {
  const seen = new Set(list.map((e) => e.id));
  return [...list, ...add.filter((e) => !seen.has(e.id) && seen.add(e.id))];
}
