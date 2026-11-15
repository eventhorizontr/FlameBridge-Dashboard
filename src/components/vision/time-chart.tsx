"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useEffect, useMemo, useRef, useState } from "react";

import { sampleIndexAt } from "@/lib/vision/digest";

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS colour, normally a series token such as var(--series-1). */
  color: string;
  values: readonly (number | null)[];
}

export interface Band {
  startS: number;
  endS: number;
  tone: "flame" | "warn" | "muted";
}

interface TimeChartProps {
  title: string;
  unit: string;
  t: readonly number[];
  durationS: number;
  series: ChartSeries[];
  playheadS: number | null;
  onSeek: (timeS: number) => void;
  bands?: Band[];
  height?: number;
  yDomain?: [number, number];
  format?: (v: number) => string;
  note?: string;
}

const MARGIN = { top: 8, right: 18, bottom: 18, left: 44 };

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const defaultFormat = (v: number) =>
  Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function formatTime(s: number, coarse = false): string {
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return coarse ? `${m}:${Math.floor(rest).toString().padStart(2, "0")}` : `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** Centered moving average over `window` samples; nulls are skipped, all-null windows stay null. */
export function smooth(values: readonly (number | null)[], window: number): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((v, i) => {
    if (v == null) return null;
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(values.length - 1, i + half); k++) {
      const x = values[k];
      if (x != null) {
        sum += x;
        n += 1;
      }
    }
    return n ? sum / n : null;
  });
}

/** One small-multiple time chart: one y-axis, shared time domain, playhead, hover read-out, click-to-seek. */
export function TimeChart({
  title,
  unit,
  t,
  durationS,
  series,
  playheadS,
  onSeek,
  bands = [],
  height = 120,
  yDomain,
  format = defaultFormat,
  note,
}: TimeChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hoverS, setHoverS] = useState<number | null>(null);
  const innerW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const x = useMemo(() => scaleLinear().domain([0, Math.max(durationS, 1)]).range([0, innerW]), [durationS, innerW]);
  const y = useMemo(() => {
    if (yDomain) return scaleLinear().domain(yDomain).range([innerH, 0]);
    let max = 0;
    let min = 0;
    for (const s of series) for (const v of s.values) if (v != null) { if (v > max) max = v; if (v < min) min = v; }
    return scaleLinear().domain([min, max || 1]).nice(4).range([innerH, 0]);
  }, [series, innerH, yDomain]);

  const paths = useMemo(
    () =>
      series.map((s) => {
        const gen = line<number>()
          .defined((i) => s.values[i] != null)
          .x((i) => x(t[i]))
          .y((i) => y(s.values[i] as number));
        return { key: s.key, color: s.color, d: gen(t.map((_, i) => i)) ?? "" };
      }),
    [series, t, x, y],
  );

  const hoverIndex = hoverS == null ? -1 : sampleIndexAt(t, hoverS);
  const ticks = y.ticks(3);
  const xTicks = x.ticks(Math.max(2, Math.floor(innerW / 90)));

  const timeFromEvent = (clientX: number, el: Element) => {
    const box = el.getBoundingClientRect();
    return Math.max(0, Math.min(durationS, x.invert(clientX - box.left - MARGIN.left)));
  };

  return (
    <figure className="min-w-0 space-y-1">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[0.75rem] font-medium text-[var(--text-1)]">
          {title} <span className="font-normal text-[var(--text-3)]">· {unit}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.6875rem] text-[var(--text-2)]">
          {series.length > 1 &&
            series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                {s.label}
              </span>
            ))}
          {hoverIndex >= 0 && (
            <span className="num text-[var(--text-1)]">
              {formatTime(t[hoverIndex])} ·{" "}
              {series
                .map((s) => {
                  const v = s.values[hoverIndex];
                  return `${series.length > 1 ? `${s.label} ` : ""}${v == null ? "—" : format(v)}`;
                })
                .join(" · ")}
            </span>
          )}
        </span>
      </figcaption>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title} over video time, ${unit}. Click to seek.`}
            className="block cursor-crosshair touch-none select-none"
            onPointerMove={(e) => setHoverS(timeFromEvent(e.clientX, e.currentTarget))}
            onPointerLeave={() => setHoverS(null)}
            onPointerDown={(e) => onSeek(timeFromEvent(e.clientX, e.currentTarget))}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {bands.map((b, i) => (
                <rect
                  key={i}
                  x={x(b.startS)}
                  y={0}
                  width={Math.max(1, x(b.endS) - x(b.startS))}
                  height={innerH}
                  fill={b.tone === "flame" ? "var(--flame-edge)" : b.tone === "warn" ? "var(--warning)" : "var(--text-3)"}
                  opacity={b.tone === "flame" ? 0.07 : 0.1}
                />
              ))}
              {ticks.map((v) => (
                <g key={v} transform={`translate(0,${y(v)})`}>
                  <line x2={innerW} stroke="var(--line)" />
                  <text x={-6} dy="0.32em" textAnchor="end" className="num fill-[var(--text-3)] text-[0.625rem]">
                    {format(v)}
                  </text>
                </g>
              ))}
              {xTicks.map((v, i) => (
                <text
                  key={v}
                  x={x(v)}
                  y={innerH + 13}
                  textAnchor={i === 0 ? "start" : i === xTicks.length - 1 && x(v) > innerW - 20 ? "end" : "middle"}
                  className="num fill-[var(--text-3)] text-[0.625rem]"
                >
                  {formatTime(v, durationS > 120)}
                </text>
              ))}
              {paths.map((p) => (
                <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={1.5} strokeLinejoin="round" />
              ))}
              {hoverS != null && <line x1={x(hoverS)} x2={x(hoverS)} y2={innerH} stroke="var(--text-3)" strokeDasharray="2 3" />}
              {playheadS != null && (
                <g transform={`translate(${x(Math.min(playheadS, durationS))},0)`}>
                  <line y2={innerH} stroke="var(--text-1)" strokeWidth={1.25} />
                  <path d="M-4,-1 L4,-1 L0,5 Z" fill="var(--text-1)" />
                </g>
              )}
            </g>
          </svg>
        )}
      </div>
      {note && <p className="text-[0.6875rem] text-[var(--text-3)]">{note}</p>}
    </figure>
  );
}
