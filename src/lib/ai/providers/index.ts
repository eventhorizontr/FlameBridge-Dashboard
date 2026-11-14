import type { AiProviderId, AiProvidersResponse } from "@/types/ai";

import { createClaudeProvider } from "./claude";
import { createGeminiProvider } from "./gemini";
import type { AiEnv, AiProvider } from "./types";

export type { AiEnv, AiProvider, ProviderRunOptions, StopReason } from "./types";
export { ProviderError } from "./types";

/** Built per call so a key added to the environment is picked up without a code change. */
export function getProviders(env: AiEnv = process.env): Record<AiProviderId, AiProvider> {
  return { claude: createClaudeProvider(env), gemini: createGeminiProvider(env) };
}

/** Requested provider if available, else the configured default, else any available one. */
export function resolveProvider(requested: AiProviderId | undefined, env: AiEnv = process.env): AiProvider | null {
  const providers = getProviders(env);
  const preferred = env.AI_DEFAULT_PROVIDER === "gemini" ? "gemini" : "claude";
  const order: AiProviderId[] = [requested ?? preferred, preferred, "claude", "gemini"];
  if (requested) return providers[requested].available ? providers[requested] : null;
  return order.map((id) => providers[id]).find((p) => p.available) ?? null;
}

export function describeProviders(env: AiEnv = process.env): AiProvidersResponse {
  const providers = getProviders(env);
  const list = (["claude", "gemini"] as const).map((id) => {
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
