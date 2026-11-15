"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Badge, cn, EvidenceChip } from "@/components/ui";

import { REFERENCES } from "./curriculum";
import { FlameSketch } from "./flame-sketch";

/**
 * Schematic U-shaped flammability map: an exponential quenching arm plus a linear blowoff arm,
 * the shape reported for BASS-II PMMA rods. Axes are unit-free on purpose — this teaches the
 * shape, not the fitted constants.
 */
export function needed(flow: number): number {
  return 0.9 * Math.exp(-7 * flow) + 0.45 * flow + 0.12;
}

/** Flow position of the bottom of the U (closed form of d/dx needed = 0). */
export const EASIEST_FLOW = Math.log((0.9 * 7) / 0.45) / 7;

export type UState = "burns" | "quenching" | "blowoff";

export function classify(flow: number, oxygen: number): UState {
  if (oxygen >= needed(flow)) return "burns";
  return flow < EASIEST_FLOW ? "quenching" : "blowoff";
}

const W = 520;
const H = 300;
const PAD = { l: 40, r: 16, t: 16, b: 38 };
const Y_MAX = 1.1;
const sx = (f: number) => PAD.l + f * (W - PAD.l - PAD.r);
const sy = (o: number) => PAD.t + (1 - o / Y_MAX) * (H - PAD.t - PAD.b);

const STATE_TEXT: Record<UState, { label: string; text: string; variant: "good" | "critical" | "serious" }> = {
  burns: { label: "Burns", text: "Enough oxygen for this airflow: the point sits above the U.", variant: "good" },
  quenching: {
    label: "Goes out · quenching",
    text: "Weak flow: too little oxygen arrives, the flame shrinks and loses heat by glowing faster than it makes it.",
    variant: "critical",
  },
  blowoff: {
    label: "Goes out · blowoff",
    text: "Strong flow: gas rushes past before it has time to react, so the flame is blown away.",
    variant: "serious",
  },
};

