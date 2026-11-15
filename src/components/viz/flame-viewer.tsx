"use client";

import {
  AlertTriangle,
  Columns2,
  Download,
  Film,
  GitCompareArrows,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  StepBack,
  StepForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Badge,
  Button,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  SegmentedControl,
  useHighlightPulse,
} from "@/components/ui";
import { formatSourceFps, localVideoPoster } from "./video-presentation";

import { useDashboard, useDispatch } from "@/lib/store";
import type { Experiment, ExperimentVideo, VideoKind } from "@/types/experiment";

const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2] as const;

interface RVFCMeta {
  mediaTime: number;
}

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: RVFCMeta) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

const KIND_LABELS: Record<VideoKind, string> = {
  primary: "Primary",
  "second-view": "2nd View",
  "still-sequence": "Still Seq",
};

function isStreamableVideo(video: Pick<ExperimentVideo, "ext">): boolean {
  const ext = video.ext.toLowerCase();
  return ext === ".mp4" || ext === ".webm" || ext === ".mov" || ext === ".m4v";
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.00";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2).padStart(5, "0");
  return `${mins}:${secs}`;
}

export type FlameCompanion = Pick<Experiment, "id" | "testId" | "principalInvestigator"> & {
  videos: readonly Pick<ExperimentVideo, "id" | "href" | "kind" | "ext" | "fallbackHref">[];
  conditions: Pick<Experiment["conditions"], "o2InitialPct">;
};

export interface FlameViewerProps {
  experiment: Experiment;
  companionExperiment?: FlameCompanion | null;
  allExperiments?: readonly FlameCompanion[];
  compact?: boolean;
  titleOverride?: string;
}

