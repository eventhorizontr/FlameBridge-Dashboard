"use client";

import { useEffect } from "react";

import { dashboardStore } from "@/lib/store";
export interface CatalogRunRef {
  id: string;
  videos: readonly { id: string }[];
}

/** Registers all real run & video IDs in the client store so reference checks validate against PSI-25. */
export function CatalogHydrator({ experiments }: { experiments: readonly CatalogRunRef[] }) {
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
