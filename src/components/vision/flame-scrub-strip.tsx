"use client";

import { useMemo } from "react";

import type { VisionVideo } from "@/types/vision";

import { formatTime, useWidth } from "./time-chart";

interface FlameScrubStripProps {
  analysis: VisionVideo;
  currentTime: number;
  duration: number;
  onSeek: (timeS: number) => void;
}

const HEIGHT = 30;

/**
 * Flame-aware progress bar: the flame-area envelope over the whole video (transient glow excluded),
 * with flame-visible spans and unmeasured stretches marked, so you can see where the fire is.
 */
export function FlameScrubStrip({ analysis, currentTime, duration, onSeek }: FlameScrubStripProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const s = analysis.series!;
  const total = duration > 0 ? duration : analysis.source?.durationS ?? 0;

  const shape = useMemo(() => {
    if (!width || !total) return null;
    const bins = Math.max(40, Math.min(600, Math.floor(width / 2)));
    const peak = new Array<number>(bins).fill(0);
    const visible = new Array<boolean>(bins).fill(false);
    const unmeasured = new Array<boolean>(bins).fill(false);
    let max = 1;
    s.t.forEach((t, i) => {
      const b = Math.min(bins - 1, Math.floor((t / total) * bins));
      const a = s.areaPx[i];
      const flags = s.flags?.[i] ?? 0;
      if (a == null) unmeasured[b] = true;
      if (s.visible[i]) visible[b] = true;
      if (a != null && !(flags & 2)) {
        peak[b] = Math.max(peak[b], a);
        max = Math.max(max, a);
      }
    });
    const bw = width / bins;
    const area = peak.map((v, b) => `${b === 0 ? "M" : "L"}${(b * bw).toFixed(1)},${(HEIGHT - 2 - (Math.sqrt(v / max) * (HEIGHT - 6))).toFixed(1)}`);
    const path = `${area.join(" ")} L${width},${HEIGHT - 2} L0,${HEIGHT - 2} Z`;
    return { bins, bw, visible, unmeasured, path };
  }, [s, total, width]);

  const first = analysis.events?.firstFlameS;
  const visibleS = analysis.events?.visibleS;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.6875rem] text-[var(--text-3)]">
        <span>
          Flame along the video <span className="text-[var(--text-2)]">(image-derived area, √-scaled)</span>
        </span>
        <span className="num">
          {first != null ? `first flame ${formatTime(first)} · visible ${visibleS?.toFixed(1)} s` : "no flame detected"}
        </span>
      </div>
      <div ref={ref} className="relative">
        {shape && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Flame presence along the video; click to seek"
            className="block cursor-pointer rounded-[var(--radius-sm)] bg-[var(--surface-1)]"
            onPointerDown={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              onSeek(Math.max(0, Math.min(total, ((e.clientX - box.left) / box.width) * total)));
            }}
          >
            {shape.unmeasured.map((u, b) =>
              u ? <rect key={`u${b}`} x={b * shape.bw} y={0} width={shape.bw + 0.5} height={HEIGHT} fill="var(--text-3)" opacity={0.12} /> : null,
            )}
            {shape.visible.map((v, b) =>
              v ? <rect key={`v${b}`} x={b * shape.bw} y={HEIGHT - 2} width={shape.bw + 0.5} height={2} fill="var(--flame-edge)" /> : null,
            )}
            <path d={shape.path} fill="var(--flame-edge)" opacity={0.55} />
            <line x1={(currentTime / Math.max(total, 1e-6)) * width} x2={(currentTime / Math.max(total, 1e-6)) * width} y2={HEIGHT} stroke="var(--text-1)" strokeWidth={1.5} />
          </svg>
        )}
      </div>
    </div>
  );
}
