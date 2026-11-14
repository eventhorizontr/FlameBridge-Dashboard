/**
 * OpenAI adapter — official `openai` SDK, Responses API, streaming manual function-calling loop.
 * Turn state (including reasoning items) is carried server-side with `previous_response_id`,
 * so each step only sends the new function outputs. The SDK retries 429/5xx itself.
 */
import OpenAI from "openai";

import { toolJsonSchema } from "../tools";
import { ProviderError, type AiEnv, type AiProvider, type ProviderRunOptions, type StopReason } from "./types";

/** GPT-6.1 Sol: OpenAI's top 6.1 tier for agentic tool use. Override with OPENAI_MODEL. */
const DEFAULT_MODEL = "gpt-6.1-sol";
const MAX_OUTPUT_TOKENS = 16_000;

export function createOpenAIProvider(env: AiEnv = process.env): AiProvider {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || DEFAULT_MODEL;
  let client: OpenAI | null = null;

  return {
    id: "openai",
    label: "OpenAI",
    model,
    available: Boolean(apiKey),
    async run(opts: ProviderRunOptions): Promise<StopReason> {
      if (!apiKey) throw new ProviderError("OpenAI is not configured on this server.", "provider_unavailable");
      client ??= new OpenAI({ apiKey, maxRetries: 3 });

      // strict:false — several inputs are optional; every call is Zod-validated before it runs.
      const tools: OpenAI.Responses.FunctionTool[] = opts.tools.map((t) => ({
        type: "function",
        name: t.name,
        description: t.description,
        parameters: toolJsonSchema(t),
        strict: false,
      }));
      let input: OpenAI.Responses.ResponseInput = opts.messages.map((m) => ({ role: m.role, content: m.content }));
      let previousResponseId: string | undefined;

      for (let step = 0; step < opts.maxSteps; step++) {
        if (opts.signal.aborted) return "aborted";
        let response: OpenAI.Responses.Response;
        try {
          const stream = client.responses.stream(
            {
              model,
              instructions: opts.system,
              input,
              tools,
              reasoning: { effort: "medium" },
              max_output_tokens: MAX_OUTPUT_TOKENS,
              ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
            },
            { signal: opts.signal },
          );
          stream.on("response.output_text.delta", (e) => opts.emit({ type: "text", delta: e.delta }));
          response = await stream.finalResponse();
        } catch (err) {
          if (opts.signal.aborted) return "aborted";
          if (err instanceof OpenAI.RateLimitError) throw new ProviderError("OpenAI is rate-limited right now — try again in a minute.", "rate_limited");
          if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError)
            throw new ProviderError("OpenAI rejected the server's API key.", "provider_unavailable");
          if (err instanceof OpenAI.APIError) {
            console.error("[ai] openai error", err.status, err.message);
            throw new ProviderError(`OpenAI API error (${err.status ?? "network"}).`, "upstream_error");
          }
          console.error("[ai] openai failure", err);
          throw new ProviderError("OpenAI request failed.", "upstream_error");
        }

        const refused = response.output.some(
          (item) => item.type === "message" && item.content.some((c) => c.type === "refusal"),
        );
        if (refused || response.incomplete_details?.reason === "content_filter") return "refusal";
        const calls = response.output.filter((item): item is OpenAI.Responses.ResponseFunctionToolCall => item.type === "function_call");
        if (response.status === "incomplete" && response.incomplete_details?.reason === "max_output_tokens") return "max_tokens";
        if (calls.length === 0) return "end";

        previousResponseId = response.id;
        input = calls.map((call) => {
          let args: unknown;
          try {
            args = JSON.parse(call.arguments || "{}");
          } catch {
            args = { INVALID_JSON: call.arguments };
          }
          const outcome = opts.runTool(call.call_id, call.name, args);
          return {
            type: "function_call_output" as const,
            call_id: call.call_id,
            output: JSON.stringify(outcome.ok ? outcome.content : { error: outcome.content }),
          };
        });
      }
      return "max_steps";
    },
  };
}
