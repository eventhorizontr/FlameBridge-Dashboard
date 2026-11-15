"use client";

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import {
  AlertTriangle,
  Crosshair,
  ExternalLink,
  Film,
  GitCompareArrows,
  Pause,
  Play,
  Plus,
  StepBack,
  StepForward,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  Badge,
  Button,
  EmptyState,
  EvidenceChip,
  formatMetricValue,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  QABadge,
  SegmentedControl,
} from "@/components/ui";
import { FlameStage } from "@/components/vision/flame-stage";
import { useVisionContours, useVisionVideo } from "@/components/vision/use-vision";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment, ExperimentDataset, ExperimentVideo, VideoKind } from "@/types/experiment";
import type { FlameOverlay, FlameOverlayMode } from "@/types/vision";

import { CatalogHydrator } from "./catalog-hydrator";
import { characteristicSizeMm, lookupExperiment, representativeAirflow } from "./dataset-queries";
import { FlowSparkline } from "./flow-sparkline";

const COMPARE_SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
] as const;

const PRESETS: Array<{ label: string; subtitle: string; ids: string[] }> = [
  {
    label: "Concurrent vs. Opposed Rod (O1 vs P1)",
    subtitle: "PMMA 1/4\" rods · airflow sweep 20→1 vs 5→2 cm/s",
    ids: ["PSI-25:O1", "PSI-25:P1"],
  },
  {
    label: "PMMA Film Sweep (B1 vs B3 vs B5)",
    subtitle: "100 µm vs 200 µm films · 5 vs 2 cm/s airflow",
    ids: ["PSI-25:B1", "PSI-25:B3", "PSI-25:B5"],
  },
  {
    label: "Low-O₂, High-Flow & QA Slab (O4 vs O13a vs M5)",
    subtitle: "14.8% O₂ extinction limit vs 49→0 cm/s rod vs M5 CO >500 ppm",
    ids: ["PSI-25:O4", "PSI-25:O13a", "PSI-25:M5"],
  },
];

const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2] as const;

const KIND_LABELS: Record<VideoKind, string> = {
  primary: "Primary",
  "second-view": "2nd View",
  "still-sequence": "Still Seq",
};

function isStreamable(v: ExperimentVideo): boolean {
  const ext = v.ext.toLowerCase();
  return ext === ".mp4" || ext === ".webm" || ext === ".mov" || ext === ".m4v";
}

