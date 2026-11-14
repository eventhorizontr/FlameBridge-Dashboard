import { BookOpen } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui";

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          Guided Curriculum · PSI-25
        </p>
        <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
          Explore & Learn Track
        </h1>
      </div>

      <EmptyState
        icon={<BookOpen className="size-5" />}
        eyebrow="Route Skeleton · #18"
        title="Guided microgravity combustion chapters"
        description="Five interactive chapters grounded in real ISS BASS-II footage — covering spherical blue flames, oxygen limits, airflow transitions, and spacecraft fire safety."
        actions={
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-9 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line-strong)] text-[0.875rem] text-[var(--text-1)] hover:bg-[var(--surface-3)]"
          >
            Return to Overview
          </Link>
        }
      />
    </div>
  );
}
