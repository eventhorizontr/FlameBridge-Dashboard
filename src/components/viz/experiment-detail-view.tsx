"use client";

import { ArrowLeft, ChevronDown, ChevronRight, FlaskConical, GitCompareArrows, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { shellUiStore } from "@/components/layout/shell-state";
import {
  Badge,
  Button,
  EvidenceChip,
  formatMetricValue,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  QABadge,
  Stat,
  Tooltip,
} from "@/components/ui";
import { useAssistant } from "@/lib/ai/client/use-assistant";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

import { CatalogHydrator } from "./catalog-hydrator";
import { characteristicSizeMm, representativeAirflow } from "./dataset-queries";
import { FlameViewer, type FlameCompanion } from "./flame-viewer";
import { FlowSparkline } from "./flow-sparkline";
import { measurementReason, missingValue } from "./measurement-notes";

export interface ExperimentDetailViewProps {
  experiment: Experiment;
  allExperiments: readonly FlameCompanion[];
  doi: string;
}

export function ExperimentDetailView({
  experiment,
  allExperiments,
  doi,
}: ExperimentDetailViewProps) {
  const mode = useDashboard((s) => s.mode);
  const dispatch = useDispatch();
  const dispatchMany = useDashboard((s) => s.dispatchMany);
  const { send } = useAssistant();
  const [showRaw, setShowRaw] = useState(false);

  const cond = experiment.conditions;
  const repAir = representativeAirflow(experiment);
  const sizeMm = characteristicSizeMm(experiment.fuel);

  const companion =
    allExperiments.find(
      (e) =>
        e.id !== experiment.id &&
        e.principalInvestigator === experiment.principalInvestigator &&
        e.videos.length > 0,
    ) ??
    allExperiments.find((e) => e.id !== experiment.id && e.videos.length > 0) ??
    null;

  const openInWhatIf = () => {
    dispatchMany([{
      type: "setLabParams",
      params: {
        ...(cond.o2InitialPct !== null ? { o2Pct: cond.o2InitialPct } : {}),
        ...(repAir !== null ? { airflowCmS: repAir } : {}),
        ...(experiment.fuel.material ? { material: experiment.fuel.material } : {}),
        ...(experiment.fuel.geometry ? { geometry: experiment.fuel.geometry } : {}),
        characteristicSizeMm: sizeMm,
      },
    }, { type: "navigate", route: "/lab" }]);
  };

  const askAiAboutRun = () => {
    shellUiStore.getState().setAssistantOpen(true);
    void send(
      `Inspect run ${experiment.testId} (${experiment.id}): summarize its conditions, fuel, airflow set-points, and any QA caveats.`,
    );
  };

  const rawEntries = Object.entries(experiment.raw);

  return (
    <div className="space-y-6">
      <CatalogHydrator experiments={allExperiments} />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[0.75rem]">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 text-[var(--text-2)] hover:text-[var(--accent)]"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Experiment Explorer</span>
            </Link>
            <span className="text-[var(--text-3)]">/</span>
            <span className="num text-[var(--text-2)]">{experiment.id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="num text-[1.75rem] sm:text-[2.25rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
              Run {experiment.testId}
            </h1>
            <Badge variant="accent">{experiment.principalInvestigator}</Badge>
            <Badge>Sample {experiment.sampleId}</Badge>
            {experiment.flowConfiguration && (
              <Badge className="capitalize">{experiment.flowConfiguration} flow</Badge>
            )}
            <QABadge flags={experiment.qa.flags} parse={experiment.qa.parse} showClean />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[0.8125rem] text-[var(--text-2)]">
            <Tooltip content="Actual ISS test date per NASA ReadMe; the on-board camera overlay shows +1 day due to a 2012 leap-year counter offset.">
              <span className="cursor-help">
                Test Date: <span className="num text-[var(--text-1)]">{experiment.date ?? missingValue("Date unavailable")}</span>
                {experiment.gmtDay !== null ? ` (GMT day ${experiment.gmtDay})` : ""}
              </span>
            </Tooltip>
            <EvidenceChip
              id={`doi:${doi}`}
              label={`${experiment.investigation} · CC0 1.0`}
              kind="dataset"
              href={`https://doi.org/${doi}`}
              detail={`Verified telemetry record ${experiment.id} from NASA PSI-25 BASS-II (parse: ${experiment.qa.parse}).`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {companion && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => dispatch({ type: "compare", ids: [experiment.id, companion.id] })}
            >
              <GitCompareArrows className="size-3.5" aria-hidden="true" />
              <span>Compare vs. {companion.testId}</span>
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={openInWhatIf}>
            <FlaskConical className="size-3.5" aria-hidden="true" />
            <span>Open in What-if Lab</span>
          </Button>
          <Button size="sm" variant="primary" onClick={askAiAboutRun}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Ask AI about {experiment.testId}</span>
          </Button>
        </div>
      </div>

      {/* Signature Flame Viewer */}
      <FlameViewer experiment={experiment} allExperiments={allExperiments} />

      {/* Gas Telemetry KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat
          label="Initial O₂"
          value={cond.o2InitialPct}
          unit="% vol"
          nullReason={measurementReason(experiment, "o2InitialPct")}
        />
        <Stat
          label="Final O₂"
          value={cond.o2FinalPct}
          unit="% vol"
          nullReason={measurementReason(experiment, "o2FinalPct")}
        />
        <Stat
          label="Initial CO₂"
          value={cond.co2InitialPct}
          unit="% vol"
          nullReason={measurementReason(experiment, "co2InitialPct")}
        />
        <Stat
          label="Final CO₂"
          value={cond.co2FinalPct}
          unit="% vol"
          nullReason={measurementReason(experiment, "co2FinalPct")}
        />
        <Stat
          label="Initial CO"
          value={cond.coInitialPpm}
          unit="ppm"
          nullReason={measurementReason(experiment, "coInitialPpm")}
        />
        <Stat
          label="Final CO"
          value={
            cond.coFinalLowerBoundPpm != null
              ? `>${cond.coFinalLowerBoundPpm}`
              : cond.coFinalPpm
          }
          unit="ppm"
          nullReason={measurementReason(experiment, "coFinalPpm")}
          delta={cond.coFinalLowerBoundPpm != null ? "Exclusive lower bound" : undefined}
        />
      </div>

      {/* Fuel & Tunnel Conditions Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Panel surface="surface-1" className="lg:col-span-6">
          <PanelHeader>
            <PanelTitle eyebrow="Fuel Specimen & Provenance" title="Fuel Composition & Geometry" />
          </PanelHeader>
          <PanelBody className="space-y-3 text-[0.8125rem]">
            <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                Verbatim &ldquo;Fuel Sample Material&rdquo; Cell
              </p>
              <p className="num text-[0.875rem] font-medium text-[var(--text-1)] mt-1">
                {experiment.fuel.raw}
              </p>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <dt className="text-[var(--text-3)]">Material</dt>
                <dd className="font-medium text-[var(--text-1)]">{experiment.fuel.material ?? missingValue("Material unavailable")}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Geometry</dt>
                <dd className="font-medium capitalize text-[var(--text-1)]">
                  {experiment.fuel.geometry ?? missingValue("Geometry unavailable")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Char. Size</dt>
                <dd className="num text-[var(--text-1)]">
                  {sizeMm !== null ? formatMetricValue(sizeMm, { unit: "mm", mode }).text : missingValue("No comparable thickness or diameter")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Width</dt>
                <dd className="num text-[var(--text-2)]">
                  {experiment.fuel.widthCm === undefined ? missingValue("Width unavailable") : formatMetricValue(experiment.fuel.widthCm, { unit: "cm", mode }).text}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Burn Sides</dt>
                <dd className="num text-[var(--text-2)]">
                  {experiment.fuel.burnSides ?? missingValue("Burn sides unavailable")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Color</dt>
                <dd className="capitalize text-[var(--text-2)]">{experiment.fuel.color ?? missingValue("Color unavailable")}</dd>
              </div>
            </dl>

            {experiment.fuel.inferred.length > 0 && (
              <div className="border-t border-[var(--line)] pt-2.5 space-y-1.5">
                <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Inferred Metadata & Sources
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[0.75rem] text-[var(--text-2)]">
                  {experiment.fuel.inferred.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </PanelBody>
        </Panel>

        <Panel surface="surface-1" className="lg:col-span-6">
          <PanelHeader>
            <PanelTitle eyebrow="MSG Glovebox Settings & QA" title="Airflow, Hardware & Quality Audit" />
          </PanelHeader>
          <PanelBody className="space-y-3 text-[0.8125rem]">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <div>
                <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Airflow Set-Points (cm/s · ~1 min sensor lag)
                </p>
                <p className="num text-[0.875rem] font-medium text-[var(--text-1)] mt-0.5">
                  {cond.airflowSetpointsCmS.length > 0
                    ? cond.airflowSetpointsCmS.join(" → ") + " cm/s"
                    : missingValue(measurementReason(experiment, "airflow"))}
                </p>
                {cond.airflowRaw && (
                  <p className="num text-[0.75rem] text-[var(--text-3)]">Raw cell: {cond.airflowRaw}</p>
                )}
              </div>
              <FlowSparkline setpoints={cond.airflowSetpointsCmS} width={110} height={32} />
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[var(--text-3)]">Flow Restrictor</dt>
                <dd className="num text-[var(--text-1)]">
                  {cond.flowRestrictor !== null
                    ? `${cond.flowRestrictor} (0=open … 2=max restriction)`
                    : missingValue("Restrictor position unavailable")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Fan / Pot Display (raw)</dt>
                <dd className="num text-[var(--text-2)]">{cond.fanDisplayRaw || missingValue("Fan display cell empty")}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Radiometer Gain (raw)</dt>
                <dd className="num text-[var(--text-2)]">{cond.radiometerGainRaw || missingValue("Radiometer gain cell empty")}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Operator Keyword Hints</dt>
                <dd className="flex flex-wrap gap-1 mt-0.5">
                  {experiment.outcomeHints.length > 0 ? (
                    experiment.outcomeHints.map((h) => (
                      <Badge key={h} variant="warning">{h}</Badge>
                    ))
                  ) : (
                    <span className="text-[var(--text-3)]">None extracted</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="border-t border-[var(--line)] pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                  Verbatim QA Flags ({experiment.qa.parse})
                </p>
              </div>
              {experiment.qa.flags.length > 0 ? (
                <ul className="space-y-1 text-[0.75rem] text-[var(--warning)]">
                  {experiment.qa.flags.map((flag) => (
                    <li key={flag} className="num rounded bg-[var(--warning)]/10 px-2 py-1 border border-[var(--warning)]/30">
                      {flag}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[0.75rem] text-[var(--good)]">
                  No parser or telemetry anomalies flagged on this row.
                </p>
              )}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Verbatim Source Row Inspection */}
      <Panel surface="surface-1">
        <PanelHeader>
          <PanelTitle
            eyebrow="Auditability"
            title={`Verbatim PSI-25 Source Table Row (${rawEntries.length} fields)`}
            actions={
              <Button
                size="sm"
                variant="ghost"
                aria-expanded={showRaw}
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? (
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                )}
                <span>{showRaw ? "Hide source cells" : "Inspect raw CSV row"}</span>
              </Button>
            }
          />
        </PanelHeader>
        {showRaw && (
          <PanelBody className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.75rem]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--text-3)] uppercase tracking-[0.06em]">
                  <th className="py-2 pr-4">CSV Column Header</th>
                  <th className="py-2">Verbatim Cell Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rawEntries.map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1.5 pr-4 font-medium text-[var(--text-2)] whitespace-nowrap">{k}</td>
                    <td className="py-1.5 num text-[var(--text-1)]">{v || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PanelBody>
        )}
      </Panel>
    </div>
  );
}
