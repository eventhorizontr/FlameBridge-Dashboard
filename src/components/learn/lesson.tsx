"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  FlaskConical,
  GitCompareArrows,
  Microscope,
  RotateCcw,
  Target,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button, cn, EvidenceChip } from "@/components/ui";
import { lookupExperiment } from "@/components/viz/dataset-queries";
import { FlameViewer } from "@/components/viz/flame-viewer";
import type { LearnChapter } from "@/components/viz/learn-chapters";
import {
  ChapterAirflowWidget,
  ChapterGeometryCaveatWidget,
  ChapterGravityWidget,
  ChapterOxygenWidget,
} from "@/components/viz/learn-widgets";
import { WindTunnelSchematic } from "@/components/viz/wind-tunnel-schematic";
import { parameterRanges } from "@/lib/data/queries";
import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

import { BadgeMedal } from "./badge-medal";
import { REFERENCES, type ConceptCard, type LabKind, type LearnModule, type ReferenceKey } from "./curriculum";
import { FireTriangle } from "./fire-triangle";
import { FlameNeeds } from "./flame-needs";
import { GravityWorlds } from "./gravity-worlds";
import { UCurve } from "./u-curve";
import type { WorldId } from "./worlds";
import { Formula } from "./formula";
import { hasPassed, passThreshold, type ModuleResult } from "./progress";

const STEPS = [
  { id: "brief", label: "Mission brief", Icon: Target },
  { id: "theory", label: "Concepts", Icon: BookOpen },
  { id: "lab", label: "Try it", Icon: Microscope },
  { id: "gate", label: "Quiz", Icon: CheckCircle2 },
] as const;
/** Unified modules learn and play in one "Explore" step. */
const UNIFIED_STEPS = [
  STEPS[0],
  { id: "explore", label: "Explore", Icon: Compass },
  STEPS[3],
] as const;
type StepId = (typeof STEPS)[number]["id"] | "explore";

const LETTERS = ["A", "B", "C", "D"] as const;

export interface LessonProps {
  module: LearnModule;
  /** Flight-data notes for the brief, when the module has them. */
  chapter: LearnChapter | undefined;
  experiments: readonly Experiment[];
  datasetDoi: string;
  result: ModuleResult | undefined;
  hasNext: boolean;
  onPass: (score: number, total: number) => void;
  onNext: () => void;
}

function ReferenceChip({ refKey, datasetDoi }: { refKey: ReferenceKey; datasetDoi: string }) {
  const ref = REFERENCES[refKey];
  return (
    <EvidenceChip
      id={ref.doi ? `doi:${ref.doi}` : `ref:${refKey}`}
      label={ref.label}
      kind={ref.doi === datasetDoi ? "dataset" : "publication"}
      href={ref.doi ? `https://doi.org/${ref.doi}` : ref.url}
      detail={ref.detail}
    />
  );
}

function TheoryPaper({ card, index, datasetDoi }: { card: ConceptCard; index: number; datasetDoi: string }) {
  return (
    <article
      className="learn-lift relative flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--paper-line)] bg-[var(--paper)] p-5 text-[var(--paper-ink)] shadow-[0_1px_0_var(--paper-2),0_12px_30px_-18px_rgb(0_0_0/0.8)] hover:shadow-[0_1px_0_var(--paper-2),0_18px_36px_-16px_rgb(0_0_0/0.9)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--paper-ink-2)]">
          Card {index + 1}
        </span>
      </div>
      <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{card.title}</h3>
      <p className="text-[0.875rem] leading-relaxed text-[var(--paper-ink)]">{card.body}</p>
      {card.formula && (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--paper-line)] bg-[var(--paper-2)]/60 px-3 py-3 text-center">
          <Formula source={card.formula} className="text-[1.0625rem] text-[var(--paper-accent)]" />
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {card.refs.map((key) => (
          <ReferenceChip key={key} refKey={key} datasetDoi={datasetDoi} />
        ))}
      </div>
    </article>
  );
}

