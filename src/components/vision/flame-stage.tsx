"use client";

import { ImageDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { boxAt, flagLabels, polygonsAt, sampleIndexAt } from "@/lib/vision/digest";
import type { FlameOverlay, VisionContours, VisionVideo } from "@/types/vision";

import { playbackStore } from "./use-vision";

interface FlameStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoId: string | null;
  experimentId?: string | null;
  /** File-name stem for "Save frame", e.g. "PSI-25_B1". */
  captureName?: string;
  analysis: VisionVideo | null;
  contours: VisionContours | null;
  overlay: FlameOverlay;
  children: ReactNode;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FOLLOW_PADDING = 1.45;
const FOLLOW_MAX_ZOOM = 4;

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Where the video picture sits inside its element (object-fit: contain letterboxing). */
function contentRect(video: HTMLVideoElement, width: number, height: number, srcW: number, srcH: number): Rect {
  const vw = video.videoWidth || srcW;
  const vh = video.videoHeight || srcH;
  const scale = Math.min(width / vw, height / vh);
  const w = vw * scale;
  const h = vh * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

/**
 * Wraps the flame viewer's <video>: draws the vision layer on a canvas in the same transformed
 * frame (so "follow" zoom moves picture and drawing together) and publishes playback time.
 * All geometry comes from the stored analysis; nothing is computed from pixels in the browser.
 */
export function FlameStage({
  videoRef,
  videoId,
  experimentId = null,
  captureName = "frame",
  analysis,
  contours,
  overlay,
  children,
}: FlameStageProps) {
  const [captureError, setCaptureError] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ analysis, contours, overlay, videoId, experimentId });

  useEffect(() => {
    latest.current = { analysis, contours, overlay, videoId, experimentId };
  }, [analysis, contours, overlay, videoId, experimentId]);

  useEffect(() => {
    const accent = readToken("--flame-edge", "#ff8a3d");
    const warning = readToken("--warning", "#f5b43c");
    const ink = readToken("--text-1", "#e8ecf3");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const zoom = { s: 1, tx: 0, ty: 0 };
    let raf = 0;
    let lastPublish = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const frame = frameRef.current;
      if (!video || !canvas || !frame) return;
      const { analysis: a, contours: c, overlay: o, videoId: id, experimentId: expId } = latest.current;
      const t = video.currentTime || 0;

      if (id && now - lastPublish > 100) {
        lastPublish = now;
        playbackStore.getState().publish(expId, id, t, !video.paused);
      }

      const width = frame.clientWidth;
      const height = frame.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const series = a?.status === "ok" ? a.series : undefined;
      const src = a?.source;
      const label = labelRef.current;
      let target = { s: 1, tx: 0, ty: 0 };

      if (series && src && o.mode !== "off") {
        const rect = contentRect(video, width, height, src.width, src.height);
        const sx = rect.w / src.width;
        const sy = rect.h / src.height;
        const box = boxAt(series, t);
        const i = sampleIndexAt(series.t, t);
        const flags = series.flags?.[i] ?? 0;
        const lit = (flags & 1) !== 0;
        const polys = c ? polygonsAt(c, series, t) : null;
        const toPath = (flat: number[]) => {
          ctx.moveTo(rect.x + (flat[0] / 1000) * rect.w, rect.y + (flat[1] / 1000) * rect.h);
          for (let k = 2; k < flat.length; k += 2) {
            ctx.lineTo(rect.x + (flat[k] / 1000) * rect.w, rect.y + (flat[k + 1] / 1000) * rect.h);
          }
          ctx.closePath();
        };

        if (o.mode === "isolate") {
          ctx.save();
          ctx.fillStyle = "rgba(2, 4, 8, 0.94)";
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
          if (polys?.length) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.filter = "blur(5px)";
            ctx.beginPath();
            polys.forEach(toPath);
            ctx.fill();
            ctx.lineWidth = 10;
            ctx.stroke();
          }
          ctx.restore();
        }

        if (o.mode === "outline" && polys?.length) {
          ctx.save();
          ctx.beginPath();
          polys.forEach(toPath);
          ctx.fillStyle = "rgba(255, 122, 69, 0.10)";
          ctx.fill();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        if (box && (o.mode === "box" || o.mode === "outline")) {
          const x = rect.x + box.x * sx;
          const y = rect.y + box.y * sy;
          const w = box.w * sx;
          const h = box.h * sy;
          ctx.save();
          ctx.strokeStyle = flags & (2 | 16) ? warning : accent;
          ctx.lineWidth = 1.5;
          ctx.setLineDash(o.mode === "outline" ? [4, 4] : []);
          ctx.strokeRect(x, y, w, h);
          // corner ticks
          ctx.setLineDash([]);
          const tick = Math.min(12, w / 4, h / 4);
          ctx.lineWidth = 2.5;
          for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
            ctx.beginPath();
            ctx.moveTo(cx + dx * tick, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + dy * tick);
            ctx.stroke();
          }
          const cxv = series.cx[i];
          const cyv = series.cy[i];
          if (cxv != null && cyv != null && series.visible[i]) {
            ctx.fillStyle = ink;
            ctx.beginPath();
            ctx.arc(rect.x + cxv * sx, rect.y + cyv * sy, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        if (o.follow && box && !lit) {
          const cxp = rect.x + (box.x + box.w / 2) * sx;
          const cyp = rect.y + (box.y + box.h / 2) * sy;
          const s = Math.max(1, Math.min(FOLLOW_MAX_ZOOM, Math.min(width / (box.w * sx * FOLLOW_PADDING), height / (box.h * sy * FOLLOW_PADDING))));
          target = { s, tx: width / 2 - s * cxp, ty: height / 2 - s * cyp };
          // keep the picture covering the frame
          target.tx = Math.min(0, Math.max(width - s * width, target.tx));
          target.ty = Math.min(0, Math.max(height - s * height, target.ty));
        }

        if (label) {
          const area = series.areaPx[i];
          const parts: string[] = [];
          if (lit) parts.push("Chamber lit — not measured");
          else if (series.visible[i] && box) {
            parts.push(`Frame ${Math.round(box.w)}×${Math.round(box.h)} px`);
            if (area != null) parts.push(`area ${area.toLocaleString("en-US")} px`);
          } else parts.push("No flame detected");
          const warn = flagLabels(flags & ~1);
          label.textContent = parts.join(" · ");
          label.title = warn.join("\n");
          label.dataset.warn = warn.length ? "1" : "0";
          label.style.display = "";
        }
      } else if (label) {
        label.style.display = "none";
      }

      const k = reduceMotion ? 1 : 0.12;
      zoom.s += (target.s - zoom.s) * k;
      zoom.tx += (target.tx - zoom.tx) * k;
      zoom.ty += (target.ty - zoom.ty) * k;
      if (zoomRef.current) {
        zoomRef.current.style.transform =
          Math.abs(zoom.s - 1) < 0.002 && Math.abs(zoom.tx) < 0.5 && Math.abs(zoom.ty) < 0.5
            ? ""
            : `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.s})`;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  /** Full-resolution PNG of the current frame, with the vision layer when it is switched on. */
  const saveFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const out = document.createElement("canvas");
    out.width = video.videoWidth;
    out.height = video.videoHeight;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0, out.width, out.height);
      const overlayCanvas = canvasRef.current;
      const frame = frameRef.current;
      if (overlay.mode !== "off" && overlayCanvas && frame) {
        const rect = contentRect(video, frame.clientWidth, frame.clientHeight, video.videoWidth, video.videoHeight);
        const dpr = overlayCanvas.width / Math.max(1, frame.clientWidth);
        ctx.drawImage(overlayCanvas, rect.x * dpr, rect.y * dpr, rect.w * dpr, rect.h * dpr, 0, 0, out.width, out.height);
      }
      const link = document.createElement("a");
      link.download = `${captureName}_t${video.currentTime.toFixed(2)}s${overlay.mode !== "off" ? `_${overlay.mode}` : ""}.png`;
      link.href = out.toDataURL("image/png");
      link.click();
      setCaptureError(null);
    } catch {
      setCaptureError("The video host did not allow pixel access (CORS) — use a screenshot instead.");
    }
  };

  return (
    <div ref={frameRef} className="relative overflow-hidden">
      <div ref={zoomRef} className="relative origin-top-left will-change-transform">
        {children}
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      </div>
      <div
        ref={labelRef}
        role="status"
        aria-live="off"
        style={{ display: "none" }}
        className="num pointer-events-none absolute left-2 top-2 max-w-[calc(100%-3.5rem)] truncate rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[rgb(6_9_15/0.78)] px-2 py-0.5 text-[0.6875rem] text-[var(--text-1)] backdrop-blur-sm data-[warn=1]:border-[var(--warning)]"
      />
      <button
        type="button"
        onClick={saveFrame}
        aria-label="Save this frame as PNG"
        title={captureError ?? "Save this frame as PNG (with the vision layer if on)"}
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[rgb(6_9_15/0.78)] text-[var(--text-1)] backdrop-blur-sm hover:border-[var(--flame-edge)] cursor-pointer"
      >
        <ImageDown className="size-4" aria-hidden="true" />
      </button>
      {captureError && (
        <p role="alert" className="absolute bottom-2 left-2 right-2 rounded-[var(--radius-sm)] bg-[rgb(6_9_15/0.85)] px-2 py-1 text-[0.6875rem] text-[var(--warning)]">
          {captureError}
        </p>
      )}
    </div>
  );
}
