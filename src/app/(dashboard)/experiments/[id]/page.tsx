import { Film } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, Skeleton } from "@/components/ui";

async function ExperimentPlaceholder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="num text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          Experiment Record · {decodedId}
        </p>
        <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
          {decodedId}
        </h1>
      </div>

      <EmptyState
        icon={<Film className="size-5" />}
        eyebrow="Route Skeleton · #12"
        title="Flame viewer & telemetry detail"
        description={`Synchronized NASA S3 video playback, frame stepping, raw PSI row, and QA provenance for ${decodedId} will render here in Issue #12.`}
        actions={
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 min-h-9 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line-strong)] text-[0.875rem] text-[var(--text-1)] hover:bg-[var(--surface-3)]"
          >
            Back to Explorer
          </Link>
        }
      />
    </div>
  );
}

export default function ExperimentDetailPage({ params }: PageProps<"/experiments/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
      }
    >
      <ExperimentPlaceholder params={params} />
    </Suspense>
  );
}