function ModuleLab({ module, experiments }: { module: LearnModule; experiments: readonly Experiment[] }) {
  const labParams = useDashboard((s) => s.labParams);
  const dispatch = useDispatch();
  const [gravityEnv, setGravityEnv] = useState<"1g" | "ug">("ug");
  const [world, setWorld] = useState<WorldId>("earth");
  const [fan, setFan] = useState(false);
  const [selectedO2, setSelectedO2] = useState<number>();
  const o2Target =
    selectedO2 ??
    lookupExperiment("PSI-25:O4", experiments)?.conditions.o2InitialPct ??
    parameterRanges(experiments).o2InitialPct?.min ??
    0;
  const [flowRunId, setFlowRunId] = useState("PSI-25:O13a");
  const [geoRunId, setGeoRunId] = useState("PSI-25:M5");

  const openRun = (id: string) => dispatch({ type: "openExperiment", id });
  const compare = (ids: string[]) => dispatch({ type: "compare", ids });
  const openLabWithO2 = (o2Pct: number) => {
    dispatch({ type: "setLabParams", params: { ...labParams, o2Pct } });
    window.setTimeout(() => dispatch({ type: "navigate", route: "/lab" }), 80);
  };

  const render = (kind: LabKind) => {
    switch (kind) {
      case "fire-triangle":
        return <FireTriangle />;
      case "gravity-worlds":
        return (
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <GravityWorlds world={world} onWorldChange={setWorld} fan={fan} onFanChange={setFan} />
          </div>
        );
      case "u-curve":
        return <UCurve />;
      case "gravity-compare":
        return (
          <ChapterGravityWidget
            experiments={experiments}
            gravityEnv={gravityEnv}
            onGravityChange={setGravityEnv}
            onCompare={compare}
            onOpenRun={openRun}
          />
        );
      case "wind-tunnel":
        return (
          <div className="space-y-3">
            <WindTunnelSchematic />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <p className="text-[0.8125rem] text-[var(--text-2)]">
                Contrast concurrent (<span className="num text-[var(--text-1)]">PSI-25:O1</span>) and opposed (
                <span className="num text-[var(--text-1)]">PSI-25:P1</span>) spread side by side.
              </p>
              <Button size="sm" variant="secondary" onClick={() => compare(["PSI-25:O1", "PSI-25:P1"])}>
                <GitCompareArrows className="size-3.5" aria-hidden="true" />
                Compare O1 vs P1
              </Button>
            </div>
          </div>
        );
      case "oxygen-threshold":
        return (
          <ChapterOxygenWidget
            experiments={experiments}
            o2Target={o2Target}
            onO2Change={setSelectedO2}
            onOpenRun={openRun}
            onOpenLabWithO2={openLabWithO2}
          />
        );
      case "airflow-regime":
        return <ChapterAirflowWidget experiments={experiments} selectedRunId={flowRunId} onSelectRunId={setFlowRunId} onOpenRun={openRun} />;
      case "geometry-caveats":
        return <ChapterGeometryCaveatWidget experiments={experiments} selectedRunId={geoRunId} onSelectRunId={setGeoRunId} onOpenRun={openRun} />;
    }
  };

  return (
    <div className="space-y-6">
      {module.lab.map((kind, i) => (
        <section key={kind} aria-label={LAB_TITLES[kind]} className="space-y-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
            {i + 1}. {LAB_TITLES[kind]}
          </p>
          {render(kind)}
        </section>
      ))}
    </div>
  );
}

const LAB_TITLES: Record<LabKind, string> = {
  "fire-triangle": "Build a fire triangle",
  "gravity-worlds": "Light a flame on another world",
  "u-curve": "Find where a flame can live",
  "gravity-compare": "Compare with ISS footage",
  "wind-tunnel": "Inside the BASS-II wind tunnel",
  "oxygen-threshold": "Browse real runs by oxygen",
  "airflow-regime": "Read a real airflow schedule",
  "geometry-caveats": "Inspect a real sensor reading",
};

