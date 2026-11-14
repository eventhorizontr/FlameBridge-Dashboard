import type { DashboardAction } from "@/types/dashboard";

import { runLabel } from "./actions";

/** Known experiment ids → their video file ids. */
export type Catalog = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Reject actions that point at runs or videos that do not exist (hallucinated references).
 * Shared by the client store and the server-side AI tool validation. Empty catalog = skip.
 */
export function checkReferences(action: DashboardAction, catalog: Catalog | null): string | null {
  if (!catalog || catalog.size === 0) return null;
  const unknown = (id: string) => (catalog.has(id) ? null : `Unknown experiment ${id}`);
  switch (action.type) {
    case "selectExperiments":
    case "compare":
      return action.ids.map(unknown).find(Boolean) ?? null;
    case "openExperiment":
      return unknown(action.id);
    case "seekVideo": {
      const videos = catalog.get(action.experimentId);
      if (!videos) return `Unknown experiment ${action.experimentId}`;
      return videos.has(action.videoId)
        ? null
        : `Video ${action.videoId} does not belong to run ${runLabel(action.experimentId)}`;
    }
    case "navigate":
      return action.route.startsWith("/experiments/")
        ? unknown(decodeURIComponent(action.route.slice("/experiments/".length)))
        : null;
    default:
      return null;
  }
}
