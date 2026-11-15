"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export interface EnvelopePoint {
  id: string;
  testId: string;
  o2Pct: number;
  airflowCmS: number;
  sizeMm: number;
  geometry: string;
  material: string;
  sameGroup: boolean;
  matchRank: number | null;
  hasVideo: boolean;
}

export interface EnvelopeQuery {
  o2Pct: number;
  airflowCmS: number;
  sizeMm: number | null;
  inside: boolean;
}

interface Props {
  points: EnvelopePoint[];
  query: EnvelopeQuery;
  groupBox: { o2: [number, number]; air: [number, number]; size: [number, number] } | null;
  geometryColors: Record<string, string>;
  colors: { good: string; warning: string; line: string; text: string; accent: string };
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (point: EnvelopePoint | null) => void;
  autoRotate: boolean;
}

/** Axis domains: O₂ % (the Lab slider range), √flow (spreads the many low-flow runs), log10 size mm. */
const O2: [number, number] = [10, 32];
const SQRT_AIR: [number, number] = [0, Math.sqrt(50)];
const LOG_SIZE: [number, number] = [-1.6, 1.4];
const SPAN = 6; // scene units per axis

const lin = (v: number, [a, b]: [number, number]) => ((Math.min(Math.max(v, a), b) - a) / (b - a) - 0.5) * SPAN;
export const toScene = (o2: number, air: number, sizeMm: number): [number, number, number] => [
  lin(o2, O2),
  lin(Math.sqrt(Math.max(air, 0)), SQRT_AIR),
  lin(Math.log10(Math.max(sizeMm, 0.03)), LOG_SIZE),
];

/** Text as a camera-facing sprite (canvas texture): no DOM roots inside the 3D scene. */
function Label({ text, position, color, size = 0.22, bold = false, anchor = "center" }: {
  text: string; position: [number, number, number]; color: string; size?: number; bold?: boolean; anchor?: "center" | "left";
}) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = `${bold ? 600 : 400} 48px system-ui, sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 16;
    canvas.width = w;
    canvas.height = 64;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 8, 34);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return { texture: t, aspect: w / 64 };
  }, [text, color, bold]);
  useEffect(() => () => texture.dispose(), [texture]);
  const offset: [number, number, number] = anchor === "left" ? [position[0] + (size * aspect) / 2, position[1], position[2]] : position;
  return (
    <sprite position={offset} scale={[size * aspect, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

function Axis({ from, to, label, ticks, color, textColor }: {
  from: [number, number, number]; to: [number, number, number]; label: string;
  ticks: { pos: [number, number, number]; text: string }[]; color: string; textColor: string;
}) {
  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={1} />
      {ticks.map((t) => (
        <Label key={t.text + label} text={t.text} position={t.pos} color={textColor} size={0.3} />
      ))}
      <Label text={label} position={to} color={textColor} size={0.36} bold anchor="left" />
    </group>
  );
}

function Point({ p, color, selected, onSelect, onHover }: {
  p: EnvelopePoint; color: string; selected: boolean; onSelect: (id: string) => void; onHover: (point: EnvelopePoint | null) => void;
}) {
  const pos = toScene(p.o2Pct, p.airflowCmS, p.sizeMm);
  const r = p.matchRank !== null ? 0.12 : p.sameGroup ? 0.085 : 0.06;
  return (
    <group position={pos}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(p);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(p.id);
        }}
      >
        <sphereGeometry args={[r, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={p.matchRank !== null ? 0.6 : 0.2} transparent opacity={p.sameGroup || p.matchRank !== null ? 1 : 0.38} />
      </mesh>
      {(selected || p.matchRank !== null) && (
        <mesh>
          <sphereGeometry args={[r * 1.7, 18, 18]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.35 : 0.15} wireframe={!selected} />
        </mesh>
      )}
    </group>
  );
}

export function Envelope3DScene({ points, query, groupBox, geometryColors, colors, selectedId, onSelect, onHover, autoRotate }: Props) {
  const half = SPAN / 2;
  const qPos = toScene(query.o2Pct, query.airflowCmS, query.sizeMm ?? 1);
  const matches = useMemo(() => points.filter((p) => p.matchRank !== null), [points]);

  const box = useMemo(() => {
    if (!groupBox) return null;
    const a = toScene(groupBox.o2[0], groupBox.air[0], groupBox.size[0]);
    const b = toScene(groupBox.o2[1], groupBox.air[1], groupBox.size[1]);
    const size: [number, number, number] = [Math.max(0.05, b[0] - a[0]), Math.max(0.05, b[1] - a[1]), Math.max(0.05, b[2] - a[2])];
    const center: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    return { size, center };
  }, [groupBox]);

  const o2Ticks = [10, 14, 18, 22, 26, 30].map((v) => ({ pos: [lin(v, O2), -half - 0.35, -half] as [number, number, number], text: `${v}` }));
  const airTicks = [0, 2, 5, 10, 20, 40].map((v) => ({ pos: [-half - 0.45, lin(Math.sqrt(v), SQRT_AIR), -half] as [number, number, number], text: `${v}` }));
  const sizeTicks = [0.05, 0.3, 1, 3, 10].map((v) => ({ pos: [-half - 0.45, -half - 0.35, lin(Math.log10(v), LOG_SIZE)] as [number, number, number], text: `${v}` }));

  return (
    <Canvas camera={{ position: [7.2, 4.2, 8.4], fov: 38 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.7} />
      <pointLight position={[6, 8, 6]} intensity={60} />
      <Axis from={[-half, -half, -half]} to={[half, -half, -half]} label="O₂ %" ticks={o2Ticks} color={colors.line} textColor={colors.text} />
      <Axis from={[-half, -half, -half]} to={[-half, half, -half]} label="Air flow cm/s (√ scale)" ticks={airTicks} color={colors.line} textColor={colors.text} />
      <Axis from={[-half, -half, -half]} to={[-half, -half, half]} label="Size mm (log)" ticks={sizeTicks} color={colors.line} textColor={colors.text} />
      <gridHelper args={[SPAN, 12, colors.line, colors.line]} position={[0, -half, 0]} />
      {box && (
        <lineSegments position={box.center}>
          <edgesGeometry args={[new THREE.BoxGeometry(...box.size)]} />
          <lineBasicMaterial color={colors.accent} transparent opacity={0.7} />
        </lineSegments>
      )}
      {points.map((p) => (
        <Point key={p.id} p={p} color={geometryColors[p.geometry] ?? colors.line} selected={p.id === selectedId} onSelect={onSelect} onHover={onHover} />
      ))}
      {query.sizeMm !== null && (
        <group position={qPos}>
          <mesh>
            <octahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color={query.inside ? colors.good : colors.warning} emissive={query.inside ? colors.good : colors.warning} emissiveIntensity={0.8} />
          </mesh>
          <Label text="Your query" position={[0, 0.42, 0]} color={query.inside ? colors.good : colors.warning} size={0.24} bold />
        </group>
      )}
      {query.sizeMm !== null &&
        matches.map((m) => (
          <Line key={m.id} points={[qPos, toScene(m.o2Pct, m.airflowCmS, m.sizeMm)]} color={colors.text} lineWidth={1} dashed dashSize={0.12} gapSize={0.08} transparent opacity={0.6} />
        ))}
      <OrbitControls makeDefault enableDamping autoRotate={autoRotate} autoRotateSpeed={0.6} minDistance={4} maxDistance={24} />
    </Canvas>
  );
}
