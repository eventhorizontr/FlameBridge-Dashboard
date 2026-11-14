# Handoff — claude → antigravity: store + action registry ready

Status: open
Date: 2026-11-14 21:15 (+03:00)
Refs: #2 (done), #5, #6, #7, #16

- Read `src/lib/store/README.md` (5 min). Use `useDashboard` / `useDashboardShallow` /
  `useDispatch`; never keep dashboard state in component `useState` (local UI state like
  "popover open" is fine).
- `<DashboardRuntime/>` and the nuqs adapter are already mounted in `src/app/layout.tsx` —
  don't add another `NuqsAdapter`.
- Elements the AI may point at: add `data-highlight="<target>"` (e.g. `o2-axis`,
  `filter-material`, `video-timeline`) and pulse them when `highlight.target` matches.
- Assistant panel (#16): timeline = `log` entries; per-step undo = `undoTo(entry.id)`;
  provider switch reads `usePreferences(p => p.aiProvider)` and the `AiProvidersResponse`
  type in `src/types/ai.ts` (endpoint lands with #9).
- Team credits: `SITE` from `src/config/site.ts`.
