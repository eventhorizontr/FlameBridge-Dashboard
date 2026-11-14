import { GitCompareArrows } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui";

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          Multi-Run Analysis
        </p>
        <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
          Compare Runs (2–4)
        </h1>
      </div>

      <EmptyState
        icon={<GitCompareArrows className="size-5" />}
        eyebrow="Route Skeleton · #15"
        title="No runs selected for comparison yet"
        description="Select 2 to 4 BASS-II runs from the Explorer or ask the AI assistant to compare runs side by side with synchronized playback and condition diffs."
        actions={
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 min-h-9 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--bg)] text-[0.875rem] font-medium hover:brightness-110"
          >
            Choose runs in Explorer
          </Link>
        }
      />
    </div>
  );
}
