"use client";

import { Droplets, Flame, Thermometer, Wind } from "lucide-react";
import { useState } from "react";

import { Badge, cn } from "@/components/ui";

import { FlameSketch } from "./flame-sketch";

const SIDES = [
  { id: "fuel", label: "Fuel", Icon: Droplets, off: "No fuel vapour: nothing left to burn." },
  { id: "oxygen", label: "Oxygen", Icon: Wind, off: "No oxygen: the flame is smothered." },
  { id: "heat", label: "Heat", Icon: Thermometer, off: "Too cold: the fuel stops turning into vapour and reactions stop." },
] as const;
type SideId = (typeof SIDES)[number]["id"];

/** M1: toggle the three sides of the fire triangle and watch the (illustrated) flame respond. */
export function FireTriangle() {
  const [on, setOn] = useState<Record<SideId, boolean>>({ fuel: true, oxygen: true, heat: true });
  const missing = SIDES.filter((s) => !on[s.id]);
  const burning = missing.length === 0;

  return (
    <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-2)] p-4 md:grid-cols-2 md:items-center">
      <div className="relative">
        <svg viewBox="0 0 240 216" className="w-full max-w-[320px] mx-auto h-auto" aria-hidden="true">
          {[
            [120, 18, 22, 192],
            [22, 192, 218, 192],
            [218, 192, 120, 18],
          ].map(([x1, y1, x2, y2], i) => {
            const side = SIDES[i];
            return (
              <line
                key={side.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth="6"
                strokeLinecap="round"
                stroke={on[side.id] ? "var(--flame-edge)" : "var(--line-strong)"}
                strokeDasharray={on[side.id] ? undefined : "6 8"}
                className="transition-[stroke] duration-[var(--dur-2)]"
              />
            );
          })}
          {[
            { id: "fuel" as const, x: 52, y: 100, r: -60 },
            { id: "oxygen" as const, x: 120, y: 207, r: 0 },
            { id: "heat" as const, x: 188, y: 100, r: 60 },
          ].map((l) => (
            <text
              key={l.id}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={on[l.id] ? "var(--flame-edge)" : "var(--text-3)"}
              transform={`rotate(${l.r} ${l.x} ${l.y})`}
            >
              {SIDES.find((s) => s.id === l.id)?.label.toUpperCase()}
            </text>
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-[11%] mx-auto w-[34%]">
          <FlameSketch buoyancy={1} intensity={burning ? 1 : 0} title={burning ? "Flame burning" : "Flame out"} className="w-full h-auto" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-3)]">Toggle a side</p>
          <Badge variant={burning ? "warning" : "neutral"} icon={<Flame className="size-3" aria-hidden="true" />}>
            {burning ? "Burning" : "Out"}
          </Badge>
        </div>
        <div className="grid gap-2">
          {SIDES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={on[id]}
              onClick={() => setOn((p) => ({ ...p, [id]: !p[id] }))}
              className={cn(
                "learn-lift flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-[0.875rem]",
                on[id]
                  ? "border-[var(--flame-edge)] bg-[var(--ember-soft)] text-[var(--text-1)]"
                  : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-3)]",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </span>
              <span className="text-[0.75rem]">{on[id] ? "present" : "removed"}</span>
            </button>
          ))}
        </div>
        <p className="min-h-[2.5rem] text-[0.8125rem] text-[var(--text-2)]" aria-live="polite">
          {burning ? "All three are present, so the flame keeps burning." : missing.map((m) => m.off).join(" ")}
        </p>
      </div>
    </div>
  );
}
