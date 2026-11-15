"use client";

import { Activity, Box, ChevronDown, ChevronLeft, ChevronRight, FileText, FlaskConical, GitCompareArrows, Network, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { shellUiStore } from "@/components/layout/shell-state";
import {
  Badge,
  Button,
  EvidenceChip,
  formatMetricValue,
  formatNullWithReason,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  QABadge,
  tabId,
  tabPanelId,
  Tabs,
} from "@/components/ui";
import { useAssistant } from "@/lib/ai/client/use-assistant";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

import { CatalogHydrator } from "./catalog-hydrator";
import { characteristicSizeMm, representativeAirflow } from "./dataset-queries";
import { FlameStudio } from "@/components/vision/flame-studio";
import { FlameAnalytics, FlameGlance } from "@/components/vision/flame-analytics";

import { FlameViewer } from "./flame-viewer";
import { FlowSparkline } from "./flow-sparkline";

type ConditionsWithCoBound = Experiment["conditions"] & {
  coFinalLowerBoundPpm?: number | null;
};

type RunTab = "measurements" | "similarity" | "3d" | "source";

const RUN_TABS = [
  { value: "measurements", label: "Measurements", icon: <Activity />, hint: "Keyframes, flame area, frame size, radiometer and duct air over time" },
  { value: "similarity", label: "Similarity", icon: <Network />, hint: "How the flame changes, its phases, and frames that look alike" },
  { value: "3d", label: "3D flame", icon: <Box />, hint: "Volumetric flame reconstructed from the footage" },
  { value: "source", label: "Source & QA", icon: <FileText />, hint: "Fuel, hardware, QA flags and the verbatim PSI table row" },
] as const;

function Reading({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="num truncate text-[1.0625rem] font-semibold text-[var(--text-1)]" title={value}>
          {value}
        </p>
        {children}
      </div>
    </div>
  );
}

export interface ExperimentDetailViewProps {
  experiment: Experiment;
  allExperiments: readonly Experiment[];
  doi: string;
}

export function ExperimentDetailView({
  experiment,
  allExperiments,
  doi,
}: ExperimentDetailViewProps) {
  const mode = useDashboard((s) => s.mode);
  const dispatch = useDispatch();
  const { send } = useAssistant();
  const [showRaw, setShowRaw] = useState(false);
  const [tab, setTab] = useState<RunTab>("measurements");
  const index = allExperiments.findIndex((e) => e.id === experiment.id);
  const prevRun = index > 0 ? allExperiments[index - 1] : null;
  const nextRun = index >= 0 && index < allExperiments.length - 1 ? allExperiments[index + 1] : null;
  const sizeLabel =
    experiment.fuel.geometry === "film" || experiment.fuel.geometry === "slab"
      ? "Thickness"
      : experiment.fuel.geometry === "rod" || experiment.fuel.geometry === "spherical-section"
        ? "Diameter"
        : "Size";

  const cond = experiment.conditions as ConditionsWithCoBound;
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
    dispatch({
      type: "setLabParams",
      params: {
        ...(cond.o2InitialPct !== null ? { o2Pct: cond.o2InitialPct } : {}),
        ...(repAir !== null ? { airflowCmS: repAir } : {}),
        ...(experiment.fuel.material ? { material: experiment.fuel.material } : {}),
        ...(experiment.fuel.geometry ? { geometry: experiment.fuel.geometry } : {}),
        characteristicSizeMm: sizeMm,
      },
    });
    window.setTimeout(() => dispatch({ type: "navigate", route: "/lab" }), 80);
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

      {/* Header: identity + the three next steps */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5">
            <Link
              href={prevRun ? `/experiments/${encodeURIComponent(prevRun.id)}` : "#"}
              aria-disabled={!prevRun}
              aria-label={prevRun ? `Previous run ${prevRun.testId}` : "No previous run"}
              className={`flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] ${prevRun ? "text-[var(--text-2)] hover:text-[var(--text-1)]" : "pointer-events-none opacity-40"}`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={nextRun ? `/experiments/${encodeURIComponent(nextRun.id)}` : "#"}
              aria-disabled={!nextRun}
              aria-label={nextRun ? `Next run ${nextRun.testId}` : "No next run"}
              className={`flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] ${nextRun ? "text-[var(--text-2)] hover:text-[var(--text-1)]" : "pointer-events-none opacity-40"}`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div>
            <h1 className="num text-[1.75rem] sm:text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-1)]">
              Run {experiment.testId}
            </h1>
            <p className="text-[0.9375rem] text-[var(--text-2)]">{experiment.fuel.raw}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{experiment.principalInvestigator}</Badge>
            <Badge>Sample {experiment.sampleId}</Badge>
            {experiment.flowConfiguration && <Badge className="capitalize">{experiment.flowConfiguration} flow</Badge>}
            <QABadge flags={experiment.qa.flags} parse={experiment.qa.parse} showClean />
            <EvidenceChip
              id={`doi:${doi}`}
              label={`${experiment.investigation} · CC0`}
              kind="dataset"
              href={`https://doi.org/${doi}`}
              detail={`Verified telemetry record ${experiment.id} from NASA PSI-25 BASS-II (parse: ${experiment.qa.parse}). Test date per NASA ReadMe; the camera overlay shows +1 day (2012 leap-year counter offset).`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {companion && (
            <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "compare", ids: [experiment.id, companion.id] })}>
              <GitCompareArrows className="size-3.5" aria-hidden="true" />
              <span>Compare vs {companion.testId}</span>
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={openInWhatIf} title="Open these conditions in the What-if Lab">
            <FlaskConical className="size-3.5" aria-hidden="true" />
            <span>Find runs like this</span>
          </Button>
          <Button size="sm" variant="primary" onClick={askAiAboutRun}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Ask AI</span>
          </Button>
        </div>
      </div>

      {/* Conditions strip: what was set for this burn (PSI-25 test table) */}
      <div className="grid grid-cols-2 divide-[var(--line)] rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] sm:grid-cols-3 xl:grid-cols-6 xl:divide-x" title="Source: PSI-25 BASS-II test table">
        <Reading label="Initial O₂" value={cond.o2InitialPct != null ? `${cond.o2InitialPct} % vol` : "—"} />
        <Reading label="Airflow" value={repAir != null ? `${repAir} cm/s` : "—"}>
          {cond.airflowSetpointsCmS.length > 1 && <FlowSparkline setpoints={cond.airflowSetpointsCmS} width={64} height={20} />}
        </Reading>
        <Reading label="Fuel" value={[experiment.fuel.material, experiment.fuel.geometry].filter(Boolean).join(" · ") || "—"} />
        <Reading label={sizeLabel} value={sizeMm != null ? `${sizeMm} mm` : "—"} />
        <Reading label="Width" value={experiment.fuel.widthCm != null ? `${experiment.fuel.widthCm} cm` : "—"} />
        <Reading label="Test date" value={experiment.date ?? "—"} />
      </div>

      {/* Footage + headline measurements */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <FlameViewer experiment={experiment} allExperiments={allExperiments} />
        </div>
        <div className="xl:col-span-4">
          <FlameGlance experiment={experiment} onFindSimilar={() => setTab("similarity")} />
        </div>
      </div>

      <Tabs<RunTab> ariaLabel="Run details" idBase="run" value={tab} onChange={setTab} items={RUN_TABS} />

      {tab === "measurements" && (
        <div role="tabpanel" id={tabPanelId("run", "measurements")} aria-labelledby={tabId("run", "measurements")}>
          <FlameAnalytics experiment={experiment} section="measurements" />
        </div>
      )}
      {tab === "similarity" && (
        <div role="tabpanel" id={tabPanelId("run", "similarity")} aria-labelledby={tabId("run", "similarity")}>
          <FlameAnalytics experiment={experiment} section="similarity" />
        </div>
      )}
      {tab === "3d" && (
        <div role="tabpanel" id={tabPanelId("run", "3d")} aria-labelledby={tabId("run", "3d")}>
          <FlameStudio experiment={experiment} />
        </div>
      )}
      {tab === "source" && (
      <div role="tabpanel" id={tabPanelId("run", "source")} aria-labelledby={tabId("run", "source")} className="space-y-6">
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
                <dd className="font-medium text-[var(--text-1)]">{experiment.fuel.material ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Geometry</dt>
                <dd className="font-medium capitalize text-[var(--text-1)]">
                  {experiment.fuel.geometry ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Char. Size</dt>
                <dd className="num text-[var(--text-1)]">
                  {sizeMm !== null ? formatMetricValue(sizeMm, { unit: "mm", mode }).text : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Width</dt>
                <dd className="num text-[var(--text-2)]">
                  {formatMetricValue(experiment.fuel.widthCm, { unit: "cm", mode }).text}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Burn Sides</dt>
                <dd className="num text-[var(--text-2)]">
                  {experiment.fuel.burnSides ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Color</dt>
                <dd className="capitalize text-[var(--text-2)]">{experiment.fuel.color ?? "—"}</dd>
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
                    : "—"}
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
                    : formatNullWithReason("Not specified")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Fan / Pot Display (raw)</dt>
                <dd className="num text-[var(--text-2)]">{cond.fanDisplayRaw || "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-3)]">Radiometer Gain (raw)</dt>
                <dd className="num text-[var(--text-2)]">{cond.radiometerGainRaw || "—"}</dd>
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
      )}
    </div>
  );
}
