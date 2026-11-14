import { Suspense } from "react";

import { Skeleton } from "@/components/ui";
import { CompareWorkspace } from "@/components/viz/compare-workspace";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";

export default function ComparePage() {
  const dataset = loadPsi25Dataset();
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80 w-full" />
        </div>
      }
    >
      <CompareWorkspace dataset={dataset} />
    </Suspense>
  );
}
