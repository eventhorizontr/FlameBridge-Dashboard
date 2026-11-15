/**
 * Server-side: one gallery entry per run whose primary footage the vision layer measured
 * (status ok, ≥ 2 s of visible flame). Values come straight from vision/index.json.
 */
import type { LibraryEntry } from "@/components/vision/flame-library";
import { representativeAirflow } from "@/components/viz/dataset-queries";
import type { ExperimentDataset } from "@/types/experiment";

import { getVisionIndex } from "./server";

export function flameLibraryEntries(dataset: ExperimentDataset): LibraryEntry[] {
  const index = getVisionIndex(dataset.accession);
  const byId = new Map(dataset.experiments.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const out: LibraryEntry[] = [];
  for (const v of index?.videos ?? []) {
    if (v.status !== "ok" || v.kind !== "primary" || seen.has(v.experimentId) || !v.events || v.events.visibleS < 2) continue;
    const e = byId.get(v.experimentId);
    if (!e) continue;
    seen.add(v.experimentId);
    out.push({
      experimentId: e.id,
      testId: e.testId,
      principalInvestigator: e.principalInvestigator,
      material: e.fuel.material,
      geometry: e.fuel.geometry,
      fuelRaw: e.fuel.raw,
      o2Pct: e.conditions.o2InitialPct,
      airflowCmS: representativeAirflow(e),
      videoId: v.videoId,
      visibleS: v.events.visibleS,
      peakAreaPx: v.events.peakAreaPx,
      peakAreaS: v.events.peakAreaS,
      keyframes: v.keyframes ?? null,
      poster: v.poster ? { file: v.poster.file, t: v.poster.t } : null,
    });
  }
  return out;
}