function Gate({
  module,
  result,
  hasNext,
  onPass,
  onNext,
}: Pick<LessonProps, "module" | "result" | "hasNext" | "onPass" | "onNext">) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const total = module.gate.length;
  const needed = passThreshold(total);
  const score = module.gate.filter((q, i) => answers[i] === q.correctIndex).length;
  const allAnswered = Object.keys(answers).length === total;
  const passed = submitted && hasPassed(score, total);

  function submit() {
    setSubmitted(true);
    if (hasPassed(score, total)) onPass(score, total);
  }

  function retry() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.875rem] text-[var(--text-2)]">
          Answer all {total} questions. Pass with <span className="num text-[var(--text-1)]">{needed}/{total}</span> (80 %) to
          unlock the next module.
        </p>
        {result && (
          <Badge variant="good">
            Passed before · <span className="num">{result.score}/{result.total}</span>
          </Badge>
        )}
      </div>

      <ol className="space-y-4 list-none p-0 m-0">
        {module.gate.map((q, qi) => {
          const chosen = answers[qi];
          const correct = chosen === q.correctIndex;
          return (
            <li key={qi} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-1)] p-4 space-y-3">
              <p id={`gate-${module.code}-${qi}`} className="text-[0.9375rem] font-medium text-[var(--text-1)]">
                <span className="num text-[var(--text-3)] mr-2">Q{qi + 1}</span>
                {q.prompt}
              </p>
              <div role="radiogroup" aria-labelledby={`gate-${module.code}-${qi}`} className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const reveal = submitted && isChosen;
                  return (
                    <button
                      key={oi}
                      type="button"
                      role="radio"
                      aria-checked={isChosen}
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                      className={cn(
                        "learn-lift flex items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-[0.875rem] leading-snug text-[var(--text-1)] disabled:cursor-default",
                        !isChosen && "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)]",
                        isChosen && !submitted && "border-[var(--flame-edge)] bg-[var(--ember-soft)]",
                        reveal && correct && "border-[var(--good)] bg-[var(--good)]/12",
                        reveal && !correct && "border-[var(--critical)] bg-[var(--critical)]/12",
                      )}
                    >
                      <span className="num shrink-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-3)] px-1.5 py-0.5 text-[0.75rem] text-[var(--text-2)]">
                        {LETTERS[oi] ?? oi + 1}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className={cn("flex items-start gap-2 text-[0.8125rem]", correct ? "text-[var(--text-1)]" : "text-[var(--text-2)]")}>
                  {correct ? (
                    <CheckCircle2 className="size-4 shrink-0 text-[var(--good)] mt-0.5" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-[var(--critical)] mt-0.5" aria-hidden="true" />
                  )}
                  <span>
                    <strong className="font-medium">{correct ? "Correct." : "Not quite."}</strong> {q.explanation}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <div className="flex justify-end">
          <Button variant="primary" disabled={!allAnswered} onClick={submit}>
            Check my answers
          </Button>
        </div>
      ) : passed ? (
        <div className="flex flex-col sm:flex-row items-center gap-5 rounded-[var(--radius-xl)] border border-[var(--ember)]/50 bg-[var(--ember-soft)] p-5">
          <BadgeMedal earned ignite size="lg" code={module.code} />
          <div className="flex-1 text-center sm:text-left space-y-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--flame-edge)]">Gate passed · +{module.xp} XP</p>
            <p className="text-[1.25rem] font-semibold text-[var(--text-1)]">Badge earned: {module.badge}</p>
            <p className="text-[0.875rem] text-[var(--text-2)]">
              Score <span className="num">{score}/{total}</span>. New rank: {module.rank}.
            </p>
          </div>
          {hasNext ? (
            <Button variant="primary" onClick={onNext}>
              Next module
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Link
              href="/lab"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-[0.875rem] font-medium text-[var(--bg)] hover:brightness-110"
            >
              <FlaskConical className="size-4" aria-hidden="true" />
              Open the What-if Lab
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-4">
          <p className="text-[0.875rem] text-[var(--text-1)]">
            Score <span className="num">{score}/{total}</span> — {needed} needed. Review the explanations, then try again.
          </p>
          <Button variant="secondary" onClick={retry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function Lesson({ module, chapter, experiments, datasetDoi, result, hasNext, onPass, onNext }: LessonProps) {
  const [step, setStep] = useState<StepId>("brief");
  const steps: readonly { id: StepId; label: string; Icon: typeof Target }[] = module.unified ? UNIFIED_STEPS : STEPS;
  const stepIndex = steps.findIndex((s) => s.id === step);
  const featured = lookupExperiment(module.featuredRunId, experiments);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--flame-edge)]">
            Module {module.code} · {module.xp} XP · Badge: {module.badge}
          </p>
          <h2 className="text-[1.5rem] sm:text-[2rem] font-semibold tracking-[-0.02em] text-[var(--text-1)] leading-[1.1]">
            {module.title}
          </h2>
          <p className="text-[0.875rem] text-[var(--text-2)]">{module.subtitle}</p>
        </div>
        {result && (
          <Badge variant="good">
            Completed · <span className="num">{result.score}/{result.total}</span>
          </Badge>
        )}
      </div>

      <div role="tablist" aria-label="Lesson steps" className={cn("grid gap-2", module.unified ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {steps.map((s, i) => {
          const active = s.id === step;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`lesson-tab-${s.id}`}
              aria-selected={active}
              aria-controls={`lesson-panel-${s.id}`}
              onClick={() => setStep(s.id)}
              className={cn(
                "learn-lift flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left",
                active
                  ? "border-[var(--flame-edge)] bg-[var(--ember-soft)] text-[var(--text-1)]"
                  : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-2)] hover:border-[var(--line-strong)]",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[0.75rem] num",
                  i < stepIndex ? "bg-[var(--ember)] text-[var(--bg)]" : active ? "bg-[var(--flame-edge)] text-[var(--bg)]" : "bg-[var(--surface-3)] text-[var(--text-3)]",
                )}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="text-[0.8125rem] font-medium">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`lesson-panel-${step}`} aria-labelledby={`lesson-tab-${step}`}>
        {step === "brief" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <blockquote className="relative rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-2)] p-5 pl-6">
                <span className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-[var(--flame-edge)]" aria-hidden="true" />
                <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--flame-edge)] mb-1.5">Opening question</p>
                <p className="text-[1.0625rem] leading-relaxed text-[var(--text-1)]">{module.hook}</p>
              </blockquote>
              <div className="space-y-2">
                <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">Learning objectives</p>
                <ul className="space-y-2">
                  {module.objectives.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-[0.9375rem] text-[var(--text-1)]">
                      <Target className="size-4 shrink-0 mt-1 text-[var(--flame-edge)]" aria-hidden="true" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
              {chapter && (
              <div className="space-y-2">
                <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">What to look for in the flight data</p>
                <div className="space-y-2 text-[0.9375rem] leading-relaxed text-[var(--text-2)]">
                  {chapter.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {chapter.citations.map((c, i) => (
                    <EvidenceChip
                      key={i}
                      id={c.doi ? `doi:${c.doi}` : c.runId ?? c.label}
                      label={c.label}
                      kind={c.doi === datasetDoi ? "dataset" : c.kind === "doi" ? "publication" : "experiment"}
                      href={c.doi ? `https://doi.org/${c.doi}` : c.runId ? `/experiments/${encodeURIComponent(c.runId)}` : undefined}
                      detail={c.detail}
                    />
                  ))}
                </div>
              </div>
              )}
              {!chapter && featured && (
                <p className="text-[0.875rem] leading-relaxed text-[var(--text-2)]">
                  The footage shows a real BASS-II burn ({featured.testId}) on the Space Station. Watch for where the flame
                  sits relative to the sample: that is where fuel vapour and oxygen meet.
                </p>
              )}
            </div>
            <div className="lg:col-span-5 min-w-0">
              {featured && (
                <FlameViewer
                  key={featured.id}
                  experiment={featured}
                  allExperiments={experiments}
                  compact
                  titleOverride={`Featured ISS run · ${featured.testId}`}
                />
              )}
            </div>
          </div>
        )}

        {step === "theory" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {module.cards.map((card, i) => (
              <TheoryPaper key={card.title} card={card} index={i} datasetDoi={datasetDoi} />
            ))}
          </div>
        )}

        {step === "lab" && <ModuleLab module={module} experiments={experiments} />}

        {step === "explore" && (
          <FlameNeeds
            cards={module.cards}
            renderRefs={(card) => card.refs.map((key) => <ReferenceChip key={key} refKey={key} datasetDoi={datasetDoi} />)}
          />
        )}

        {step === "gate" && (
          <Gate key={module.id} module={module} result={result} hasNext={hasNext} onPass={onPass} onNext={onNext} />
        )}
      </div>

      {step !== "gate" && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
          <Button variant="ghost" disabled={stepIndex === 0} onClick={() => setStep(steps[Math.max(0, stepIndex - 1)].id)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Button>
          <Button variant="primary" onClick={() => setStep(steps[stepIndex + 1].id)}>
            {steps[stepIndex + 1].label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