export function UCurve() {
  const flowId = useId();
  const o2Id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [flow, setFlow] = useState(0.15);
  const [oxygen, setOxygen] = useState(0.75);
  const state = classify(flow, oxygen);
  const info = STATE_TEXT[state];

  const path = useMemo(() => {
    const pts = Array.from({ length: 81 }, (_, i) => i / 80);
    return pts.map((f, i) => `${i ? "L" : "M"}${sx(f).toFixed(1)} ${sy(needed(f)).toFixed(1)}`).join(" ");
  }, []);
  const burnArea = `${path} L${sx(1)} ${sy(Y_MAX)} L${sx(0)} ${sy(Y_MAX)} Z`;
  const outArea = `${path} L${sx(1)} ${sy(0)} L${sx(0)} ${sy(0)} Z`;

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    if (e.type === "pointermove" && e.buttons !== 1) return;
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    setFlow(Math.max(0, Math.min(1, (x - PAD.l) / (W - PAD.l - PAD.r))));
    setOxygen(Math.max(0, Math.min(Y_MAX, (1 - (y - PAD.t) / (H - PAD.t - PAD.b)) * Y_MAX)));
  }

  const flowWord = flow < EASIEST_FLOW * 0.6 ? "weak" : flow > EASIEST_FLOW * 1.8 ? "strong" : "moderate";
  const o2Word = oxygen < 0.4 ? "low" : oxygen > 0.8 ? "high" : "medium";

  return (
    <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-2)] p-4 lg:grid-cols-12">
      <div className="lg:col-span-7 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">The U-shaped map</p>
          <Badge variant="neutral">Schematic shape · no fitted values</Badge>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none cursor-crosshair select-none rounded-[var(--radius-md)] bg-[var(--bg)]"
          role="img"
          aria-label={`U-shaped flammability map. Current point: ${flowWord} airflow, ${o2Word} oxygen — ${info.label}.`}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
        >
          <path d={burnArea} fill="var(--good)" opacity="0.1" />
          <path d={outArea} fill="var(--critical)" opacity="0.12" />
          <line x1={sx(EASIEST_FLOW)} x2={sx(EASIEST_FLOW)} y1={sy(Y_MAX)} y2={sy(0)} stroke="var(--text-3)" strokeDasharray="3 4" />
          <text x={sx(EASIEST_FLOW) + 4} y={sy(Y_MAX) + 10} fontSize="11" fill="var(--text-3)">
            regime divide
          </text>
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
          <text x={sx(0.03)} y={sy(0.06)} fontSize="12" fill="var(--critical)">goes out</text>
          <text x={sx(0.78)} y={sy(0.98)} fontSize="12" fill="var(--good)">burns</text>
          <text x={sx(0.02)} y={sy(0.62)} fontSize="11" fill="var(--text-2)">quenching arm</text>
          <text x={sx(0.7)} y={sy(0.5)} fontSize="11" fill="var(--text-2)">blowoff arm</text>
          <circle cx={sx(EASIEST_FLOW)} cy={sy(needed(EASIEST_FLOW))} r="3.5" fill="var(--accent)" />
          <text x={sx(EASIEST_FLOW) + 6} y={sy(needed(EASIEST_FLOW)) + 14} fontSize="11" fill="var(--text-2)">easiest burning</text>
          {/* axes */}
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} stroke="var(--line-strong)" />
          <line x1={PAD.l} x2={PAD.l} y1={sy(0)} y2={sy(Y_MAX)} stroke="var(--line-strong)" />
          <text x={(PAD.l + W - PAD.r) / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-3)">
            airflow  (weak → strong)
          </text>
          <text x={10} y={(PAD.t + sy(0)) / 2} textAnchor="middle" fontSize="11" fill="var(--text-3)" transform={`rotate(-90 10 ${(PAD.t + sy(0)) / 2})`}>
            oxygen  (less → more)
          </text>
          {/* the learner's point */}
          <circle
            cx={sx(flow)}
            cy={sy(oxygen)}
            r="7"
            fill={state === "burns" ? "var(--flame-edge)" : "var(--surface-3)"}
            stroke="var(--text-1)"
            strokeWidth="1.5"
            className={state === "burns" ? "learn-pulse" : undefined}
          />
        </svg>
        <p className="text-[0.75rem] text-[var(--text-3)]">Click or drag on the map, or use the sliders.</p>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={flowId} className="flex justify-between text-[0.8125rem] text-[var(--text-2)]">
            <span>Airflow (fan)</span>
            <span className="text-[var(--text-1)]">{flowWord}</span>
          </label>
          <input id={flowId} type="range" min={0} max={1} step={0.01} value={flow} onChange={(e) => setFlow(Number(e.target.value))} aria-valuetext={`${flowWord} airflow`} className="w-full accent-[var(--accent)]" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={o2Id} className="flex justify-between text-[0.8125rem] text-[var(--text-2)]">
            <span>Oxygen in the air</span>
            <span className="text-[var(--text-1)]">{o2Word}</span>
          </label>
          <input id={o2Id} type="range" min={0} max={Y_MAX} step={0.01} value={oxygen} onChange={(e) => setOxygen(Number(e.target.value))} aria-valuetext={`${o2Word} oxygen`} className="w-full accent-[var(--ember)]" />
        </div>
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--bg)] p-3">
          <FlameSketch
            buoyancy={0}
            fan={flow}
            intensity={state === "burns" ? Math.min(1, 0.4 + (oxygen - needed(flow)) * 2) : 0}
            title={info.label}
            className="w-24 h-auto shrink-0"
          />
          <div className="space-y-1" aria-live="polite">
            <Badge variant={info.variant}>{info.label}</Badge>
            <p className={cn("text-[0.8125rem] leading-relaxed text-[var(--text-2)]")}>{info.text}</p>
          </div>
        </div>
        <p className="text-[0.75rem] leading-relaxed text-[var(--text-3)]">
          The dashed line marks where the two behaviours trade places. It is not an extinction line: flames can still burn
          to its left if there is enough oxygen.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-[var(--text-3)]">
          Shape after:
          {(["olsonFerkul2017", "nasaTm2021"] as const).map((k) => {
            const r = REFERENCES[k];
            return (
              <EvidenceChip
                key={k}
                id={`ref:${k}`}
                label={r.label}
                kind="publication"
                href={r.doi ? `https://doi.org/${r.doi}` : r.url}
                detail={r.detail}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
