import { Suspense } from "react";

import { Skeleton } from "@/components/ui";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";
import { LearnTrack } from "@/components/viz/learn-track";

export default function LearnPage() {
  const dataset = loadPsi25Dataset();
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <LearnTrack dataset={dataset} />
    </Suspense>
  );
}
