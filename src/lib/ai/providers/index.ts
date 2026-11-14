import type { AiProviderId, AiProvidersResponse } from "@/types/ai";

import { createClaudeProvider } from "./claude";
import { createOpenAIProvider } from "./openai";
import type { AiEnv, AiProvider } from "./types";

export type { AiEnv, AiProvider, ProviderRunOptions, StopReason } from "./types";
export { ProviderError } from "./types";

/** Built per call so a key added to the environment is picked up without a code change. */
export function getProviders(env: AiEnv = process.env): Record<AiProviderId, AiProvider> {
  return { openai: createOpenAIProvider(env), claude: createClaudeProvider(env) };
}

/** Requested provider if available, else the configured default, else any available one. */
export function resolveProvider(requested: AiProviderId | undefined, env: AiEnv = process.env): AiProvider | null {
  const providers = getProviders(env);
  const preferred: AiProviderId = env.AI_DEFAULT_PROVIDER === "claude" ? "claude" : "openai";
  const order: AiProviderId[] = [preferred, "openai", "claude"];
  if (requested) return providers[requested].available ? providers[requested] : null;
  return order.map((id) => providers[id]).find((p) => p.available) ?? null;
}

export function describeProviders(env: AiEnv = process.env): AiProvidersResponse {
  const providers = getProviders(env);
  const list = (["openai", "claude"] as const).map((id) => {
    const p = providers[id];
    return {
      id,
      label: p.label,
      model: p.model,
      available: p.available,
      ...(p.available ? {} : { reason: `${p.label} is not configured on this deployment.` }),
    };
  });
  return { providers: list, default: resolveProvider(undefined, env)?.id ?? null };
}
