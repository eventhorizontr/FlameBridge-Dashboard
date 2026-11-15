import { Unbounded } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SITE } from "@/config/site";

import "./landing.css";

const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["700", "800"] });

export const PRODUCT_NAME = SITE.name;
const TEAM_NAME = "EventHorizonTR";
const DASHBOARD_ROUTE = "/overview";

/** Direct ways into the dashboard besides "Go to dashboard" (Home). */
const SECTIONS = [
  { href: "/explore", label: "Explore runs" },
  { href: "/compare", label: "Compare" },
  { href: "/lab", label: "What-if Lab" },
] as const;

/** Every figure on the landing page, computed from the built PSI-25 data by the route. */
export interface LandingFacts {
  /** Runs in public/data/PSI-25/experiments.json. */
  runCount: number;
  /** Videos with status "ok" in the vision index (computer-vision measured). */
  measuredVideoCount: number | null;
  /** Runs that state a total pressure (lib/science/pressure.ts). */
  runsWithPressure: number;
  /** The run shown in the frame-by-frame sequence. */
  sequenceRun: { testId: string; thicknessMm: number | null; airflowCmS: number | null } | null;
}

/** Number of stills in public/landing/b12-still-sequence.jpg (640 × 256 px each). */
const SEQUENCE_FRAMES = 61;

