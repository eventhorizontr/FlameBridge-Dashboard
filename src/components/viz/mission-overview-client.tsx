"use client";

import { ArrowRight, BookOpen, Compass, Film, FlaskConical, GitCompareArrows, Pause, Play, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { shellUiStore } from "@/components/layout/shell-state";
import {
  Badge,
  Button,
  EvidenceChip,
  formatBytes,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Stat,
} from "@/components/ui";
import { SITE } from "@/config/site";
import { useDashboard, useDispatch } from "@/lib/store";
import type { ExperimentDataset, InvestigationManifest } from "@/types/experiment";


import { CatalogHydrator, type CatalogRunRef } from "./catalog-hydrator";
import type { computeOverviewStats } from "./dataset-queries";
import { localVideoPoster } from "./video-presentation";
import { WindTunnelSchematic } from "./wind-tunnel-schematic";

const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
] as const;

export function MissionOverviewClient({
  dataset,
  manifest,
  stats,
  catalog,
}: {
  dataset: Pick<ExperimentDataset, "accession" | "doi" | "license">;
  manifest: Pick<InvestigationManifest, "acronym" | "title">;
  stats: ReturnType<typeof computeOverviewStats>;
  catalog: CatalogRunRef[];
}) {
  const mode = useDashboard((s) => s.mode);
  const dispatch = useDispatch();
  const dispatchMany = useDashboard((s) => s.dispatchMany);
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  const o2Span =
    stats.o2Range ? `${stats.o2Range.min.toFixed(1)}–${stats.o2Range.max.toFixed(1)}` : null;
  const airSpan =
    stats.airflowRange ? `${stats.airflowRange.min}–${stats.airflowRange.max}` : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reducedMotion) video.pause();
    else void video.play().catch(() => { /* Autoplay can be blocked by the browser. */ });
  }, [reducedMotion]);

  const toggleHeroPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => { /* Keep play controls available. */ });
    else video.pause();
  };

  return (
    <div className="space-y-6">
      <CatalogHydrator experiments={catalog} />

      {/* Hero Instrument Banner with Real NASA S3 Footage */}
      <Panel surface="surface-1" className="overflow-hidden border-[var(--line-strong)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-7 p-5 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">ISS Microgravity Science Glovebox</Badge>
                <EvidenceChip
                  id={`doi:${dataset.doi}`}
                  label={`${dataset.accession} · ${manifest.acronym} · ${dataset.license}`}
                  kind="dataset"
                  href={`https://doi.org/${dataset.doi}`}
                  detail={`Official NASA PSI investigation ${dataset.accession} (${manifest.title}). ${stats.totalManifestFiles} files (${formatBytes(stats.totalManifestBytes)}).`}
                />
              </div>

              <h1 className="text-[2rem] sm:text-[3rem] font-semibold tracking-[-0.02em] leading-[1.08] text-[var(--text-1)]">
                {SITE.name}
              </h1>

              <p className="text-[1rem] text-[var(--text-2)] leading-relaxed max-w-2xl">
                {mode === "learn"
                  ? "Watch International Space Station footage from NASA’s BASS-II glovebox and compare the recorded airflow, oxygen, and fuel conditions."
                  : `Explore NASA PSI-25 (BASS-II) solid-fuel combustion data. Filter ${stats.totalRuns} runs across ${stats.piCount} principal investigators, inspect QA flags, frame-step ISS footage, and find runs with similar conditions.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="lg"
                onClick={() => dispatch({ type: "navigate", route: "/explore" })}
              >
                <Compass className="size-4" aria-hidden="true" />
                <span>Explore {stats.totalRuns} Runs</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => dispatch({ type: "navigate", route: "/lab" })}
              >
                <FlaskConical className="size-4 text-[var(--accent)]" aria-hidden="true" />
                <span>Visual What-if Lab</span>
              </Button>
              <Button
                variant="accent-soft"
                size="lg"
                onClick={() => shellUiStore.getState().setAssistantOpen(true)}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                <span>Ask AI Assistant</span>
              </Button>
            </div>
          </div>

          {/* Real NASA Video Preview Slot */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[var(--line)] bg-[var(--surface-2)] p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                Live ISS Footage Stream
              </span>
              {stats.heroRun && (
                <EvidenceChip
                  id={stats.heroRun.id}
                  label={`Run ${stats.heroRun.testId} · ${stats.heroRun.principalInvestigator}`}
                  kind="experiment"
                  href={`/experiments/${encodeURIComponent(stats.heroRun.id)}`}
                  detail={`${stats.heroRun.fuel.raw} · ${stats.heroRun.conditions.o2InitialPct ?? "—"} % O₂`}
                />
              )}
            </div>

            <div className="relative aspect-video rounded-[var(--radius-md)] overflow-hidden border border-[var(--line-strong)] bg-[var(--bg)] flex items-center justify-center">
              {stats.heroVideo && !videoFailed ? (
                <video
                  ref={videoRef}
                  src={stats.heroVideo.href}
                  poster={localVideoPoster(stats.heroVideo.fallbackHref)}
                  crossOrigin="anonymous"
                  muted
                  loop
                  playsInline
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onError={() => setVideoFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/orbital-flame-mark.svg"
                    alt="Illustrative flame schematic"
                    className="size-16 mx-auto"
                  />
                  <p className="text-[0.8125rem] text-[var(--text-2)]">
                    NASA PSI S3 stream temporarily unavailable — telemetry &amp; offline charts remain active.
                  </p>
                </div>
              )}

              {stats.heroVideo && !videoFailed && (
                <button
                  type="button"
                  onClick={toggleHeroPlayback}
                  aria-label={playing ? "Pause hero ISS video" : "Play hero ISS video"}
                  className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 min-h-7 px-2.5 rounded-full bg-[rgb(6_9_15/0.8)] backdrop-blur-sm border border-[var(--line-strong)] text-[0.75rem] text-[var(--text-1)] hover:border-[var(--accent)] cursor-pointer"
                >
                  {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
                  <span>{playing ? "Pause clip" : "Play clip"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-[0.75rem] text-[var(--text-2)]">
              <span className="truncate num">
                {stats.heroVideo ? stats.heroVideo.fileName : "No primary MP4"}
              </span>
              {stats.heroRun && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "openExperiment", id: stats.heroRun!.id })}
                  className="shrink-0 text-[var(--accent)] hover:underline cursor-pointer font-medium"
                >
                  Open Flame Viewer →
                </button>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Computed Key Numbers Grid — zero hard-coded values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat
          label="Test Runs"
          value={stats.totalRuns}
          evidence={{
            id: dataset.accession,
            label: "PSI-25 Exp. Table",
            kind: "dataset",
            href: `https://doi.org/${dataset.doi}`,
            detail: `${stats.totalRuns} measured burn records across ${stats.piCount} investigator groups.`,
          }}
        />
        <Stat
          label="Principal Investigators"
          value={stats.piCount}
          evidence={{
            id: `${dataset.accession}:PIs`,
            label: `${stats.piCount} Research Groups`,
            kind: "dataset",
            detail: stats.piSummaries.map((p) => `${p.name} (${p.runs})`).join(", "),
          }}
        />
        <Stat
          label="Initial O₂ Envelope"
          value={o2Span}
          unit="% O₂"
          nullReason="No valid O₂ records"
          evidence={{
            id: `${dataset.accession}:O2`,
            label: "MCA Calibrated",
            kind: "dataset",
            detail: "Daily MCA-offset calibrated oxygen percentage by volume.",
          }}
        />
        <Stat
          label="Tunnel Airflow"
          value={airSpan}
          unit="cm/s"
          nullReason="No airflow set-points"
          evidence={{
            id: `${dataset.accession}:Flow`,
            label: "MSG Duct Display",
            kind: "dataset",
            detail: "Forced-convection air speeds across all recorded set-points.",
          }}
        />
        <Stat
          label="ISS Video Archive"
          value={`${stats.runsWithVideo}/${stats.totalRuns}`}
          delta={`${stats.mp4Count} MP4 · ${formatBytes(stats.mp4Bytes)}`}
          evidence={{
            id: `${dataset.accession}:Videos`,
            label: "PSI-25 Manifest",
            kind: "file",
            detail: `${stats.mp4Count} MP4 files streamed directly from NASA S3 via /api/psi/file.`,
          }}
        />
        <Stat
          label="QA Flagged Runs"
          value={stats.runsWithQaFlags}
          delta={stats.parseVersions.join(", ")}
          evidence={{
            id: `${dataset.accession}:QA`,
            label: "Verbatim QA Audit",
            kind: "dataset",
            detail: "Runs with source anomalies (implausible O₂, merged fan/air columns, or date discrepancy) surfaced explicitly.",
          }}
        />
      </div>

      {/* Apparatus & Physics Interactive SVG Schematic */}
      <WindTunnelSchematic />

      {/* PI Campaign Matrix (click any PI to filter Explorer) */}
      <Panel surface="surface-1">
        <PanelHeader>
          <PanelTitle
            eyebrow="Campaign Coverage"
            title="Principal Investigators & Solid Fuel Families"
            actions={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  dispatchMany([{ type: "resetFilters" }, { type: "navigate", route: "/explore" }]);
                }}
              >
                <span>View all {stats.totalRuns}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Button>
            }
          />
        </PanelHeader>
        <PanelBody className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {stats.piSummaries.map((pi, idx) => {
            const seriesColor = SERIES_VARS[idx % SERIES_VARS.length];
            return (
              <button
                key={pi.name}
                type="button"
                onClick={() => {
                  dispatchMany([
                    { type: "setFilters", filters: { principalInvestigators: [pi.name] } },
                    { type: "navigate", route: "/explore" },
                  ]);
                }}
                className="text-left rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-3)] p-4 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium text-[0.9375rem] text-[var(--text-1)]">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seriesColor }}
                    />
                    {pi.name}
                  </span>
                  <span className="num text-[0.8125rem] text-[var(--accent)]">
                    {pi.runs} runs
                  </span>
                </div>
                <p className="text-[0.8125rem] text-[var(--text-2)]">
                  Materials: {pi.materials.join(", ") || "—"} · Geometries: {pi.geometries.join(", ") || "—"}
                </p>
                <div className="flex items-center justify-between text-[0.75rem] text-[var(--text-3)]">
                  <span className="num">{pi.withVideo} runs with footage</span>
                  <span>
                    Flow: {pi.flowConfigs.length ? pi.flowConfigs.join(" / ") : "unlabeled in ReadMe"}
                  </span>
                </div>
              </button>
            );
          })}
        </PanelBody>
      </Panel>

      {/* Mode-Adaptive Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            route: "/explore" as const,
            title: "Experiment Explorer",
            Icon: Compass,
            expert: "Sortable experiment table linked to an oxygen and airflow scatterplot.",
            learn: "Browse every ISS space-fire test on an interactive map and spot patterns across fuels.",
          },
          {
            route: "/lab" as const,
            title: "Visual What-if Lab",
            Icon: FlaskConical,
            expert: "Distance-ranked nearest real runs inside the measured PSI-25 envelope with explicit delta vectors.",
            learn: "Pick an oxygen level and wind speed to see which real NASA experiment comes closest.",
          },
          {
            route: "/compare" as const,
            title: "Compare Runs",
            Icon: GitCompareArrows,
            expert: "Synchronized 2–4 run video grid, highlighted condition diffs, and flow set-point trajectory overlay.",
            learn: "Watch up to four space flames side by side to see how changing air or fuel changes the fire.",
          },
          {
            route: "/learn" as const,
            title: "Explore & Learn Track",
            Icon: mode === "learn" ? BookOpen : Film,
            expert: "5 structured pedagogical modules linking NASA ReadMe science directly to verified BASS-II clips.",
            learn: "Take a 5-chapter interactive tour through microgravity flames with real footage & quizzes.",
          },
        ].map((card) => (
          <button
            key={card.route}
            type="button"
            onClick={() => dispatch({ type: "navigate", route: card.route })}
            className="group text-left rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)] p-4 sm:p-5 transition-colors cursor-pointer flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="size-9 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent)]/50">
                <card.Icon className="size-4" aria-hidden="true" />
              </div>
              <h2 className="text-[1rem] font-medium text-[var(--text-1)]">{card.title}</h2>
              <p className="text-[0.8125rem] text-[var(--text-2)] leading-relaxed">
                {mode === "learn" ? card.learn : card.expert}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--accent)]">
              <span>Open</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