function formatClock(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00.0";
  const m = Math.floor(s / 60);
  const rest = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${rest}`;
}

interface CompareVideoTileProps {
  experiment: Experiment;
  seriesColor: string;
  rate: number;
  registerVideo: (id: string, el: HTMLVideoElement | null) => void;
  onDurationReport: (id: string, dur: number) => void;
  onTimeReport: (id: string, time: number) => void;
  onOpen: (id: string) => void;
}

function CompareVideoTile({
  experiment,
  seriesColor,
  rate,
  registerVideo,
  onDurationReport,
  onTimeReport,
  onOpen,
}: CompareVideoTileProps) {
  const streamable = experiment.videos.filter(isStreamable);
  const defaultVid =
    streamable.find((v) => v.kind === "primary") ?? streamable[0] ?? null;

  const [selectedId, setSelectedId] = useState<string>(defaultVid?.id ?? "");
  const [failed, setFailed] = useState(false);

  const activeVid =
    streamable.find((v) => v.id === selectedId) ?? defaultVid;

  const tileRef = useRef<HTMLVideoElement | null>(null);
  const globalOverlay = useDashboard((st) => st.flameOverlay);
  const [localOverlay, setLocalOverlay] = useState<FlameOverlay | null>(null);
  const overlay = localOverlay ?? globalOverlay;
  const visionLoad = useVisionVideo(experiment.investigation, activeVid?.id);
  const vision = visionLoad.status === "ready" && visionLoad.data.status === "ok" ? visionLoad.data : null;
  const contoursLoad = useVisionContours(
    experiment.investigation,
    activeVid?.id,
    Boolean(vision) && (overlay.mode === "outline" || overlay.mode === "isolate"),
  );

  useEffect(() => {
    if (tileRef.current) tileRef.current.playbackRate = rate;
  }, [rate, activeVid?.id]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-3)]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: seriesColor }}
          />
          <button
            type="button"
            onClick={() => onOpen(experiment.id)}
            className="num font-semibold text-[0.875rem] text-[var(--text-1)] hover:text-[var(--accent)] truncate cursor-pointer"
          >
            {experiment.testId} · {experiment.principalInvestigator}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {streamable.length > 1 && activeVid && (
            <select
              aria-label={`Camera stream for ${experiment.testId}`}
              value={activeVid.id}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setFailed(false);
              }}
              className="num h-6 px-1.5 rounded border border-[var(--line-strong)] bg-[var(--surface-1)] text-[0.6875rem] text-[var(--text-1)]"
            >
              {streamable.map((v, i) => (
                <option key={v.id} value={v.id}>
                  {KIND_LABELS[v.kind]} {streamable.length > 1 ? `#${i + 1}` : ""}
                </option>
              ))}
            </select>
          )}
          <span className="num text-[0.75rem] text-[var(--text-3)]">
            {experiment.conditions.o2InitialPct !== null
              ? `${experiment.conditions.o2InitialPct}% O₂`
              : "O₂ —"}
          </span>
        </div>
      </div>

      {!activeVid ? (
        <div className="aspect-video bg-[var(--bg)] flex flex-col items-center justify-center p-4 text-center gap-1.5">
          <Film className="size-5 text-[var(--text-3)]" aria-hidden="true" />
          <p className="text-[0.8125rem] text-[var(--text-2)]">
            No MP4 video recorded for {experiment.testId}
          </p>
        </div>
      ) : failed ? (
        <div className="aspect-video bg-[var(--bg)] flex flex-col items-center justify-center p-4 text-center gap-2">
          <AlertTriangle className="size-5 text-[var(--warning)]" aria-hidden="true" />
          <p className="text-[0.75rem] text-[var(--text-2)]">
            PSI S3 video stream unavailable for {experiment.testId}.
          </p>
          <Button size="sm" variant="ghost" onClick={() => setFailed(false)}>
            Retry
          </Button>
        </div>
      ) : (
        <FlameStage
          videoRef={tileRef}
          videoId={activeVid.id}
          experimentId={experiment.id}
          captureName={`${experiment.investigation}_${experiment.testId}`}
          analysis={vision}
          contours={contoursLoad.status === "ready" ? contoursLoad.data : null}
          overlay={overlay}
        >
        <video
          key={activeVid.id}
          ref={(el) => {
            tileRef.current = el;
            registerVideo(experiment.id, el);
          }}
          src={activeVid.href}
          crossOrigin="anonymous"
          playsInline
          muted
          loop
          preload="metadata"
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = rate;
            if (Number.isFinite(e.currentTarget.duration)) {
              onDurationReport(experiment.id, e.currentTarget.duration);
            }
          }}
          onTimeUpdate={(e) => onTimeReport(experiment.id, e.currentTarget.currentTime)}
          onError={() => setFailed(true)}
          className="w-full aspect-video bg-[var(--bg)] object-contain"
        />
        </FlameStage>
      )}

      {vision && (
        <div className="px-2 py-1 border-t border-[var(--line)] flex flex-wrap items-center gap-1.5 bg-[var(--surface-1)]">
          <SegmentedControl<FlameOverlayMode>
            ariaLabel={`Flame overlay for ${experiment.testId}`}
            size="sm"
            value={overlay.mode}
            onChange={(mode) => setLocalOverlay({ ...overlay, mode })}
            options={[
              { value: "off", label: "Off" },
              { value: "box", label: "Frame" },
              { value: "outline", label: "Outline" },
              { value: "isolate", label: "Only" },
            ]}
          />
          <Button
            size="sm"
            variant={overlay.follow ? "accent-soft" : "ghost"}
            aria-pressed={overlay.follow}
            onClick={() => setLocalOverlay({ ...overlay, follow: !overlay.follow })}
            title="Crop to the flame and follow it"
          >
            <Crosshair className="size-3.5" aria-hidden="true" />
            <span>Follow</span>
          </Button>
          {localOverlay && (
            <button
              type="button"
              onClick={() => setLocalOverlay(null)}
              className="text-[0.6875rem] text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
            >
              use global
            </button>
          )}
        </div>
      )}

      <div className="px-3 py-1.5 border-t border-[var(--line)] flex items-center justify-between gap-2 text-[0.75rem] text-[var(--text-2)]">
        <span className="truncate">{experiment.fuel.raw}</span>
        <QABadge flags={experiment.qa.flags} parse={experiment.qa.parse} />
      </div>
    </div>
  );
}

