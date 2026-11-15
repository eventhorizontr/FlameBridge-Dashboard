"use client";

import { GitCompareArrows, Images, Map as MapIcon, Rows3, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, tabId, tabPanelId, Tabs } from "@/components/ui";
import { FlameLibrary, type LibraryEntry } from "@/components/vision/flame-library";
import { useDashboard, useDispatch } from "@/lib/store";
import type { ExperimentDataset } from "@/types/experiment";

import { CatalogHydrator } from "./catalog-hydrator";
import { filterExperiments } from "./dataset-queries";
import { ExperimentMatrix } from "./experiment-matrix";
import { FacetBar, hasActiveFilters, RunSearch } from "./facet-bar";
import { ParameterSpaceMap } from "./parameter-space-map";

type RunsView = "table" | "map" | "gallery";

const VIEWS = [
  { value: "table", label: "Table", icon: <Rows3 />, hint: "Every run and its conditions, with the O₂ × airflow map" },
  { value: "map", label: "Map", icon: <MapIcon />, hint: "O₂ × airflow parameter space; drag to select" },
  { value: "gallery", label: "Gallery", icon: <Images />, hint: "Runs by their measured peak flame" },
] as const;

const isView = (v: string | null): v is RunsView => v === "table" || v === "map" || v === "gallery";

/**
 * Runs: find any burn. Filters on the left narrow one set of runs; Table / Map / Gallery are
 * lenses on that set. The lens is kept in `?view=` so a view can be shared.
 */
export function ExplorerWorkspace({ dataset, library = [] }: { dataset: ExperimentDataset; library?: LibraryEntry[] }) {
  const filters = useDashboard((s) => s.filters);
  const mode = useDashboard((s) => s.mode);
  const selection = useDashboard((s) => s.selection);
  const dispatch = useDispatch();
  const filtered = filterExperiments(dataset.experiments, filters);
  const [view, setView] = useState<RunsView>("table");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("view");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the shareable URL after hydration
    if (isView(fromUrl)) setView(fromUrl);
  }, []);

  const changeView = (next: RunsView) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "table") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const ids = new Set(filtered.map((e) => e.id));
  const gallery = library.filter((e) => ids.has(e.experimentId));
  const canCompare = selection.length >= 2 && selection.length <= 4;

  return (
    <div className="space-y-4">
      <CatalogHydrator experiments={dataset.experiments} />

      <div>
        <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">Experiment Explorer</h1>
        <p className="text-[0.9375rem] text-[var(--text-2)]">
          {mode === "learn"
            ? "Every burn NASA ran in BASS-II. Pick one to watch it, or narrow the list with the filters."
            : "Every BASS-II burn on the ISS. Filter, sort and open a run; tick 2–4 to send them to Compare."}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] p-2.5">
        <RunSearch className="w-full sm:w-72" />
        <p className="num text-[0.8125rem] text-[var(--text-2)]" aria-live="polite">
          <span className="font-semibold text-[var(--text-1)]">{filtered.length}</span> of {dataset.count} runs
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Tabs<RunsView> ariaLabel="Runs view" idBase="runs" value={view} onChange={changeView} items={VIEWS} />
          <Button
            size="sm"
            variant={canCompare ? "primary" : "secondary"}
            disabled={!canCompare}
            onClick={() => dispatch({ type: "compare", ids: selection })}
            title={canCompare ? "Open the selected runs in Compare" : "Tick 2–4 runs in the table or map"}
          >
            <GitCompareArrows className="size-3.5" aria-hidden="true" />
            <span>Compare selected ({selection.length})</span>
          </Button>
          {selection.length > 0 && (
            <button
              type="button"
              onClick={() => dispatch({ type: "selectExperiments", ids: [] })}
              aria-label="Clear selected runs"
              className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-3)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)] cursor-pointer"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Filters: sidebar on desktop, collapsible on small screens */}
        <details className="group rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] lg:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3.5 text-[0.875rem] text-[var(--text-1)]">
            <SlidersHorizontal className="size-4 text-[var(--accent)]" aria-hidden="true" />
            Filters{hasActiveFilters(filters) ? " · active" : ""}
          </summary>
          <FacetBar experiments={dataset.experiments} className="rounded-none border-0 border-t" />
        </details>
        <FacetBar experiments={dataset.experiments} className="hidden self-start lg:sticky lg:top-20 lg:block" />

        <div role="tabpanel" id={tabPanelId("runs", view)} aria-labelledby={tabId("runs", view)} className="min-w-0">
          {view === "table" && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_340px]">
              <ExperimentMatrix experiments={filtered} />
              <div className="hidden min-[1400px]:block">
                <div className="sticky top-20">
                  <ParameterSpaceMap allExperiments={dataset.experiments} filteredExperiments={filtered} compact />
                </div>
              </div>
            </div>
          )}
          {view === "map" && <ParameterSpaceMap allExperiments={dataset.experiments} filteredExperiments={filtered} />}
          {view === "gallery" && (
            <div className="space-y-3">
              <FlameLibrary entries={gallery} accession={dataset.accession} />
              {filtered.length > gallery.length && (
                <p className="text-[0.75rem] text-[var(--text-3)]">
                  {filtered.length - gallery.length} matching run{filtered.length - gallery.length === 1 ? " has" : "s have"} no measured flame
                  footage (no video, or the vision layer did not measure it) —{" "}
                  <button type="button" onClick={() => changeView("table")} className="text-[var(--accent)] hover:underline cursor-pointer">
                    see the table
                  </button>
                  .
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
