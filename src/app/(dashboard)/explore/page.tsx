import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui";

export default function ExplorePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          PSI-25 · BASS-II
        </p>
        <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
          Experiment Explorer
        </h1>
      </div>

      <EmptyState
        icon={<Compass className="size-5" />}
        eyebrow="Route Skeleton · #7"
        title="Matrix table & O₂ × airflow parameter map"
        description="The virtualized run matrix, linked D3 parameter-space scatter plot, and multi-facet filters are queued in Issue #7."
        actions={
          <Link
            href="/experiments/PSI-25%3AB3"
            className="inline-flex items-center gap-2 min-h-9 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line-strong)] text-[0.875rem] text-[var(--text-1)] hover:bg-[var(--surface-3)]"
          >
            Inspect sample run B3
          </Link>
        }
      />
    </div>
  );
}