function Arrow({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="nf-arrow-icon"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function DashboardCta({ large = false }: { large?: boolean }) {
  return (
    <Link href={DASHBOARD_ROUTE} className={large ? "nf-cta nf-cta-lg" : "nf-cta"}>
      Go to dashboard
      <Arrow size={large ? 18 : 16} />
    </Link>
  );
}

function SectionHead({ kicker, title, lead }: { kicker: string; title: string; lead: ReactNode }) {
  return (
    <div className="nf-head nf-rv">
      <div>
        <div className="nf-kicker">{kicker}</div>
        <h2 className="nf-h2">{title}</h2>
      </div>
      <p className="nf-lead">{lead}</p>
    </div>
  );
}

const fmt = (v: number | null, unit: string) => (v === null ? "—" : `${v} ${unit}`);

export function LandingPage({ facts }: { facts: LandingFacts }) {
  const { runCount, measuredVideoCount, runsWithPressure, sequenceRun } = facts;

  const shifts = [
    { label: "No weight", from: "1 g", to: "≈ 0 g", body: "On a station or a ship in transit nothing rises. The hot gas stays wrapped around the flame." },
    { label: "More oxygen", from: "21 %", to: "34 %", body: "Cabin air for future crewed vehicles is planned richer in oxygen than the air on Earth." },
    { label: "Lower pressure", from: "101.3", to: "56.5 kPa", body: "And the cabin is held well below the pressure we live in at sea level." },
  ];

  const steps = [
    { title: "Reads NASA’s data", body: "The PSI test table, the flame photographs and the ISS experiment videos, streamed from NASA." },
    {
      title: "Takes its own measurements",
      body: "Computer vision measures flame area and visible burn time in every usable video, labelled as image pixels and never converted to millimetres.",
    },
    { title: "Matches, never simulates", body: "Enter oxygen, airflow and fuel. The What-if Lab returns the real ISS runs closest to it." },
    { title: "Applies it to your cabin", body: "Add a cabin pressure and see where your atmosphere stands against what was actually burned." },
    {
      title: "Adds an honest warning",
      body: "“No run in this dataset states a pressure. Outside the tested range, this is a gap, not an answer.”",
      accent: true,
    },
  ];

  const ask = [
    { title: "You ask", body: "“Which PMMA runs burned closest to 34 % oxygen at low airflow?”" },
    { title: "The assistant reads the records", body: "It calls tools on the PSI dataset and the vision measurements before it writes a word." },
    { title: "Numbers come from tool results", body: "It is instructed to state only values it retrieved, and every run it cites links back to that run’s record." },
    { title: "It drives the dashboard, you keep control", body: "Filters, comparisons and navigation it applies show up as steps you can undo.", accent: true },
  ];

  return (
    <div className={`nf-root ${unbounded.variable}`}>
      <div className="nf-navwrap">
        <nav aria-label="Primary" className="nf-wrap nf-nav">
          <a href="#top" className="nf-brand">
            <Image src="/brand/flamebridge-mark-128.png" alt="" width={32} height={32} priority />
            <span className="nf-brand-name">{PRODUCT_NAME}</span>
          </a>
          <div className="nf-navlinks">
            {SECTIONS.map((l) => (
              <Link key={l.href} href={l.href} className="nf-navlink">
                {l.label}
              </Link>
            ))}
          </div>
          <DashboardCta />
        </nav>
        <div className="nf-bar" aria-hidden="true" />
      </div>

      <header id="top" className="nf-hero">
        <div className="nf-fill nf-gridbg" aria-hidden="true" />
        <div className="nf-par" aria-hidden="true">
          <div className="nf-fill nf-stars" style={{ opacity: 0.7 }} />
        </div>
        <div className="nf-halo" aria-hidden="true" />

        <div className="nf-hero-copy">
          <div className="nf-live-row">
            <span className="nf-live" aria-hidden="true" />
            <span>Built on NASA’s open ISS fire experiments</span>
          </div>
          <h1 className="nf-h1">Fire burns differently in space.</h1>
          <p className="nf-slogan">{SITE.slogan}</p>
          <p className="nf-hero-lead">
            {PRODUCT_NAME} turns NASA’s real fire experiments on the International Space Station into a readable,
            testable and honest research tool for fire safety in weightless spacecraft.
          </p>
          <DashboardCta large />
          <nav aria-label="Open a section" className="nf-quick">
            {SECTIONS.map((l) => (
              <Link key={l.href} href={l.href} className="nf-ghost">
                {l.label}
                <Arrow size={14} />
              </Link>
            ))}
          </nav>
        </div>

        <div className="nf-hero-figure">
          <div className="nf-hero-frame">
            <div className="nf-glow" aria-hidden="true" />
            <div className="nf-seq">
              <div
                className="nf-sprite nf-hs"
                role="img"
                aria-label="NASA photograph of a flame in weightlessness on the Space Station: a dim blue dome with an orange core, spreading along a thin sample"
              />
            </div>
            <div className="nf-pill nf-pill-light nf-float">Real flame, real station</div>
            <div className="nf-pill nf-pill-dark nf-float-b">NASA BASS-II · test {sequenceRun?.testId ?? "B12"}</div>
          </div>
          <div className="nf-note" style={{ textAlign: "center" }}>
            Scroll, and the flame spreads along the sample.
          </div>
        </div>

        <div className="nf-wrap nf-stats">
          <div className="nf-stat">
            <div className="nf-display nf-stat-value">{runCount}</div>
            <div className="nf-stat-label">ISS fire runs in NASA’s PSI-25 (BASS-II) table</div>
          </div>
          <div className="nf-stat">
            <div className="nf-display nf-stat-value">{measuredVideoCount ?? "—"}</div>
            <div className="nf-stat-label">
              {measuredVideoCount === null
                ? "ISS videos measured by computer vision (vision index not built)"
                : "ISS videos measured frame by frame by computer vision"}
            </div>
          </div>
          <div className="nf-stat">
            <div className="nf-display nf-stat-value">{runsWithPressure}</div>
            <div className="nf-stat-label">runs that state a cabin pressure. Shown as “—”, never assumed.</div>
          </div>
        </div>
      </header>

      <section id="problem" className="nf-wrap nf-stack" style={{ paddingTop: 72, paddingBottom: 80, gap: 48 }}>
        <SectionHead
          kicker="The problem"
          title="In orbit, a flame has no up."
          lead="Without weight, hot air doesn’t rise. The flame rounds off and spreads slowly and quietly, and sometimes a flame that would die on Earth keeps burning. Size a detector or a suppression system without knowing that, and you can size it wrong."
        />
        <div className="nf-grid-cards nf-stag" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
          {shifts.map((s) => (
            <div key={s.label} className="nf-glass nf-shift">
              <div className="nf-shift-label">{s.label}</div>
              <div className="nf-display nf-shift-values">
                <span className="nf-shift-from">{s.from}</span>
                <span className="nf-arrow">
                  <Arrow size={22} />
                </span>
                <span>{s.to}</span>
              </div>
              <div className="nf-card-body">{s.body}</div>
            </div>
          ))}
        </div>
        <div className="nf-note">
          Oxygen and pressure shown are NASA’s recommended exploration atmosphere: 34 % O₂ at 56.5 kPa
          (NASA/TP-2010-216134).
        </div>
      </section>

      <div aria-hidden="true" style={{ overflow: "clip", paddingBottom: 72 }}>
        <div className="nf-mq nf-outline">
          {Array.from({ length: 3 }).flatMap((_, i) =>
            ["Readable", "Testable", "Honest"].map((w) => <span key={`${w}-${i}`}>{w}</span>),
          )}
        </div>
      </div>

      <section id="data" className="nf-section nf-section-alt">
        <div className="nf-wrap nf-pad nf-split">
          <div className="nf-rv nf-stack" style={{ flex: "1 1 360px", minWidth: 0, gap: 20 }}>
            <div className="nf-kicker">What we have</div>
            <h2 className="nf-h2">NASA lit real fires in orbit. The data is open.</h2>
            <p className="nf-lead">
              For years NASA has run real fire experiments on the International Space Station and released the
              results to the public.
            </p>
            <ol className="nf-stack" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {[
                `A table of ${runCount} BASS-II test runs`,
                "Photographs of the flames",
                "Videos of the experiments",
                "Reports that summarise the results",
              ].map((t, i) => (
                <li key={t} className="nf-list-row">
                  <span className="nf-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <p className="nf-lead" style={{ fontSize: 17 }}>
              But it is scattered, and it never answers the engineer’s question directly: what would happen in my
              spacecraft?
            </p>
          </div>

          <div className="nf-rv nf-shot-card nf-shot-scope" style={{ flex: "1.5 1 520px", minWidth: 0 }}>
            <div
              style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 16px", padding: "0 4px" }}
            >
              <div className="nf-card-title" style={{ fontSize: 18 }}>
                One of those tests, frame by frame
              </div>
              <div className="nf-live-row" style={{ letterSpacing: 0, textTransform: "none" }}>
                frame&nbsp;<span className="nf-count" />&nbsp;/ {SEQUENCE_FRAMES}
              </div>
            </div>
            <div className="nf-shot">
              <div
                className="nf-sprite nf-ds"
                role="img"
                aria-label={`Sequence of ${SEQUENCE_FRAMES} NASA photographs: an igniter wire lights a thin sample and a blue flame spreads along it`}
              />
            </div>
            <dl className="nf-meta" style={{ margin: 0 }}>
              <div>
                <dt>Source</dt>
                <dd>NASA PSI, BASS-II</dd>
              </div>
              <div>
                <dt>Test</dt>
                <dd>{sequenceRun?.testId ?? "—"}</dd>
              </div>
              <div>
                <dt>Sample</dt>
                <dd>{fmt(sequenceRun?.thicknessMm ?? null, "mm thick")}</dd>
              </div>
              <div>
                <dt>Airflow</dt>
                <dd>{fmt(sequenceRun?.airflowCmS ?? null, "cm/s")}</dd>
              </div>
              <div>
                <dt>Stills</dt>
                <dd>{SEQUENCE_FRAMES} frames</dd>
              </div>
            </dl>
            <div className="nf-note" style={{ padding: "0 4px" }}>
              Every frame was taken on the Space Station. Sample and airflow are read from NASA’s test table.
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="nf-section">
        <div className="nf-wrap nf-pad nf-stack" style={{ gap: 48 }}>
          <SectionHead
            kicker="What it does"
            title="From scattered records to one answer."
            lead={`${PRODUCT_NAME} gathers that scattered data into one dashboard and goes looking for the answer, in five steps.`}
          />
          <div className="nf-grid-cards nf-stag" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))" }}>
            {steps.map((s, i) => (
              <div key={s.title} className={`${s.accent ? "nf-glass-accent" : "nf-glass"} nf-stack`} style={{ padding: 24, gap: 12 }}>
                <div className="nf-step-num" style={s.accent ? { color: "var(--nf-ink)", fontSize: 22 } : { fontSize: 22 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="nf-card-title">{s.title}</div>
                <div className="nf-card-body" style={s.accent ? { color: "var(--nf-accent-ink)" } : undefined}>
                  {s.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="who" className="nf-section nf-section-alt">
        <div className="nf-wrap nf-pad" style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "40px 56px" }}>
          <div className="nf-rv nf-stack" style={{ flex: "1 1 340px", minWidth: 0, gap: 20 }}>
            <div className="nf-kicker">Who it is for</div>
            <h2 className="nf-h2">For the engineers who design the cabin.</h2>
            <p className="nf-lead">
              Researchers and engineers designing crewed spacecraft, stations and habitats, who have to decide how
              fire is detected and put out before anything flies.
            </p>
          </div>
          <div
            className="nf-grid-cards nf-stag"
            style={{ flex: "1.6 1 520px", minWidth: 0, gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))" }}
          >
            <div className="nf-glass nf-stack" style={{ padding: 32, gap: 14, borderRadius: 24 }}>
              <div className="nf-card-title-lg" style={{ color: "var(--nf-ink)" }}>
                What was actually burned
              </div>
              <div className="nf-card-body" style={{ fontSize: 16 }}>
                Every run, with its oxygen, airflow, sample and ISS footage side by side, filterable and comparable.
              </div>
            </div>
            <div className="nf-stack" style={{ padding: 32, gap: 14, borderRadius: 24, background: "var(--nf-accent-strong)", color: "var(--nf-ink)" }}>
              <div className="nf-card-title-lg">What nobody has tested yet</div>
              <div style={{ fontSize: 16, color: "var(--nf-accent-ink-2)" }}>
                More important: see where the tested conditions end, so a design never leans on a run that was never
                made.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ai" className="nf-section">
        <div className="nf-wrap nf-pad" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "48px 64px" }}>
          <div className="nf-rv nf-stack" style={{ flex: "1 1 360px", minWidth: 0, gap: 20 }}>
            <div className="nf-kicker">The role of AI</div>
            <h2 className="nf-h2">Ask in your own words. Every answer points back to the data.</h2>
            <p className="nf-lead">
              You can put a question to the dashboard the way you would say it. The assistant answers from the
              project’s records and says plainly when the data does not hold the answer.
            </p>
          </div>
          <div className="nf-ask nf-stack" style={{ flex: "1.4 1 520px", minWidth: 0, gap: 12 }}>
            {ask.map((a, i) => (
              <div key={a.title} className={`nf-a nf-a${i + 1} nf-step ${a.accent ? "nf-glass-accent" : "nf-glass"}`}>
                <div className="nf-step-num" style={a.accent ? { color: "var(--nf-ink)" } : undefined}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="nf-stack" style={{ gap: 6 }}>
                  <div className="nf-card-title" style={{ fontSize: 19, letterSpacing: "-0.01em" }}>
                    {a.title}
                  </div>
                  <div className="nf-card-body" style={{ fontSize: 16, color: a.accent ? "var(--nf-accent-ink)" : undefined }}>
                    {a.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ padding: 16 }}>
        <section id="stance" className="nf-sheet">
          <div className="nf-pad nf-stack" style={{ maxWidth: 1208, margin: "0 auto", paddingLeft: "var(--nf-gutter)", paddingRight: "var(--nf-gutter)", gap: 48 }}>
            <SectionHead
              kicker="Scientific stance"
              title="Shown right, not shown pretty."
              lead="The aim is to show results correctly rather than attractively. What is missing stays visibly missing."
            />
            <div className="nf-grid-cards nf-stag" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
              <div className="nf-sheet-card">
                <span className="nf-tag" style={{ background: "var(--nf-tag-blue)", color: "var(--nf-tag-blue-ink)" }}>
                  Traced
                </span>
                <div className="nf-card-title-lg">Every number has a source</div>
                <div className="nf-card-body">
                  Values come from a NASA PSI file or a documented calculation. A value that was not recorded is shown
                  as “—” with the reason, never as zero.
                </div>
              </div>
              <div className="nf-sheet-card">
                <span className="nf-tag" style={{ background: "var(--nf-sheet-ink)", color: "var(--nf-ink)" }}>
                  Labelled
                </span>
                <div className="nf-card-title-lg">Pixels stay pixels</div>
                <div className="nf-card-body">
                  Flame sizes measured by computer vision are marked as image-derived. Without a visible scale they
                  are never turned into millimetres.
                </div>
              </div>
              <div className="nf-sheet-card">
                <span className="nf-tag" style={{ background: "var(--nf-tag-ember)", color: "var(--nf-tag-ember-ink)" }}>
                  Not simulated
                </span>
                <div className="nf-card-title-lg">Matches, not made-up results</div>
                <div className="nf-card-body">
                  The What-if Lab only ever returns runs NASA really burned. It never presents a simulation as a
                  measurement.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section style={{ position: "relative" }}>
        <div className="nf-fill nf-stars" aria-hidden="true" style={{ opacity: 0.5 }} />
        <div className="nf-hero-copy" style={{ paddingBottom: 96, animation: "none" }}>
          <Image
            className="nf-zoom"
            src="/landing/horizon-glow.png"
            alt=""
            width={900}
            height={640}
            style={{ width: "100%", maxWidth: 440, height: "auto" }}
          />
          <h2 className="nf-h2-xl nf-rv">Know the fire before you build the cabin.</h2>
          <p className="nf-lead" style={{ maxWidth: "60ch" }}>
            {PRODUCT_NAME} turns the real fire experiments NASA ran in space into a readable, testable and honest
            research tool for the fire safety of future spacecraft.
          </p>
          <DashboardCta large />
        </div>
        <footer className="nf-footer">
          <div className="nf-wrap nf-footer-inner">
            <div className="nf-stack" style={{ gap: 10 }}>
              <Image src="/landing/team-wordmark.png" alt="Event Horizon" width={200} height={27} />
              <div style={{ fontSize: 14, color: "var(--nf-text-3)" }}>
                {PRODUCT_NAME} · {SITE.slogan}. A project by team {TEAM_NAME}.
              </div>
            </div>
            <div className="nf-note" style={{ maxWidth: "46ch" }}>
              Uses data NASA has released to the public. Not affiliated with or endorsed by NASA.
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
