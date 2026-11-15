/**
 * Provider-agnostic agent turn: validates the request, runs the chosen provider's tool loop
 * with the shared tools, and streams `AiStreamEvent`s as NDJSON.
 */
import { z } from "zod";
import { FLAME_OVERLAY_MODES } from "@/types/vision";

import type { AiRequest, AiStreamEvent } from "@/types/ai";
import { ExperimentFiltersSchema, LabParamsSchema, UserModeSchema } from "@/types/schemas";

import { ProviderError, resolveProvider, type AiProvider } from "./providers";
import { contextBlock, systemPrompt } from "./system-prompt";
import { executeTool, TOOLS } from "./tools";

export const MAX_STEPS = 8;
const MAX_HISTORY = 20;

export const AiRequestSchema = z.strictObject({
  provider: z.enum(["openai", "claude"]).optional(),
  messages: z
    .array(z.strictObject({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4_000) }))
    .min(1)
    .max(60)
    .refine((m) => m.at(-1)?.role === "user", { message: "last message must be from the user" }),
  context: z.strictObject({
    mode: UserModeSchema,
    route: z.string().max(300),
    filters: ExperimentFiltersSchema,
    selection: z.array(z.string().max(80)).max(200),
    openExperimentId: z.string().max(80).nullable(),
    compareIds: z.array(z.string().max(80)).max(4),
    labParams: LabParamsSchema,
    video: z
      .strictObject({
        experimentId: z.string().max(80),
        videoId: z.string().regex(/^[0-9a-f]{24}$/i),
        timeS: z.number().finite().nonnegative(),
        overlay: z.enum(FLAME_OVERLAY_MODES),
      })
      .nullable()
      .optional(),
  }),
});

const encoder = new TextEncoder();
const line = (e: AiStreamEvent) => encoder.encode(`${JSON.stringify(e)}\n`);

export function ndjsonResponse(body: ReadableStream<Uint8Array>, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** A single-event error stream, so the client has one code path. */
export function errorResponse(code: Extract<AiStreamEvent, { type: "error" }>["code"], message: string, status: number) {
  return ndjsonResponse(
    new ReadableStream({
      start(c) {
        c.enqueue(line({ type: "error", code, message }));
        c.close();
      },
    }),
    status,
  );
}

/** Run one assistant turn. `provider` override is for tests. */
export function runAgentTurn(req: AiRequest, signal: AbortSignal, provider?: AiProvider): ReadableStream<Uint8Array> {
  const chosen = provider ?? resolveProvider(req.provider);
  const turnId = `turn-${crypto.randomUUID()}`;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: AiStreamEvent) => {
        if (!closed) controller.enqueue(line(e));
      };
      const finish = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      if (!chosen) {
        emit({
          type: "error",
          code: "provider_unavailable",
          message: req.provider
            ? `${req.provider === "claude" ? "Claude" : "OpenAI"} is not configured on this deployment.`
            : "No AI provider is configured on this deployment.",
        });
        return finish();
      }

      emit({ type: "start", turnId, provider: chosen.id, model: chosen.model });
      const history = req.messages.slice(-MAX_HISTORY);
      const last = history[history.length - 1];
      const messages = [...history.slice(0, -1), { role: "user" as const, content: contextBlock(req.context) + last.content }];

      try {
        const stopReason = await chosen.run({
          system: systemPrompt(),
          messages,
          tools: TOOLS,
          signal,
          maxSteps: MAX_STEPS,
          emit,
          runTool: (callId, name, input) => {
            emit({ type: "tool_call", callId, name, input });
            const outcome = executeTool(name, input);
            emit({ type: "tool_result", callId, name, ok: outcome.ok, summary: outcome.summary, evidence: outcome.evidence });
            if (outcome.ok && outcome.actions?.length) emit({ type: "actions", callId, actions: outcome.actions });
            return outcome;
          },
        });
        if (stopReason === "refusal") {
          emit({ type: "text", delta: "\n\nI can’t help with that request. I can answer questions about the experiments in this dataset." });
        }
        emit({ type: "done", stopReason });
      } catch (err) {
        if (err instanceof ProviderError) {
          emit({ type: "error", code: err.code, message: err.message });
        } else {
          console.error("[ai] turn failed", err);
          emit({ type: "error", code: "internal", message: "The assistant hit an internal error." });
        }
      }
      finish();
    },
  });
}
