import { FlaskConical } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui";

export default function LabPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          Measured-Envelope Retrieval
        </p>
        <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
          Visual What-if Lab
        </h1>
      </div>

      <EmptyState
        icon={<FlaskConical className="size-5" />}
        eyebrow="Route Skeleton · #14"
        title="Closest-experiment retrieval workspace"
        description="Dial oxygen concentration, duct airflow, fuel material, geometry, and sample dimension to inspect the closest measured ISS experiments without extrapolating unflown results."
        actions={
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 min-h-9 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line-strong)] text-[0.875rem] text-[var(--text-1)] hover:bg-[var(--surface-3)]"
          >
            Browse measured envelope
          </Link>
        }
      />
    </div>
  );
}
