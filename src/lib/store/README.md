# Dashboard store — how to use it (Antigravity, read this)

All dashboard state lives in one Zustand store and changes **only** through
`dispatch(DashboardAction)`. The AI assistant dispatches the very same actions, so anything
a user can click, the AI can do, and every step shows up in the timeline and can be undone.

```tsx
"use client";
import { useDashboard, useDashboardShallow, useDispatch } from "@/lib/store";

const mode = useDashboard((s) => s.mode);                       // primitive → plain selector
const { filters, selection } = useDashboardShallow((s) => ({    // new object → shallow
  filters: s.filters,
  selection: s.selection,
}));
const dispatch = useDispatch();

dispatch({ type: "setFilters", filters: { materials: ["PMMA"] } });
dispatch({ type: "openExperiment", id: "PSI-25:O13a" });         // also navigates
```

## State (`DashboardData`, `state.ts`)
| key | meaning |
|---|---|
| `mode` | `"expert" \| "learn"` |
| `filters` | `ExperimentFilters` (`@/types/dashboard`) — filtering itself is done by `src/lib/data` queries |
| `selection` | experiment ids selected/brushed in the explorer |
| `openExperimentId` | run shown on `/experiments/[id]` |
| `compareIds` | 2–4 runs for `/compare` |
| `videoCursor` | `{experimentId, videoId, timeS, seq}` — the flame viewer seeks when `seq` changes |
| `labParams` | What-if Lab query (`DEFAULT_LAB_PARAMS` = centre of the measured envelope) |
| `route` | current pathname (synced automatically) |
| `highlight` | `{target, seq}` — flash/pulse the element whose `data-highlight="<target>"` matches |

## Actions
`setMode · setFilters (merge) · resetFilters · selectExperiments · openExperiment · compare ·
seekVideo · setLabParams (merge) · navigate · highlight` — shapes in `@/types/dashboard`.

- `dispatch` validates (Zod + known ids/videos) and returns `{ok:true, entry} | {ok:false, error}`.
- `openExperiment`, `compare`, `navigate` change the route; `<DashboardRuntime/>` (mounted in
  the root layout) performs the navigation and keeps the URL shareable.
- Prefer `dispatch({type:"navigate", route})` over raw `router.push` for in-app jumps that the
  user might want to undo. Plain `<Link>` is fine too — the store follows the pathname.

## Timeline & undo (for the assistant panel, #16)
```ts
const log = useDashboard((s) => s.log);        // LogEntry[] (last 50): label, source "user"|"ai", groupId, undone
dashboardStore.getState().undo();              // latest step — or the whole AI turn
dashboardStore.getState().undoTo(entry.id);    // this step and everything after it
dashboardStore.getState().undoGroup(groupId);  // one AI turn
```
`highlight` entries are not undoable (`entry.undoable === false`).

## URL (shareable views)
`?mode=learn&mat=PMMA&geo=rod&o2=15~18&air=~10&vid=true&qa=false&q=blue&sel=…&cmp=PSI-25:B1,PSI-25:B2`
— parsed and validated in `url.ts`; invalid params are dropped.

## Preferences
`usePreferences((p) => p.aiProvider)` / `preferencesStore.getState().setAiProvider("gemini")` —
the Claude ↔ Gemini switch (ADR-012). Not an action: the AI cannot change its own provider.

## Catalog
The page that loads the dataset calls once:
`dashboardStore.getState().setCatalog(experiments.map(e => ({ id: e.id, videoIds: e.videos.map(v => v.id) })))`
so hallucinated ids are rejected.
