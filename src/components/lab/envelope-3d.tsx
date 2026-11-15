"use client";

import { RotateCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Button, Skeleton } from "@/components/ui";
import { characteristicSizeMm, representativeAirflow } from "@/components/viz/dataset-queries";
import type { LabParams } from "@/types/dashboard";
import type { Experiment } from "@/types/experiment";

import type { EnvelopePoint } from "./envelope-3d-scene";

const Envelope3DScene = dynamic(() => import("./envelope-3d-scene").then((m) => m.Envelope3DScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/** Fixed categorical order (never cycled): colour follows the geometry, not its rank. */
const GEOMETRY_ORDER = ["rod", "film", "slab", "fabric", "spherical-section", "candle"] as const;

function tokens() {
  const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const t = (n: string, f: string) => css?.getPropertyValue(n).trim() || f;
  return {
    geometry: Object.fromEntries(GEOMETRY_ORDER.map((g, i) => [g, t(`--series-${i + 1}`, "#3987e5")])) as Record<string, string>,
    good: t("--good", "#0ca30c"),
    warning: t("--warning", "#fab219"),
    line: t("--text-3", "#7f899b"),
    text: t("--text-1", "#e8edf5"),
    accent: t("--accent", "#5aa9ff"),
  };
}

interface Envelope3DProps {
  experiments: readonly Experiment[];
  params: LabParams;
  matchIds: string[];
  inside: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The What-if query in the 3-D measured space (O₂ × flow × characteristic size): every PSI-25 run
 * with all three values, the same-material/geometry envelope box, and dashed links to the matches.
 */
export function Envelope3D({ experiments, params, matchIds, inside, selectedId, onSelect }: Envelope3DProps) {
  const [palette] = useState(tokens);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hovered, setHovered] = useState<EnvelopePoint | null>(null);

  const { points, groupBox, skipped } = useMemo(() => {
    const pts: EnvelopePoint[] = [];
    let missing = 0;
    for (const e of experiments) {
      const o2 = e.conditions.o2InitialPct;
      const air = representativeAirflow(e);
      const size = characteristicSizeMm(e.fuel);
      if (o2 == null || air == null || size == null) {
        missing += 1;
        continue;
      }
      const rank = matchIds.indexOf(e.id);
      pts.push({
        id: e.id,
        testId: e.testId,
        o2Pct: o2,
        airflowCmS: air,
        sizeMm: size,
        geometry: e.fuel.geometry ?? "unknown",
        material: e.fuel.material ?? "unknown",
        sameGroup: e.fuel.material === params.material && e.fuel.geometry === params.geometry,
        matchRank: rank >= 0 ? rank + 1 : null,
        hasVideo: e.videos.length > 0,
      });
    }
    const group = pts.filter((p) => p.sameGroup);
    const ext = (vals: number[]): [number, number] => [Math.min(...vals), Math.max(...vals)];
    return {
      points: pts,
      skipped: missing,
      groupBox: group.length
        ? { o2: ext(group.map((p) => p.o2Pct)), air: ext(group.map((p) => p.airflowCmS)), size: ext(group.map((p) => p.sizeMm)) }
        : null,
    };
  }, [experiments, matchIds, params.geometry, params.material]);

  const present = GEOMETRY_ORDER.filter((g) => points.some((p) => p.geometry === g));

  return (
    <div className="space-y-2">
      <div className="relative h-[24rem] sm:h-[28rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[radial-gradient(ellipse_at_center,var(--surface-2),var(--bg))]">
        <Envelope3DScene
          points={points}
          query={{ o2Pct: params.o2Pct, airflowCmS: params.airflowCmS, sizeMm: params.characteristicSizeMm, inside }}
          groupBox={groupBox}
          geometryColors={palette.geometry}
          colors={palette}
          selectedId={selectedId}
          onSelect={onSelect}
          onHover={setHovered}
          autoRotate={autoRotate}
        />
        {(() => {
          const card = hovered ?? points.find((p) => p.id === selectedId) ?? null;
          return card ? (
            <div className="num pointer-events-none absolute left-2 top-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[rgb(6_9_15/0.85)] px-2.5 py-1.5 text-[0.6875rem] text-[var(--text-1)]">
              <strong className="font-semibold">{card.testId}</strong> · {card.material} {card.geometry}
              <br />
              {card.o2Pct} % O₂ · {card.airflowCmS} cm/s · {card.sizeMm} mm
              {card.matchRank !== null ? ` · match #${card.matchRank}` : ""}
              {hovered ? "" : " · selected"}
            </div>
          ) : null;
        })()}
        <Button
          size="sm"
          variant={autoRotate ? "accent-soft" : "secondary"}
          aria-pressed={autoRotate}
          onClick={() => setAutoRotate((v) => !v)}
          className="absolute right-2 top-2"
        >
          <RotateCw className="size-3.5" aria-hidden="true" />
          <span>Auto-rotate</span>
        </Button>
        <span className="pointer-events-none absolute bottom-2 right-2 text-[0.6875rem] text-[var(--text-3)]">Drag to rotate · scroll to zoom · click a run</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] text-[var(--text-2)]">
        {present.map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: palette.geometry[g] }} aria-hidden="true" />
            {g}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rotate-45" style={{ background: inside ? palette.good : palette.warning }} aria-hidden="true" />
          your query
        </span>
        <span className="text-[var(--text-3)]">
          Box = measured range of {params.material} {params.geometry} runs. {skipped > 0 ? `${skipped} runs without O₂, flow and size are not plotted.` : ""}
          {params.characteristicSizeMm === null ? " Set a size to place the query." : ""}
        </span>
      </div>
    </div>
  );
}
