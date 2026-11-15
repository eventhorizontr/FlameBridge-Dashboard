import { AppShell } from "@/components/layout";
import { FlameLibrary, type LibraryEntry } from "@/components/vision/flame-library";
import { loadPsi25Dataset, loadPsi25Manifest } from "@/components/viz/dataset-bridge";
import { representativeAirflow } from "@/components/viz/dataset-queries";
import { MissionOverview } from "@/components/viz/mission-overview";
import { getVisionIndex } from "@/lib/vision/server";

export default function HomePage() {
  const dataset = loadPsi25Dataset();
  const manifest = loadPsi25Manifest();
  const index = getVisionIndex("PSI-25");
  const byId = new Map(dataset.experiments.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const library: LibraryEntry[] = [];
  for (const v of index?.videos ?? []) {
    if (v.status !== "ok" || v.kind !== "primary" || seen.has(v.experimentId) || !v.events || v.events.visibleS < 2) continue;
    const e = byId.get(v.experimentId);
    if (!e) continue;
    seen.add(v.experimentId);
    library.push({
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

  return (
    <AppShell>
      <MissionOverview dataset={dataset} manifest={manifest} />
      {library.length > 0 && (
        <div className="mt-6">
          <FlameLibrary entries={library} />
        </div>
      )}
    </AppShell>
  );
}
