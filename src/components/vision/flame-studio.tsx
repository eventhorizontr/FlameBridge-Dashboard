"use client";

import { visionStatusText } from "@/lib/vision/status-text";
import { Camera, Expand, Orbit, Pause, Play, RotateCw, ScanEye, Shrink } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, Button, EmptyState, Panel, PanelBody, PanelHeader, PanelTitle, SegmentedControl, Skeleton } from "@/components/ui";
import { polygonsAt, sampleIndexAt } from "@/lib/vision/digest";
import { useDispatch } from "@/lib/store";
import type { Experiment } from "@/types/experiment";

import { FlameScrubStrip } from "./flame-scrub-strip";
import type { CameraPreset, RenderStyle, StackSlice } from "./flame-studio-scene";
import { buildVolume, type EmissionVolume, type FramePixels, type VolumeModel } from "./flame-volume";
import { formatTime } from "./time-chart";
import { rasterise, visualHull } from "./two-view";
import { usePlayback, useVisionContours, useVisionVideo } from "./use-vision";

const FlameStudioScene = dynamic(() => import("./flame-studio-scene").then((m) => m.FlameStudioScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const AXISYMMETRIC = new Set(["rod", "spherical-section", "candle"]);
const PLANAR = new Set(["film", "slab", "fabric"]);

type ModelChoice = "auto" | VolumeModel | "stack";

const MODEL_LABEL: Record<VolumeModel | "stack", string> = {
  axisymmetric: "Axisymmetric emission",
  twoview: "Two-camera reconstruction",
  planar: "Planar extrusion",
  stack: "Time stack",
};

const MODEL_NOTE: Record<VolumeModel | "stack", string> = {
  axisymmetric:
    "Rods, spheres and candles in axial flow burn axisymmetrically. Each column of the video frame is the line-of-sight integral of the flame's emission, so an onion-peeling Abel inversion (Dasch 1992) recovers the emission at every radius, per colour channel. Assumes an optically thin flame; the glow you see is that reconstructed emission.",
  twoview:
    "Planar samples are filmed edge-on by the video camera and face-on by the Nikon still camera. The side-view brightness is spread across the face-view silhouette so that the side projection is preserved (shape-from-silhouette, Laurentini 1994). The cameras are not synchronised: the still frame is paired by burn phase, and the shape is an upper bound.",
  planar:
    "Planar samples burn as near-2D sheets across their width. The side-view brightness is extruded through the depth; the depth is illustrative because the footage has no scale.",
  stack:
    "The measured outline at successive times stacked along a time axis (x, y, t). No geometric assumption at all; the bright ring is the current moment.",
};

function tokens() {
  const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const t = (n: string, f: string) => css?.getPropertyValue(n).trim() || f;
  return {
    edge: t("--flame-edge", "#ff8a3d"),
    core: t("--flame-core", "#9fd4ff"),
    ember: t("--ember", "#ff6b2c"),
    line: t("--text-3", "#7f899b"),
    text: t("--text-1", "#e8edf5"),
    bg: t("--bg", "#06090f"),
  };
}

function videoElement(videoId: string | null): HTMLVideoElement | null {
  return videoId ? document.querySelector<HTMLVideoElement>(`video[data-video-id="${videoId}"]`) : null;
}

function grabFull(video: HTMLVideoElement | null): FramePixels | null {
  if (!video || !video.videoWidth || video.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0);
    return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
  } catch {
    return null; // stream without CORS: fall back to the outline-only model
  }
}

const toPx = (polys: number[][], w: number, h: number) =>
  polys.map((flat) => {
    const pts: [number, number][] = [];
    for (let k = 0; k + 1 < flat.length; k += 2) pts.push([(flat[k] / 1000) * w, (flat[k + 1] / 1000) * h]);
    return pts;
  });

/** The main flame: the largest polygon plus sizeable pieces next to it (drops remote reflections). */
function mainFlame(polys: [number, number][][]): { polys: [number, number][][]; bbox: { x: number; y: number; w: number; h: number } } | null {
  const info = polys
    .filter((p) => p.length > 2)
    .map((p) => {
      let a = 0;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
      const xs = p.map((q) => q[0]);
      const ys = p.map((q) => q[1]);
      return { p, area: Math.abs(a) / 2, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    });
  if (!info.length) return null;
  const main = info.reduce((a, b) => (b.area > a.area ? b : a));
  const reach = Math.hypot(main.x1 - main.x0, main.y1 - main.y0) * 0.5;
  const kept = info.filter(
    (q) =>
      q === main ||
      (q.area >= 0.15 * main.area &&
        Math.max(0, q.x0 - main.x1, main.x0 - q.x1) <= reach &&
        Math.max(0, q.y0 - main.y1, main.y0 - q.y1) <= reach),
  );
  const x0 = Math.min(...kept.map((q) => q.x0));
  const x1 = Math.max(...kept.map((q) => q.x1));
  const y0 = Math.min(...kept.map((q) => q.y0));
  const y1 = Math.max(...kept.map((q) => q.y1));
  return { polys: kept.map((q) => q.p), bbox: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

export function FlameStudio({ experiment }: { experiment: Experiment }) {
  const dispatch = useDispatch();
  const playingVideo = usePlayback((s) => s.videoId);
  const playheadS = usePlayback((s) => s.timeS);
  const isPlaying = usePlayback((s) => s.playing);
  const ownIds = useMemo(() => new Set(experiment.videos.map((v) => v.id)), [experiment.videos]);
  const primary = experiment.videos.find((v) => v.kind === "primary") ?? experiment.videos[0] ?? null;
  const videoId = playingVideo && ownIds.has(playingVideo) ? playingVideo : primary?.id ?? null;
  const load = useVisionVideo(experiment.investigation, videoId);
  const analysis = load.status === "ready" && load.data.status === "ok" ? load.data : null;
  const contoursLoad = useVisionContours(experiment.investigation, videoId, Boolean(analysis));
  const contours = contoursLoad.status === "ready" ? contoursLoad.data : null;

  const geometry = experiment.fuel.geometry ?? "";
  const planar = PLANAR.has(geometry);
  const stillVideo = experiment.videos.find((v) => v.kind === "still-sequence") ?? null;
  const stillLoad = useVisionVideo(experiment.investigation, planar ? stillVideo?.id : null);
  const still = stillLoad.status === "ready" && stillLoad.data.status === "ok" && stillLoad.data.events?.peakAreaS != null ? stillLoad.data : null;
  const stillContoursLoad = useVisionContours(experiment.investigation, still?.videoId, Boolean(still));
  const stillContours = stillContoursLoad.status === "ready" ? stillContoursLoad.data : null;

  const autoModel: VolumeModel = AXISYMMETRIC.has(geometry) ? "axisymmetric" : still ? "twoview" : "planar";
  const [choice, setChoice] = useState<ModelChoice>("auto");
  const model: VolumeModel | "stack" = choice === "auto" ? autoModel : choice;
  const [style, setStyle] = useState<RenderStyle>("glow");
  const [exposure, setExposure] = useState(2.5);
  const [autoRotate, setAutoRotate] = useState(false);
  const [preset, setPreset] = useState<{ name: CameraPreset; nonce: number }>({ name: "orbit", nonce: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [colors] = useState(tokens);
  const stageRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLCanvasElement>(null);

  const series = analysis?.series;
  const peakT = analysis?.events?.peakAreaS ?? 0;
  const playIndex = series && playingVideo === videoId ? sampleIndexAt(series.t, playheadS) : -1;
  const playheadHasFlame = Boolean(series && playIndex >= 0 && series.visible[playIndex] === 1);
  // follow the video when it shows a flame; otherwise show the peak (outline-only until the video is there)
  const useT = playheadHasFlame ? playheadS : peakT;
  const index = series ? sampleIndexAt(series.t, useT) : -1;
  const sampleT = series && index >= 0 ? series.t[index] : 0;
  const visible = series && index >= 0 ? series.visible[index] === 1 : false;
  const polygons = useMemo(() => (series && contours ? polygonsAt(contours, series, sampleT) : null), [series, contours, sampleT]);

  // the still-camera frame for the two-camera model: its steady peak
  const faceMask = useMemo(() => {
    if (!still?.series || !still.source || !stillContours || still.events?.peakAreaS == null) return null;
    const i = sampleIndexAt(still.series.t, still.events.peakAreaS);
    const polys = stillContours.polygons[i];
    const flame = polys?.length ? mainFlame(toPx(polys, still.source.width, still.source.height)) : null;
    return flame ? rasterise(flame.polys, still.source.width, still.source.height) : null;
  }, [still, stillContours]);

  const [volume, setVolume] = useState<EmissionVolume | null>(null);
  // rebuild when the video has actually decoded a new frame (after a seek or on load)
  const [frameTick, setFrameTick] = useState(0);
  useEffect(() => {
    const v = videoElement(videoId);
    if (!v) return;
    const bump = () => setFrameTick((n) => n + 1);
    v.addEventListener("seeked", bump);
    v.addEventListener("loadeddata", bump);
    return () => {
      v.removeEventListener("seeked", bump);
      v.removeEventListener("loadeddata", bump);
    };
  }, [videoId, analysis]);
  const [details, setDetails] = useState<{ mirrored?: boolean; agreement?: number } | null>(null);

  useEffect(() => {
    if (model === "stack" || !analysis?.source || !series || index < 0 || !polygons?.length || !visible) return;
    const src = analysis.source;
    const flame = mainFlame(toPx(polygons, src.width, src.height));
    if (!flame) return;
    const sidePolys = flame.polys;
    const side = rasterise(sidePolys, src.width, src.height);
    const { x: bx, y: by, w: bw, h: bh } = flame.bbox;
    if (!side || bw < 2 || bh < 2) return;
    const id = window.setTimeout(() => {
      const video = videoElement(videoId);
      // footage pixels only when the video actually shows this moment
      const frame = video && Math.abs(video.currentTime - series.t[index]) < 0.35 ? grabFull(video) : null;
      let face = null;
      if (model === "twoview" && faceMask) {
        const hull = visualHull(side, faceMask, 24);
        face = { mask: faceMask, mirrored: hull.mirrored };
        setDetails({ mirrored: hull.mirrored, agreement: hull.agreement });
      } else setDetails(null);
      const cy = series.cy[index];
      const axisY = cy != null && cy >= by && cy <= by + bh ? cy : by + bh / 2;
      setVolume(
        buildVolume({
          model: model === "twoview" && !face ? "planar" : model,
          side,
          frame,
          source: src,
          bbox: { x: bx, y: by, w: bw, h: bh },
          axisY,
          fallback: [1, 0.25, 0.045],
          face,
        }),
      );
      // 2D source inset: the frame crop with the measured outline
      const inset = insetRef.current;
      const ctx = inset?.getContext("2d");
      if (inset && ctx) {
        const pad = 0.35;
        const cx0 = Math.max(0, bx - bw * pad);
        const cy0 = Math.max(0, by - bh * pad);
        const cw = Math.min(src.width - cx0, bw * (1 + 2 * pad));
        const ch = Math.min(src.height - cy0, bh * (1 + 2 * pad));
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, inset.width, inset.height);
        const video = videoElement(videoId);
        const s = Math.min(inset.width / cw, inset.height / ch);
        const ox = (inset.width - cw * s) / 2;
        const oy = (inset.height - ch * s) / 2;
        try {
          if (video && video.readyState >= 2) ctx.drawImage(video, (cx0 / src.width) * video.videoWidth, (cy0 / src.height) * video.videoHeight, (cw / src.width) * video.videoWidth, (ch / src.height) * video.videoHeight, ox, oy, cw * s, ch * s);
        } catch {
          /* tainted stream: outline only */
        }
        ctx.strokeStyle = colors.edge;
        ctx.lineWidth = 1.2;
        for (const poly of sidePolys) {
          ctx.beginPath();
          poly.forEach(([x, y], k) => (k ? ctx.lineTo(ox + (x - cx0) * s, oy + (y - cy0) * s) : ctx.moveTo(ox + (x - cx0) * s, oy + (y - cy0) * s)));
          ctx.closePath();
          ctx.stroke();
        }
      }
    }, 40);
    return () => window.clearTimeout(id);
  }, [model, analysis, series, index, polygons, visible, videoId, faceMask, colors.bg, colors.edge, frameTick]);

  const stack = useMemo<StackSlice[] | null>(() => {
    if (model !== "stack" || !series || !contours || !analysis?.source) return null;
    const src = analysis.source;
    const vis = series.t.map((_, i) => i).filter((i) => series.visible[i] && contours.polygons[i]?.length && !((series.flags?.[i] ?? 0) & (2 | 16)));
    const step = Math.max(1, Math.ceil(vis.length / 140));
    return vis
      .filter((_, k) => k % step === 0)
      .map((i) => {
        const polys = contours.polygons[i]!;
        const largest = polys.reduce((a, b) => (b.length > a.length ? b : a), polys[0]);
        return { t: series.t[i], polygon: toPx([largest], src.width, src.height)[0] };
      });
  }, [model, series, contours, analysis]);

  const togglePlay = useCallback(() => {
    const v = videoElement(videoId);
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, [videoId]);

  const seek = useCallback(
    (t: number) => {
      if (!videoId) return;
      dispatch({ type: "seekVideo", experimentId: experiment.id, videoId, timeS: Number(t.toFixed(2)) });
    },
    [dispatch, experiment.id, videoId],
  );

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const modelOptions = [
    { value: "auto" as const, label: `Auto · ${MODEL_LABEL[autoModel].split(" ")[0]}` },
    ...(AXISYMMETRIC.has(geometry) ? [{ value: "axisymmetric" as const, label: "Axisymmetric" }] : []),
    ...(planar && still ? [{ value: "twoview" as const, label: "Two-camera" }] : []),
    ...(planar ? [{ value: "planar" as const, label: "Planar" }] : []),
    { value: "stack" as const, label: "Time stack" },
  ];

  return (
    <Panel surface="surface-1">
      <PanelHeader>
        <PanelTitle eyebrow="Flame 3D Studio · reconstructed from the ISS footage" title="3D Flame" />
      </PanelHeader>
      <PanelBody className="space-y-3">
        {!videoId || load.status === "absent" ? (
          <EmptyState icon={<ScanEye className="size-5" />} title="No analysed footage" description="The 3D flame is reconstructed from the vision layer; this run has none." />
        ) : load.status === "loading" ? (
          <Skeleton className="h-96" />
        ) : !analysis ? (
          <EmptyState
            icon={<ScanEye className="size-5" />}
            title={load.status === "ready" ? visionStatusText(load.data.status, load.data.reason).title : "This video is not measured"}
            description={load.status === "ready" ? visionStatusText(load.data.status, load.data.reason).body : ""}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<ModelChoice> ariaLabel="3D model" size="sm" value={choice} onChange={setChoice} options={modelOptions} />
              {model !== "stack" && (
                <SegmentedControl<RenderStyle>
                  ariaLabel="Render style"
                  size="sm"
                  value={style}
                  onChange={setStyle}
                  options={[
                    { value: "glow", label: "Glow" },
                    { value: "surface", label: "Surface" },
                  ]}
                />
              )}
              <span className="mx-1 hidden h-5 w-px bg-[var(--line-strong)] sm:block" aria-hidden="true" />
              <Button size="sm" variant="ghost" onClick={() => setPreset({ name: "camera", nonce: Date.now() })} title="Look along the ISS video camera's line of sight">
                <Camera className="size-3.5" aria-hidden="true" />
                <span>Camera view</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreset({ name: "top", nonce: Date.now() })}>
                <span>Top</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreset({ name: "orbit", nonce: Date.now() })}>
                <Orbit className="size-3.5" aria-hidden="true" />
                <span>3/4</span>
              </Button>
              <Button size="sm" variant={autoRotate ? "accent-soft" : "ghost"} aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
                <RotateCw className="size-3.5" aria-hidden="true" />
                <span>Rotate</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => (fullscreen ? void document.exitFullscreen() : void stageRef.current?.requestFullscreen())}
              >
                {fullscreen ? <Shrink className="size-3.5" aria-hidden="true" /> : <Expand className="size-3.5" aria-hidden="true" />}
                <span>{fullscreen ? "Exit" : "Fullscreen"}</span>
              </Button>
            </div>

            <div ref={stageRef} className="relative h-[24rem] sm:h-[34rem] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg)] [&:fullscreen]:h-screen [&:fullscreen]:rounded-none">
              {model !== "stack" && !visible ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-[0.875rem] text-[var(--text-2)]">
                  <p>No flame in view at {formatTime(sampleT)}.</p>
                  {analysis.events?.peakAreaS != null && (
                    <Button size="sm" variant="primary" onClick={() => seek(analysis.events!.peakAreaS!)}>
                      Jump to the peak flame ({formatTime(analysis.events.peakAreaS)})
                    </Button>
                  )}
                </div>
              ) : (
                <FlameStudioScene
                  volume={model === "stack" ? null : volume}
                  stack={stack}
                  stackNow={sampleT}
                  style={style}
                  exposure={exposure}
                  autoRotate={autoRotate}
                  preset={preset}
                  colors={colors}
                />
              )}
              <div className="pointer-events-none absolute left-3 top-3 space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="accent">{MODEL_LABEL[model]}</Badge>
                  <Badge className="num">t = {formatTime(sampleT)}</Badge>
                  {model !== "stack" && volume && <Badge>{volume.usedPixels ? "footage emission" : "outline only"}</Badge>}
                  {model !== "stack" && volume && !volume.usedPixels && (
                    <button
                      type="button"
                      onClick={() => seek(sampleT)}
                      className="pointer-events-auto rounded-full border border-[var(--flame-edge)] px-2 text-[0.6875rem] text-[var(--flame-edge)] cursor-pointer"
                    >
                      Use the footage at {formatTime(sampleT)}
                    </button>
                  )}
                </div>
                {model !== "stack" && volume && volume.saturatedShare > 0.05 && (
                  <p className="num text-[0.6875rem] text-[var(--warning)]">
                    {(volume.saturatedShare * 100).toFixed(0)} % of the flame is clipped at full brightness — the core is a lower bound
                  </p>
                )}
              </div>
              {model !== "stack" && (
                <label className="absolute right-3 top-3 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgb(6_9_15/0.7)] px-2 py-1 text-[0.6875rem] text-[var(--text-2)]">
                  Exposure
                  <input type="range" min={0.6} max={6} step={0.1} value={exposure} onChange={(e) => setExposure(Number(e.target.value))} className="w-24 accent-[var(--flame-edge)]" />
                </label>
              )}
              {model !== "stack" && (
                <figure className="pointer-events-none absolute bottom-3 left-3 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--bg)]">
                  <canvas ref={insetRef} width={200} height={132} className="block" aria-label="2D source frame with the measured outline" />
                  <figcaption className="bg-[rgb(6_9_15/0.8)] px-1.5 py-0.5 text-[0.625rem] text-[var(--text-2)]">2D source · ISS video</figcaption>
                </figure>
              )}
              <span className="pointer-events-none absolute bottom-3 right-3 text-[0.6875rem] text-[var(--text-3)]">Drag to orbit · scroll to zoom · right-drag to pan</span>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" variant="primary" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </Button>
              <div className="min-w-0 flex-1">
                <FlameScrubStrip analysis={analysis} currentTime={sampleT} duration={analysis.source?.durationS ?? 0} onSeek={seek} />
              </div>
            </div>

            <details className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[0.75rem] text-[var(--text-2)]">
              <summary className="cursor-pointer text-[var(--text-1)]">How this 3D flame is built</summary>
              <div className="mt-2 space-y-2 leading-relaxed">
                <p>{MODEL_NOTE[model]}</p>
                {model === "twoview" && details?.agreement != null && (
                  <p className="num">
                    Side/face profile agreement r = {details.agreement.toFixed(2)}
                    {details.mirrored ? " · face view mirrored to match" : ""}.
                  </p>
                )}
                <p>
                  The 3D model follows the video above: play or scrub here and the reconstruction updates from the current frame.
                  Brightness is relative (8-bit video, not radiometrically calibrated); pixels are linearised from sRGB and only the
                  measured flame region is used. Sizes are in units of the flame length — the footage has no physical scale.
                </p>
              </div>
            </details>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
