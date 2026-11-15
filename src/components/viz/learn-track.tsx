"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Compass,
  Flame,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  Layers,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
  SegmentedControl,
  Stat,
} from "@/components/ui";
import { parameterRanges } from "@/lib/data/queries";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment, ExperimentDataset } from "@/types/experiment";

import { CatalogHydrator } from "./catalog-hydrator";
import {
  characteristicSizeMm,
  lookupExperiment,
  representativeAirflow,
} from "./dataset-queries";
import { FlameViewer } from "./flame-viewer";
import { FlowSparkline } from "./flow-sparkline";
import { LEARN_CHAPTERS, type LearnChapter } from "./learn-chapters";
import { WindTunnelSchematic } from "./wind-tunnel-schematic";

const AIRFLOW_DEMO_IDS = ["PSI-25:O13a", "PSI-25:O1", "PSI-25:T1"] as const;
const GEOMETRY_DEMO_IDS = ["PSI-25:M5", "PSI-25:B1", "PSI-25:O1", "PSI-25:T1"] as const;
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export interface LearnTrackProps {
  dataset: ExperimentDataset;
}

function ChapterGravityWidget({
  experiments,
  gravityEnv,
  onGravityChange,
  onCompare,
  onOpenRun,
}: {
  experiments: readonly Experiment[];
  gravityEnv: "1g" | "ug";
  onGravityChange: (next: "1g" | "ug") => void;
  onCompare: (ids: string[]) => void;
  onOpenRun: (id: string) => void;
}) {
  const b3 = lookupExperiment("PSI-25:B3", experiments);
  const o1 = lookupExperiment("PSI-25:O1", experiments);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          ariaLabel="Gravity environment comparison"
          value={gravityEnv}
          onChange={onGravityChange}
          size="sm"
          options={[
            { value: "ug", label: "ISS Microgravity (μg)" },
            { value: "1g", label: "Earth Gravity (1g)" },
          ]}
        />
        {b3 && o1 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onCompare([b3.id, o1.id])}
          >
            <GitCompareArrows className="size-3.5" aria-hidden="true" />
            Compare B3 vs O1
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        <div className="md:col-span-5 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[0.75rem] text-[var(--text-3)] mb-2">
            <span>Illustrative Gas Transport</span>
            <Badge variant={gravityEnv === "ug" ? "accent" : "warning"}>
              {gravityEnv === "ug" ? "Weak buoyancy" : "Buoyant updraft"}
            </Badge>
          </div>
          <svg
            viewBox="0 0 260 150"
            role="img"
            aria-label={
              gravityEnv === "ug"
                ? "Illustration of gas transport with weak buoyancy"
                : "Illustration of upward buoyant gas transport"
            }
            className="w-full h-auto max-w-full rounded-[var(--radius-sm)] bg-[var(--bg)] border border-[var(--line)]"
          >
            <rect
              x="95"
              y="108"
              width="70"
              height="10"
              rx="2"
              fill="var(--surface-3)"
              stroke="var(--line-strong)"
            />
            {gravityEnv === "ug" ? (
              <g>
                <ellipse
                  cx="130"
                  cy="90"
                  rx="42"
                  ry="32"
                  fill="var(--accent)"
                  fillOpacity="0.16"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                <ellipse
                  cx="130"
                  cy="96"
                  rx="24"
                  ry="18"
                  fill="var(--accent)"
                  fillOpacity="0.24"
                  stroke="var(--accent)"
                  strokeOpacity="0.85"
                  strokeWidth="1.2"
                />
                <path
                  d="M44 90 L78 90 M216 90 L182 90"
                  stroke="var(--text-3)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x="130"
                  y="24"
                  textAnchor="middle"
                  fill="var(--text-2)"
                  fontSize="10"
                >
                  Weak buoyant updraft
                </text>
                <text
                  x="130"
                  y="140"
                  textAnchor="middle"
                  fill="var(--accent)"
                  fontSize="10"
                >
                  Conceptual illustration
                </text>
              </g>
            ) : (
              <g>
                <path
                  d="M130 22 C158 55 162 92 130 110 C98 92 102 55 130 22 Z"
                  fill="var(--warning)"
                  fillOpacity="0.22"
                  stroke="var(--warning)"
                  strokeWidth="2"
                />
                <path
                  d="M130 42 C145 66 146 92 130 106 C114 92 115 66 130 42 Z"
                  fill="var(--serious)"
                  fillOpacity="0.32"
                  stroke="var(--serious)"
                  strokeWidth="1.2"
                />
                <path
                  d="M66 96 L66 36 M66 36 L61 44 M66 36 L71 44"
                  stroke="var(--warning)"
                  strokeWidth="1.6"
                  fill="none"
                />
                <path
                  d="M194 96 L194 36 M194 36 L189 44 M194 36 L199 44"
                  stroke="var(--warning)"
                  strokeWidth="1.6"
                  fill="none"
                />
                <text
                  x="130"
                  y="140"
                  textAnchor="middle"
                  fill="var(--warning)"
                  fontSize="10"
                >
                  Arrows show a buoyant updraft
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 space-y-1.5">
            <p className="text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)]">
              Gas Transport
            </p>
            <p className="text-[0.875rem] font-medium text-[var(--text-1)]">
              {gravityEnv === "ug"
                ? "Molecular diffusion + controlled MSG draft"
                : "Gravity-driven buoyant updraft"}
            </p>
            <p className="text-[0.8125rem] text-[var(--text-2)]">
              {gravityEnv === "ug"
                ? "Freefall weakens the buoyancy-driven flow around the flame."
                : "Hot, less dense gases rise through cooler surrounding air."}
            </p>
          </div>
          {b3 && (
            <div className="sm:col-span-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[0.8125rem] text-[var(--text-2)] min-w-0">
                <span className="font-mono font-medium text-[var(--text-1)]">{b3.testId}</span>
                {" · "}
                {b3.fuel.material ?? "Fuel"} {b3.fuel.geometry ?? "sample"} ·{" "}
                <span className="num">
                  {formatMetricValue(b3.conditions.o2InitialPct, { unit: "% O2", precision: 1 }).text}
                </span>{" "}
                @{" "}
                <span className="num">
                  {formatMetricValue(representativeAirflow(b3), { unit: "cm/s", precision: 0 }).text}
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onOpenRun(b3.id)}>
                Open {b3.testId}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChapterOxygenWidget({
  experiments,
  o2Target,
  onO2Change,
  onOpenRun,
  onOpenLabWithO2,
}: {
  experiments: readonly Experiment[];
  o2Target: number;
  onO2Change: (next: number) => void;
  onOpenRun: (id: string) => void;
  onOpenLabWithO2: (o2Pct: number) => void;
}) {
  const matches = useMemo(() => {
    return experiments
      .filter(
        (exp) =>
          exp.conditions.o2InitialPct !== null &&
          Math.abs(exp.conditions.o2InitialPct - o2Target) <= 1.0,
      )
      .sort((a, b) => {
        const da = Math.abs((a.conditions.o2InitialPct ?? 0) - o2Target);
        const db = Math.abs((b.conditions.o2InitialPct ?? 0) - o2Target);
        return da - db;
      });
  }, [experiments, o2Target]);

  const oxygenRange = parameterRanges(experiments).o2InitialPct;
  if (!oxygenRange) {
    return <p className="text-sm text-[var(--text-2)]">— No initial oxygen readings in this dataset.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="learn-o2-scrubber"
            className="text-[0.875rem] font-medium text-[var(--text-1)]"
          >
            Measured Initial Tunnel O₂ Scrubber
          </label>
          <span className="num font-mono text-[1rem] font-semibold text-[var(--accent)]">
            {o2Target.toFixed(1)}% O₂
          </span>
        </div>
        <input
          id="learn-o2-scrubber"
          type="range"
          min={oxygenRange.min}
          max={oxygenRange.max}
          step={0.1}
          value={o2Target}
          onChange={(e) => onO2Change(Number(e.target.value))}
          className="w-full accent-[var(--accent)] cursor-pointer"
        />
        <div className="flex justify-between text-[0.75rem] text-[var(--text-3)] num">
          <span>{oxygenRange.min.toFixed(1)}% recorded minimum</span>
          <span>{oxygenRange.max.toFixed(1)}% recorded maximum</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.75rem] uppercase tracking-[0.06em] text-[var(--text-3)]">
            Runs within 1 percentage point of the selection ({matches.length})
          </span>
          <Button
            size="sm"
            variant="accent-soft"
            onClick={() => onOpenLabWithO2(o2Target)}
          >
            <FlaskConical className="size-3.5" aria-hidden="true" />
            Find matches in What-if Lab
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {matches.slice(0, 6).map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => onOpenRun(exp.id)}
              className="text-left rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-3)] px-3 py-2 transition-colors min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[0.8125rem] font-semibold text-[var(--text-1)]">
                  {exp.testId}
                </span>
                <span className="num text-[0.75rem] text-[var(--accent)]">
                  {formatMetricValue(exp.conditions.o2InitialPct, { unit: "%", precision: 1 }).text}
                </span>
              </div>
              <p className="text-[0.75rem] text-[var(--text-2)] truncate">
                {exp.principalInvestigator} · {exp.fuel.material ?? "Fuel"}{" "}
                {exp.fuel.geometry ?? "sample"} ·{" "}
                {formatMetricValue(representativeAirflow(exp), { unit: "cm/s", precision: 0 }).text}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChapterAirflowWidget({
  experiments,
  selectedRunId,
  onSelectRunId,
  onOpenRun,
}: {
  experiments: readonly Experiment[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  onOpenRun: (id: string) => void;
}) {
  const candidates = AIRFLOW_DEMO_IDS.map((id) => lookupExperiment(id, experiments)).filter(
    (exp): exp is Experiment => Boolean(exp),
  );
  const activeRun =
    candidates.find((c) => c.id === selectedRunId) ?? candidates[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {candidates.map((run) => {
          const active = activeRun?.id === run.id;
          return (
            <Button
              key={run.id}
              size="sm"
              variant={active ? "primary" : "secondary"}
              onClick={() => onSelectRunId(run.id)}
            >
              <span className="font-mono">{run.testId}</span>
              <span className="opacity-80">({run.conditions.airflowSetpointsCmS.length} steps)</span>
            </Button>
          );
        })}
      </div>

      {activeRun && (
        <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.875rem] font-semibold text-[var(--text-1)]">
                {activeRun.testId} · {activeRun.principalInvestigator} (
                {activeRun.fuel.material ?? "Fuel"} {activeRun.fuel.geometry ?? "sample"})
              </p>
              <p className="text-[0.75rem] text-[var(--text-2)]">
                {activeRun.flowConfiguration ?? "unknown"} flow ·{" "}
                {
                  formatMetricValue(activeRun.conditions.o2InitialPct, {
                    unit: "% initial O2",
                    precision: 1,
                  }).text
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <FlowSparkline
                setpoints={activeRun.conditions.airflowSetpointsCmS}
                domainMax={Math.max(...candidates.flatMap((run) => run.conditions.airflowSetpointsCmS))}
                width={132}
                height={32}
              />
              <Button size="sm" variant="ghost" onClick={() => onOpenRun(activeRun.id)}>
                Inspect
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {activeRun.conditions.airflowSetpointsCmS.map((step, i) => (
              <Badge key={`${activeRun.id}-step-${i}`} variant="neutral">
                <span className="num font-mono">
                  #{i + 1}: {step} cm/s
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function ChapterGeometryCaveatWidget({
  experiments,
  selectedRunId,
  onSelectRunId,
  onOpenRun,
}: {
  experiments: readonly Experiment[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  onOpenRun: (id: string) => void;
}) {
  const candidates = GEOMETRY_DEMO_IDS.map((id) => lookupExperiment(id, experiments)).filter(
    (exp): exp is Experiment => Boolean(exp),
  );
  const activeRun =
    candidates.find((c) => c.id === selectedRunId) ?? candidates[0] ?? null;

  if (!activeRun) return null;
  const charSize = characteristicSizeMm(activeRun.fuel);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {candidates.map((run) => {
          const active = run.id === activeRun.id;
          return (
            <Button
              key={run.id}
              size="sm"
              variant={active ? "primary" : "secondary"}
              onClick={() => onSelectRunId(run.id)}
            >
              <span className="font-mono">{run.testId}</span>
              <span className="opacity-80">· {run.fuel.geometry ?? "sample"}</span>
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="Material" value={activeRun.fuel.material} nullReason="Unparsed fuel material" />
        <Stat label="Geometry" value={activeRun.fuel.geometry} nullReason="Unparsed geometry" />
        <Stat
          label="Thickness / Dia"
          value={charSize}
          unit="mm"
          precision={2}
          nullReason="No parsed mm value"
        />
        <Stat
          label="Final CO"
          value={
            activeRun.conditions.coFinalLowerBoundPpm === undefined
              ? activeRun.conditions.coFinalPpm
              : `> ${activeRun.conditions.coFinalLowerBoundPpm}`
          }
          unit="ppm"
          precision={0}
          nullReason={
            activeRun.qa.flags.find((flag) => flag.startsWith("coFinal:")) ??
            "Final CO reading unavailable"
          }
        />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[0.875rem] font-semibold text-[var(--text-1)]">
              {activeRun.testId}
            </span>
            <QABadge flags={activeRun.qa.flags} parse={activeRun.qa.parse} />
          </div>
          <Button size="sm" variant="ghost" onClick={() => onOpenRun(activeRun.id)}>
            Inspect Raw Record
          </Button>
        </div>

        <p className="text-[0.8125rem] text-[var(--text-2)] break-words">
          Raw Fuel Entry: <span className="text-[var(--text-1)]">{activeRun.fuel.raw}</span>
        </p>

        {activeRun.qa.flags.length > 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-2.5 flex items-start gap-2">
            <AlertTriangle
              className="size-4 shrink-0 text-[var(--warning)] mt-0.5"
              aria-hidden="true"
            />
            <div className="text-[0.8125rem] text-[var(--text-1)] space-y-1 min-w-0">
              <p className="font-medium">Catalog QA flags</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--text-2)] break-words">
                {activeRun.qa.flags.map((flag, idx) => (
                  <li key={`${activeRun.id}-flag-${idx}`}>{flag}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-[0.8125rem] text-[var(--text-3)]">
            The catalog has no QA flags for this run.
          </p>
        )}
      </div>
    </div>
  );
}

function InteractiveBadgeIcon({ chapter }: { chapter: LearnChapter }) {
  switch (chapter.interactiveKind) {
    case "gravity-compare":
      return <Flame className="size-4 text-[var(--accent)] shrink-0" aria-hidden="true" />;
    case "wind-tunnel":
      return <Compass className="size-4 text-[var(--accent)] shrink-0" aria-hidden="true" />;
    case "oxygen-threshold":
      return <Gauge className="size-4 text-[var(--accent)] shrink-0" aria-hidden="true" />;
    case "airflow-regime":
      return <Layers className="size-4 text-[var(--accent)] shrink-0" aria-hidden="true" />;
    case "geometry-caveats":
      return <ShieldAlert className="size-4 text-[var(--accent)] shrink-0" aria-hidden="true" />;
  }
}

export function LearnTrack({ dataset }: LearnTrackProps) {
  const labParams = useDashboard((s) => s.labParams);
  const dispatch = useDispatch();

  const [activeIndex, setActiveIndex] = useState(0);
  const [visitedChapters, setVisitedChapters] = useState<Record<string, boolean>>({
    [LEARN_CHAPTERS[0].id]: true,
  });
  const [quizSelections, setQuizSelections] = useState<Record<string, number | undefined>>({});

  const [gravityEnv, setGravityEnv] = useState<"1g" | "ug">("ug");
  const [selectedO2, setO2Target] = useState<number>();
  const o2Target = selectedO2 ?? lookupExperiment("PSI-25:O13a", dataset.experiments)?.conditions.o2InitialPct ??
    parameterRanges(dataset.experiments).o2InitialPct?.min ?? 0;
  const [selectedFlowRunId, setSelectedFlowRunId] = useState<string>("PSI-25:O13a");
  const [selectedGeoRunId, setSelectedGeoRunId] = useState<string>("PSI-25:M5");

  const chapter = LEARN_CHAPTERS[activeIndex] ?? LEARN_CHAPTERS[0];
  const featuredRun =
    lookupExperiment(chapter.featuredRunId, dataset.experiments) ?? dataset.experiments[0];

  const relatedRuns = useMemo(
    () =>
      chapter.relatedRunIds
        .map((id) => lookupExperiment(id, dataset.experiments))
        .filter((exp): exp is Experiment => Boolean(exp)),
    [chapter.relatedRunIds, dataset.experiments],
  );

  const solvedCount = useMemo(
    () =>
      LEARN_CHAPTERS.filter((c) => quizSelections[c.id] === c.quiz.correctIndex).length,
    [quizSelections],
  );

  const visitedCount = useMemo(
    () => LEARN_CHAPTERS.filter((c) => Boolean(visitedChapters[c.id])).length,
    [visitedChapters],
  );

  function selectChapter(nextIndex: number) {
    const clamped = Math.max(0, Math.min(LEARN_CHAPTERS.length - 1, nextIndex));
    const target = LEARN_CHAPTERS[clamped];
    setActiveIndex(clamped);
    setVisitedChapters((prev) => ({ ...prev, [target.id]: true }));
  }

  function handleOpenRun(id: string) {
    dispatch({ type: "openExperiment", id });
  }

  function handleCompareRuns(ids: string[]) {
    dispatch({ type: "compare", ids });
  }

  function handleOpenLabWithO2(o2Pct: number) {
    dispatch({ type: "setLabParams", params: { ...labParams, o2Pct } });
    window.setTimeout(() => dispatch({ type: "navigate", route: "/lab" }), 80);
  }

  const selectedQuizIdx = quizSelections[chapter.id];
  const hasAnswered = selectedQuizIdx !== undefined;
  const isQuizCorrect = selectedQuizIdx === chapter.quiz.correctIndex;

  return (
    <div className="space-y-5">
      <CatalogHydrator experiments={dataset.experiments} />

      {/* Header + Progress Summary */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">Learn</h1>
          <p className="text-[0.9375rem] text-[var(--text-2)] max-w-3xl">
            Five short chapters on why flames behave differently in orbit, each on a real ISS burn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Badge variant="neutral">
            <span className="num">{visitedCount}/{LEARN_CHAPTERS.length}</span> chapters
          </Badge>
          <Badge variant={solvedCount === LEARN_CHAPTERS.length ? "good" : "accent"}>
            <span className="num">{solvedCount}/{LEARN_CHAPTERS.length}</span> quizzes
          </Badge>
        </div>
      </div>

      {/* 5-Chapter Stepper */}
      <nav aria-label="Curriculum chapters">
        <div
          role="tablist"
          aria-label="Microgravity combustion chapters"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2"
        >
          {LEARN_CHAPTERS.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isSolved = quizSelections[item.id] === item.quiz.correctIndex;
            const isVisited = Boolean(visitedChapters[item.id]);

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectChapter(idx)}
                className={`text-left rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors flex items-start gap-2.5 min-w-0 ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-1)]"
                    : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {isSolved ? (
                    <CheckCircle2 className="size-4 text-[var(--good)]" />
                  ) : (
                    <Circle
                      className={`size-4 ${
                        isActive
                          ? "text-[var(--accent)]"
                          : isVisited
                            ? "text-[var(--text-2)]"
                            : "text-[var(--text-3)]"
                      }`}
                    />
                  )}
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)]">
                    Chapter 0{item.number}
                  </span>
                  <span className="block text-[0.8125rem] font-medium text-[var(--text-1)] line-clamp-2">
                    {item.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column: Narrative + Interactive Widget + Quiz Checkpoint */}
        <div className="xl:col-span-7 space-y-5 min-w-0">
          <Panel surface="surface-2">
            <PanelHeader>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <Badge variant="accent">
                  Chapter {chapter.number} of {LEARN_CHAPTERS.length}
                </Badge>
                <span className="text-[0.75rem] text-[var(--text-3)]">{chapter.subtitle}</span>
              </div>
              <BookOpen className="size-4 text-[var(--text-3)] shrink-0" aria-hidden="true" />
            </PanelHeader>
            <PanelBody className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-[1.25rem] sm:text-[1.5rem] font-semibold tracking-[-0.015em] text-[var(--text-1)]">
                  {chapter.title}
                </h2>
                <p className="text-[0.875rem] text-[var(--text-2)]">{chapter.summary}</p>
              </div>

              <div className="space-y-3 text-[0.9375rem] leading-relaxed text-[var(--text-1)]">
                {chapter.paragraphs.map((paragraph, pIdx) => (
                  <p key={`${chapter.id}-p-${pIdx}`}>{paragraph}</p>
                ))}
              </div>

              <div className="rounded-[var(--radius-sm)] border-l-2 border-[var(--accent)] bg-[var(--surface-1)] px-3.5 py-2.5">
                <p className="text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--accent)] font-medium mb-0.5">
                  Physical Takeaway
                </p>
                <p className="text-[0.875rem] text-[var(--text-1)]">{chapter.takeaway}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[0.75rem] text-[var(--text-3)]">Verified Sources:</span>
                {chapter.citations.map((cit, cIdx) => (
                  <EvidenceChip
                    key={`${chapter.id}-cit-${cIdx}`}
                    id={cit.doi ? `doi:${cit.doi}` : cit.runId ?? cit.label}
                    label={cit.label}
                    kind={cit.doi === dataset.doi ? "dataset" : cit.kind === "doi" ? "publication" : "experiment"}
                    href={
                      cit.doi
                        ? `https://doi.org/${cit.doi}`
                        : cit.runId
                          ? `/experiments/${encodeURIComponent(cit.runId)}`
                          : undefined
                    }
                    detail={cit.detail}
                  />
                ))}
              </div>
            </PanelBody>
          </Panel>

          {/* Interactive Chapter Mechanism Panel */}
          <Panel>
            <PanelHeader>
              <PanelTitle
                eyebrow={`Chapter 0${chapter.number}`}
                title="Hands-On Physics Explorer"
                actions={<InteractiveBadgeIcon chapter={chapter} />}
              />
            </PanelHeader>
            <PanelBody>
              {chapter.interactiveKind === "gravity-compare" && (
                <ChapterGravityWidget
                  experiments={dataset.experiments}
                  gravityEnv={gravityEnv}
                  onGravityChange={setGravityEnv}
                  onCompare={handleCompareRuns}
                  onOpenRun={handleOpenRun}
                />
              )}

              {chapter.interactiveKind === "wind-tunnel" && (
                <div className="space-y-4">
                  <WindTunnelSchematic />
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3">
                    <p className="text-[0.8125rem] text-[var(--text-2)]">
                      Contrast concurrent (<span className="font-mono text-[var(--text-1)]">PSI-25:O1</span>) vs opposed (<span className="font-mono text-[var(--text-1)]">PSI-25:P1</span>) spread side by side.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCompareRuns(["PSI-25:O1", "PSI-25:P1"])}
                    >
                      <GitCompareArrows className="size-3.5" aria-hidden="true" />
                      Compare O1 vs P1
                    </Button>
                  </div>
                </div>
              )}

              {chapter.interactiveKind === "oxygen-threshold" && (
                <ChapterOxygenWidget
                  experiments={dataset.experiments}
                  o2Target={o2Target}
                  onO2Change={setO2Target}
                  onOpenRun={handleOpenRun}
                  onOpenLabWithO2={handleOpenLabWithO2}
                />
              )}

              {chapter.interactiveKind === "airflow-regime" && (
                <ChapterAirflowWidget
                  experiments={dataset.experiments}
                  selectedRunId={selectedFlowRunId}
                  onSelectRunId={setSelectedFlowRunId}
                  onOpenRun={handleOpenRun}
                />
              )}

              {chapter.interactiveKind === "geometry-caveats" && (
                <ChapterGeometryCaveatWidget
                  experiments={dataset.experiments}
                  selectedRunId={selectedGeoRunId}
                  onSelectRunId={setSelectedGeoRunId}
                  onOpenRun={handleOpenRun}
                />
              )}
            </PanelBody>
          </Panel>

          {/* Quiz Checkpoint */}
          <Panel surface="surface-2">
            <PanelHeader>
              <PanelTitle
                eyebrow={`Chapter 0${chapter.number}`}
                title="Quiz Checkpoint"
                actions={
                  hasAnswered ? (
                    <Badge variant={isQuizCorrect ? "good" : "warning"}>
                      {isQuizCorrect ? "Solved" : "Review Answer"}
                    </Badge>
                  ) : null
                }
              />
            </PanelHeader>
            <PanelBody className="space-y-4">
              <p className="text-[0.9375rem] font-medium text-[var(--text-1)]">
                {chapter.quiz.question}
              </p>

              <div className="space-y-2" role="radiogroup" aria-label="Quiz answer choices">
                {chapter.quiz.options.map((option, optIdx) => {
                  const isChosen = selectedQuizIdx === optIdx;
                  const isCorrectOption = optIdx === chapter.quiz.correctIndex;
                  const letter = OPTION_LETTERS[optIdx] ?? String(optIdx + 1);

                  let borderStyle =
                    "border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-3)]";
                  if (isChosen && isCorrectOption) {
                    borderStyle =
                      "border-[var(--good)] bg-[var(--good)]/12 text-[var(--text-1)]";
                  } else if (isChosen && !isCorrectOption) {
                    borderStyle =
                      "border-[var(--warning)] bg-[var(--warning)]/12 text-[var(--text-1)]";
                  }

                  return (
                    <button
                      key={`${chapter.id}-opt-${optIdx}`}
                      type="button"
                      role="radio"
                      aria-checked={isChosen}
                      onClick={() =>
                        setQuizSelections((prev) => ({
                          ...prev,
                          [chapter.id]: optIdx,
                        }))
                      }
                      className={`w-full text-left rounded-[var(--radius-md)] border px-3.5 py-2.5 transition-colors flex items-start gap-3 ${borderStyle}`}
                    >
                      <span className="font-mono text-[0.75rem] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text-2)] shrink-0 mt-0.5">
                        {letter}
                      </span>
                      <span className="text-[0.875rem] text-[var(--text-1)] leading-snug">
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              {hasAnswered && (
                <div
                  className={`rounded-[var(--radius-md)] border p-3 text-[0.8125rem] space-y-1 ${
                    isQuizCorrect
                      ? "border-[var(--good)]/45 bg-[var(--good)]/10 text-[var(--text-1)]"
                      : "border-[var(--warning)]/45 bg-[var(--warning)]/10 text-[var(--text-1)]"
                  }`}
                >
                  <p className="font-semibold">
                    {isQuizCorrect
                      ? "Correct"
                      : "Try another choice"}
                  </p>
                  <p className="text-[var(--text-2)]">{chapter.quiz.explanation}</p>
                </div>
              )}

              {/* Footer Chapter Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={activeIndex === 0}
                  onClick={() => selectChapter(activeIndex - 1)}
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Previous Chapter
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  {activeIndex === LEARN_CHAPTERS.length - 1 ? (
                    <>
                      <Link
                        href="/lab"
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-[0.8125rem] font-medium text-[var(--bg)] hover:brightness-110"
                      >
                        <FlaskConical className="size-3.5" aria-hidden="true" />
                        Launch What-if Lab
                      </Link>
                      <Link
                        href="/explore"
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-[0.8125rem] text-[var(--text-1)] hover:border-[var(--accent)]/50"
                      >
                        Explore All {dataset.count} Runs
                      </Link>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => selectChapter(activeIndex + 1)}
                    >
                      Next Chapter
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            </PanelBody>
          </Panel>
        </div>

        {/* Right Column: Embedded ISS Video Viewer + Related PSI-25 Runs */}
        <div className="xl:col-span-5 space-y-5 min-w-0">
          {featuredRun && (
            <FlameViewer
              key={featuredRun.id}
              experiment={featuredRun}
              allExperiments={dataset.experiments}
              compact
              titleOverride={`Featured ISS Run · ${featuredRun.testId}`}
            />
          )}

          <Panel>
            <PanelHeader>
              <PanelTitle
                eyebrow="Source Evidence"
                title={`Cited PSI-25 Runs in Chapter 0${chapter.number}`}
              />
            </PanelHeader>
            <PanelBody className="space-y-2.5">
              {relatedRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-[0.875rem] font-semibold text-[var(--text-1)]">
                        {run.testId}
                      </span>
                      <Badge variant="neutral">{run.principalInvestigator}</Badge>
                      <QABadge flags={run.qa.flags} parse={run.qa.parse} />
                    </div>
                    <Button
                      size="sm"
                      variant="accent-soft"
                      onClick={() => handleOpenRun(run.id)}
                    >
                      Inspect Run
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[0.75rem]">
                    <div>
                      <span className="block text-[var(--text-3)]">Fuel</span>
                      <span className="text-[var(--text-2)]">
                        {run.fuel.material ?? "—"} · {run.fuel.geometry ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[var(--text-3)]">Initial O₂</span>
                      <span className="num text-[var(--text-1)]">
                        {
                          formatMetricValue(run.conditions.o2InitialPct, {
                            unit: "%",
                            precision: 1,
                          }).text
                        }
                      </span>
                    </div>
                    <div>
                      <span className="block text-[var(--text-3)]">Airflow</span>
                      <span className="num text-[var(--text-1)]">
                        {
                          formatMetricValue(representativeAirflow(run), {
                            unit: "cm/s",
                            precision: 0,
                          }).text
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
