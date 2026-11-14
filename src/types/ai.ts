/**
 * AI CONTRACT — provider identity and the `/api/ai/providers` response (ADR-012).
 * Owner: Claude. The streaming event protocol of `/api/ai` is added with #9.
 */

export type AiProviderId = "claude" | "gemini";

export interface AiProviderInfo {
  id: AiProviderId;
  /** Display name, e.g. "Claude" / "Gemini". */
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
}
