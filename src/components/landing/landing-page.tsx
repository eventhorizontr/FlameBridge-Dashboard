"use client";

import { ArrowRight, BookOpen, FlaskConical, GitCompareArrows, Menu, Rows3, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { shellUiStore } from "@/components/layout/shell-state";
import { EvidenceChip } from "@/components/ui";
import { WindTunnelSchematic } from "@/components/viz/wind-tunnel-schematic";
import type { FuelFamily } from "@/components/viz/dataset-queries";
import { SITE } from "@/config/site";
import { useDispatch } from "@/lib/store";
import type { LandingBurn, LandingData } from "@/lib/vision/landing";

const POSTER = (file: string) => `/data/psi-25/vision/frames/${file}`;
const FAMILY: Record<FuelFamily, { label: string; color: string }> = {
  "film-slab": { label: "Film / Slab", color: "var(--series-1)" },
  "rod-sphere": { label: "Rod / Sphere", color: "var(--series-2)" },
  "fabric-other": { label: "Fabric / Candle", color: "var(--series-3)" },
};
const NAV = [
  { href: "/explore", label: "Runs" },
  { href: "/compare", label: "Compare" },
  { href: "/lab", label: "Lab" },
  { href: "/learn", label: "Learn" },
] as const;

const fmt = (v: number, d = 1) => (Number.isInteger(v) ? String(v) : v.toFixed(d));
const caption = (b: LandingBurn) =>
  [`Run ${b.testId}`, b.principalInvestigator, b.fuelRaw, b.o2Pct != null ? `${b.o2Pct} % O₂` : null, b.airflowCmS != null ? `${b.airflowCmS} cm/s` : null]
    .filter(Boolean)
    .join(" · ");

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Section({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
      <Reveal>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id={`${id}-title`} className="text-[1.5rem] sm:text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">
            {title}
          </h2>
          {action}
        </div>
        {children}
      </Reveal>
    </section>
  );
}

/** Real ISS flame posters (OSD blanked), cross-fading; static under reduced motion. */
function HeroFootage({ burns }: { burns: LandingBurn[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || burns.length < 2) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % burns.length), 4500);
    return () => window.clearInterval(id);
  }, [burns.length, reduce]);
  const b = burns[i];
  if (!b) return null;
  return (
    <figure className="space-y-3">
      <Link
        href={`/experiments/${encodeURIComponent(b.experimentId)}`}
        className="relative block aspect-[3/2] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-black shadow-[0_30px_80px_-30px_rgb(90_169_255/0.35)]"
        aria-label={`Open ${caption(b)}`}
      >
        <AnimatePresence mode="sync">
          <motion.img
            key={b.experimentId}
            src={POSTER(b.poster!.file)}
            alt={`Peak flame of run ${b.testId} on the ISS`}
            className="absolute inset-0 size-full object-cover"
            initial={reduce ? false : { opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        </AnimatePresence>
        <span className="num absolute left-3 top-3 rounded-[var(--radius-sm)] bg-[rgb(6_9_15/0.75)] px-2 py-0.5 text-[0.6875rem] text-[var(--text-2)]">
          {b.pick} · peak frame
        </span>
      </Link>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="num text-[0.8125rem] text-[var(--text-2)]">{caption(b)}</span>
        <span className="flex gap-1.5" role="tablist" aria-label="Featured burns">
          {burns.map((x, n) => (
            <button
              key={x.experimentId}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Show run ${x.testId}`}
              onClick={() => setI(n)}
              className={`h-2 rounded-full transition-all cursor-pointer ${n === i ? "w-5 bg-[var(--accent)]" : "w-2 bg-[var(--line-strong)] hover:bg-[var(--text-3)]"}`}
            />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}

function Numbers({ d }: { d: LandingData }) {
  const items = [
    { v: String(d.runs), l: "burns", src: "PSI-25 test table" },
    { v: String(d.teams), l: "research teams", src: "PSI-25 test table" },
    { v: d.o2Range ? `${fmt(d.o2Range[0])}–${fmt(d.o2Range[1])}` : "—", l: "% O₂ initial", src: "PSI-25 test table" },
    { v: d.airflowRange ? `${fmt(d.airflowRange[0], 0)}–${fmt(d.airflowRange[1], 0)}` : "—", l: "cm/s airflow", src: "set-points" },
    { v: String(d.videos), l: `videos · ${d.videoGb.toFixed(1)} GB`, src: "PSI-25 archive" },
    { v: String(d.measured), l: "runs measured by computer vision", src: "vision layer" },
  ];
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-1)] sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.l} className="border-b border-r border-[var(--line)] px-4 py-4 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(3n)]:border-r lg:last:border-r-0">
          <dd className="num text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-[var(--text-1)]">{it.v}</dd>
          <dt className="mt-1.5 text-[0.8125rem] text-[var(--text-2)]">{it.l}</dt>
          <p className="num mt-2 text-[0.6875rem] text-[var(--text-3)]">src: {it.src}</p>
        </div>
      ))}
    </dl>
  );
}

/** Every burn with initial O₂ and airflow, coloured by fuel family. Static, click a point to open it. */
function BurnMap({ d }: { d: LandingData }) {
  const reduce = useReducedMotion();
  const W = 760;
  const H = 360;
  const M = { t: 16, r: 16, b: 44, l: 52 };
  const xs = d.points.map((p) => p.air);
  const ys = d.points.map((p) => p.o2);
  const xMax = Math.ceil((Math.max(...xs, 1) + 2) / 5) * 5;
  const yMin = Math.floor(Math.min(...ys, 14) - 0.5);
  const yMax = Math.ceil(Math.max(...ys, 22) + 0.5);
  const x = (v: number) => M.l + (v / xMax) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - yMin) / (yMax - yMin)) * (H - M.t - M.b);
  const xt = Array.from({ length: xMax / 5 + 1 }, (_, i) => i * 5);
  const yt = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).filter((v) => v % 2 === 0);
  const dispatch = useDispatch();
  return (
    <div className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-1)] p-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Scatter of ${d.points.length} burns: initial oxygen against airflow, coloured by fuel family`}>
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--text-3)" className="num">
              {v}
            </text>
          </g>
        ))}
        {xt.map((v) => (
          <g key={`x${v}`}>
            <line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} stroke="var(--line)" />
            <text x={x(v)} y={H - M.b + 18} textAnchor="middle" fontSize="12" fill="var(--text-3)" className="num">
              {v}
            </text>
          </g>
        ))}
        <text x={(W + M.l) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--text-2)">
          Airflow (cm/s, median set-point)
        </text>
        <text transform={`translate(14,${(H - M.b + M.t) / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--text-2)">
          Initial O₂ (% vol)
        </text>
        {d.points.map((p, n) => (
          <motion.circle
            key={p.id}
            cx={x(p.air)}
            cy={y(p.o2)}
            r={5}
            fill={FAMILY[p.family].color}
            stroke="var(--surface-1)"
            strokeWidth={2}
            initial={reduce ? false : { opacity: 0, scale: 0 }}
            whileInView={{ opacity: 0.9, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: reduce ? 0 : 0.004 * n }}
            className="cursor-pointer"
            onClick={() => dispatch({ type: "openExperiment", id: p.id })}
          >
            <title>{`Run ${p.testId} · ${p.o2} % O₂ · ${p.air} cm/s`}</title>
          </motion.circle>
        ))}
      </svg>
      <div className="flex flex-col justify-between gap-4">
        <ul className="space-y-2 text-[0.875rem] text-[var(--text-2)]">
          {(Object.keys(FAMILY) as FuelFamily[]).map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: FAMILY[f].color }} aria-hidden="true" />
              {FAMILY[f].label}
              <span className="num ml-auto text-[var(--text-3)]">{d.points.filter((p) => p.family === f).length}</span>
            </li>
          ))}
        </ul>
        <p className="text-[0.75rem] text-[var(--text-3)]">
          {d.points.length} burns plotted · {d.unplotted} without O₂ or airflow are not drawn.
        </p>
        <Link href="/explore?view=map" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--accent)] px-4 text-[0.875rem] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]">
          Open the map <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function BurnCard({ b }: { b: LandingBurn }) {
  return (
    <Link
      href={`/experiments/${encodeURIComponent(b.experimentId)}`}
      className="group block overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] transition-colors hover:border-[var(--flame-edge)]"
    >
      <span className="relative block aspect-[3/2] bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={POSTER(b.poster!.file)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-[var(--dur-3)] group-hover:scale-[1.03]" />
        <span className="absolute left-2 top-2 rounded-[var(--radius-sm)] bg-[rgb(6_9_15/0.78)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--text-1)]">{b.pick}</span>
        <span className="num absolute bottom-2 right-2 rounded-[var(--radius-sm)] bg-[rgb(6_9_15/0.78)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-2)]">Run {b.testId}</span>
      </span>
      <span className="block space-y-1 p-3.5">
        <span className="block truncate text-[0.9375rem] font-medium text-[var(--text-1)]">{b.fuelRaw}</span>
        <span className="num block text-[0.75rem] text-[var(--text-2)]">
          {b.principalInvestigator} · {b.o2Pct != null ? `${b.o2Pct} % O₂` : "O₂ —"} · {b.airflowCmS != null ? `${b.airflowCmS} cm/s` : "flow —"}
        </span>
        <span className="num block text-[0.75rem] text-[var(--text-3)]">
          {b.visibleS.toFixed(0)} s visible · peak {b.peakAreaPx != null ? `${b.peakAreaPx.toLocaleString("en-US")} px` : "—"}
        </span>
      </span>
    </Link>
  );
}

const TOOLS = [
  { href: "/explore", Icon: Rows3, title: "Runs", body: "Filter all burns by fuel, oxygen, airflow and QA. Table, map or gallery." },
  { href: "/compare", Icon: GitCompareArrows, title: "Compare", body: "Play up to four burns in sync and see exactly what differs." },
  { href: "/lab", Icon: FlaskConical, title: "What-if Lab", body: "Set conditions and get the closest real burns — never a simulation." },
  { href: "/learn", Icon: BookOpen, title: "Learn", body: "Five short chapters on why flames behave differently in orbit." },
] as const;

export function LandingPage({ data }: { data: LandingData }) {
  const dispatch = useDispatch();
  const reduce = useReducedMotion();
  const [menu, setMenu] = useState(false);
  const askAi = () => {
    dispatch({ type: "navigate", route: "/explore" });
    shellUiStore.getState().setAssistantOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-[var(--bg)]">
        Skip to main content
      </a>

      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgb(6_9_15/0.85)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/orbital-flame-mark.svg" alt="" className="size-8" />
            <span className="text-[1rem] font-semibold tracking-[-0.02em]">{SITE.name}</span>
          </Link>
          <nav aria-label="Primary" className="mx-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-[var(--radius-sm)] px-3 py-2 text-[0.875rem] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/explore" className="ml-auto hidden min-h-9 items-center rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 text-[0.875rem] font-medium text-[var(--bg)] hover:brightness-110 md:inline-flex">
            Open dashboard
          </Link>
          <button
            type="button"
            className="ml-auto flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-2)] md:hidden cursor-pointer"
            aria-expanded={menu}
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu((m) => !m)}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menu && (
          <nav aria-label="Mobile" className="border-t border-[var(--line)] px-4 pb-3 md:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block min-h-11 py-3 text-[0.9375rem] text-[var(--text-1)]">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main id="main-content" className="space-y-20 pb-16 sm:space-y-24">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-[1240px] items-center gap-10 px-4 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-20">
          <div>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="num text-[0.8125rem] text-[var(--text-2)]"
            >
              NASA PSI-25 data · ISS {data.years}
            </motion.p>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 text-balance text-[clamp(2.4rem,5.4vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]"
            >
              What does fire do without gravity?
            </motion.h1>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-5 max-w-xl text-pretty text-[1.125rem] leading-relaxed text-[var(--text-2)]"
            >
              {data.runs} real solid-fuel burns aboard the International Space Station — watch them, compare them, and ask
              questions of the data.
            </motion.p>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/explore" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 text-[0.9375rem] font-semibold text-[var(--bg)] hover:brightness-110">
                Explore the {data.runs} burns <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/learn" className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--line-strong)] px-5 text-[0.9375rem] font-medium text-[var(--text-1)] hover:border-[var(--text-3)]">
                Take the guided tour
              </Link>
            </motion.div>
            <button type="button" onClick={askAi} className="mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] text-[var(--accent)] underline-offset-4 hover:underline cursor-pointer">
              <Sparkles className="size-4" aria-hidden="true" /> Ask the research AI
            </button>
          </div>
          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15 }}>
            <HeroFootage burns={data.hero} />
          </motion.div>
        </section>

        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <Reveal>
            <Numbers d={data} />
          </Reveal>
        </div>

        <Section id="earth-vs-orbit" title="Earth vs orbit">
          <WindTunnelSchematic />
        </Section>

        <Section id="map" title="The map of every burn">
          <BurnMap d={data} />
        </Section>

        <Section
          id="watch"
          title={`${data.six.length} burns worth watching`}
          action={
            <Link href="/explore?view=gallery" className="inline-flex items-center gap-1.5 text-[0.875rem] text-[var(--accent)] hover:underline">
              See all {data.measured} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.six.map((b) => (
              <BurnCard key={b.experimentId} b={b} />
            ))}
          </div>
          <p className="mt-3 text-[0.75rem] text-[var(--text-3)]">Each pick comes from a computed statistic. Areas are pixels of the 720×480 frame, not millimetres.</p>
        </Section>

        <Section id="tools" title="Four ways in">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map(({ href, Icon, title, body }) => (
              <Link key={href} href={href} className="group flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] p-5 transition-colors hover:border-[var(--accent)]">
                <span className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-[1.0625rem] font-semibold text-[var(--text-1)]">{title}</span>
                <span className="text-[0.875rem] leading-relaxed text-[var(--text-2)]">{body}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-[0.8125rem] text-[var(--accent)]">
                  Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </Section>
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-6 text-[0.8125rem] text-[var(--text-2)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            {SITE.challenge} · Team <strong className="font-medium text-[var(--text-1)]">{SITE.team.name}</strong>: {SITE.team.members.join(" · ")}
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <EvidenceChip id="doi:10.60555/4qc4-de67" label="DOI 10.60555/4qc4-de67 · CC0 1.0" kind="dataset" href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-25" />
            <a href={SITE.repository} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">
              GitHub
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
