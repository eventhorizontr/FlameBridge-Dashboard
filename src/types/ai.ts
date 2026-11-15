/**
 * AI CONTRACT — providers (ADR-012), the `/api/ai` request and its streamed event protocol.
 * Owner: Claude. UI (#16) consumes this through `useAssistant()`; never parse the stream yourself.
 */
import type { DashboardAction, ExperimentFilters, LabParams, UserMode } from "./dashboard";
import type { FlameOverlayMode } from "./vision";

export type AiProviderId = "openai" | "claude";

export interface AiProviderInfo {
  id: AiProviderId;
  /** Display name, e.g. "OpenAI" / "Claude". */
  label: string;
  /** Exact model id used for answers — shown as a badge on each assistant message. */
  model: string;
  /** False when the server has no key for this provider; the UI disables it with `reason`. */
  available: boolean;
  reason?: string;
}

/** GET /api/ai/providers */
export interface AiProvidersResponse {
  providers: AiProviderInfo[];
  default: AiProviderId | null;
  /** This visitor's question allowance (ADR-028); absent when it cannot be read. */
  quota?: AiQuota;
}

/** Questions one IP may send to the assistant (ADR-028). `resetsAt` null = a total that never resets. */
export interface AiQuota {
  limit: number;
  remaining: number;
  resetsAt: string | null;
}

/** Prior conversation, text only (tool traces are not replayed). */
export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** What the user is looking at when they ask — lets the agent act relative to the view. */
export interface AiClientContext {
  mode: UserMode;
  route: string;
  filters: ExperimentFilters;
  selection: string[];
  openExperimentId: string | null;
  compareIds: string[];
  labParams: LabParams;
  /** Where the flame viewer is: lets the assistant answer "what is the flame doing now?". */
  video?: { experimentId: string; videoId: string; timeS: number; overlay: FlameOverlayMode } | null;
}

/** POST /api/ai body. Last message must be from the user. */
export interface AiRequest {
  provider?: AiProviderId;
  messages: AiChatMessage[];
  context: AiClientContext;
}

/** A source the answer relied on — rendered as an evidence chip. */
export interface Evidence {
  /** Stable key: experiment id ("PSI-25:B1"), "doi:…", or "psi-file:<id>". */
  id: string;
  label: string;
  kind: "experiment" | "dataset" | "file" | "publication";
  /** App-relative or external link. */
  href?: string;
}

/** One frame of the similarity index, with its thumbnail tile. */
export interface FrameMatch {
  experimentId: string;
  testId: string;
  videoId: string;
  kind: string | null;
  timeS: number;
  /** Cosine similarity of DINOv2 embeddings (1 = identical). */
  similarity: number;
  thumb: { sheet: string; index: number; cols: number; rows: number; tileW: number; tileH: number };
}

/** A set of frames to show as a gallery (e.g. "frames most like this one"). */
export interface FrameGallery {
  title: string;
  method: string;
  query: FrameMatch;
  frames: FrameMatch[];
}

/**
 * `/api/ai` response: `application/x-ndjson`, one event per line, in order.
 * `actions` events carry server-validated dashboard actions — the client applies them via
 * `dispatchMany(actions, { source: "ai", groupId: turnId })` so the whole turn undoes at once.
 */
export type AiStreamEvent =
  | { type: "start"; turnId: string; provider: AiProviderId; model: string }
  | { type: "text"; delta: string }
  | { type: "tool_call"; callId: string; name: string; input: unknown }
  | {
      type: "tool_result";
      callId: string;
      name: string;
      ok: boolean;
      summary: string;
      evidence: Evidence[];
      /** Frames the tool found (find_similar_frames) — rendered as a clickable gallery. */
      gallery?: FrameGallery;
    }
  | { type: "actions"; callId: string; actions: DashboardAction[] }
  | { type: "done"; stopReason: "end" | "max_steps" | "refusal" | "max_tokens" | "aborted" }
  | { type: "error"; code: AiErrorCode; message: string };

export type AiErrorCode =
  | "bad_request"
  | "provider_unavailable"
  | "rate_limited"
  | "quota_exceeded"
  | "upstream_error"
  | "internal";

/** Re-exported for tool-input typing on both sides. */
export type { DashboardAction, ExperimentFilters, LabParams };
