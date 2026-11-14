/**
 * Claude adapter — `@anthropic-ai/sdk`, streaming manual tool loop.
 * Opus 5.5: thinking is always on (adaptive); depth via `output_config.effort`. Forced
 * tool_choice is not supported on this model, so tool use is steered by the prompt.
 */
import Anthropic from "@anthropic-ai/sdk";

import { toolJsonSchema } from "../tools";
import { ProviderError, type AiEnv, type AiProvider, type ProviderRunOptions, type StopReason } from "./types";

const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TOKENS = 16_000;

export function createClaudeProvider(env: AiEnv = process.env): AiProvider {
  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.CLAUDE_MODEL || DEFAULT_MODEL;
  let client: Anthropic | null = null;

  return {
    id: "claude",
    label: "Claude",
    model,
    available: Boolean(apiKey),
    async run(opts: ProviderRunOptions): Promise<StopReason> {
      if (!apiKey) throw new ProviderError("Claude is not configured on this server.", "provider_unavailable");
      client ??= new Anthropic({ apiKey });

      const tools: Anthropic.Tool[] = opts.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: toolJsonSchema(t) as Anthropic.Tool.InputSchema,
        eager_input_streaming: true,
      }));
      const messages: Anthropic.MessageParam[] = opts.messages.map((m) => ({ role: m.role, content: m.content }));
      let jsonRetries = 0;

      for (let step = 0; step < opts.maxSteps; step++) {
        if (opts.signal.aborted) return "aborted";
        const stream = client.messages.stream(
          {
            model,
            max_tokens: MAX_TOKENS,
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
            tools,
            messages,
          },
          { signal: opts.signal },
        );
        stream.on("text", (delta) => opts.emit({ type: "text", delta }));

        let message: Anthropic.Message;
        try {
          message = await stream.finalMessage();
          jsonRetries = 0;
        } catch (err) {
          if (opts.signal.aborted) return "aborted";
          if (err instanceof Anthropic.RateLimitError) throw new ProviderError("Claude is rate-limited right now — try again in a minute.", "rate_limited");
          if (err instanceof Anthropic.AuthenticationError) throw new ProviderError("Claude rejected the server's API key.", "provider_unavailable");
          if (err instanceof Anthropic.APIError) throw new ProviderError(`Claude API error (${err.status ?? "network"}).`, "upstream_error");
          // Tool input JSON that could not be parsed at all (eager input streaming): re-issue the turn.
          if (jsonRetries++ >= 2) throw new ProviderError("Claude produced an unreadable tool call.", "upstream_error");
          continue;
        }

        if (message.stop_reason === "refusal") return "refusal";
        if (message.stop_reason === "pause_turn") {
          messages.push({ role: "assistant", content: message.content });
          continue;
        }
        const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        if (toolUses.length === 0) return message.stop_reason === "max_tokens" ? "max_tokens" : "end";
        // A tool input cut off at max_tokens can still parse — never run it.
        if (message.stop_reason === "max_tokens") return "max_tokens";

        messages.push({ role: "assistant", content: message.content });
        const results: Anthropic.ToolResultBlockParam[] = toolUses.map((use) => {
          const outcome = opts.runTool(use.id, use.name, use.input);
          return {
            type: "tool_result",
            tool_use_id: use.id,
            is_error: !outcome.ok,
            content: JSON.stringify(outcome.content),
          };
        });
        messages.push({ role: "user", content: results });
      }
      return "max_steps";
    },
  };
}
