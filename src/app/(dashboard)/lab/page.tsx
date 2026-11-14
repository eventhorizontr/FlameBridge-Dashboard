import { Suspense } from "react";

import { WhatIfLab } from "@/components/lab/what-if-lab";
import { Skeleton } from "@/components/ui";
import { CatalogHydrator } from "@/components/viz/catalog-hydrator";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";

export default function LabPage() {
  const dataset = loadPsi25Dataset();
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <CatalogHydrator experiments={dataset.experiments} />
      <WhatIfLab dataset={dataset} />
    </Suspense>
  );
}
