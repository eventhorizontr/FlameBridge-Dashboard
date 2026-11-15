"use client";

import { Fan } from "lucide-react";

import { Badge, cn, EvidenceChip } from "@/components/ui";

import { REFERENCES } from "./curriculum";
import { FlameSketch } from "./flame-sketch";
import { buoyancyStrength, WORLDS, type WorldId } from "./worlds";

export function PlanetGlyph({ id, className }: { id: WorldId; className?: string }) {
  if (id === "orbit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="var(--text-2)" />
        <rect x="1.5" y="10.5" width="6" height="3" fill="var(--accent)" />
        <rect x="16.5" y="10.5" width="6" height="3" fill="var(--accent)" />
        <path d="M12 4 V8 M12 16 V20" stroke="var(--text-3)" strokeWidth="1.2" />
      </svg>
    );
  }
  const fill = id === "earth" ? "var(--planet-earth)" : id === "mars" ? "var(--planet-mars)" : "var(--planet-moon)";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" fill={fill} />
      {id === "earth" && <path d="M7 9 q3 -2 5 1 t5 2 M6 15 q4 1 6 -1" stroke="var(--planet-earth-2)" strokeWidth="2" fill="none" />}
      {id === "mars" && <circle cx="9" cy="10" r="2" fill="var(--planet-mars-2)" />}
      {id === "moon" && (
        <>
          <circle cx="9" cy="9" r="1.8" fill="var(--planet-moon-2)" />
          <circle cx="15" cy="14" r="2.4" fill="var(--planet-moon-2)" />
        </>
      )}
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgb(255 255 255 / 0.15)" />
    </svg>
  );
}

export interface GravityWorldsProps {
  world: WorldId;
  onWorldChange: (id: WorldId) => void;
  fan: boolean;
  onFanChange: (on: boolean) => void;
  compact?: boolean;
}

/** Pick a world and watch the (illustrative) flame change shape. Shared by the hero and module M2. */
export function GravityWorlds({ world, onWorldChange, fan, onFanChange, compact = false }: GravityWorldsProps) {
  const current = WORLDS.find((w) => w.id === world) ?? WORLDS[0];
  const b = buoyancyStrength(current.gRel);
  const ref = REFERENCES.nasaFactSheet;

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Where is the flame burning?" className="grid grid-cols-4 gap-1.5">
        {WORLDS.map((w) => {
          const active = w.id === world;
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onWorldChange(w.id)}
              className={cn(
                "learn-lift flex flex-col items-center gap-1 rounded-[var(--radius-md)] border px-1 py-2 text-[0.75rem]",
                active
                  ? "border-[var(--flame-edge)] bg-[var(--ember-soft)] text-[var(--text-1)]"
                  : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--line-strong)]",
              )}
            >
              <PlanetGlyph id={w.id} className={cn("size-7", active && "learn-float")} />
              <span className="font-medium">{w.short}</span>
              <span className="num text-[0.6875rem] text-[var(--text-3)]">{w.gLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="relative rounded-[var(--radius-lg)] border border-[var(--line)] bg-[radial-gradient(80%_70%_at_50%_80%,var(--ember-soft),transparent_70%),var(--bg)]">
        <FlameSketch
          buoyancy={b}
          fan={fan ? 0.8 : 0}
          title={`Illustration of a flame on ${current.name}${fan ? " with a fan blowing" : ""}`}
          className={cn("w-full h-auto", compact ? "max-h-[210px]" : "max-h-[260px]")}
        />
        <div className="absolute left-2 top-2">
          <Badge variant="neutral">Illustration · not a simulation</Badge>
        </div>
        <button
          type="button"
          aria-pressed={fan}
          onClick={() => onFanChange(!fan)}
          className={cn(
            "absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem]",
            fan
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-1)]"
              : "border-[var(--line-strong)] bg-[var(--surface-1)] text-[var(--text-2)]",
          )}
        >
          <Fan className={cn("size-3.5", fan && "learn-spin")} aria-hidden="true" />
          Fan {fan ? "on" : "off"}
        </button>
      </div>

      <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]" aria-live="polite">
        <strong className="font-medium text-[var(--text-1)]">{current.name}.</strong> {current.blurb}
        {fan && " The fan pushes fresh air past the flame and bends it downstream."}
      </p>
      {!compact && (
        <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-[var(--text-3)]">
          Gravity values:
          <EvidenceChip id="ref:nasaFactSheet" label={ref.label} kind="publication" href={ref.url} detail={ref.detail} />
        </div>
      )}
    </div>
  );
}
