"use client";

import { Box, Orbit, RotateCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { Badge, Button, EmptyState, Panel, PanelBody, PanelHeader, PanelTitle, SegmentedControl, Skeleton } from "@/components/ui";
import { polygonsAt, sampleIndexAt } from "@/lib/vision/digest";
import type { MeshModel, Profile } from "@/lib/vision/mesh";
import type { Experiment } from "@/types/experiment";

import type { FramePixels, SpaceTimeSlice } from "./flame-3d-scene";
import { formatTime } from "./time-chart";
import { usePlayback, useVisionContours, useVisionVideo } from "./use-vision";

const Flame3DScene = dynamic(() => import("./flame-3d-scene").then((m) => m.Flame3DScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const AXISYMMETRIC = new Set(["rod", "spherical-section", "candle"]);

const MODEL_NOTES: Record<MeshModel, string> = {
  revolve:
    "Solid of revolution about the flow axis through the flame centroid. Rods, spheres and candles in axial flow burn axisymmetrically, so the projected half-width at each position is the radius. Surface colours are the footage pixels the camera saw.",
  extrude:
    "The side-view silhouette extruded across the sample. Films, slabs and fabrics burn as near-2D sheets across their width; the depth shown is illustrative because the footage has no scale.",
  spacetime:
    "The measured outline at successive times, stacked along a time axis (x, y, t). No geometric assumption: every vertex is a contour point from the analysis. The bright ring is the current time.",
};

function readTokens() {
  const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const t = (name: string, fallback: string) => css?.getPropertyValue(name).trim() || fallback;
  return {
    core: t("--flame-core", "#9fd4ff"),
    edge: t("--flame-edge", "#ff8a3d"),
    ember: t("--ember", "#ff6b2c"),
    line: t("--text-3", "#7f899b"),
    text: t("--text-1", "#e8edf5"),
  };
}

/** Pixels of the viewer's current frame (same video, CORS-enabled stream), or null. */
function grabFrame(videoId: string): FramePixels | null {
  const video = document.querySelector<HTMLVideoElement>(`video[data-video-id="${videoId}"]`);
  if (!video || !video.videoWidth) return null;
  const w = Math.min(360, video.videoWidth);
  const h = Math.round((w * video.videoHeight) / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, w, h);
    return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
  } catch {
    return null; // tainted canvas: fall back to design-system flame colours
  }
}

export function Flame3D({ experiment }: { experiment: Experiment }) {
  const playingVideo = usePlayback((s) => s.videoId);
  const playheadS = usePlayback((s) => s.timeS);
  const ownIds = useMemo(() => new Set(experiment.videos.map((v) => v.id)), [experiment.videos]);
  const fallback = experiment.videos.find((v) => v.kind === "primary") ?? experiment.videos[0] ?? null;
  const videoId = playingVideo && ownIds.has(playingVideo) ? playingVideo : fallback?.id ?? null;
  const load = useVisionVideo(experiment.investigation, videoId);
  const analysis = load.status === "ready" && load.data.status === "ok" ? load.data : null;
  const contoursLoad = useVisionContours(experiment.investigation, videoId, Boolean(analysis));
  const contours = contoursLoad.status === "ready" ? contoursLoad.data : null;

  const [model, setModel] = useState<MeshModel>(AXISYMMETRIC.has(experiment.fuel.geometry ?? "") ? "revolve" : "extrude");
  const [followVideo, setFollowVideo] = useState(true);
  const [pinnedT, setPinnedT] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pixels, setPixels] = useState<FramePixels | null>(null);
  const [colors, setColors] = useState(() => readTokens());

  useEffect(() => setColors(readTokens()), []);

  const series = analysis?.series;
  const peakT = analysis?.events?.peakAreaS ?? null;
  const targetT = followVideo && playingVideo === videoId && playheadS > 0 ? playheadS : pinnedT ?? peakT ?? 0;
  const index = series ? sampleIndexAt(series.t, targetT) : -1;
  // throttle geometry rebuilds to stored samples (5 Hz)
  const sampleT = series && index >= 0 ? series.t[index] : 0;
  const polygons = useMemo(
    () => (series && contours ? polygonsAt(contours, series, sampleT) : null),
    [series, contours, sampleT],
  );
  const axisY = series && index >= 0 ? series.cy[index] ?? (series.bboxY[index] ?? 0) + (series.bboxH[index] ?? 0) / 2 : 0;

  useEffect(() => {
    if (!videoId || model === "spacetime") return;
    const id = window.setTimeout(() => setPixels(grabFrame(videoId)), 60);
    return () => window.clearTimeout(id);
  }, [videoId, sampleT, model]);

  const slices = useMemo<SpaceTimeSlice[]>(() => {
    if (!series || !contours || model !== "spacetime") return [];
    const vis = series.t.map((_, i) => i).filter((i) => series.visible[i] && contours.polygons[i]?.length && !((series.flags?.[i] ?? 0) & (2 | 16)));
    const step = Math.max(1, Math.ceil(vis.length / 140));
    const src = analysis!.source!;
    return vis
      .filter((_, k) => k % step === 0)
      .map((i) => {
        const polys = contours.polygons[i]!;
        const largest = polys.reduce((a, b) => (b.length > a.length ? b : a), polys[0]);
        const pts: [number, number][] = [];
        for (let k = 0; k + 1 < largest.length; k += 2) pts.push([(largest[k] / 1000) * src.width, (largest[k + 1] / 1000) * src.height]);
        return { t: series.t[i], polygon: pts };
      });
  }, [series, contours, model, analysis]);

  const visible = series && index >= 0 ? series.visible[index] === 1 : false;

  return (
    <Panel surface="surface-1">
      <PanelHeader>
        <PanelTitle
          eyebrow="Flame in 3D · built from the measured outline"
          title="Interactive Flame Model"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<MeshModel>
                ariaLabel="3D model"
                size="sm"
                value={model}
                onChange={setModel}
                options={[
                  { value: "revolve", label: "Revolve", icon: <Orbit className="size-3.5" aria-hidden="true" /> },
                  { value: "extrude", label: "Extrude", icon: <Box className="size-3.5" aria-hidden="true" /> },
                  { value: "spacetime", label: "Space-time" },
                ]}
              />
              <Button size="sm" variant={autoRotate ? "accent-soft" : "ghost"} aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
                <RotateCw className="size-3.5" aria-hidden="true" />
                <span>Auto-rotate</span>
              </Button>
            </div>
          }
        />
      </PanelHeader>
      <PanelBody className="space-y-3">
        {!videoId || load.status === "absent" ? (
          <EmptyState title="No analysed footage" description="The 3D model is built from the vision layer; this run has none." />
        ) : load.status === "loading" || (analysis && contoursLoad.status === "loading") ? (
          <Skeleton className="h-80" />
        ) : !analysis ? (
          <EmptyState title="This video is not measured" description={load.status === "ready" ? load.data.reason ?? "No analysis." : ""} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <div className="relative h-[22rem] sm:h-[26rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[radial-gradient(ellipse_at_center,var(--surface-2),var(--bg))]">
                {model !== "spacetime" && !visible ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[0.8125rem] text-[var(--text-2)]">
                    No flame at {formatTime(sampleT)} — play the video to a burning moment or jump to the peak.
                  </div>
                ) : (
                  <Flame3DScene
                    model={model}
                    polygons={polygons}
                    slices={slices}
                    currentT={sampleT}
                    source={{ width: analysis.source!.width, height: analysis.source!.height }}
                    axisY={axisY}
                    pixels={pixels}
                    autoRotate={autoRotate}
                    colors={colors}
                    onProfile={setProfile}
                  />
                )}
                <span className="num pointer-events-none absolute left-2 top-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[rgb(6_9_15/0.75)] px-2 py-0.5 text-[0.6875rem] text-[var(--text-1)]">
                  {model === "spacetime" ? `${slices.length} outlines · now ${formatTime(sampleT)}` : `t = ${formatTime(sampleT)}`}
                </span>
                <span className="pointer-events-none absolute bottom-2 right-2 text-[0.6875rem] text-[var(--text-3)]">Drag to rotate · scroll to zoom</span>
              </div>
              <div className="space-y-3 text-[0.75rem] text-[var(--text-2)]">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="accent">{experiment.fuel.geometry ?? "geometry unknown"}</Badge>
                  <Badge>{model === "revolve" ? "axisymmetric model" : model === "extrude" ? "planar model" : "measured outlines"}</Badge>
                  {model !== "spacetime" && (pixels ? <Badge>footage colours</Badge> : <Badge>palette colours</Badge>)}
                </div>
                <p className="leading-relaxed">{MODEL_NOTES[model]}</p>
                {model === "revolve" && profile && (
                  <p className="num">
                    Upper/lower asymmetry {(profile.asymmetry * 100).toFixed(0)} %
                    {profile.asymmetry > 0.35 ? " — high: the flame is not axisymmetric here, read the model as a shape sketch." : ""}
                  </p>
                )}
                {model === "revolve" && !AXISYMMETRIC.has(experiment.fuel.geometry ?? "") && (
                  <p className="text-[var(--warning)]">This sample is planar; the revolved shape is illustrative only. Prefer Extrude.</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant={followVideo ? "accent-soft" : "ghost"} aria-pressed={followVideo} onClick={() => setFollowVideo((v) => !v)}>
                    Follow video
                  </Button>
                  {peakT != null && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFollowVideo(false);
                        setPinnedT(peakT);
                      }}
                    >
                      Peak frame {formatTime(peakT)}
                    </Button>
                  )}
                </div>
                <p className="text-[0.6875rem] text-[var(--text-3)]">
                  Two orthogonal views (video side view + still-camera view) could give a visual hull, but the two cameras are not
                  synchronised and have different, uncalibrated magnifications, so it is not built.
                </p>
              </div>
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
