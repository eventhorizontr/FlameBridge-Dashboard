import { Suspense } from "react";

import { Skeleton } from "@/components/ui";
import { CompareWorkspace, type CompareVision } from "@/components/viz/compare-workspace";
import { getVisionIndex } from "@/lib/vision/server";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";

export default function ComparePage() {
  const dataset = loadPsi25Dataset();
  const vision: CompareVision = {};
  for (const v of getVisionIndex(dataset.accession)?.videos ?? []) {
    if (v.status !== "ok" || v.kind !== "primary" || !v.events || vision[v.experimentId]) continue;
    vision[v.experimentId] = { firstFlameS: v.events.firstFlameS, visibleS: v.events.visibleS, peakAreaPx: v.events.peakAreaPx, peakAreaS: v.events.peakAreaS };
  }
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80 w-full" />
        </div>
      }
    >
      <CompareWorkspace dataset={dataset} vision={vision} />
    </Suspense>
  );
}
