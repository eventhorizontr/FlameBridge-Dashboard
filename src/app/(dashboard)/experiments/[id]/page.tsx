import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, Skeleton } from "@/components/ui";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";
import { lookupExperiment } from "@/components/viz/dataset-queries";
import { ExperimentDetailView } from "@/components/viz/experiment-detail-view";

async function ExperimentDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const dataset = loadPsi25Dataset();
  const experiment = lookupExperiment(decodedId, dataset.experiments);

  if (!experiment) {
    return (
      <EmptyState
        icon={<FileQuestion className="size-5" />}
        eyebrow="Unknown Experiment Record"
        title={`Run "${decodedId}" was not found in ${dataset.accession}`}
        description="Verify the run identifier (e.g. PSI-25:O1, PSI-25:B3, PSI-25:M5) or return to the Experiment Explorer to browse all 129 runs."
        actions={
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 min-h-9 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-soft)] border border-[var(--accent)]/50 text-[0.875rem] text-[var(--accent)] hover:bg-[var(--accent)]/20"
          >
            Back to Experiment Explorer
          </Link>
        }
      />
    );
  }

  return (
    <ExperimentDetailView
      experiment={experiment}
      allExperiments={dataset.experiments}
      doi={dataset.doi}
    />
  );
}

export default function ExperimentDetailPage({ params }: PageProps<"/experiments/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ExperimentDetailLoader params={params} />
    </Suspense>
  );
}
