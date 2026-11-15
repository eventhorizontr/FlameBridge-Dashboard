"use client";

import { Images, Map as MapIcon, Rows3 } from "lucide-react";
import { useEffect, useState } from "react";

import { tabId, tabPanelId, Tabs } from "@/components/ui";
import { FlameLibrary, type LibraryEntry } from "@/components/vision/flame-library";
import { useDashboard } from "@/lib/store";
import type { ExperimentDataset } from "@/types/experiment";

import { CatalogHydrator } from "./catalog-hydrator";
import { filterExperiments } from "./dataset-queries";
import { ExperimentMatrix } from "./experiment-matrix";
import { FacetBar } from "./facet-bar";
import { ParameterSpaceMap } from "./parameter-space-map";

type AtlasView = "gallery" | "map" | "table";

const VIEWS = [
  { value: "gallery", label: "Gallery", icon: <Images />, hint: "Runs by their real peak flame" },
  { value: "map", label: "Map", icon: <MapIcon />, hint: "O₂ × airflow parameter space; drag to select" },
  { value: "table", label: "Table", icon: <Rows3 />, hint: "Every run and its telemetry, sortable" },
] as const;

const isView = (v: string | null): v is AtlasView => v === "gallery" || v === "map" || v === "table";

/**
 * Atlas (ADR-020): the single place to find a run. Facets on top filter every view; the view
 * switch is a lens on the same filtered set (Gallery → Map → Table), kept in `?view=` so it can be shared.
 */
export function ExplorerWorkspace({ dataset, library = [] }: { dataset: ExperimentDataset; library?: LibraryEntry[] }) {
  const filters = useDashboard((s) => s.filters);
  const mode = useDashboard((s) => s.mode);
  const filtered = filterExperiments(dataset.experiments, filters);
  const [view, setView] = useState<AtlasView>("gallery");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("view");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the shareable URL after hydration
    if (isView(fromUrl)) setView(fromUrl);
  }, []);

  const changeView = (next: AtlasView) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "gallery") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const filteredIds = new Set(filtered.map((e) => e.id));
  const gallery = library.filter((e) => filteredIds.has(e.experimentId));
  const withoutFlame = filtered.length - gallery.length;

  return (
    <div className="space-y-5">
      <CatalogHydrator experiments={dataset.experiments} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--flame-edge)]">
            {dataset.accession} · BASS-II · {dataset.count} runs
          </p>
          <h1 className="text-[1.75rem] sm:text-[2.25rem] font-semibold tracking-[-0.03em] text-[var(--text-1)]">Atlas</h1>
          <p className="max-w-3xl text-[0.875rem] text-[var(--text-2)]">
            {mode === "learn"
              ? "Every burn NASA ran in BASS-II. Pick a flame, or narrow the list with the filters — every view below shows the same runs."
              : "Facets filter all three lenses on the same set. Missing telemetry is listed verbatim, never coerced to 0."}
          </p>
        </div>
        <Tabs<AtlasView> ariaLabel="Atlas view" idBase="atlas" value={view} onChange={changeView} items={VIEWS} />
      </div>

      <FacetBar experiments={dataset.experiments} filteredCount={filtered.length} />

      <div role="tabpanel" id={tabPanelId("atlas", view)} aria-labelledby={tabId("atlas", view)}>
        {view === "gallery" && (
          <div className="space-y-3">
            <FlameLibrary entries={gallery} accession={dataset.accession} />
            {withoutFlame > 0 && (
              <p className="text-[0.75rem] text-[var(--text-3)]">
                {withoutFlame} of the {filtered.length} matching runs have no measured flame footage (no video archived, or the
                vision layer skipped it) —{" "}
                <button type="button" onClick={() => changeView("table")} className="text-[var(--accent)] hover:underline cursor-pointer">
                  see them in the table
                </button>
                .
              </p>
            )}
          </div>
        )}
        {view === "map" && <ParameterSpaceMap allExperiments={dataset.experiments} filteredExperiments={filtered} />}
        {view === "table" && <ExperimentMatrix experiments={filtered} />}
      </div>
    </div>
  );
}
