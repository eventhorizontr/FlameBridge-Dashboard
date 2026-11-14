"use client";

import { useEffect } from "react";

import { dashboardStore } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

/** Registers all real run & video IDs in the client store so reference checks validate against PSI-25. */
export function CatalogHydrator({ experiments }: { experiments: readonly Experiment[] }) {
  useEffect(() => {
    dashboardStore.getState().setCatalog(
      experiments.map((e) => ({
        id: e.id,
        videoIds: e.videos.map((v) => v.id),
      })),
    );
  }, [experiments]);

  return null;
}
