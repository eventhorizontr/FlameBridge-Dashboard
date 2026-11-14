/**
 * Gemini adapter — `@google/genai`, generateContentStream + manual function-calling loop.
 * Model parts are replayed verbatim (including `thoughtSignature`), which Gemini requires
 * when sending function-call history back.
 */
import { GoogleGenAI, type Content, type Part } from "@google/genai";

import { toolJsonSchema } from "../tools";
import { ProviderError, type AiEnv, type AiProvider, type ProviderRunOptions, type StopReason } from "./types";

/** Google's documented general-purpose default; override with GEMINI_MODEL. */
const DEFAULT_MODEL = "gemini-4-hydrogen";
const MAX_OUTPUT_TOKENS = 8_192;

const errorStatus = (err: unknown): number | undefined =>
  typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" ? err.status : undefined;

export function createGeminiProvider(env: AiEnv = process.env): AiProvider {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  let client: GoogleGenAI | null = null;

  return {
    id: "gemini",
    label: "Gemini",
    model,
    available: Boolean(apiKey),
    async run(opts: ProviderRunOptions): Promise<StopReason> {
      if (!apiKey) throw new ProviderError("Gemini is not configured on this server.", "provider_unavailable");
      client ??= new GoogleGenAI({ apiKey });

      const functionDeclarations = opts.tools.map((t) => ({
        name: t.name,
        description: t.description,
        parametersJsonSchema: toolJsonSchema(t),
      }));
      const contents: Content[] = opts.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      for (let step = 0; step < opts.maxSteps; step++) {
        if (opts.signal.aborted) return "aborted";
        const parts: Part[] = [];
        let finishReason: string | undefined;
        try {
          const stream = await client.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction: opts.system,
              tools: [{ functionDeclarations }],
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              abortSignal: opts.signal,
            },
          });
          for await (const chunk of stream) {
            const candidate = chunk.candidates?.[0];
            finishReason = candidate?.finishReason ?? finishReason;
            for (const part of candidate?.content?.parts ?? []) {
              parts.push(part);
              if (part.text && !part.thought) opts.emit({ type: "text", delta: part.text });
            }
          }
        } catch (err) {
          if (opts.signal.aborted) return "aborted";
          const status = errorStatus(err);
          if (status === 429) throw new ProviderError("Gemini is rate-limited right now — try again shortly or switch to Claude.", "rate_limited");
          if (status === 401 || status === 403) throw new ProviderError("Gemini rejected the server's API key.", "provider_unavailable");
          console.error("[ai] gemini error", err);
          throw new ProviderError(`Gemini API error (${status ?? "network"}).`, "upstream_error");
        }

        if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT" || finishReason === "BLOCKLIST") return "refusal";
        const calls = parts.filter((p) => p.functionCall);
        if (calls.length === 0) return finishReason === "MAX_TOKENS" ? "max_tokens" : "end";
        if (finishReason === "MAX_TOKENS") return "max_tokens";

        contents.push({ role: "model", parts });
        const responses: Part[] = calls.map((p, i) => {
          const call = p.functionCall!;
          const callId = call.id ?? `gemini-${step}-${i}`;
          const outcome = opts.runTool(callId, call.name ?? "", call.args ?? {});
          return {
            functionResponse: {
              ...(call.id ? { id: call.id } : {}),
              name: call.name,
              response: outcome.ok ? { result: outcome.content } : { error: outcome.content },
            },
          };
        });
        contents.push({ role: "user", parts: responses });
      }
      return "max_steps";
    },
  };
}
