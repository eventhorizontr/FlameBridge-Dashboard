import { Suspense } from "react";

import { Skeleton } from "@/components/ui";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";
import { ExplorerWorkspace } from "@/components/viz/explorer-workspace";

export default function ExplorePage() {
  const dataset = loadPsi25Dataset();
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ExplorerWorkspace dataset={dataset} />
    </Suspense>
  );
}
