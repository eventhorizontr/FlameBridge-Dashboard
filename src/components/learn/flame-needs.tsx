"use client";

import { Droplets, Flame, Thermometer, Wind } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge, cn } from "@/components/ui";

import type { ConceptCard } from "./curriculum";
import { FlameSketch } from "./flame-sketch";

const INGREDIENTS = [
  {
    id: "fuel",
    label: "Fuel",
    Icon: Droplets,
    job: "Something to burn: here, gas that comes off a heated plastic.",
    takeAway: "Cut off the fuel",
    off: "No fuel vapour left, so there is nothing to burn.",
  },
  {
    id: "oxygen",
    label: "Oxygen",
    Icon: Wind,
    job: "The part of the air that the fuel reacts with.",
    takeAway: "Smother it",
    off: "No oxygen reaches the flame, so it is smothered.",
  },
  {
    id: "heat",
    label: "Heat",
    Icon: Thermometer,
    job: "Keeps the plastic giving off vapour and keeps the reaction going.",
    takeAway: "Cool it down",
    off: "Too cold: the plastic stops giving off vapour and the reaction stops.",
  },
] as const;
type IngredientId = (typeof INGREDIENTS)[number]["id"];

const STORY = [
  { id: "heat", title: "Heat warms the plastic", text: "The flame’s heat warms the surface of the solid sample." },
  { id: "vapour", title: "The surface turns to vapour", text: "The hot surface gives off fuel vapour. The solid itself does not burn." },
  { id: "meet", title: "Vapour meets oxygen", text: "Vapour drifts out, oxygen drifts in. The flame sits where they meet." },
] as const;
type StoryId = (typeof STORY)[number]["id"];

