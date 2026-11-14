import type { AiChatMessage, AiProviderId, AiStreamEvent } from "@/types/ai";

import type { AgentTool, ToolOutcome } from "../tools";

export type StopReason = Extract<AiStreamEvent, { type: "done" }>["stopReason"];

export interface ProviderRunOptions {
  system: string;
  /** Conversation; the last entry is the user turn (already prefixed with dashboard state). */
  messages: AiChatMessage[];
  tools: AgentTool[];
  /** Validates + executes a tool call; emits timeline events. Never throws. */
  runTool: (callId: string, name: string, input: unknown) => ToolOutcome;
  emit: (event: AiStreamEvent) => void;
  signal: AbortSignal;
  maxSteps: number;
}

/**
 * One adapter per vendor (ADR-012). An adapter owns its wire format and its tool loop; it
 * shares the system prompt, tool definitions, validation and event protocol with the others.
 */
export interface AiProvider {
  id: AiProviderId;
  label: string;
  model: string;
  available: boolean;
  run: (options: ProviderRunOptions) => Promise<StopReason>;
}

/** Thrown for upstream failures that should reach the user as a readable message. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: "provider_unavailable" | "rate_limited" | "upstream_error",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** The environment slice providers read (process.env in production, a literal in tests). */
export type AiEnv = Readonly<Record<string, string | undefined>>;
