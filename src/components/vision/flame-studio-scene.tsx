"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";

import type { EmissionVolume } from "./flame-volume";

export type RenderStyle = "glow" | "surface";
export type CameraPreset = "camera" | "top" | "orbit";

export interface StackSlice {
  t: number;
  polygon: [number, number][];
}

interface StudioSceneProps {
  volume: EmissionVolume | null;
  stack: StackSlice[] | null;
  stackNow: number;
  style: RenderStyle;
  exposure: number;
  autoRotate: boolean;
  preset: { name: CameraPreset; nonce: number };
  colors: { edge: string; core: string; line: string; text: string; ember: string; bg: string };
}

const LENGTH = 6; // scene units for the flame length

const vertexShader = /* glsl */ `
out vec3 vOrigin;
out vec3 vDirection;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vDirection = position - vOrigin;
  gl_Position = projectionMatrix * mvPosition;
}`;

const fragmentShader = /* glsl */ `
precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
out vec4 outColor;
uniform sampler3D map;
uniform float exposure;
uniform float steps;
vec2 hitBox(vec3 orig, vec3 dir) {
  vec3 inv = 1.0 / dir;
  vec3 t0 = (vec3(-0.5) - orig) * inv;
  vec3 t1 = (vec3(0.5) - orig) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  return vec2(max(tmin.x, max(tmin.y, tmin.z)), min(tmax.x, min(tmax.y, tmax.z)));
}
void main() {
  vec3 dir = normalize(vDirection);
  vec2 b = hitBox(vOrigin, dir);
  if (b.x > b.y) discard;
  b.x = max(b.x, 0.0);
  float dt = (b.y - b.x) / steps;
  vec3 p = vOrigin + (b.x + 0.5 * dt) * dir;
  vec3 acc = vec3(0.0);
  float a = 0.0;
  for (int i = 0; i < 256; i++) {
    if (float(i) >= steps) break;
    vec4 s = texture(map, p + 0.5);
    vec3 c = s.rgb * s.rgb; // stored sqrt-encoded
    acc += c * s.a * dt * exposure * 6.0;
    a += s.a * dt * exposure * 1.5;
    p += dir * dt;
  }
  acc = vec3(1.0) - exp(-acc * 1.6); // filmic-ish tone map of the emission sum
  outColor = vec4(acc, clamp(a, 0.0, 1.0));
}`;

