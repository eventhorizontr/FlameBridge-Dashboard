"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import { profileOf, revolveRadius, toPixels, type MeshModel, type Profile } from "@/lib/vision/mesh";

export interface FramePixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface SpaceTimeSlice {
  t: number;
  polygon: [number, number][];
}

interface SceneProps {
  model: MeshModel;
  polygons: number[][] | null;
  slices: SpaceTimeSlice[];
  currentT: number;
  source: { width: number; height: number };
  axisY: number;
  pixels: FramePixels | null;
  autoRotate: boolean;
  colors: { core: string; edge: string; ember: string; line: string; text: string };
  onProfile?: (p: Profile | null) => void;
}

const UNIT = 1 / 60; // scene units per source pixel

function sampleColor(pixels: FramePixels | null, srcW: number, srcH: number, x: number, y: number, fallback: THREE.Color): THREE.Color {
  if (!pixels) return fallback;
  const px = Math.min(pixels.width - 1, Math.max(0, Math.round((x / srcW) * pixels.width)));
  const py = Math.min(pixels.height - 1, Math.max(0, Math.round((y / srcH) * pixels.height)));
  const k = (py * pixels.width + px) * 4;
  const c = new THREE.Color(pixels.data[k] / 255, pixels.data[k + 1] / 255, pixels.data[k + 2] / 255);
  // keep very dark samples visible as embers instead of black holes
  return c.getHSL({ h: 0, s: 0, l: 0 }).l < 0.08 ? c.lerp(fallback, 0.55) : c;
}

function RevolveMesh({ polygons, source, axisY, pixels, colors, onProfile }: Omit<SceneProps, "model" | "slices" | "currentT" | "autoRotate">) {
  const geometry = useMemo(() => {
    if (!polygons?.length) return null;
    const polys = toPixels(polygons, source.width, source.height);
    const profile = profileOf(polys, axisY, 80, 1);
    onProfile?.(profile);
    if (!profile) return null;
    const r = revolveRadius(profile);
    const xc = (profile.x[0] + profile.x[profile.x.length - 1]) / 2;
    const points = profile.x.map((x, i) => new THREE.Vector2(r[i] * UNIT, (x - xc) * UNIT));
    const segments = 96;
    const g = new THREE.LatheGeometry(points, segments);
    const edge = new THREE.Color(colors.edge);
    const core = new THREE.Color(colors.core);
    const pos = g.getAttribute("position");
    const colorsArr = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const i = v % points.length;
      const j = Math.floor(v / points.length);
      const theta = (j / segments) * Math.PI * 2;
      const x = profile.x[i];
      // the camera saw this ring at image row axisY - r cos(theta) (theta = 0 at the top)
      const y = axisY - r[i] * Math.cos(theta);
      const shade = r[i] > 0 ? core.clone().lerp(edge, Math.min(1, Math.abs(Math.sin(theta)))) : edge;
      const c = sampleColor(pixels, source.width, source.height, x, y, shade);
      colorsArr.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colorsArr, 3));
    g.rotateZ(-Math.PI / 2); // lathe axis (Y) -> flow axis (X)
    g.computeVertexNormals();
    return g;
  }, [polygons, source.width, source.height, axisY, pixels, colors.edge, colors.core, onProfile]);

  if (!geometry) return null;
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.55} metalness={0} emissive={colors.ember} emissiveIntensity={0.18} transparent opacity={0.92} />
      </mesh>
      <mesh geometry={geometry} scale={1.06}>
        <meshBasicMaterial color={colors.edge} transparent opacity={0.08} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ExtrudeMesh({ polygons, source, axisY, pixels, colors }: Omit<SceneProps, "model" | "slices" | "currentT" | "autoRotate">) {
  const geometry = useMemo(() => {
    if (!polygons?.length) return null;
    const polys = toPixels(polygons, source.width, source.height).filter((p) => p.length > 2);
    if (!polys.length) return null;
    const xs = polys.flat().map((p) => p[0]);
    const xc = (Math.min(...xs) + Math.max(...xs)) / 2;
    const length = Math.max(...xs) - Math.min(...xs);
    const shapes = polys.map((poly) => {
      const s = new THREE.Shape();
      poly.forEach(([x, y], k) => {
        const sx = (x - xc) * UNIT;
        const sy = (axisY - y) * UNIT;
        if (k === 0) s.moveTo(sx, sy);
        else s.lineTo(sx, sy);
      });
      s.closePath();
      return s;
    });
    const depth = Math.max(0.4, length * 0.45 * UNIT);
    const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, steps: 6 });
    g.translate(0, 0, -depth / 2);
    const edge = new THREE.Color(colors.edge);
    const pos = g.getAttribute("position");
    const colorsArr = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v) / UNIT + xc;
      const y = axisY - pos.getY(v) / UNIT;
      const c = sampleColor(pixels, source.width, source.height, x, y, edge);
      colorsArr.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colorsArr, 3));
    g.computeVertexNormals();
    return g;
  }, [polygons, source.width, source.height, axisY, pixels, colors.edge]);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.6} emissive={colors.ember} emissiveIntensity={0.15} transparent opacity={0.9} />
    </mesh>
  );
}

