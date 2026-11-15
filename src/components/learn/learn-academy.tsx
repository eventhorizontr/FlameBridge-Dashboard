"use client";

import { ArrowRight, BookOpen, CheckCircle2, Flame, Lock, Map as MapIcon, Microscope, Rocket, RotateCcw, Sparkles, Star, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";

import { Badge, Button, cn, EvidenceChip } from "@/components/ui";
import { CatalogHydrator } from "@/components/viz/catalog-hydrator";
import { LEARN_CHAPTERS } from "@/components/viz/learn-chapters";
import { parameterRanges } from "@/lib/data/queries";
import { useDashboard, useDispatch } from "@/lib/store";
import type { ExperimentDataset } from "@/types/experiment";

import { BadgeMedal } from "./badge-medal";
import { LEARN_MODULES, TOTAL_XP } from "./curriculum";
import { EmberField } from "./ember-field";
import { GravityWorlds } from "./gravity-worlds";
import { Lesson } from "./lesson";
import { completedCount, currentRank, earnedXp, isUnlocked, nextModuleIndex } from "./progress";
import { learnProgressStore } from "./progress-store";
import { Roadmap, type NodeState } from "./roadmap";
import { SpaceBackdrop } from "./space-backdrop";
import { buoyancyStrength, WORLDS, type WorldId } from "./worlds";

const HOW_IT_WORKS = [
  { Icon: Target, title: "Brief", text: "An opening question, goals and a real ISS burn to watch." },
  { Icon: BookOpen, title: "Concepts", text: "Short notebook cards in plain language, each tied to a source." },
  { Icon: Microscope, title: "Try it", text: "Play with the idea, then check it against real PSI-25 runs." },
  { Icon: CheckCircle2, title: "Quiz", text: "Get 80 % of the questions right to earn XP, a badge and the next module." },
] as const;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function LearnAcademy({ dataset }: { dataset: ExperimentDataset }) {
  const mode = useDashboard((s) => s.mode);
  const dispatch = useDispatch();
  const completed = useStore(learnProgressStore, (s) => s.completed);
  const justEarned = useStore(learnProgressStore, (s) => s.justEarned);
  const recordPass = useStore(learnProgressStore, (s) => s.recordPass);
  const clearJustEarned = useStore(learnProgressStore, (s) => s.clearJustEarned);
  const reset = useStore(learnProgressStore, (s) => s.reset);

  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [world, setWorld] = useState<WorldId>("mars");
  const [fan, setFan] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const lessonRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(learnProgressStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      setHydrated(true);
      const next = nextModuleIndex(learnProgressStore.getState().completed);
      setSelected(next === -1 ? LEARN_MODULES.length - 1 : next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!justEarned) return;
    const t = window.setTimeout(clearJustEarned, 1600);
    return () => window.clearTimeout(t);
  }, [justEarned, clearJustEarned]);

  useEffect(() => {
    if (!launching) return;
    const t = window.setTimeout(() => setLaunching(false), 2600);
    return () => window.clearTimeout(t);
  }, [launching]);

  const notes = useMemo(() => new Map(LEARN_CHAPTERS.map((c) => [c.id, c])), []);

  const states: NodeState[] = LEARN_MODULES.map((m, i): NodeState =>
    completed[m.id] ? "done" : isUnlocked(i, completed) ? "open" : "locked",
  );
  const xp = earnedXp(completed);
  const done = completedCount(completed);
  const rank = currentRank(completed);
  const next = nextModuleIndex(completed);
  const xpPct = Math.round((xp / TOTAL_XP) * 100);
  const currentWorld = WORLDS.find((w) => w.id === world) ?? WORLDS[0];
  const lift = buoyancyStrength(currentWorld.gRel);

  const stats = useMemo(() => {
    const exps = dataset.experiments;
    const pis = new Set(exps.map((e) => e.principalInvestigator).filter(Boolean)).size;
    const ranges = parameterRanges(exps);
    const videos = exps.reduce((n, e) => n + e.videos.length, 0);
    return [
      { value: String(dataset.count), label: "ISS burns", detail: "Rows in the BASS-II Test Matrix" },
      { value: String(pis), label: "Science teams", detail: "Distinct PI field values" },
      {
        value: ranges.o2InitialPct ? `${ranges.o2InitialPct.min}–${ranges.o2InitialPct.max}` : "—",
        unit: "% O₂",
        label: "Oxygen tested",
        detail: "Recorded initial O₂ (% by volume)",
      },
      { value: String(videos), label: "Video files", detail: "PSI-25 footage catalogued for these runs" },
    ];
  }, [dataset]);

  function openLesson(index: number) {
    if (!isUnlocked(index, completed)) return;
    setSelected(index);
    setOpenIndex(index);
    window.requestAnimationFrame(() =>
      lessonRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }),
    );
  }

  function launch(index: number) {
    if (prefersReducedMotion()) {
      openLesson(index);
      return;
    }
    setLaunching(true);
    window.setTimeout(() => openLesson(index), 700);
  }

  const ctaIndex = next === -1 ? LEARN_MODULES.length - 1 : next;
  const selModule = LEARN_MODULES[selected];
  const selState = states[selected];
  const openModule = openIndex !== null ? LEARN_MODULES[openIndex] : undefined;

  return (
    <div className="space-y-6">
      <CatalogHydrator experiments={dataset.experiments} />

      {/* Hero: cartoon space scene with Mars and a rocket */}
      <section
        aria-labelledby="learn-hero-title"
        className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[radial-gradient(90%_110%_at_88%_70%,var(--ember-soft)_0%,transparent_60%),radial-gradient(90%_80%_at_0%_0%,var(--accent-soft)_0%,transparent_60%),var(--surface-1)] min-h-[440px] lg:min-h-[520px]"
      >
        <SpaceBackdrop world={world} launching={launching} className="pointer-events-none absolute inset-0 size-full" />
        <EmberField buoyancy={lift} className="pointer-events-none absolute inset-0 size-full opacity-60" />
        <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-12 lg:items-center lg:min-h-[520px]">
          <div className="lg:col-span-6 space-y-5 rounded-[var(--radius-xl)] bg-[rgb(11_16_25/0.55)] p-4 backdrop-blur-[6px] sm:p-5 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">

            <h1 id="learn-hero-title" className="text-[2.5rem] sm:text-[3.5rem] font-bold leading-[1] tracking-[-0.035em] text-[var(--text-1)]">
              Blast off!
              <span className="block bg-[linear-gradient(90deg,var(--flame-edge),var(--ember)_45%,var(--flame-core))] bg-clip-text text-transparent">
                Fire science beyond Earth
              </span>
            </h1>
            <p className="max-w-xl text-[1rem] leading-relaxed text-[var(--text-2)]">
              Would a campfire burn on Mars? What does a flame look like inside a spaceship? Pick a world, light a flame and
              finish five short missions with real videos from NASA&apos;s {dataset.count} fire tests on the Space Station.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" className="rounded-full px-6" onClick={() => launch(ctaIndex)}>
                <Rocket className="size-4" aria-hidden="true" />
                {done === 0 ? "Launch mission 1" : next === -1 ? "Review missions" : `Continue ${LEARN_MODULES[ctaIndex].code}`}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <a
                href="#learn-roadmap"
                className="learn-lift inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-5 py-2.5 text-[0.875rem] font-medium text-[var(--text-1)] hover:border-[var(--flame-edge)]/60"
              >
                <MapIcon className="size-4" aria-hidden="true" />
                Mission map
              </a>
              {mode !== "learn" && (
                <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "setMode", mode: "learn" })}>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Use Explore &amp; Learn display mode
                </Button>
              )}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-6 relative h-full" aria-hidden="true">
            <span className="kid-wiggle absolute right-[34%] top-[8%] rounded-[var(--radius-lg)] rounded-bl-none bg-[var(--text-1)] px-3 py-1.5 text-[0.875rem] font-bold text-[var(--bg)] shadow-[0_8px_24px_rgb(0_0_0/0.4)]">
              Next stop: Mars!
            </span>
          </div>
        </div>
      </section>

      {/* World picker */}
      <section
        aria-labelledby="learn-worlds-title"
        className="grid gap-5 rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface-1)] p-4 sm:p-6 lg:grid-cols-12 lg:items-center"
      >
        <div className="lg:col-span-5 space-y-3">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--flame-edge)]">Try it now</p>
          <h2 id="learn-worlds-title" className="text-[1.5rem] sm:text-[1.875rem] font-bold leading-tight tracking-[-0.02em] text-[var(--text-1)]">
            Where will your flame burn?
          </h2>
          <p className="text-[0.9375rem] leading-relaxed text-[var(--text-2)]">
            Tap Earth, Mars, the Moon or a spaceship in orbit. Less gravity means hot air rises more slowly, so the flame
            changes shape. Turn on the fan to see how astronauts bring fresh air to a flame.
          </p>
        </div>
        <div className="lg:col-span-7">
          <GravityWorlds world={world} onWorldChange={setWorld} fan={fan} onFanChange={setFan} />
        </div>
      </section>

      {/* Mission status */}
      <section aria-label="Mission status" className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-1)] p-4">
          <BadgeMedal earned={done > 0} code={done > 0 ? LEARN_MODULES[done - 1].code : "—"} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[1.0625rem] font-semibold text-[var(--text-1)]">{rank}</p>
              <span className="num text-[0.75rem] text-[var(--text-3)]">
                {xp}/{TOTAL_XP} XP
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Course XP"
              aria-valuemin={0}
              aria-valuemax={TOTAL_XP}
              aria-valuenow={xp}
              className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--ember),var(--flame-edge))] shadow-[0_0_12px_var(--ember-glow)] transition-[width] duration-[var(--dur-4)] ease-[var(--ease-out)]"
                style={{ width: `${hydrated ? xpPct : 0}%` }}
              />
            </div>
            <p className="text-[0.75rem] text-[var(--text-2)]">
              <span className="num">{done}/{LEARN_MODULES.length}</span> missions complete
            </p>
          </div>
        </div>
        <div className="lg:col-span-8 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-[var(--surface-1)] px-4 py-3">
              <p className="num text-[1.125rem] sm:text-[1.5rem] font-semibold leading-tight text-[var(--text-1)]">
                {s.value}
                {s.unit && <span className="ml-1 text-[0.75rem] font-normal text-[var(--text-3)]">{s.unit}</span>}
              </p>
              <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">{s.label}</p>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-2 bg-[var(--surface-1)] px-4 py-2 text-[0.75rem] text-[var(--text-3)]">
            Computed from the catalogue
            <EvidenceChip
              id={`doi:${dataset.doi}`}
              label={dataset.accession}
              kind="dataset"
              href={`https://doi.org/${dataset.doi}`}
              detail={stats.map((s) => `${s.label}: ${s.detail}`).join(" · ")}
            />
          </div>
        </div>
      </section>

      {/* Roadmap + module detail */}
      <section id="learn-roadmap" aria-labelledby="learn-roadmap-title" className="scroll-mt-6 grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface-1)] p-4 sm:p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">Mission map</p>
              <h2 id="learn-roadmap-title" className="text-[1.25rem] font-semibold text-[var(--text-1)]">
                Light the fuse, mission by mission
              </h2>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                    setOpenIndex(null);
                    setSelected(0);
                  }}
                >
                  Confirm reset
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)} disabled={done === 0}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset progress
              </Button>
            )}
          </div>
          <Roadmap
            modules={LEARN_MODULES}
            titles={LEARN_MODULES.map((m) => m.title)}
            states={states}
            selectedIndex={selected}
            onSelect={setSelected}
          />
          <p className="mt-2 text-[0.75rem] text-[var(--text-3)]">Use the arrow keys to move between missions. Progress is saved in this browser only.</p>
        </div>

        {selModule && (
          <aside aria-live="polite" className="lg:col-span-5 flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface-2)] p-5">
            <div className="flex items-start gap-4">
              <BadgeMedal earned={selState === "done"} ignite={justEarned === selModule.id} code={selModule.code} />
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--flame-edge)]">
                  Mission {selModule.code} · {selModule.xp} XP
                </p>
                <h3 className="text-[1.125rem] font-semibold leading-snug text-[var(--text-1)]">{selModule.title}</h3>
                <p className="text-[0.8125rem] text-[var(--text-2)]">
                  Badge <strong className="font-medium text-[var(--text-1)]">{selModule.badge}</strong> · Rank{" "}
                  <strong className="font-medium text-[var(--text-1)]">{selModule.rank}</strong>
                </p>
              </div>
            </div>
            <p className="text-[0.875rem] leading-relaxed text-[var(--text-2)]">{selModule.hook}</p>
            <ol className="m-0 list-none space-y-1.5 p-0">
              {[
                { label: "Brief & ISS footage", meta: selModule.featuredRunId.replace("PSI-25:", "") },
                ...selModule.cards.map((c) => ({ label: c.title, meta: "Concept" })),
                { label: "Try it", meta: `${selModule.lab.length} interactive` },
                { label: `Quiz · ${selModule.gate.length} questions`, meta: "80 %" },
              ].map((row, i) => (
                <li
                  key={`${row.label}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-[var(--text-1)]">
                    <span className="num grid size-5 shrink-0 place-items-center rounded-full bg-[var(--surface-3)] text-[0.6875rem] text-[var(--text-3)]">
                      {i + 1}
                    </span>
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0 text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-3)]">{row.meta}</span>
                </li>
              ))}
            </ol>
            <div className="mt-auto">
              {selState === "locked" ? (
                <p className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-[0.8125rem] text-[var(--text-2)]">
                  <Lock className="size-4 shrink-0 text-[var(--text-3)]" aria-hidden="true" />
                  Pass the quiz of {LEARN_MODULES[selected - 1]?.code} to unlock this mission.
                </p>
              ) : (
                <Button variant="primary" className="w-full" onClick={() => openLesson(selected)}>
                  {selState === "done" ? "Review mission" : "Start mission"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </aside>
        )}
      </section>

      {/* Lesson */}
      <section ref={lessonRef} aria-label="Lesson" className="scroll-mt-6">
        {openModule && openIndex !== null ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface-1)] p-4 sm:p-6">
            <Lesson
              key={openModule.id}
              module={openModule}
              chapter={openModule.flightNotesChapterId ? notes.get(openModule.flightNotesChapterId) : undefined}
              experiments={dataset.experiments}
              datasetDoi={dataset.doi}
              result={completed[openModule.id]}
              hasNext={openIndex < LEARN_MODULES.length - 1}
              onPass={(score, total) => recordPass(openModule.id, score, total)}
              onNext={() => openLesson(openIndex + 1)}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ Icon, title, text }, i) => (
              <div
                key={title}
                className="learn-float learn-lift rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-1)] p-4"
                style={{ animationDelay: `${i * 0.35}s`, animationDuration: `${3.6 + i * 0.4}s` }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--ember-soft)] text-[var(--flame-edge)]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="num text-[0.75rem] text-[var(--text-3)]">Step {i + 1}</span>
                </div>
                <p className="text-[0.9375rem] font-semibold text-[var(--text-1)]">{title}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--text-2)]">{text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Badge shelf */}
      <section aria-labelledby="learn-badges-title" className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface-1)] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="learn-badges-title" className="text-[1.125rem] font-semibold text-[var(--text-1)]">
            Badge case
          </h2>
          <Badge variant={done === LEARN_MODULES.length ? "good" : "neutral"}>
            <span className="num">{done}/{LEARN_MODULES.length}</span> earned
          </Badge>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {LEARN_MODULES.map((m) => {
            const earned = Boolean(completed[m.id]);
            return (
              <li key={m.id} className="flex flex-col items-center gap-2 text-center">
                <BadgeMedal earned={earned} ignite={justEarned === m.id} code={m.code} />
                <span className={cn("text-[0.8125rem] font-medium", earned ? "text-[var(--text-1)]" : "text-[var(--text-3)]")}>{m.badge}</span>
                <span className="sr-only">{earned ? "earned" : "locked"}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