function EmissionVolumeMesh({ volume, exposure }: { volume: EmissionVolume; exposure: number }) {
  const texture = useMemo(() => {
    const t = new THREE.Data3DTexture(volume.data, volume.nx, volume.ny, volume.nz);
    t.format = THREE.RGBAFormat;
    t.type = THREE.UnsignedByteType;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
    return t;
  }, [volume]);
  useEffect(() => () => texture.dispose(), [texture]);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const exposureRef = useRef(exposure);
  useEffect(() => {
    exposureRef.current = exposure;
  }, [exposure]);
  useFrame(() => {
    const m = materialRef.current;
    if (m) {
      m.uniforms.map.value = texture;
      m.uniforms.exposure.value = exposureRef.current * volume.gain;
    }
  });
  const uniforms = useMemo(() => ({ map: { value: null as THREE.Data3DTexture | null }, exposure: { value: 2 }, steps: { value: 160 } }), []);
  const s = LENGTH / volume.size[0];
  return (
    <mesh scale={[volume.size[0] * s, volume.size[1] * s, volume.size[2] * s]}>
      <boxGeometry args={[1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        glslVersion={THREE.GLSL3}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function EmissionSurface({ volume, colors }: { volume: EmissionVolume; colors: StudioSceneProps["colors"] }) {
  const object = useMemo(() => {
    const n = 64;
    const material = new THREE.MeshStandardMaterial({
      vertexColors: false,
      color: colors.edge,
      emissive: colors.ember,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const mc = new MarchingCubes(n, material, false, false, 150000);
    mc.isolation = 0.18;
    const { nx, ny, nz, data } = volume;
    for (let k = 0; k < n; k++)
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const x = Math.min(nx - 1, Math.floor((i / n) * nx));
          const y = Math.min(ny - 1, Math.floor((j / n) * ny));
          const z = Math.min(nz - 1, Math.floor((k / n) * nz));
          mc.field[i + j * n + k * n * n] = data[(x + y * nx + z * nx * ny) * 4 + 3] / 255;
        }
    mc.update();
    const s = LENGTH / volume.size[0];
    mc.scale.set((volume.size[0] * s) / 2, (volume.size[1] * s) / 2, (volume.size[2] * s) / 2);
    return mc;
  }, [volume, colors.edge, colors.ember]);
  return <primitive object={object} />;
}

function TimeStack({ stack, now, colors }: { stack: StackSlice[]; now: number; colors: StudioSceneProps["colors"] }) {
  const lines = useMemo(() => {
    if (!stack.length) return [];
    const t0 = stack[0].t;
    const span = Math.max(1e-6, stack[stack.length - 1].t - t0);
    const xs = stack.flatMap((s) => s.polygon.map((p) => p[0]));
    const ys = stack.flatMap((s) => s.polygon.map((p) => p[1]));
    const xc = (Math.min(...xs) + Math.max(...xs)) / 2;
    const yc = (Math.min(...ys) + Math.max(...ys)) / 2;
    const unit = LENGTH / Math.max(1, Math.max(...xs) - Math.min(...xs));
    const early = new THREE.Color(colors.core);
    const late = new THREE.Color(colors.edge);
    return stack.map((s) => {
      const z = ((s.t - t0) / span - 0.5) * 7;
      const pts = s.polygon.map(([x, y]) => new THREE.Vector3((x - xc) * unit, (yc - y) * unit, z));
      if (pts.length) pts.push(pts[0].clone());
      const base = early.clone().lerp(late, (s.t - t0) / span);
      const m = new THREE.LineBasicMaterial({ color: base, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
      return { object: new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m), t: s.t, base };
    });
  }, [stack, colors.core, colors.edge]);
  const nearest = lines.reduce((b, l, i) => (Math.abs(l.t - now) < Math.abs((lines[b]?.t ?? Infinity) - now) ? i : b), 0);
  lines.forEach((l, i) => {
    const m = l.object.material as THREE.LineBasicMaterial;
    m.color.copy(i === nearest ? new THREE.Color(colors.text) : l.base);
    m.opacity = i === nearest ? 1 : 0.55;
  });
  return (
    <group rotation={[0, -Math.PI / 5, 0]}>
      {lines.map((l, i) => (
        <primitive key={i} object={l.object} />
      ))}
    </group>
  );
}

function CameraRig({ preset }: { preset: StudioSceneProps["preset"] }) {
  const { camera, controls } = useThree();
  const target = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    const positions: Record<CameraPreset, [number, number, number]> = {
      camera: [0, 0, 7.2], // the ISS video camera's line of sight
      top: [0, 7.2, 0.01],
      orbit: [4.6, 2.6, 5.4],
    };
    target.current = new THREE.Vector3(...positions[preset.name]);
  }, [preset]);
  useFrame(() => {
    if (!target.current) return;
    camera.position.lerp(target.current, 0.12);
    (controls as unknown as { target: THREE.Vector3 } | null)?.target.set(0, 0, 0);
    if (camera.position.distanceTo(target.current) < 0.02) target.current = null;
  });
  return null;
}

export function FlameStudioScene({ volume, stack, stackNow, style, exposure, autoRotate, preset, colors }: StudioSceneProps) {
  return (
    <Canvas camera={{ position: [4.6, 2.6, 5.4], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={[colors.bg]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 6, 7]} intensity={45} color={colors.core} />
      <pointLight position={[-6, -2, -5]} intensity={20} color={colors.edge} />
      {stack ? (
        <TimeStack stack={stack} now={stackNow} colors={colors} />
      ) : volume ? (
        style === "glow" ? (
          <EmissionVolumeMesh volume={volume} exposure={exposure} />
        ) : (
          <EmissionSurface volume={volume} colors={colors} />
        )
      ) : null}
      {/* flow axis */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, LENGTH * 1.5, 8]} />
        <meshBasicMaterial color={colors.line} transparent opacity={0.45} />
      </mesh>
      <Grid
        position={[0, volume && !stack ? -((volume.size[1] * LENGTH) / volume.size[0]) / 2 - 0.4 : -2.8, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.6}
        sectionSize={2.5}
        sectionThickness={1}
        cellColor={colors.line}
        sectionColor={colors.line}
        fadeDistance={22}
        fadeStrength={1.5}
        infiniteGrid
      />
      <CameraRig preset={preset} />
      <OrbitControls makeDefault enableDamping autoRotate={autoRotate} autoRotateSpeed={0.7} minDistance={2.5} maxDistance={24} />
      <EffectComposer>
        <Bloom intensity={1.6} luminanceThreshold={0.06} luminanceSmoothing={0.7} mipmapBlur radius={0.75} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