type ConditionsWithBound = Experiment["conditions"] & {
  coFinalLowerBoundPpm?: number | null;
};

interface DiffField {
  label: string;
  values: string[];
  rawCompareValues: string[];
  renderCell?: (exp: Experiment, idx: number) => React.ReactNode;
}

export function CompareWorkspace({ dataset }: { dataset: ExperimentDataset }) {
  const flameOverlay = useDashboard((st) => st.flameOverlay);
  const compareIds = useDashboard((s) => s.compareIds);
  const mode = useDashboard((s) => s.mode);
  const dispatch = useDispatch();

  const [addSearch, setAddSearch] = useState("");
  const [diffMode, setDiffMode] = useState<"all" | "diff">("all");
  const [overlayView, setOverlayView] = useState<"chart" | "table">("chart");
  const [playingAll, setPlayingAll] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [masterTime, setMasterTime] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const chartDescId = useId();

  const comparedRuns = useMemo(() => {
    const unique: Experiment[] = [];
    const seen = new Set<string>();
    for (const id of compareIds) {
      const exp = lookupExperiment(id, dataset.experiments);
      if (exp && !seen.has(exp.id) && unique.length < 4) {
        seen.add(exp.id);
        unique.push(exp);
      }
    }
    return unique;
  }, [compareIds, dataset.experiments]);

  const registerVideo = (id: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el);
    } else {
      videoRefs.current.delete(id);
    }
  };

  const maxDuration = Math.max(0, ...comparedRuns.map((r) => durations[r.id] ?? 0));

  const togglePlayAll = () => {
    const next = !playingAll;
    for (const run of comparedRuns) {
      const v = videoRefs.current.get(run.id);
      if (!v) continue;
      if (next) {
        v.playbackRate = rate;
        void v.play().catch(() => undefined);
      } else {
        v.pause();
      }
    }
    setPlayingAll(next);
  };

  const seekAll = (timeS: number) => {
    const clamped = Math.max(0, maxDuration > 0 ? Math.min(maxDuration, timeS) : timeS);
    setMasterTime(clamped);
    for (const run of comparedRuns) {
      const v = videoRefs.current.get(run.id);
      if (v) v.currentTime = clamped;
    }
  };

  const stepAllFrames = (delta: number) => {
    if (playingAll) {
      for (const run of comparedRuns) videoRefs.current.get(run.id)?.pause();
      setPlayingAll(false);
    }
    seekAll(masterTime + delta / 30);
  };

  const removeRun = (id: string) => {
    dispatch({
      type: "compare",
      ids: comparedRuns.filter((r) => r.id !== id).map((r) => r.id),
    });
  };

  const addRun = (id: string) => {
    if (comparedRuns.length >= 4 || comparedRuns.some((r) => r.id === id)) return;
    dispatch({
      type: "compare",
      ids: [...comparedRuns.map((r) => r.id), id],
    });
    setAddSearch("");
  };

  const candidateRuns = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return dataset.experiments
      .filter((e) => !comparedRuns.some((c) => c.id === e.id))
      .filter(
        (e) =>
          !q ||
          `${e.testId} ${e.principalInvestigator} ${e.fuel.raw}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [addSearch, comparedRuns, dataset.experiments]);

  // Diff matrix rows
  const diffRows: DiffField[] = useMemo(() => {
    const fmt = (val: number | string | null | undefined, unit?: string, prec?: number) =>
      formatMetricValue(val, { unit, mode, precision: prec }).text;

    const specs: Array<{
      label: string;
      get: (e: Experiment) => string;
      renderCell?: (e: Experiment) => React.ReactNode;
    }> = [
      { label: "Principal Investigator", get: (e) => e.principalInvestigator },
      { label: "Sample ID", get: (e) => e.sampleId },
      { label: "Test Date (GMT Day)", get: (e) => `${e.date ?? "—"} (${e.gmtDay ?? "—"})` },
      { label: "Fuel Raw Text", get: (e) => e.fuel.raw },
      { label: "Fuel Material", get: (e) => e.fuel.material ?? "—" },
      { label: "Fuel Geometry", get: (e) => e.fuel.geometry ?? "—" },
      {
        label: "Characteristic Size",
        get: (e) => fmt(characteristicSizeMm(e.fuel), "mm", 2),
      },
      { label: "Flow Direction", get: (e) => e.flowConfiguration ?? "unlabeled" },
      {
        label: "Flow Restrictor",
        get: (e) => (e.conditions.flowRestrictor !== null ? String(e.conditions.flowRestrictor) : "—"),
      },
      { label: "Initial O₂", get: (e) => fmt(e.conditions.o2InitialPct, "%", 1) },
      { label: "Final O₂", get: (e) => fmt(e.conditions.o2FinalPct, "%", 1) },
      { label: "Initial CO₂", get: (e) => fmt(e.conditions.co2InitialPct, "%", 2) },
      { label: "Final CO₂", get: (e) => fmt(e.conditions.co2FinalPct, "%", 2) },
      { label: "Initial CO", get: (e) => fmt(e.conditions.coInitialPpm, "ppm") },
      {
        label: "Final CO",
        get: (e) => {
          const c = e.conditions as ConditionsWithBound;
          if (c.coFinalLowerBoundPpm != null) return `>${c.coFinalLowerBoundPpm} ppm`;
          return fmt(c.coFinalPpm, "ppm");
        },
      },
      {
        label: "Airflow Set-Points",
        get: (e) =>
          e.conditions.airflowSetpointsCmS.length > 0
            ? `${e.conditions.airflowSetpointsCmS.join(" → ")} cm/s`
            : "—",
        renderCell: (e) => (
          <div className="flex items-center gap-2">
            <FlowSparkline setpoints={e.conditions.airflowSetpointsCmS} />
            <span className="num text-[0.75rem]">
              {e.conditions.airflowSetpointsCmS.length > 0
                ? `${e.conditions.airflowSetpointsCmS.join(" → ")} cm/s`
                : "—"}
            </span>
          </div>
        ),
      },
      {
        label: "Representative Airflow",
        get: (e) => fmt(representativeAirflow(e), "cm/s", 1),
      },
      { label: "Total Frames Shot", get: (e) => fmt(e.totalFramesShot) },
      {
        label: "Operator Hints",
        get: (e) => (e.outcomeHints.length ? e.outcomeHints.join(", ") : "None"),
      },
      {
        label: "QA Flags",
        get: (e) => (e.qa.flags.length ? e.qa.flags.join("; ") : "Clean"),
        renderCell: (e) => <QABadge flags={e.qa.flags} parse={e.qa.parse} showClean />,
      },
    ];

    return specs.map((spec) => {
      const vals = comparedRuns.map((r) => spec.get(r));
      return {
        label: spec.label,
        values: vals,
        rawCompareValues: vals,
        renderCell: spec.renderCell,
      };
    });
  }, [comparedRuns, mode]);

  const visibleDiffRows =
    diffMode === "diff"
      ? diffRows.filter((row) => new Set(row.rawCompareValues).size > 1)
      : diffRows;

  // D3 Set-point trajectory scales
  const maxSteps = Math.max(2, ...comparedRuns.map((r) => r.conditions.airflowSetpointsCmS.length));
  const [, maxAirflow] = extent(comparedRuns.flatMap((r) => r.conditions.airflowSetpointsCmS));
  const [minO2, maxO2] = extent(
    comparedRuns
      .flatMap((r) => [r.conditions.o2InitialPct, r.conditions.o2FinalPct])
      .filter((v): v is number => v !== null),
  );

  const trajW = 420;
  const trajH = 220;
  const trajPad = { t: 18, r: 18, b: 36, l: 44 };
  const trajPlotW = trajW - trajPad.l - trajPad.r;
  const trajPlotH = trajH - trajPad.t - trajPad.b;

  const trajX = scaleLinear().domain([1, maxSteps]).range([0, trajPlotW]);
  const trajY = scaleLinear()
    .domain([0, Math.max(10, (maxAirflow ?? 20) * 1.15)])
    .range([trajPlotH, 0])
    .nice();
  const o2Y = scaleLinear()
    .domain([Math.max(10, (minO2 ?? 14) - 1), Math.min(26, (maxO2 ?? 23) + 1)])
    .range([trajPlotH, 0])
    .nice();

  const lineBuilder = line<{ step: number; val: number }>()
    .x((d) => trajX(d.step))
    .y((d) => trajY(d.val));

  return (
    <div className="space-y-6">
      <CatalogHydrator experiments={dataset.experiments} />

      {/* Title & Shareable URL Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
            Multi-Run Comparison · 2–4 Simultaneous Records
          </p>
          <h1 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
            Compare Runs
          </h1>
          <p className="text-[0.875rem] text-[var(--text-2)] max-w-2xl">
            Synchronized NASA S3 video playback, condition differences, and airflow set-point
            overlays synced directly with the shareable <code className="text-[var(--text-1)]">?cmp=</code> URL.
          </p>
        </div>

        <EvidenceChip
          id={`doi:${dataset.doi}`}
          label="PSI-25 Verified Telemetry"
          kind="dataset"
          href={`https://doi.org/${dataset.doi}`}
          detail="All metrics compared verbatim from NASA PSI-25 BASS-II; missing values remain explicit."
        />
      </div>

      {/* Selected Runs Pills + Add Picker + Presets */}
      <Panel surface="surface-1">
        <PanelBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                Active Slots ({comparedRuns.length}/4):
              </span>
              {comparedRuns.map((run, idx) => (
                <div
                  key={run.id}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-2.5 pr-1 py-1 text-[0.75rem]"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: COMPARE_SERIES[idx % COMPARE_SERIES.length] }}
                  />
                  <span className="num font-semibold text-[var(--text-1)]">{run.testId}</span>
                  <span className="text-[var(--text-3)] hidden sm:inline">
                    ({run.principalInvestigator})
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove run ${run.testId} from compare`}
                    onClick={() => removeRun(run.id)}
                    className="p-0.5 rounded text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            {comparedRuns.length < 4 && (
              <div className="relative min-w-[230px] flex-1 max-w-xs">
                <input
                  type="search"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Add run (e.g. O1, P1, B3, M5)…"
                  aria-label="Search runs to add to comparison"
                  className="w-full min-h-8 px-2.5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] text-[0.8125rem] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]"
                />
                {addSearch.trim() && (
                  <div className="absolute right-0 left-0 top-9 z-20 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--surface-1)] shadow-xl max-h-56 overflow-y-auto divide-y divide-[var(--line)]">
                    {candidateRuns.length > 0 ? (
                      candidateRuns.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => addRun(c.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface-3)] flex items-center justify-between gap-2 text-[0.75rem] cursor-pointer"
                        >
                          <span>
                            <strong className="num text-[var(--text-1)]">{c.testId}</strong> ·{" "}
                            <span className="text-[var(--text-2)]">{c.principalInvestigator}</span>
                          </span>
                          <Plus className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-[0.75rem] text-[var(--text-3)]">No matching runs</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--line)]">
            <span className="text-[0.75rem] text-[var(--text-3)]">Curated comparisons:</span>
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="sm"
                variant="secondary"
                title={preset.subtitle}
                className="max-w-full h-auto py-1 whitespace-normal text-left"
                onClick={() => dispatch({ type: "compare", ids: preset.ids })}
              >
                <GitCompareArrows className="size-3.5" aria-hidden="true" />
                <span>{preset.label}</span>
              </Button>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {comparedRuns.length < 2 ? (
        <EmptyState
          icon={<GitCompareArrows className="size-5" />}
          eyebrow="Select 2 to 4 Runs"
          title="Pick at least 2 runs to unlock side-by-side comparison"
          description="Choose a curated scientific preset above, type a run ID into the Add Run field, or select 2–4 checkboxes in the Atlas table."
          actions={
            <Button
              size="sm"
              variant="primary"
              onClick={() => dispatch({ type: "compare", ids: PRESETS[0].ids })}
            >
              Load {PRESETS[0].label}
            </Button>
          }
        />
      ) : (
        <>
          {/* Master Synchronized Video Grid */}
          <Panel surface="surface-1">
            <PanelHeader className="flex-wrap">
              <PanelTitle
                eyebrow="Synchronized Footage Grid"
                title={`Master Transport · ${comparedRuns.length} Streams`}
                actions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SegmentedControl<FlameOverlayMode>
                      ariaLabel="Flame overlay for all streams"
                      size="sm"
                      value={flameOverlay.mode}
                      onChange={(mode) => dispatch({ type: "setFlameOverlay", overlay: { mode } })}
                      options={[
                        { value: "off", label: "Off" },
                        { value: "box", label: "Frame" },
                        { value: "outline", label: "Outline" },
                        { value: "isolate", label: "Flame only" },
                      ]}
                    />
                    <Button
                      size="sm"
                      variant={flameOverlay.follow ? "accent-soft" : "ghost"}
                      aria-pressed={flameOverlay.follow}
                      onClick={() => dispatch({ type: "setFlameOverlay", overlay: { follow: !flameOverlay.follow } })}
                    >
                      <Crosshair className="size-3.5" aria-hidden="true" />
                      <span>Follow all</span>
                    </Button>
                    <Button size="sm" variant="primary" onClick={togglePlayAll}>
                      {playingAll ? (
                        <Pause className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="size-3.5" aria-hidden="true" />
                      )}
                      <span>{playingAll ? "Pause All" : "Play All"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Step all back one frame"
                      onClick={() => stepAllFrames(-1)}
                    >
                      <StepBack className="size-3.5" aria-hidden="true" />
                      <span className="num">-1f</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Step all forward one frame"
                      onClick={() => stepAllFrames(1)}
                    >
                      <span className="num">+1f</span>
                      <StepForward className="size-3.5" aria-hidden="true" />
                    </Button>
                    <div className="flex items-center gap-1 ml-1">
                      {PLAYBACK_RATES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={rate === r}
                          onClick={() => setRate(r)}
                          className={`num min-h-7 px-2 rounded-[var(--radius-sm)] border text-[0.75rem] cursor-pointer ${
                            rate === r
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                              : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)]"
                          }`}
                        >
                          {r}×
                        </button>
                      ))}
                    </div>
                  </div>
                }
              />
            </PanelHeader>

            <PanelBody className="space-y-4">
              {/* Master Sync Scrubber */}
              <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
                <span className="hidden sm:inline text-[0.75rem] text-[var(--text-2)] shrink-0">Sync Seek</span>
                <input
                  type="range"
                  aria-label="Master synchronized timeline scrubber"
                  min={0}
                  max={maxDuration > 0 ? maxDuration : 60}
                  step={1 / 30}
                  value={Math.min(masterTime, maxDuration > 0 ? maxDuration : 60)}
                  onChange={(e) => seekAll(Number(e.target.value))}
                  className="flex-1 min-w-0 accent-[var(--accent)] cursor-pointer"
                />
                <span className="num text-[0.75rem] text-[var(--text-1)] shrink-0">
                  {formatClock(masterTime)} / {maxDuration > 0 ? formatClock(maxDuration) : "—"}
                </span>
              </div>

              <div
                className={`grid gap-3 ${
                  comparedRuns.length === 3
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 md:grid-cols-2"
                }`}
              >
                {comparedRuns.map((run, idx) => (
                  <CompareVideoTile
                    key={run.id}
                    experiment={run}
                    seriesColor={COMPARE_SERIES[idx % COMPARE_SERIES.length]}
                    rate={rate}
                    registerVideo={registerVideo}
                    onDurationReport={(id, dur) =>
                      setDurations((prev) => (prev[id] === dur ? prev : { ...prev, [id]: dur }))
                    }
                    onTimeReport={(id, time) => {
                      if (id === comparedRuns[0]?.id) setMasterTime(time);
                    }}
                    onOpen={(id) => dispatch({ type: "openExperiment", id })}
                  />
                ))}
              </div>
            </PanelBody>
          </Panel>

          {/* D3 Set-Point & Gas Shift Overlay */}
          <Panel surface="surface-1">
            <PanelHeader className="flex-wrap">
              <PanelTitle
                eyebrow="D3 Telemetry Overlay"
                title="Airflow Set-Point Trajectories & O₂ Consumption Shift"
                actions={
                  <SegmentedControl<"chart" | "table">
                    ariaLabel="Overlay visualization mode"
                    size="sm"
                    value={overlayView}
                    onChange={setOverlayView}
                    options={[
                      { value: "chart", label: "Overlay Charts" },
                      { value: "table", label: "Data Table" },
                    ]}
                  />
                }
              />
            </PanelHeader>
            <PanelBody className="space-y-3">
              <p id={chartDescId} className="sr-only">
                Side-by-side D3 line charts comparing the airflow set-points across run steps and initial to final
                oxygen percentages for {comparedRuns.map((r) => r.testId).join(", ")}.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-[0.75rem]">
                {comparedRuns.map((run, idx) => (
                  <span key={run.id} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: COMPARE_SERIES[idx % COMPARE_SERIES.length] }}
                    />
                    <span className="num font-medium text-[var(--text-1)]">{run.testId}</span>
                    <span className="text-[var(--text-3)]">{run.principalInvestigator}</span>
                  </span>
                ))}
              </div>

              {overlayView === "chart" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Airflow set-points across step index */}
                  <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3">
                    <p className="text-[0.75rem] font-medium text-[var(--text-2)] mb-2">
                      Duct Airflow Set-Point Sequence (cm/s)
                    </p>
                    <svg
                      viewBox={`0 0 ${trajW} ${trajH}`}
                      className="w-full h-auto"
                      role="img"
                      aria-label="Airflow set-point trajectory overlay"
                      aria-describedby={chartDescId}
                    >
                      <g transform={`translate(${trajPad.l},${trajPad.t})`}>
                        {trajY.ticks(5).map((t) => (
                          <g key={`ay-${t}`} transform={`translate(0,${trajY(t)})`}>
                            <line x1={0} x2={trajPlotW} stroke="var(--line)" strokeDasharray="2 4" />
                            <text x={-6} dy="0.32em" textAnchor="end" fill="var(--text-3)" fontSize="10" className="num">
                              {t}
                            </text>
                          </g>
                        ))}
                        <line x1={0} y1={trajPlotH} x2={trajPlotW} y2={trajPlotH} stroke="var(--line-strong)" />
                        <line x1={0} y1={0} x2={0} y2={trajPlotH} stroke="var(--line-strong)" />
                        <text
                          x={trajPlotW / 2}
                          y={trajPlotH + 26}
                          textAnchor="middle"
                          fill="var(--text-3)"
                          fontSize="10"
                        >
                          Set-Point Step Index (1 = initial)
                        </text>

                        {comparedRuns.map((run, idx) => {
                          const pts = run.conditions.airflowSetpointsCmS.map((val, i) => ({
                            step: i + 1,
                            val,
                          }));
                          const color = COMPARE_SERIES[idx % COMPARE_SERIES.length];
                          const pathD = pts.length > 0 ? lineBuilder(pts) : null;
                          return (
                            <g key={run.id}>
                              {pathD && (
                                <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" />
                              )}
                              {pts.map((p) => (
                                <circle
                                  key={`${run.id}-${p.step}`}
                                  cx={trajX(p.step)}
                                  cy={trajY(p.val)}
                                  r={3.5}
                                  fill={color}
                                  stroke="var(--bg)"
                                  strokeWidth="1"
                                />
                              ))}
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>

                  {/* Right: Initial -> Final O2 Slope Graph */}
                  <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3">
                    <p className="text-[0.75rem] font-medium text-[var(--text-2)] mb-2">
                      Calibrated Oxygen Shift: Initial → Final (% vol)
                    </p>
                    <svg
                      viewBox={`0 0 ${trajW} ${trajH}`}
                      className="w-full h-auto"
                      role="img"
                      aria-label="Initial vs Final O2 percentage comparison"
                      aria-describedby={chartDescId}
                    >
                      <g transform={`translate(${trajPad.l},${trajPad.t})`}>
                        {o2Y.ticks(5).map((t) => (
                          <g key={`oy-${t}`} transform={`translate(0,${o2Y(t)})`}>
                            <line x1={0} x2={trajPlotW} stroke="var(--line)" strokeDasharray="2 4" />
                            <text x={-6} dy="0.32em" textAnchor="end" fill="var(--text-3)" fontSize="10" className="num">
                              {t.toFixed(1)}
                            </text>
                          </g>
                        ))}
                        <line x1={trajPlotW * 0.2} y1={0} x2={trajPlotW * 0.2} y2={trajPlotH} stroke="var(--line-strong)" />
                        <line x1={trajPlotW * 0.8} y1={0} x2={trajPlotW * 0.8} y2={trajPlotH} stroke="var(--line-strong)" />
                        <text x={trajPlotW * 0.2} y={trajPlotH + 22} textAnchor="middle" fill="var(--text-2)" fontSize="10">
                          Initial O₂ (%)
                        </text>
                        <text x={trajPlotW * 0.8} y={trajPlotH + 22} textAnchor="middle" fill="var(--text-2)" fontSize="10">
                          Final O₂ (%)
                        </text>

                        {comparedRuns.map((run, idx) => {
                          const color = COMPARE_SERIES[idx % COMPARE_SERIES.length];
                          const x0 = trajPlotW * 0.2;
                          const x1 = trajPlotW * 0.8;
                          const o0 = run.conditions.o2InitialPct;
                          const o1 = run.conditions.o2FinalPct;
                          return (
                            <g key={run.id}>
                              {o0 !== null && o1 !== null && (
                                <line
                                  x1={x0}
                                  y1={o2Y(o0)}
                                  x2={x1}
                                  y2={o2Y(o1)}
                                  stroke={color}
                                  strokeWidth="2.2"
                                />
                              )}
                              {o0 !== null && (
                                <circle cx={x0} cy={o2Y(o0)} r={4} fill={color} stroke="var(--bg)" />
                              )}
                              {o1 !== null && (
                                <circle cx={x1} cy={o2Y(o1)} r={4} fill={color} stroke="var(--bg)" />
                              )}
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--line)]">
                  <table className="w-full text-left border-collapse text-[0.8125rem]">
                    <thead className="bg-[var(--surface-3)] text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)]">
                      <tr>
                        <th className="py-2 px-3">Run</th>
                        <th className="py-2 px-3">Airflow Set-Points (cm/s)</th>
                        <th className="py-2 px-3 text-right">Initial O₂ (%)</th>
                        <th className="py-2 px-3 text-right">Final O₂ (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {comparedRuns.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 num font-medium text-[var(--text-1)]">{r.testId}</td>
                          <td className="py-2 px-3 num text-[var(--text-2)]">
                            {r.conditions.airflowSetpointsCmS.join(" → ") || "—"}
                          </td>
                          <td className="py-2 px-3 num text-right text-[var(--text-1)]">
                            {r.conditions.o2InitialPct ?? "—"}
                          </td>
                          <td className="py-2 px-3 num text-right text-[var(--text-1)]">
                            {r.conditions.o2FinalPct ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Highlighted Condition Diff Matrix */}
          <Panel surface="surface-1">
            <PanelHeader className="flex-wrap">
              <PanelTitle
                eyebrow="Telemetry & Conditions Diff Matrix"
                title="Side-by-Side Field Comparison"
                actions={
                  <SegmentedControl<"all" | "diff">
                    ariaLabel="Diff visibility filter"
                    size="sm"
                    value={diffMode}
                    onChange={setDiffMode}
                    options={[
                      { value: "all", label: "All fields" },
                      { value: "diff", label: "Differences only" },
                    ]}
                  />
                }
              />
            </PanelHeader>
            <PanelBody className="p-0 sm:p-0 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-[0.8125rem]">
                <thead className="bg-[var(--surface-3)] border-b border-[var(--line-strong)] text-[0.75rem]">
                  <tr>
                    <th className="py-2.5 pl-4 pr-3 text-[var(--text-3)] uppercase tracking-[0.06em] text-[0.6875rem] w-52">
                      Parameter
                    </th>
                    {comparedRuns.map((run, idx) => (
                      <th key={run.id} className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "openExperiment", id: run.id })}
                          className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-1)] hover:text-[var(--accent)] cursor-pointer"
                        >
                          <span
                            aria-hidden="true"
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: COMPARE_SERIES[idx % COMPARE_SERIES.length] }}
                          />
                          <span className="num">{run.testId}</span>
                          <ExternalLink className="size-3 text-[var(--text-3)]" aria-hidden="true" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {visibleDiffRows.map((row) => {
                    const differs = new Set(row.rawCompareValues).size > 1;
                    return (
                      <tr
                        key={row.label}
                        className={differs ? "bg-[var(--accent-soft)]/25" : undefined}
                      >
                        <th
                          scope="row"
                          className={`py-2 pl-4 pr-3 font-medium text-[var(--text-2)] align-top border-l-2 ${
                            differs ? "border-[var(--accent)]" : "border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{row.label}</span>
                            {differs && <Badge variant="accent">Δ</Badge>}
                          </div>
                        </th>
                        {comparedRuns.map((run, idx) => (
                          <td key={`${row.label}-${run.id}`} className="py-2 px-3 num text-[var(--text-1)] align-top">
                            {row.renderCell ? row.renderCell(run, idx) : row.values[idx]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </PanelBody>
          </Panel>
        </>
      )}
    </div>
  );
}
