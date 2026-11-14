/**
 * Gemini adapter — `@google/genai`, generateContentStream + manual function-calling loop.
 * Model parts are replayed verbatim (including `thoughtSignature`), which Gemini requires
 * when sending function-call history back.
 */
import { GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";

import { toolJsonSchema } from "../tools";
import { ProviderError, type AiEnv, type AiProvider, type ProviderRunOptions, type StopReason } from "./types";

/** Google's documented general-purpose default; override with GEMINI_MODEL. */
const DEFAULT_MODEL = "gemini-4-hydrogen";
const MAX_OUTPUT_TOKENS = 8_192;

/** Retries for transient upstream limits (429 per-minute quota, 503 high demand). */
const MAX_RETRIES = 3;
const MAX_WAIT_MS = 20_000;

const errorStatus = (err: unknown): number | undefined =>
  typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" ? err.status : undefined;

/** Server hint ("retry in 12.3s" / retryDelay "12s") or exponential backoff, capped. */
function retryDelayMs(err: unknown, attempt: number): number {
  const m = /retry(?:Delay)?["\s:]*(?:in\s*)?"?(\d+(?:\.\d+)?)s/i.exec(err instanceof Error ? err.message : String(err));
  const hinted = m ? Math.ceil(Number(m[1]) * 1000) + 250 : 0;
  return Math.min(MAX_WAIT_MS, Math.max(hinted, 2_000 * 2 ** attempt));
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

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
        for (let attempt = 0; ; attempt++) {
          let emitted = false;
          try {
            const stream = await client.models.generateContentStream({
              model,
              contents,
              config: {
                systemInstruction: opts.system,
                tools: [{ functionDeclarations }],
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
                abortSignal: opts.signal,
              },
            });
            for await (const chunk of stream) {
              const candidate = chunk.candidates?.[0];
              finishReason = candidate?.finishReason ?? finishReason;
              for (const part of candidate?.content?.parts ?? []) {
                parts.push(part);
                if (part.text && !part.thought) {
                  emitted = true;
                  opts.emit({ type: "text", delta: part.text });
                }
              }
            }
            break;
          } catch (err) {
            if (opts.signal.aborted) return "aborted";
            const status = errorStatus(err);
            // Retry only before anything reached the user, so text is never duplicated.
            if ((status === 429 || status === 503) && !emitted && attempt < MAX_RETRIES) {
              parts.length = 0;
              await sleep(retryDelayMs(err, attempt), opts.signal);
              continue;
            }
            if (status === 429) throw new ProviderError("Gemini's request quota is exhausted for the moment — try again in a minute.", "rate_limited");
            if (status === 503) throw new ProviderError("Gemini is overloaded right now — try again shortly.", "upstream_error");
            if (status === 401 || status === 403) throw new ProviderError("Gemini rejected the server's API key.", "provider_unavailable");
            console.error("[ai] gemini error", err);
            throw new ProviderError(`Gemini API error (${status ?? "network"}).`, "upstream_error");
          }
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
