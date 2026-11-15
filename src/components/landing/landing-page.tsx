"use client";

import { ArrowRight, Box, Compass, Film, FlaskConical, GitCompareArrows, Network, ScanEye, ShieldCheck, Sparkles, Type } from "lucide-react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { shellUiStore } from "@/components/layout/shell-state";
import { EvidenceChip } from "@/components/ui";
import { SITE } from "@/config/site";
import { useDispatch } from "@/lib/store";
import type { LandingPoster, LandingStats } from "@/lib/vision/landing";

const EASE = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, { duration: 1.6, ease: EASE, onUpdate: setShown });
    return () => controls.stop();
  }, [inView, value, reduce]);
  return (
    <span ref={ref} className="num">
      {shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Three rows of real flame posters drifting in opposite directions. */
function PosterField({ posters }: { posters: LandingPoster[] }) {
  const rows = useMemo(() => {
    const out: LandingPoster[][] = [[], [], []];
    posters.forEach((p, i) => out[i % 3].push(p));
    return out.map((r) => (r.length ? [...r, ...r] : r));
  }, [posters]);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 flex w-[180%] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] flex-col gap-3 opacity-80">
        {rows.map((row, r) => (
          <div
            key={r}
            className="flex w-max gap-3 motion-safe:animate-[drift_120s_linear_infinite]"
            style={{ animationDirection: r % 2 ? "reverse" : "normal", animationDuration: `${110 + r * 25}s` }}
          >
            {row.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${p.file}-${i}`}
                src={`/data/psi-25/vision/frames/${p.file}`}
                alt=""
                loading={i < 8 ? "eager" : "lazy"}
                className="h-[clamp(7rem,13vw,11rem)] aspect-[3/2] rounded-[var(--radius-md)] object-cover ring-1 ring-[var(--line)]"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(4_6_11/0.72)_0%,rgb(4_6_11/0.6)_45%,rgb(4_6_11/0.9)_75%,var(--bg)_95%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  );
}

function WayCard({ icon, title, kicker, body, cta, onClick, children }: {
  icon: ReactNode; title: string; kicker: string; body: string; cta: string; onClick: () => void; children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="glass group flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-xl)] text-left cursor-pointer"
    >
      <div className="relative h-44 overflow-hidden border-b border-[var(--line)]">{children}</div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <span className="flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--text-3)]">
          {icon}
          {kicker}
        </span>
        <h3 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">{title}</h3>
        <p className="text-[0.875rem] leading-relaxed text-[var(--text-2)]">{body}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[0.8125rem] font-medium text-[var(--accent)]">
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </motion.button>
  );
}

export function LandingPage({ stats }: { stats: LandingStats }) {
  const dispatch = useDispatch();
  const reduce = useReducedMotion();
  const posters = stats.posters;
  const headline = "Fire on the space station,";

  const pipeline = [
    { icon: <Film className="size-5" />, title: "ISS footage", metric: `${stats.videos} videos`, body: "The full BASS-II camera archive, streamed from NASA PSI." },
    { icon: <ScanEye className="size-5" />, title: "Flame segmentation", metric: `${(stats.analysedFrames / 1000).toFixed(0)}k frames`, body: "Every flame framed and measured, with per-frame QA flags." },
    { icon: <Type className="size-5" />, title: "Telemetry OCR", metric: stats.ocrAirReadRate != null ? `${(stats.ocrAirReadRate * 100).toFixed(2)} % read` : "—", body: "Air flow, fan and radiometer read back from the video overlay." },
    { icon: <Network className="size-5" />, title: "Contextual search", metric: `${stats.indexedFlames.toLocaleString("en-US")} flames`, body: "DINOv2 embeddings find the frames that look alike." },
    { icon: <Box className="size-5" />, title: "3D reconstruction", metric: "Abel inversion", body: "Axisymmetric emission and two-camera hulls, from real pixels." },
    { icon: <Sparkles className="size-5" />, title: "Research agent", metric: "tool-grounded", body: "An AI that cites the data and drives the dashboard." },
  ];

  return (
    <div className="overflow-x-clip">
      {/* ------------------------------------------------------------------ hero */}
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center">
        {posters.length > 0 && <PosterField posters={posters} />}
        <div className="relative mx-auto w-full max-w-[1200px] px-5 py-20 text-center sm:px-8">
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.75rem] text-[var(--text-2)]"
          >
            <span className="size-1.5 rounded-full bg-[var(--flame-edge)] shadow-[0_0_12px_var(--flame-edge)]" aria-hidden="true" />
            {SITE.challenge} · NASA PSI-25 BASS-II
          </motion.span>
          <h1 className="mt-7 text-balance text-[clamp(2.5rem,6.4vw,5.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
            <span className="block">
              {headline.split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  className="inline-block pr-[0.25em]"
                  initial={reduce ? false : { opacity: 0, y: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: EASE }}
                >
                  {word}
                </motion.span>
              ))}
            </span>
            <motion.span
              className="text-flame block"
              initial={reduce ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6, ease: EASE }}
            >
              measured frame by frame.
            </motion.span>
          </h1>
          <Reveal delay={0.8}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-[clamp(1rem,1.6vw,1.2rem)] leading-relaxed text-[var(--text-2)]">
              {stats.runs} solid-fuel burns from the International Space Station, turned into one instrument: computer vision on
              every frame, telemetry read back from the video, 3D flames reconstructed from real pixels, and an AI that answers
              only from the data.
            </p>
          </Reveal>
          <Reveal delay={0.95} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: "navigate", route: "/explore" })}
              style={{ backgroundImage: "var(--grad-flame)" }}
              className="group relative inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.9375rem] font-semibold text-[var(--bg)] shadow-[0_10px_40px_-10px_var(--ember)] cursor-pointer"
            >
              Open the Atlas
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => shellUiStore.getState().setAssistantOpen(true)}
              className="glass inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.9375rem] font-medium text-[var(--text-1)] cursor-pointer"
            >
              <Sparkles className="size-4 text-[var(--flame-hot)]" aria-hidden="true" />
              Ask the research AI
            </button>
          </Reveal>
          <Reveal delay={1.1}>
            <dl className="glass mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-xl)] sm:grid-cols-4">
              {[
                { label: "ISS burns", value: <CountUp value={stats.runs} /> },
                { label: "frames analysed", value: <CountUp value={stats.analysedFrames} /> },
                { label: "flame frames indexed", value: <CountUp value={stats.indexedFlames} /> },
                { label: "overlay OCR read rate", value: stats.ocrAirReadRate != null ? <CountUp value={stats.ocrAirReadRate * 100} decimals={2} suffix=" %" /> : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-[rgb(4_6_11/0.35)] px-5 py-5">
                  <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text-3)]">{s.label}</dt>
                  <dd className="mt-1.5 text-[clamp(1.4rem,2.6vw,2rem)] font-semibold tracking-[-0.03em] text-[var(--text-1)]">{s.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- three ways in */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8">
        <Reveal>
          <p className="text-[0.75rem] font-medium uppercase tracking-[0.16em] text-[var(--flame-edge)]">Three ways in</p>
          <h2 className="mt-3 max-w-3xl text-[clamp(1.8rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
            Find a burn, measure it, put it in context.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Reveal delay={0.05}>
            <WayCard
              icon={<Compass className="size-3.5" aria-hidden="true" />}
              kicker="Atlas"
              title="Every flame, at a glance"
              body="Browse all runs by their real flame, filter by fuel, oxygen and flow, and switch to the matrix or the parameter map."
              cta="Open the Atlas"
              onClick={() => dispatch({ type: "navigate", route: "/explore" })}
            >
              <div className="grid h-full grid-cols-4 gap-1 p-1">
                {posters.slice(0, 8).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.file} src={`/data/psi-25/vision/frames/${p.file}`} alt="" loading="lazy" className="size-full rounded-[var(--radius-sm)] object-cover" />
                ))}
              </div>
            </WayCard>
          </Reveal>
          <Reveal delay={0.12}>
            <WayCard
              icon={<ScanEye className="size-3.5" aria-hidden="true" />}
              kicker="Run"
              title="Frame it, measure it, see it in 3D"
              body="Bounding frame, outline or flame-only view on the footage, synced signals, frame search and a volumetric 3D flame."
              cta={posters[0] ? `Open run ${posters[0].testId}` : "Open a run"}
              onClick={() => posters[0] && dispatch({ type: "openExperiment", id: posters[0].experimentId })}
            >
              {posters[0] && (
                <div className="relative size-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/data/psi-25/vision/frames/${posters[0].file}`} alt="" className="size-full object-cover" />
                  <motion.div
                    aria-hidden="true"
                    className="absolute left-[24%] top-[22%] h-[56%] w-[52%] rounded-[4px] border-2 border-[var(--flame-edge)] shadow-[0_0_24px_var(--ember)]"
                    animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              )}
            </WayCard>
          </Reveal>
          <Reveal delay={0.19}>
            <WayCard
              icon={<FlaskConical className="size-3.5" aria-hidden="true" />}
              kicker="Lab & Compare"
              title="What-if, without inventing results"
              body="Place a hypothetical burn in the measured O₂ × flow × size space and get the closest real ISS runs — or compare runs side by side."
              cta="Open the Lab"
              onClick={() => dispatch({ type: "navigate", route: "/lab" })}
            >
              <svg viewBox="0 0 300 176" className="size-full" aria-hidden="true">
                {Array.from({ length: 46 }, (_, i) => {
                  const x = 30 + ((i * 53) % 240);
                  const y = 30 + ((i * 37) % 120);
                  return <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 4 : 2.5} fill={i % 3 ? "var(--series-1)" : "var(--series-2)"} opacity={0.7} />;
                })}
                <motion.circle
                  cx={150}
                  cy={88}
                  r={7}
                  fill="var(--flame-hot)"
                  animate={reduce ? undefined : { r: [6, 9, 6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {[ [120, 70], [178, 104], [160, 60] ].map(([x, y], i) => (
                  <line key={i} x1={150} y1={88} x2={x} y2={y} stroke="var(--text-2)" strokeDasharray="4 4" />
                ))}
              </svg>
            </WayCard>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="mt-5">
          <button
            type="button"
            onClick={() => dispatch({ type: "navigate", route: "/compare" })}
            className="glass flex w-full items-center justify-between gap-4 rounded-[var(--radius-xl)] px-6 py-5 text-left cursor-pointer hover:border-[var(--line-strong)]"
          >
            <span className="flex items-center gap-3">
              <GitCompareArrows className="size-5 text-[var(--accent)]" aria-hidden="true" />
              <span>
                <span className="block text-[0.9375rem] font-medium text-[var(--text-1)]">Compare up to four burns in sync</span>
                <span className="block text-[0.8125rem] text-[var(--text-2)]">Play all footage together with per-video framing, outline and flame-follow.</span>
              </span>
            </span>
            <ArrowRight className="size-4 text-[var(--accent)]" aria-hidden="true" />
          </button>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------- pipeline */}
      <section className="relative border-y border-[var(--line)] bg-[rgb(8_12_22/0.5)] py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Reveal>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.16em] text-[var(--accent)]">From pixels to physics</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(1.8rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
              One pipeline, from the camera to the answer.
            </h2>
          </Reveal>
          <div className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pipeline.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.06}>
                <div className="glass relative h-full rounded-[var(--radius-lg)] p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-3)] text-[var(--flame-hot)]">{step.icon}</span>
                    <span className="num text-[0.75rem] text-[var(--text-3)]">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-[1.0625rem] font-semibold text-[var(--text-1)]">{step.title}</h3>
                  <p className="num mt-1 text-[0.8125rem] text-[var(--accent)]">{step.metric}</p>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--text-2)]">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- trust */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <Reveal>
            <p className="flex items-center gap-2 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-[var(--good)]">
              <ShieldCheck className="size-4" aria-hidden="true" /> Science you can check
            </p>
            <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
              No invented numbers. Every value has a source.
            </h2>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-[var(--text-2)]">
              Areas are pixels, not millimetres — the footage has no scale. The radiometer is uncalibrated and says so. Lit, glowing
              or clipped frames are flagged, not hidden. The What-if Lab finds real runs; it never simulates results.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <EvidenceChip id="doi:10.60555/4qc4-de67" label="PSI-25 dataset" kind="dataset" href="https://doi.org/10.60555/4qc4-de67" />
              <EvidenceChip id="doi:10.1364/AO.31.001146" label="Abel inversion" kind="publication" href="https://doi.org/10.1364/AO.31.001146" />
              <EvidenceChip id="arxiv:2304.07193" label="DINOv2" kind="publication" href="https://arxiv.org/abs/2304.07193" />
              <EvidenceChip id="doi:10.1109/34.273735" label="Visual hull" kind="publication" href="https://doi.org/10.1109/34.273735" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: stats.dateAudit.total ? `${stats.dateAudit.match}/${stats.dateAudit.total}` : "—", label: "videos whose OCR'd date matches the NASA test matrix" },
                { value: stats.ocrAirReadRate != null ? `${(stats.ocrAirReadRate * 100).toFixed(2)} %` : "—", label: "duct air-flow values read from the video overlay" },
                { value: stats.measuredVideos.toString(), label: "videos measured; skipped and unreadable files are listed, not hidden" },
                { value: stats.o2Range ? `${stats.o2Range[0]}–${stats.o2Range[1]} %` : "—", label: "oxygen range of the measured envelope" },
              ].map((m) => (
                <div key={m.label} className="glass rounded-[var(--radius-lg)] p-5">
                  <p className="num text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold tracking-[-0.03em] text-[var(--text-1)]">{m.value}</p>
                  <p className="mt-2 text-[0.8125rem] leading-snug text-[var(--text-2)]">{m.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- experiment */}
      <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-[var(--radius-xl)] p-8 sm:p-12">
            <div aria-hidden="true" className="absolute -right-24 -top-24 size-80 rounded-full bg-[radial-gradient(circle,rgb(255_138_61/0.25),transparent_70%)]" />
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.16em] text-[var(--text-3)]">The experiment</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(1.6rem,3vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
              BASS-II: solid fuels burned in the Microgravity Science Glovebox, 2014.
            </h2>
            <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--text-2)]">
              PMMA films, slabs, rods and spheres and SIBAL fabric, burned in a small wind tunnel at controlled oxygen and air flow —
              where buoyancy disappears and flames take shapes they never take on Earth.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {stats.pis.map((p) => (
                <span key={p.name} className="num rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1.5 text-[0.8125rem] text-[var(--text-1)]">
                  {p.name} <span className="text-[var(--text-3)]">· {p.runs} runs</span>
                </span>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: "navigate", route: "/explore" })}
                style={{ backgroundImage: "var(--grad-flame)" }}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.875rem] font-semibold text-[var(--bg)] cursor-pointer"
              >
                Start exploring <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "navigate", route: "/learn" })}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--line-strong)] px-5 text-[0.875rem] font-medium text-[var(--text-1)] cursor-pointer hover:bg-[var(--surface-2)]"
              >
                New to combustion? Learn
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
