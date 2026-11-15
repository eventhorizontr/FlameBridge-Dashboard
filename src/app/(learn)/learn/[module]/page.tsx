import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LEARN_MODULES } from "@/components/learn/curriculum";
import { LearnAcademy } from "@/components/learn/learn-academy";
import { LearnGate } from "@/components/layout/learn-gate";
import { Skeleton } from "@/components/ui";
import { getDataset } from "@/lib/data";

export function generateStaticParams() {
  return LEARN_MODULES.map((m) => ({ module: m.id }));
}

async function ModuleAcademy({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleId } = await params;
  if (!LEARN_MODULES.some((m) => m.id === moduleId)) notFound();
  return (
    <LearnGate>
      <LearnAcademy dataset={getDataset("PSI-25")} initialModuleId={moduleId} />
    </LearnGate>
  );
}

/** One Learn Academy module, e.g. /learn/m2-gravity — the route the AI and the command palette open. */
export default function LearnModulePage({ params }: PageProps<"/learn/[module]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ModuleAcademy params={params} />
    </Suspense>
  );
}
