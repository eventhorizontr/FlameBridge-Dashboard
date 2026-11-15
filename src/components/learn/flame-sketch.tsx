/**
 * Illustrative flame drawing driven by buoyancy strength (0 … 1) and an optional fan.
 * Not a simulation: shape, colour and arrows are qualitative and labelled as such by callers.
 */
export interface FlameSketchProps {
  /** 0 = no buoyancy (orbit), 1 = Earth. */
  buoyancy: number;
  /** Imposed airflow from the left, 0 … 1. */
  fan?: number;
  /** 0 … 1 multiplier for flame size; 0 hides the flame (extinguished). */
  intensity?: number;
  title: string;
  className?: string;
}

function teardrop(cx: number, base: number, w: number, h: number, lean: number): string {
  const tipX = cx + lean;
  return [
    `M${tipX} ${base - h}`,
    `C${cx + w * 0.95 + lean * 0.4} ${base - h * 0.55} ${cx + w} ${base - h * 0.08} ${cx} ${base}`,
    `C${cx - w} ${base - h * 0.08} ${cx - w * 0.95 + lean * 0.4} ${base - h * 0.55} ${tipX} ${base - h}`,
    "Z",
  ].join(" ");
}

export function FlameSketch({ buoyancy, fan = 0, intensity = 1, title, className }: FlameSketchProps) {
  const b = Math.max(0, Math.min(1, buoyancy));
  const k = Math.max(0, Math.min(1, intensity));
  const w = (30 + 10 * (1 - b)) * (0.55 + 0.45 * k);
  const h = (w * (1.2 + 0.7 * b) + 90 * b) * (0.6 + 0.4 * k);
  const lean = fan * 26;
  const base = 150;
  const cx = 130;
  const yellow = 0.12 + 0.88 * b;
  const blue = 0.45 + 0.5 * (1 - b);
  const riseDur = b > 0.02 ? 2.6 / (0.35 + b) : 0;

  return (
    <svg viewBox="0 0 260 190" role="img" aria-label={title} className={className}>
      <title>{title}</title>
      {/* buoyant updraft arrows */}
      {riseDur > 0 &&
        [56, 204].map((x) => (
          <g key={x} opacity={0.25 + 0.6 * b} className="learn-rise" style={{ animationDuration: `${riseDur}s` }}>
            <path d={`M${x} 150 L${x} 70 M${x} 70 l-5 8 M${x} 70 l5 8`} stroke="var(--warning)" strokeWidth="1.6" fill="none" />
          </g>
        ))}
      {/* diffusion dots when buoyancy is weak */}
      {b < 0.5 &&
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={cx + Math.cos(a) * 78}
              cy={105 + Math.sin(a) * 52}
              r="1.8"
              fill="var(--flame-core)"
              opacity={0.55 * (1 - b * 2)}
              className="learn-twinkle"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          );
        })}
      {/* fan arrows */}
      {fan > 0 &&
        [92, 118, 144].map((y, i) => (
          <path
            key={y}
            d={`M14 ${y} L${44 + fan * 20} ${y} m-6 -5 l6 5 l-6 5`}
            stroke="var(--accent)"
            strokeWidth="1.6"
            fill="none"
            opacity={0.4 + 0.5 * fan}
            className="learn-drift"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      {/* sample */}
      <rect x={cx - 40} y={base + 2} width="80" height="9" rx="2" fill="var(--surface-3)" stroke="var(--line-strong)" />
      {k > 0 && (
        <g className="learn-flame">
          <path d={teardrop(cx, base, w * 1.25, h * 1.12, lean)} fill="var(--flame-core)" opacity={blue * (0.3 + 0.35 * (1 - b))} />
          <path d={teardrop(cx, base, w, h, lean)} fill="var(--flame-edge)" opacity={yellow * 0.85} />
          <path d={teardrop(cx, base, w * 0.55, h * 0.6, lean * 0.6)} fill="var(--warning)" opacity={yellow * 0.9} />
          <path d={teardrop(cx, base, w * 0.75, h * 0.3, lean * 0.3)} fill="var(--flame-core)" opacity={blue} />
        </g>
      )}
    </svg>
  );
}
