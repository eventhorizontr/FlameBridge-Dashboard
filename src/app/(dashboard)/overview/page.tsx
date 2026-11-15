import type { Metadata } from "next";

import { FlameLibrary } from "@/components/vision/flame-library";
import { computeOverviewStats } from "@/components/viz/dataset-queries";
import { loadPsi25Dataset, loadPsi25Manifest } from "@/components/viz/dataset-bridge";
import { MissionOverview } from "@/components/viz/mission-overview";
import { flameLibraryEntries } from "@/lib/vision/library";
import { getVisionIndex } from "@/lib/vision/server";

export const metadata: Metadata = { title: "Home" };

export default function OverviewPage() {
  const dataset = loadPsi25Dataset();
  const manifest = loadPsi25Manifest();
  const library = flameLibraryEntries(dataset);

  // Start the hero clip on its measured steady-peak frame instead of the dark pre-ignition frame.
  const heroId = computeOverviewStats(dataset, manifest).heroVideo?.id ?? null;
  const heroVision = heroId ? getVisionIndex("PSI-25")?.videos.find((v) => v.videoId === heroId) : undefined;
  const heroStartS = heroVision?.poster?.t ?? heroVision?.events?.firstFlameS ?? null;

  return (
    <>
      <MissionOverview dataset={dataset} manifest={manifest} heroStartS={heroStartS} />
      {library.length > 0 && (
        <div className="mt-6">
          <FlameLibrary entries={library} limit={6} />
        </div>
      )}
    </>
  );
}
