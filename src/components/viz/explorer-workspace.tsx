"use client";

import { useDashboard } from "@/lib/store";
import type { ExperimentDataset } from "@/types/experiment";

import { CatalogHydrator } from "./catalog-hydrator";
import { filterExperiments } from "./dataset-queries";
import { ExperimentMatrix } from "./experiment-matrix";
import { FacetBar } from "./facet-bar";
import { ParameterSpaceMap } from "./parameter-space-map";

export function ExplorerWorkspace({ dataset }: { dataset: ExperimentDataset }) {
  const filters = useDashboard((s) => s.filters);
  const mode = useDashboard((s) => s.mode);
  const filtered = filterExperiments(dataset.experiments, filters);

  return (
    <div className="space-y-5">
      <CatalogHydrator experiments={dataset.experiments} />

      <div className="space-y-1">
        <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
          {dataset.accession} · BASS-II · {dataset.count} Records
        </p>
        <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
          Experiment Explorer
        </h1>
        <p className="text-[0.875rem] text-[var(--text-2)] max-w-3xl">
          {mode === "learn"
            ? "Explore every ISS combustion test in NASA's BASS-II archive. Click fuel pills or drag across the Oxygen × Airflow map to isolate real burns."
            : `Filter ${dataset.count} runs in the telemetry matrix and inspect initial O₂ versus median airflow on the linked scatterplot.`}
        </p>
      </div>

      <FacetBar experiments={dataset.experiments} filteredCount={filtered.length} />

      <ParameterSpaceMap allExperiments={dataset.experiments} filteredExperiments={filtered} />

      <ExperimentMatrix experiments={filtered} />
    </div>
  );
}
