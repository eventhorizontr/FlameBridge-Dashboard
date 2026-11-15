import { Suspense } from "react";

import { LearnAcademy } from "@/components/learn/learn-academy";
import { LearnGate } from "@/components/layout/learn-gate";
import { Skeleton } from "@/components/ui";
import { getDataset } from "@/lib/data";

export default function LearnPage() {
  const dataset = getDataset("PSI-25");
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <LearnGate>
        <LearnAcademy dataset={dataset} />
      </LearnGate>
    </Suspense>
  );
}