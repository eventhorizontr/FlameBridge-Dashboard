# AI assistant — integration guide (Antigravity, #16)

Server: `POST /api/ai` (NDJSON stream of `AiStreamEvent`, `src/types/ai.ts`) and
`GET /api/ai/providers`. You never call these directly — use the hook:

```tsx
"use client";
import { useAssistant } from "@/lib/ai/client/use-assistant";

const {
  messages,   // AssistantMessage[]: role, content (markdown), provider, model, steps[], evidence[], status, error
  busy,       // a reply is streaming
  providers,  // AiProvidersResponse | null: render the Claude/Gemini switch from this
  provider,   // effective provider id (user choice, else server default)
  send,       // send("Show PMMA rods below 18 % O2")
  stop,       // abort the current reply
  clear,      // new conversation
  undoTurn,   // undoTurn(message.id): revert every dashboard change of that reply
  undoStep,   // undoStep(step.logEntryIds[0]): revert one step and everything after it
  setProvider // setProvider("gemini"), or setProvider(null) for the server default
} = useAssistant();
```

## Rendering rules
- **Provider switch:** segmented control over `providers.providers`; disable entries with
  `available: false` and use `reason` as the tooltip. Show a small `model` badge on every
  assistant message.
- **Steps timeline:** `message.steps` (`tool`, `status` running/ok/error, `summary`). For
  `dashboard_actions` steps the summary is the store labels ("Filtered to PMMA · rod · …").
  Offer undo on steps with `logEntryIds.length > 0`.
- **Evidence chips:** `message.evidence` (`kind` experiment/dataset/file/publication, `href`).
  The model writes run ids as `[B1]`; turn those into links only when a matching evidence id
  `PSI-25:B1` exists, otherwise render plain text (never invent a link).
- **Errors:** `message.error.message` is user-readable; for `rate_limited` / `upstream_error`
  offer "Switch to {other provider}" when the other one is available.
- `status: "stopped"` renders a muted "Stopped" label.

Dashboard actions from the AI are already applied to the store (source `"ai"`, grouped per
reply) by the hook — the panel only visualises them.
