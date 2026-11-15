"use client";

import { Check, Flame, Lock } from "lucide-react";

import { cn } from "@/components/ui";

import type { LearnModule } from "./curriculum";

export type NodeState = "locked" | "open" | "done";

const VIEW = 600;
const POINTS: readonly (readonly [number, number])[] = [
  [140, 64],
  [460, 180],
  [150, 300],
  [450, 416],
  [300, 536],
];

function segmentPath(a: readonly [number, number], b: readonly [number, number]): string {
  const bend = (b[1] - a[1]) * 0.75;
  return `M${a[0]} ${a[1]} C${a[0]} ${a[1] + bend} ${b[0]} ${b[1] - bend} ${b[0]} ${b[1]}`;
}

export interface RoadmapProps {
  modules: readonly LearnModule[];
  titles: readonly string[];
  states: readonly NodeState[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * The "fuse" roadmap: a winding wick through the modules. Burnt segments glow, the segment
 * leading to the next open module is lit and moving, locked ones stay dark. Nodes are real
 * buttons positioned over the SVG, so every module is keyboard reachable (arrow keys move too).
 */
export function Roadmap({ modules, titles, states, selectedIndex, onSelect }: RoadmapProps) {
  const count = Math.min(modules.length, POINTS.length);

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = Math.min(count - 1, index + 1);
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;
    event.preventDefault();
    onSelect(next);
    const target = event.currentTarget.parentElement?.parentElement?.querySelector<HTMLButtonElement>(
      `[data-node-index="${next}"]`,
    );
    target?.focus();
  }

  const stateLabel = (s: NodeState) => (s === "done" ? "completed" : s === "open" ? "available" : "locked");

  return (
    <>
    {/* Phones: a straight vertical fuse with full-width rows. */}
    <ol className="sm:hidden relative list-none m-0 p-0 space-y-3" aria-label="Course roadmap">
      <span aria-hidden="true" className="absolute left-[1.375rem] top-4 bottom-4 w-0.5 bg-[var(--line-strong)]" />
      {modules.slice(0, count).map((m, i) => {
        const state = states[i];
        const selected = i === selectedIndex;
        return (
          <li key={m.id} className="relative">
            <button
              type="button"
              data-node-index={i}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              aria-current={selected ? "step" : undefined}
              aria-label={`${m.code}: ${titles[i]} — ${stateLabel(state)}`}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-1.5 pr-3 text-left",
                selected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-transparent",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2",
                  state === "done" && "bg-[var(--ember)] border-[var(--ember)] text-[var(--bg)]",
                  state === "open" && "bg-[var(--surface-2)] border-transparent text-[var(--flame-edge)] learn-flicker",
                  state === "locked" && "bg-[var(--surface-1)] border-[var(--line-strong)] text-[var(--text-3)]",
                )}
              >
                {state === "done" ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : state === "open" ? (
                  <Flame className="size-4" />
                ) : (
                  <Lock className="size-3.5" />
                )}
              </span>
              <span className="min-w-0" aria-hidden="true">
                <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                  {m.code} · {m.xp} XP
                </span>
                <span className={cn("block text-[0.8125rem] leading-tight font-medium", state === "locked" ? "text-[var(--text-3)]" : "text-[var(--text-1)]")}>
                  {titles[i]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
    <div className="hidden sm:block relative w-full mx-auto max-w-[560px]" style={{ aspectRatio: "1 / 1" }}>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="fuse-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {POINTS.slice(0, count - 1).map((a, i) => {
          const b = POINTS[i + 1];
          const d = segmentPath(a, b);
          const burnt = states[i] === "done" && states[i + 1] === "done";
          const lit = states[i] === "done" && states[i + 1] === "open";
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--line-strong)" strokeWidth="6" strokeLinecap="round" />
              <path
                d={d}
                fill="none"
                stroke="var(--surface-3)"
                strokeWidth="2"
                strokeDasharray="2 10"
                strokeLinecap="round"
              />
              {(burnt || lit) && (
                <path
                  d={d}
                  fill="none"
                  stroke={burnt ? "var(--ember)" : "var(--flame-edge)"}
                  strokeWidth={burnt ? 4 : 3}
                  strokeLinecap="round"
                  strokeDasharray={lit ? "10 4 2 12" : undefined}
                  className={lit ? "learn-fuse" : undefined}
                  filter="url(#fuse-glow)"
                />
              )}
            </g>
          );
        })}
      </svg>

      <ol className="absolute inset-0 list-none m-0 p-0" aria-label="Course roadmap">
        {modules.slice(0, count).map((m, i) => {
          const [x, y] = POINTS[i];
          const state = states[i];
          const selected = i === selectedIndex;
          const labelRight = x < VIEW / 2;
          return (
            <li
              key={m.id}
              className="absolute size-0"
              style={{ left: `${(x / VIEW) * 100}%`, top: `${(y / VIEW) * 100}%` }}
            >
              <button
                type="button"
                data-node-index={i}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                aria-current={selected ? "step" : undefined}
                aria-label={`${m.code}: ${titles[i]} — ${state === "done" ? "completed" : state === "open" ? "available" : "locked"}`}
                className={cn(
                  "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full border-2 size-11 sm:size-14 transition-[transform,background-color] duration-[var(--dur-2)]",
                  state === "done" && "bg-[var(--ember)] border-[var(--ember)] text-[var(--bg)]",
                  state === "open" && "bg-[var(--surface-2)] border-transparent text-[var(--flame-edge)] learn-flicker",
                  state === "locked" && "bg-[var(--surface-1)] border-[var(--line-strong)] text-[var(--text-3)]",
                  selected && "scale-110 outline-2 outline-offset-4 outline-[var(--accent)]",
                )}
              >
                {state === "done" ? (
                  <Check className="size-5 sm:size-6" aria-hidden="true" strokeWidth={2.5} />
                ) : state === "open" ? (
                  <Flame className="size-5 sm:size-6" aria-hidden="true" />
                ) : (
                  <Lock className="size-4 sm:size-5" aria-hidden="true" />
                )}
              </button>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 -translate-y-1/2 w-[clamp(6.5rem,30vw,11rem)] pointer-events-none",
                  labelRight ? "left-8 sm:left-10 text-left" : "right-8 sm:right-10 text-right",
                )}
              >
                <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">
                  {m.code} · {m.xp} XP
                </span>
                <span
                  className={cn(
                    "block text-[0.75rem] sm:text-[0.8125rem] leading-tight font-medium",
                    state === "locked" ? "text-[var(--text-3)]" : "text-[var(--text-1)]",
                  )}
                >
                  {titles[i]}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
    </>
  );
}