/** Small illustrated scene for the "how a solid burns" story. Illustration, not a simulation. */
function SolidBurnScene({ step }: { step: StoryId }) {
  const showVapour = step !== "heat";
  const showMeet = step === "meet";
  return (
    <svg viewBox="0 0 240 140" role="img" aria-label="Illustration: a plastic sample heats up, gives off vapour, and the flame forms where vapour meets oxygen" className="mx-auto h-auto w-full max-h-[280px]">
      <title>How a solid sample burns (illustration)</title>
      {/* sample */}
      <rect x="40" y="96" width="160" height="22" rx="4" fill="var(--surface-3)" stroke="var(--line-strong)" />
      <rect
        x="40"
        y="96"
        width="160"
        height="6"
        rx="3"
        fill="var(--ember)"
        opacity={step === "heat" ? 0.95 : 0.6}
        className={cn(step === "heat" && "learn-pulse")}
      />
      <text x="120" y="112" textAnchor="middle" fontSize="9" fill="var(--text-2)">
        PMMA plastic
      </text>
      {/* heat arrows from above */}
      {step === "heat" &&
        [80, 120, 160].map((x) => (
          <path key={x} d={`M${x} 52 L${x} 84 M${x - 5} 78 L${x} 86 L${x + 5} 78`} stroke="var(--flame-edge)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        ))}
      {/* vapour wisps rising from the surface */}
      {showVapour &&
        [70, 100, 130, 160].map((x, i) => (
          <path
            key={x}
            d={`M${x} 94 q-6 -8 0 -16 t0 -16`}
            stroke="var(--text-2)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className="learn-rise"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      {/* oxygen dots coming in from the sides */}
      {showMeet &&
        [
          [12, 40],
          [22, 62],
          [14, 80],
          [228, 40],
          [218, 62],
          [226, 80],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="var(--accent)" opacity="0.85" />
            <text x={x} y={y + 2.5} textAnchor="middle" fontSize="6" fontWeight="700" fill="var(--bg)">
              O₂
            </text>
          </g>
        ))}
      {/* the flame band where they meet */}
      {showMeet && (
        <path d="M44 66 Q120 18 196 66" stroke="var(--flame-edge)" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.9" className="learn-flicker" />
      )}
      {showMeet && (
        <text x="120" y="30" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--flame-edge)">
          flame = where they meet
        </text>
      )}
    </svg>
  );
}

/**
 * M1 "What a Flame Needs" as one connected screen: the fire triangle, the three ingredients and
 * how a solid really burns, side by side. Text paraphrases the module's cited concept cards;
 * every drawing is an illustration, not a simulation.
 */
export function FlameNeeds({ cards, renderRefs }: { cards: readonly ConceptCard[]; renderRefs: (card: ConceptCard) => ReactNode }) {
  const [on, setOn] = useState<Record<IngredientId, boolean>>({ fuel: true, oxygen: true, heat: true });
  const [story, setStory] = useState<StoryId>("heat");
  const missing = INGREDIENTS.filter((s) => !on[s.id]);
  const burning = missing.length === 0;
  const [triangleCard, vapourCard, meetCard] = cards;

  return (
    <div className="space-y-5">
      {/* Part 1: triangle + ingredients */}
      <section aria-labelledby="needs-triangle" className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[radial-gradient(70%_80%_at_30%_60%,var(--ember-soft),transparent_70%),var(--surface-2)] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--flame-edge)]">Part 1 · The fire triangle</p>
            <h3 id="needs-triangle" className="text-[1.25rem] sm:text-[1.5rem] font-bold tracking-[-0.02em] text-[var(--text-1)]">
              Keep the flame alive
            </h3>
          </div>
          <Badge variant={burning ? "warning" : "neutral"} icon={<Flame className="size-3" aria-hidden="true" />}>
            {burning ? "Burning" : "Out"}
          </Badge>
        </div>

        <div className="grid gap-5 lg:grid-cols-12 lg:items-center">
          <div className="relative lg:col-span-5">
            <svg viewBox="0 0 240 216" className="mx-auto h-auto w-full max-w-[340px]" aria-hidden="true">
              {[
                [120, 18, 22, 192],
                [22, 192, 218, 192],
                [218, 192, 120, 18],
              ].map(([x1, y1, x2, y2], i) => {
                const side = INGREDIENTS[i];
                return (
                  <line
                    key={side.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke={on[side.id] ? "var(--flame-edge)" : "var(--line-strong)"}
                    strokeDasharray={on[side.id] ? undefined : "6 10"}
                    className="transition-[stroke] duration-[var(--dur-2)]"
                  />
                );
              })}
              {[
                { id: "fuel" as const, x: 52, y: 100, r: -60 },
                { id: "oxygen" as const, x: 120, y: 209, r: 0 },
                { id: "heat" as const, x: 188, y: 100, r: 60 },
              ].map((l) => (
                <text
                  key={l.id}
                  x={l.x}
                  y={l.y}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={on[l.id] ? "var(--flame-edge)" : "var(--text-3)"}
                  transform={`rotate(${l.r} ${l.x} ${l.y})`}
                >
                  {INGREDIENTS.find((s) => s.id === l.id)?.label.toUpperCase()}
                </text>
              ))}
            </svg>
            <div className="absolute inset-x-0 bottom-[11%] mx-auto w-[36%]">
              <FlameSketch buoyancy={1} intensity={burning ? 1 : 0} title={burning ? "Flame burning" : "Flame out"} className="h-auto w-full" />
            </div>
            <div className="absolute left-0 top-0">
              <Badge variant="neutral">Illustration · not a simulation</Badge>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--text-2)]">
              A flame needs <strong className="text-[var(--text-1)]">all three</strong> at the same time. Tap one to take it
              away, just like a fire extinguisher does.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {INGREDIENTS.map(({ id, label, Icon, job, takeAway }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on[id]}
                  onClick={() => setOn((p) => ({ ...p, [id]: !p[id] }))}
                  className={cn(
                    "learn-lift flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border-2 p-3 text-left",
                    on[id]
                      ? "border-[var(--flame-edge)] bg-[var(--ember-soft)] text-[var(--text-1)]"
                      : "border-dashed border-[var(--line-strong)] bg-[var(--surface-1)] text-[var(--text-3)]",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-full",
                        on[id] ? "bg-[var(--flame-edge)] text-[var(--bg)]" : "bg-[var(--surface-3)] text-[var(--text-3)]",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-[0.6875rem] font-medium uppercase tracking-[0.06em]">{on[id] ? "In" : "Removed"}</span>
                  </span>
                  <span className="text-[1rem] font-bold">{label}</span>
                  <span className="text-[0.8125rem] leading-snug text-[var(--text-2)]">{job}</span>
                  <span className="text-[0.75rem] text-[var(--text-3)]">Extinguisher: {takeAway.toLowerCase()}</span>
                </button>
              ))}
            </div>
            <p
              className={cn(
                "min-h-[2.75rem] rounded-[var(--radius-md)] px-3 py-2 text-[0.875rem]",
                burning ? "bg-[var(--ember-soft)] text-[var(--text-1)]" : "bg-[var(--surface-1)] text-[var(--text-2)]",
              )}
              aria-live="polite"
            >
              {burning ? "Fuel, oxygen and heat are all here, so the flame keeps burning." : missing.map((m) => m.off).join(" ")}
            </p>
            {triangleCard && <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-[var(--text-3)]">Source: {renderRefs(triangleCard)}</div>}
          </div>
        </div>
      </section>

      {/* Part 2: how a solid burns, connected to the "Fuel" side */}
      <section aria-labelledby="needs-solid" className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface-2)] p-4 sm:p-6">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--flame-edge)]">Part 2 · Where does the fuel come from?</p>
        <h3 id="needs-solid" className="mb-4 text-[1.25rem] sm:text-[1.5rem] font-bold tracking-[-0.02em] text-[var(--text-1)]">
          How a plastic burns, in three steps
        </h3>
        <div className="grid gap-5 lg:grid-cols-12 lg:items-center">
          <ol className="m-0 grid list-none gap-2 p-0 lg:col-span-5" aria-label="Story steps">
            {STORY.map((s, i) => {
              const active = s.id === story;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStory(s.id)}
                    className={cn(
                      "learn-lift flex w-full items-start gap-3 rounded-[var(--radius-lg)] border-2 p-3 text-left",
                      active ? "border-[var(--flame-edge)] bg-[var(--ember-soft)]" : "border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-strong)]",
                    )}
                  >
                    <span
                      className={cn(
                        "num grid size-8 shrink-0 place-items-center rounded-full text-[0.875rem] font-bold",
                        active ? "bg-[var(--flame-edge)] text-[var(--bg)]" : "bg-[var(--surface-3)] text-[var(--text-2)]",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="space-y-0.5">
                      <span className="block text-[0.9375rem] font-bold text-[var(--text-1)]">{s.title}</span>
                      <span className="block text-[0.8125rem] leading-snug text-[var(--text-2)]">{s.text}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="lg:col-span-7 space-y-2">
            <div className="relative rounded-[var(--radius-lg)] border border-[var(--line)] bg-[radial-gradient(80%_70%_at_50%_80%,var(--ember-soft),transparent_70%),var(--bg)] p-2">
              <SolidBurnScene step={story} />
              <div className="absolute left-2 top-2">
                <Badge variant="neutral">Illustration · not a simulation</Badge>
              </div>
            </div>
            <p className="text-[0.8125rem] leading-relaxed text-[var(--text-2)]">
              Most BASS-II samples on the Space Station were PMMA, the clear plastic sold as Plexiglas. Scientists call a
              flame that sits where fuel and oxygen meet a <strong className="text-[var(--text-1)]">diffusion flame</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-[var(--text-3)]">
              Sources: {vapourCard && renderRefs(vapourCard)} {meetCard && renderRefs(meetCard)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