export function FlameViewer({
  experiment,
  companionExperiment = null,
  allExperiments = [],
  compact = false,
  titleOverride,
}: FlameViewerProps) {
  const dispatch = useDispatch();
  const videoCursor = useDashboard((s) => s.videoCursor);
  const timelinePulse = useHighlightPulse("video-timeline");

  const videos = experiment.videos;
  const defaultVideo =
    videos.find((v) => v.kind === "primary" && isStreamableVideo(v)) ??
    videos.find((v) => isStreamableVideo(v)) ??
    videos[0] ??
    null;

  const [activeVideoId, setActiveVideoId] = useState<string>(defaultVideo?.id ?? "");
  const [useFallback, setUseFallback] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "ready" | "error">("idle");
  const [retryNonce, setRetryNonce] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loop, setLoop] = useState(true);
  const [rate, setRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // A/B split compare state
  const [abCompare, setAbCompare] = useState(Boolean(companionExperiment));
  const defaultCompanion =
    companionExperiment ??
    allExperiments.find(
      (e) => e.id !== experiment.id && e.videos.some((v) => isStreamableVideo(v)),
    ) ??
    null;
  const [companionId, setCompanionId] = useState<string>(defaultCompanion?.id ?? "");
  const [companionError, setCompanionError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const lastCursorSeqRef = useRef<number | null>(null);

  // Keep selected video ID valid if parent changes experiment prop
  const activeVideo =
    videos.find((v) => v.id === activeVideoId) ?? defaultVideo;
  const sourceFps = useFallback ? null : activeVideo?.fps ?? null;
  // Use a small seek increment when the source has no reported frame rate.
  const fps = sourceFps ?? 30;
  const streamSrc =
    activeVideo && useFallback && activeVideo.fallbackHref
      ? activeVideo.fallbackHref
      : activeVideo?.href;

  const companionExp =
    allExperiments.find((e) => e.id === companionId) ??
    (companionExperiment?.id === companionId ? companionExperiment : null);
  const companionVideo = companionExp
    ? companionExp.videos.find((v) => v.kind === "primary" && isStreamableVideo(v)) ??
      companionExp.videos.find(isStreamableVideo) ?? null
    : null;

  // Bind requestVideoFrameCallback with timeupdate fallback
  useEffect(() => {
    const video = videoRef.current as VideoWithRVFC | null;
    if (!video || !activeVideo || !isStreamableVideo(activeVideo)) return;

    let rvfcId: number | null = null;
    let cancelled = false;

    const tickRVFC = (_now: number, meta: RVFCMeta) => {
      if (cancelled) return;
      setCurrentTime(meta.mediaTime);
      if (video.requestVideoFrameCallback) {
        rvfcId = video.requestVideoFrameCallback(tickRVFC);
      }
    };

    const onTimeUpdate = () => {
      if (!cancelled) setCurrentTime(video.currentTime);
    };
    const onLoadedMeta = () => {
      if (cancelled) return;
      setDuration(Number.isFinite(video.duration) ? video.duration : activeVideo.durationS ?? 0);
      video.playbackRate = rate;
      setLoadState("ready");
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    if (video.requestVideoFrameCallback) {
      rvfcId = video.requestVideoFrameCallback(tickRVFC);
    }
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      cancelled = true;
      if (rvfcId !== null && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(rvfcId);
      }
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [activeVideo, rate, retryNonce, useFallback]);

  // Keep the cursor pending until the requested camera is mounted and seekable.
  useEffect(() => {
    if (!videoCursor || videoCursor.experimentId !== experiment.id) return;
    if (lastCursorSeqRef.current === videoCursor.seq) return;

    const targetVideo = videos.find((video) => video.id === videoCursor.videoId);
    if (!targetVideo) return;
    if (targetVideo.id !== activeVideo?.id) {
      const switchCamera = window.setTimeout(() => {
        setActiveVideoId(targetVideo.id);
        setUseFallback(false);
        setLoadState("idle");
        setDuration(0);
      }, 0);
      return () => window.clearTimeout(switchCamera);
    }

    const video = videoRef.current;
    if (!video) return;
    const applyCursor = () => {
      lastCursorSeqRef.current = videoCursor.seq;
      const requested = videoCursor.timeS;
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(requested, video.duration)
        : requested;
      if (abCompare && videoBRef.current) videoBRef.current.currentTime = video.currentTime;
    };
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      applyCursor();
      return;
    }
    video.addEventListener("loadedmetadata", applyCursor, { once: true });
    return () => video.removeEventListener("loadedmetadata", applyCursor);
  }, [abCompare, activeVideo?.id, experiment.id, loadState, retryNonce, useFallback, videoCursor, videos]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    const vb = abCompare ? videoBRef.current : null;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => undefined);
      if (vb) {
        void vb.play().catch(() => undefined);
      }
    } else {
      v.pause();
      vb?.pause();
      setPlaying(false);
    }
  }, [abCompare]);

  const seekTo = useCallback(
    (timeS: number, recordAction: boolean) => {
      const clamped = Math.max(0, duration > 0 ? Math.min(duration, timeS) : timeS);
      const v = videoRef.current;
      if (v) v.currentTime = clamped;
      if (abCompare && videoBRef.current) videoBRef.current.currentTime = clamped;
      setCurrentTime(clamped);

      if (recordAction && activeVideo) {
        dispatch({
          type: "seekVideo",
          experimentId: experiment.id,
          videoId: activeVideo.id,
          timeS: Number(clamped.toFixed(3)),
        });
      }
    },
    [abCompare, activeVideo, dispatch, duration, experiment.id],
  );

  const stepFrame = useCallback(
    (deltaFrames: number) => {
      const v = videoRef.current;
      const vb = abCompare ? videoBRef.current : null;
      if (v && !v.paused) v.pause();
      if (vb && !vb.paused) vb.pause();
      setPlaying(false);
      const nextTime = Math.max(0, currentTime + deltaFrames / fps);
      seekTo(nextTime, true);
    },
    [abCompare, currentTime, fps, seekTo],
  );

  const changeRate = (nextRate: number) => {
    setRate(nextRate);
  };

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    if (videoBRef.current) videoBRef.current.playbackRate = rate;
  }, [rate, abCompare, companionId]);

  const handleVideoError = () => {
    if (activeVideo?.fallbackHref && !useFallback) {
      setUseFallback(true);
      setLoadState("idle");
      return;
    }
    setLoadState("error");
    setPlaying(false);
  };

  const frameNumber = sourceFps === null ? null : Math.round(currentTime * sourceFps);
  const comparableRuns = allExperiments.filter(
    (e) => e.id !== experiment.id && e.videos.some((v) => isStreamableVideo(v)),
  );

  return (
    <Panel
      surface="surface-1"
      className="border-[var(--line-strong)]"
      tabIndex={0}
      onKeyDown={(e) => {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          stepFrame(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          stepFrame(1);
        } else if (e.key === " " || e.key.toLowerCase() === "k") {
          e.preventDefault();
          togglePlay();
        }
      }}
    >
      <PanelHeader className="flex-wrap">
        <PanelTitle
          eyebrow={`Flame Viewer · ${experiment.testId} · ${experiment.principalInvestigator}`}
          title={titleOverride ?? `ISS Footage — ${experiment.fuel.raw}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {videos.length > 1 && activeVideo && (
                <SegmentedControl<string>
                  ariaLabel="Camera view switcher"
                  size="sm"
                  value={activeVideo.id}
                  onChange={(nextId) => {
                    setActiveVideoId(nextId);
                    setUseFallback(false);
                    setLoadState("idle");
                    setCurrentTime(0);
                    setPlaying(false);
                  }}
                  options={videos.map((v, idx) => ({
                    value: v.id,
                    label:
                      videos.filter((x) => x.kind === v.kind).length > 1
                        ? `${KIND_LABELS[v.kind]} #${idx + 1}`
                        : KIND_LABELS[v.kind],
                  }))}
                />
              )}

              {!compact && comparableRuns.length > 0 && (
                <Button
                  size="sm"
                  variant={abCompare ? "primary" : "ghost"}
                  onClick={() => setAbCompare((v) => !v)}
                >
                  <Columns2 className="size-3.5" aria-hidden="true" />
                  <span>{abCompare ? "Exit A/B" : "A/B Split Compare"}</span>
                </Button>
              )}
            </div>
          }
        />
      </PanelHeader>

      <PanelBody className="space-y-4">
        {!activeVideo ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-6 text-center space-y-2">
            <Film className="size-7 mx-auto text-[var(--text-3)]" aria-hidden="true" />
            <p className="text-[0.9375rem] font-medium text-[var(--text-1)]">
              No video files linked to Run {experiment.testId}
            </p>
            <p className="text-[0.8125rem] text-[var(--text-2)] max-w-lg mx-auto">
              This PSI-25 test table entry has zero associated MP4 or still-sequence assets in the
              manifest. Telemetry values below remain inspectable verbatim.
            </p>
          </div>
        ) : !isStreamableVideo(activeVideo) ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <Badge>{KIND_LABELS[activeVideo.kind]} ({activeVideo.ext})</Badge>
              <p className="num text-[0.875rem] font-medium text-[var(--text-1)]">
                {activeVideo.fileName}
              </p>
              <p className="text-[0.75rem] text-[var(--text-2)]">
                Non-streamable archive asset; download directly from NASA PSI file proxy.
              </p>
            </div>
            <a
              href={activeVideo.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-3)] text-[0.8125rem] text-[var(--text-1)] hover:border-[var(--accent)]"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span>Download {activeVideo.ext}</span>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Video Canvas Stage (single or A/B split) */}
            <div
              className={`grid gap-3 ${
                abCompare ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {/* Primary Run Video A */}
              <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--bg)] overflow-hidden relative">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--line)] text-[0.75rem]">
                  <span className="num font-medium text-[var(--text-1)] shrink-0">
                    A · Run {experiment.testId} ({KIND_LABELS[activeVideo.kind]})
                  </span>
                  <span className="num text-[var(--text-3)] min-w-0 max-w-full truncate">
                    {experiment.conditions.o2InitialPct !== null
                      ? `${experiment.conditions.o2InitialPct}% O₂`
                      : "O₂ —"}
                    {" · "}
                    {activeVideo.fileName}
                  </span>
                </div>

                {loadState === "error" ? (
                  <div className="aspect-video flex flex-col items-center justify-center p-5 text-center space-y-3">
                    <AlertTriangle className="size-6 text-[var(--warning)]" aria-hidden="true" />
                    <div className="space-y-1 max-w-md">
                      <p className="text-[0.875rem] font-medium text-[var(--text-1)]">
                        PSI S3 video stream currently unavailable
                      </p>
                      <p className="text-[0.75rem] text-[var(--text-2)]">
                        NASA&apos;s upstream presigned S3 redirect may be temporarily unreachable or blocked.
                        Telemetry and frame metadata remain intact below.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setUseFallback(false);
                          setLoadState("idle");
                          setRetryNonce((n) => n + 1);
                        }}
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        <span>Retry PSI stream</span>
                      </Button>
                      <a
                        href={activeVideo.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 min-h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-2)] text-[0.75rem] text-[var(--text-2)] hover:text-[var(--text-1)]"
                      >
                        Direct proxy URL
                      </a>
                    </div>
                  </div>
                ) : (
                  <video
                    key={`${activeVideo.id}-${useFallback ? "fb" : "pri"}-${retryNonce}`}
                    ref={videoRef}
                    src={streamSrc}
                    poster={localVideoPoster(activeVideo.fallbackHref)}
                    crossOrigin="anonymous"
                    playsInline
                    muted={muted}
                    loop={loop}
                    preload="metadata"
                    onError={handleVideoError}
                    className={`w-full bg-[var(--bg)] object-contain ${
                      compact ? "max-h-[280px]" : "max-h-[460px]"
                    } aspect-video`}
                  />
                )}
              </div>

              {/* Companion Run Video B (when A/B Split Compare enabled) */}
              {abCompare && (
                <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--bg)] overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 bg-[var(--surface-2)] border-b border-[var(--line)] text-[0.75rem]">
                    <div className="flex items-center gap-2">
                      <span className="num font-medium text-[var(--accent)]">B · Compare</span>
                      <select
                        aria-label="Select companion experiment for A/B split compare"
                        value={companionId}
                        onChange={(e) => {
                          setCompanionId(e.target.value);
                          setCompanionError(false);
                        }}
                        className="num h-6 px-1.5 rounded border border-[var(--line-strong)] bg-[var(--surface-3)] text-[0.75rem] text-[var(--text-1)]"
                      >
                        {comparableRuns.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.testId} · {r.principalInvestigator} ({r.conditions.o2InitialPct ?? "—"}% O₂)
                          </option>
                        ))}
                      </select>
                    </div>
                    {companionExp && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          dispatch({ type: "compare", ids: [experiment.id, companionExp.id] })
                        }
                      >
                        <GitCompareArrows className="size-3" aria-hidden="true" />
                        <span>Full Compare</span>
                      </Button>
                    )}
                  </div>

                  {companionVideo && !companionError ? (
                    <video
                      key={companionVideo.id}
                      ref={videoBRef}
                      src={companionVideo.href}
                      poster={localVideoPoster(companionVideo.fallbackHref)}
                      crossOrigin="anonymous"
                      playsInline
                      muted
                      loop={loop}
                      preload="metadata"
                      onError={() => setCompanionError(true)}
                      className={`w-full bg-[var(--bg)] object-contain ${
                        compact ? "max-h-[280px]" : "max-h-[460px]"
                      } aspect-video`}
                    />
                  ) : (
                    <div className="aspect-video flex items-center justify-center p-4 text-center text-[0.8125rem] text-[var(--text-3)]">
                      {companionVideo
                        ? "Companion PSI stream failed to load."
                        : "Select a companion run with MP4 footage."}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scrubber & Transport Controls */}
            <div
              {...timelinePulse.highlightProps}
              className={`rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 space-y-2.5 ${
                timelinePulse.highlightClassName ?? ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <input
                  type="range"
                  aria-label="Flame footage timeline scrubber"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={1 / fps}
                  value={Math.min(currentTime, duration > 0 ? duration : 100)}
                  onChange={(e) => seekTo(Number(e.target.value), false)}
                  onPointerUp={(e) => seekTo(Number(e.currentTarget.value), true)}
                  onKeyUp={(e) => seekTo(Number(e.currentTarget.value), true)}
                  className="min-w-[140px] flex-1 accent-[var(--accent)] cursor-pointer"
                />
                <div className="num text-[0.75rem] text-[var(--text-1)] whitespace-nowrap shrink-0">
                  <span>{formatClock(currentTime)}</span>
                  <span className="text-[var(--text-3)]"> / {duration > 0 ? formatClock(duration) : "—"}</span>
                  <span className="ml-2 text-[var(--accent)]">
                    {frameNumber === null ? null : `≈ f${frameNumber}`}
                  </span>
                  <span className="ml-1 text-[var(--text-3)]">
                    {formatSourceFps(sourceFps)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={togglePlay}
                    aria-label={playing ? "Pause playback" : "Play playback"}
                  >
                    {playing ? (
                      <Pause className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Play className="size-3.5" aria-hidden="true" />
                    )}
                    <span>{playing ? "Pause" : "Play"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => stepFrame(-1)}
                    aria-label={sourceFps === null ? "Seek back a short step" : "Step back one frame"}
                    title="Step -1 frame (ArrowLeft)"
                  >
                    <StepBack className="size-3.5" aria-hidden="true" />
                    <span className="num">{sourceFps === null ? "Back" : "-1f"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => stepFrame(1)}
                    aria-label={sourceFps === null ? "Seek forward a short step" : "Step forward one frame"}
                    title="Step +1 frame (ArrowRight)"
                  >
                    <span className="num">{sourceFps === null ? "Forward" : "+1f"}</span>
                    <StepForward className="size-3.5" aria-hidden="true" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMuted((m) => !m)}
                    aria-label={muted ? "Unmute audio" : "Mute audio"}
                  >
                    {muted ? (
                      <VolumeX className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Volume2 className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant={loop ? "secondary" : "ghost"}
                    onClick={() => setLoop((l) => !l)}
                    aria-pressed={loop}
                    aria-label="Toggle loop"
                  >
                    <Repeat className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>

                {/* Speed Controls */}
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Playback speed">
                  {PLAYBACK_RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={rate === r}
                      onClick={() => changeRate(r)}
                      className={`num min-h-7 px-2 rounded-[var(--radius-sm)] border text-[0.75rem] cursor-pointer transition-colors ${
                        rate === r
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                          : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-2)] hover:text-[var(--text-1)]"
                      }`}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Honest Data-Driven Event-Marker Lane */}
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                <span>Event & Telemetry Marker Lane (Source-Verified)</span>
                <span className="normal-case tracking-normal">
                  Keyboard: <code className="text-[var(--text-2)]">Space</code> play/pause ·{" "}
                  <code className="text-[var(--text-2)]">← / →</code> frame-step
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[0.75rem]">
                <button
                  type="button"
                  onClick={() => seekTo(0, true)}
                  className="num inline-flex items-center gap-1.5 min-h-6 px-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface-1)] text-[var(--text-1)] hover:border-[var(--accent)] cursor-pointer"
                >
                  <span className="size-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                  <span>0.00 s · Video start</span>
                </button>

                {experiment.outcomeHints.map((hint) => (
                  <Badge key={hint} variant="warning">
                    Operator hint: {hint}
                  </Badge>
                ))}

                {experiment.conditions.airflowSetpointsCmS.length > 0 && (
                  <Badge className="min-w-0 whitespace-normal">
                    Airflow set-points ({experiment.conditions.airflowSetpointsCmS.join(" → ")} cm/s · ~1 min duct lag)
                  </Badge>
                )}

                {experiment.totalFramesShot !== null && (
                  <Badge>
                    Total frames shot: <span className="num ml-1">{experiment.totalFramesShot}</span>
                  </Badge>
                )}

                {experiment.outcomeHints.length === 0 &&
                  experiment.conditions.airflowSetpointsCmS.length === 0 && (
                    <span className="text-[var(--text-3)]">
                      No timestamped event markers recorded in PSI-25 CSV — scrub or frame-step to inspect burn progression.
                    </span>
                  )}
              </div>
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
