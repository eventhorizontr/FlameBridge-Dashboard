"use client";

import { scaleLinear } from "d3-scale";

import { Tooltip } from "@/components/ui";

export interface FlowSparklineProps {
  setpoints: readonly number[];
  domainMax?: number;
  width?: number;
  height?: number;
}

/**
 * Compact SVG sparkline of duct airflow set-points in run order (cm/s).
 * Empty arrays render `"—"` with an explicit reason rather than fabricating zero flow.
 */
export function FlowSparkline({
  setpoints,
  domainMax = 65,
  width = 76,
  height = 22,
}: FlowSparklineProps) {
  if (setpoints.length === 0) {
    return (
      <Tooltip content="No airflow set-points parsed from telemetry table">
        <span className="num text-[0.75rem] text-[var(--text-3)] cursor-help">—</span>
      </Tooltip>
    );
  }

  const padX = 4;
  const padY = 4;
  const yScale = scaleLinear()
    .domain([0, Math.max(domainMax, ...setpoints, 10)])
    .range([height - padY, padY]);

  const points: Array<{ x: number; y: number }> =
    setpoints.length === 1
      ? [
          { x: padX, y: yScale(setpoints[0]) },
          { x: width - padX, y: yScale(setpoints[0]) },
        ]
      : setpoints.map((v, i) => ({
          x: padX + (i / (setpoints.length - 1)) * (width - padX * 2),
          y: yScale(v),
        }));

  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const ariaLabel = `Airflow set-points: ${setpoints.join(", ")} cm/s`;

  return (
    <Tooltip content={`Run order set-points: ${setpoints.join(" → ")} cm/s`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="shrink-0 overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="var(--line)"
          strokeWidth="1"
        />
        <path
          d={pathData}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, idx) => (
          <circle
            key={`${idx}-${p.x}`}
            cx={p.x}
            cy={p.y}
            r={setpoints.length === 1 && idx === 0 ? 0 : 2.1}
            fill="var(--accent)"
          />
        ))}
      </svg>
    </Tooltip>
  );
}