function SpaceTime({ slices, currentT, axisY, colors }: Pick<SceneProps, "slices" | "currentT" | "axisY" | "colors">) {
  const lines = useMemo(() => {
    if (!slices.length) return [];
    const t0 = slices[0].t;
    const t1 = slices[slices.length - 1].t;
    const span = Math.max(1e-6, t1 - t0);
    const xs = slices.flatMap((s) => s.polygon.map((p) => p[0]));
    const xc = (Math.min(...xs) + Math.max(...xs)) / 2;
    const depth = 8; // scene units for the whole time span
    const early = new THREE.Color(colors.core);
    const late = new THREE.Color(colors.edge);
    return slices.map((s) => {
      const z = ((s.t - t0) / span - 0.5) * depth;
      const pts = s.polygon.map(([x, y]) => new THREE.Vector3((x - xc) * UNIT, (axisY - y) * UNIT, z));
      if (pts.length) pts.push(pts[0].clone());
      const material = new THREE.LineBasicMaterial({ color: early.clone().lerp(late, (s.t - t0) / span), transparent: true, opacity: 0.55 });
      return { object: new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material), t: s.t, base: material.color.clone() };
    });
  }, [slices, axisY, colors.core, colors.edge]);

  const nearest = lines.reduce((best, l, i) => (Math.abs(l.t - currentT) < Math.abs((lines[best]?.t ?? Infinity) - currentT) ? i : best), 0);
  lines.forEach((l, i) => {
    const m = l.object.material as THREE.LineBasicMaterial;
    m.opacity = i === nearest ? 1 : 0.5;
    m.color.copy(i === nearest ? new THREE.Color(colors.text) : l.base);
  });
  return (
    <group rotation={[0, -Math.PI / 5, 0]}>
      {lines.map((l, i) => (
        <primitive key={i} object={l.object} />
      ))}
    </group>
  );
}

export function Flame3DScene(props: SceneProps) {
  const { model, autoRotate, colors } = props;
  return (
    <Canvas camera={{ position: [0, 1.8, 9], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.55} />
      <pointLight position={[4, 5, 6]} intensity={40} color={colors.core} />
      <pointLight position={[-5, -3, -4]} intensity={18} color={colors.edge} />
      {model === "revolve" && <RevolveMesh {...props} />}
      {model === "extrude" && <ExtrudeMesh {...props} />}
      {model === "spacetime" && <SpaceTime {...props} />}
      {/* flow axis */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 9, 6]} />
        <meshBasicMaterial color={colors.line} transparent opacity={0.6} />
      </mesh>
      <gridHelper args={[12, 24, colors.line, colors.line]} position={[0, -2.6, 0]} />
      <OrbitControls makeDefault enableDamping autoRotate={autoRotate} autoRotateSpeed={0.8} minDistance={2} maxDistance={20} />
    </Canvas>
  );
}
