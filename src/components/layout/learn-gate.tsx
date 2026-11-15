"use client";

import { BookOpen } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ReactNode } from "react";

import { Button, EmptyState } from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";

const modeParser = parseAsStringLiteral(["expert", "learn"] as const);

/** True when the viewer is in Explore & Learn mode (store only; safe outside Suspense). */
export function useIsLearnMode(): boolean {
  return useDashboard((s) => s.mode) === "learn";
}

/**
 * The Learn track is for Explore & Learn mode only; Expert mode sees a notice instead.
 * Reads search params, so render it inside the page's own <Suspense> boundary.
 */
export function LearnGate({ children }: { children: ReactNode }) {
  // Also read the URL, so a shared `/learn?mode=learn` link opens before the store hydrates from it.
  const [urlMode] = useQueryState("mode", modeParser);
  const isLearn = useIsLearnMode() || urlMode === "learn";
  const dispatch = useDispatch();

  if (isLearn) return <>{children}</>;

  return (
    <EmptyState
      icon={<BookOpen className="size-5" aria-hidden="true" />}
      eyebrow="Explore & Learn"
      title="The Learn track is part of Explore & Learn mode"
      description="Expert mode keeps to the research views: overview, explorer, compare and the What-if Lab. Switch to Explore & Learn to open the guided chapters."
      actions={
        <>
          <Button variant="primary" size="sm" onClick={() => dispatch({ type: "setMode", mode: "learn" })}>
            Switch to Explore & Learn
          </Button>
          <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "navigate", route: "/overview" })}>
            Back to Mission overview
          </Button>
        </>
      }
    />
  );
}
