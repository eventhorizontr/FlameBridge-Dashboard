"use client";

import { cn } from "@/components/ui";

import type { WorldId } from "./worlds";

const STARS = Array.from({ length: 60 }, (_, i) => {
  // deterministic pseudo-random positions (no hydration mismatch)
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  // rounded so server and browser render identical attributes
  const round = (v: number) => Math.round(v * 100) / 100;
  return { x: round((a - Math.floor(a)) * 100), y: round((b - Math.floor(b)) * 60), r: i % 7 === 0 ? 0.18 : 0.1, d: (i % 5) * 0.6 };
});

/** Craters on Mars, relative to its centre (decorative). */
const MARS_CRATERS = [
  { x: -5, y: -3, r: 2.1 },
  { x: 4, y: 4.5, r: 1.6 },
  { x: 6.5, y: -5, r: 1.1 },
  { x: -2, y: 7, r: 1.2 },
  { x: -8.5, y: 3, r: 0.9 },
];

/**
 * Decorative hero scene for the kids' track: a big Mars with a little base, the Moon, an orbiting
 * station and a cartoon rocket with an exhaust trail. The world the learner picks glows; a launch
 * sends the rocket off screen. Purely decorative — no data.
 */
export function SpaceBackdrop({ world, launching, className }: { world: WorldId; launching: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="kid-mars" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="var(--flame-edge)" />
          <stop offset="55%" stopColor="var(--planet-mars)" />
          <stop offset="100%" stopColor="var(--planet-mars-2)" />
        </radialGradient>
        <radialGradient id="kid-mars-air" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="var(--ember)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--ember)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kid-rocket" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--text-1)" />
          <stop offset="100%" stopColor="var(--text-2)" />
        </linearGradient>
      </defs>

      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--text-1)" className="learn-twinkle" style={{ animationDelay: `${s.d}s` }} />
      ))}

      {/* Moon */}
      <g className={cn(world === "moon" && "learn-glow")}>
        <circle cx="52" cy="8" r="3" fill="var(--planet-moon)" />
        <circle cx="51" cy="7.2" r="0.6" fill="var(--planet-moon-2)" />
        <circle cx="53.3" cy="9" r="0.5" fill="var(--planet-moon-2)" />
      </g>

      {/* Mars: big, with an atmosphere halo, craters, a polar cap and a tiny base */}
      <g className={cn(world === "mars" && "learn-glow")}>
        <circle cx="82" cy="40" r="19" fill="url(#kid-mars-air)" />
        <circle cx="82" cy="40" r="15" fill="url(#kid-mars)" />
        <g className="kid-mars-spin" style={{ transformOrigin: "82px 40px" }}>
          {MARS_CRATERS.map((c, i) => (
            <circle key={i} cx={82 + c.x} cy={40 + c.y} r={c.r} fill="var(--planet-mars-2)" opacity="0.7" />
          ))}
        </g>
        <ellipse cx="80" cy="26.4" rx="5" ry="1.4" fill="var(--text-1)" opacity="0.85" />
        {/* Mars base: dome + flag */}
        <g transform="translate(76 25.6)">
          <path d="M-1.6 0 A1.6 1.6 0 0 1 1.6 0 Z" fill="var(--accent)" opacity="0.9" />
          <line x1="2.4" y1="0" x2="2.4" y2="-2.6" stroke="var(--text-1)" strokeWidth="0.18" />
          <path d="M2.4 -2.6 L4 -2.15 L2.4 -1.7 Z" fill="var(--ember)" />
        </g>
      </g>

      {/* orbiting station */}
      <ellipse cx="82" cy="40" rx="22" ry="6" fill="none" stroke="var(--line-strong)" strokeWidth="0.15" strokeDasharray="0.6 0.8" />
      <g className="learn-orbit" style={{ transformOrigin: "82px 40px" }}>
        <g transform="translate(104 40)">
          <rect x="-0.9" y="-0.6" width="1.8" height="1.2" fill={world === "orbit" ? "var(--text-1)" : "var(--text-3)"} />
          <rect x="-3" y="-0.3" width="1.8" height="0.6" fill="var(--accent)" />
          <rect x="1.2" y="-0.3" width="1.8" height="0.6" fill="var(--accent)" />
        </g>
      </g>

      {/* Earth limb */}
      <g className={cn(world === "earth" && "learn-glow")}>
        <ellipse cx="30" cy="76" rx="60" ry="17" fill="var(--planet-earth)" opacity="0.35" />
        <ellipse cx="30" cy="76" rx="60" ry="17" fill="none" stroke="var(--accent)" strokeWidth="0.3" opacity="0.8" />
      </g>

      {/* cartoon rocket heading for Mars */}
      <g className={launching ? "learn-launch" : "learn-hover"} style={{ transformOrigin: "62px 34px" }}>
        <g transform="translate(62 34) rotate(42)">
          {/* exhaust puffs */}
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={0}
              cy={9 + i * 2.6}
              r={1.1 + i * 0.45}
              fill="var(--text-2)"
              opacity={0.42 - i * 0.08}
              className="kid-puff"
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          ))}
          {/* flame */}
          <path d="M-1.5 5.2 Q0 12 1.5 5.2 Z" fill="var(--flame-edge)" className="learn-flame" />
          <path d="M-0.8 5.2 Q0 9 0.8 5.2 Z" fill="var(--flame-core)" className="learn-flame" />
          {/* fins */}
          <path d="M-2.4 1.6 L-4.6 6 L-2.4 5 Z" fill="var(--ember)" />
          <path d="M2.4 1.6 L4.6 6 L2.4 5 Z" fill="var(--ember)" />
          {/* body */}
          <path d="M0 -9 C2.9 -6 3 -1 2.4 5.2 L-2.4 5.2 C-3 -1 -2.9 -6 0 -9 Z" fill="url(#kid-rocket)" />
          <path d="M0 -9 C1.5 -7.6 2.2 -6.2 2.5 -4.8 L-2.5 -4.8 C-2.2 -6.2 -1.5 -7.6 0 -9 Z" fill="var(--ember)" />
          <rect x="-2.6" y="2.6" width="5.2" height="0.9" fill="var(--ember)" opacity="0.85" />
          {/* window */}
          <circle cx="0" cy="-1.6" r="1.35" fill="var(--surface-1)" stroke="var(--accent)" strokeWidth="0.45" />
          <circle cx="-0.4" cy="-2" r="0.4" fill="var(--flame-core)" opacity="0.8" />
        </g>
      </g>
    </svg>
  );
}
