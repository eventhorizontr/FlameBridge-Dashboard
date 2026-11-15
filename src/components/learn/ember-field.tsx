"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  hue: 0 | 1 | 2;
}

const MAX_PARTICLES = 48;

/**
 * Decorative ember particles behind the Explore & Learn hero. `buoyancy` (0 … 1) sets how strongly
 * embers rise; at 0 they drift without a preferred direction. Purely illustrative: it encodes no data.
 * Stops when the tab is hidden and never starts under `prefers-reduced-motion: reduce`.
 */
export function EmberField({ buoyancy, className }: { buoyancy: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buoyancyRef = useRef(buoyancy);

  useEffect(() => {
    buoyancyRef.current = buoyancy;
  }, [buoyancy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(canvas);
    const colors = [
      styles.getPropertyValue("--ember").trim() || "orange",
      styles.getPropertyValue("--flame-edge").trim() || "orange",
      styles.getPropertyValue("--flame-core").trim() || "lightblue",
    ];

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const spawn = (anywhere: boolean): Particle => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 6,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(0.25 + Math.random() * 0.55),
      r: 0.6 + Math.random() * 1.6,
      life: Math.random(),
      hue: Math.random() < 0.18 ? 2 : Math.random() < 0.5 ? 0 : 1,
    });
    const particles = Array.from({ length: MAX_PARTICLES }, () => spawn(true));

    let frame = 0;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      const lift = buoyancyRef.current;
      const floating = lift < 0.05;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (floating) {
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
          p.vx *= 0.985;
          p.vy *= 0.985;
        } else {
          p.vy += (-(0.15 + 0.6 * lift) * (1 + p.r * 0.3) - p.vy) * 0.02;
          p.vx += (Math.random() - 0.5) * 0.03;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.004;
        if (p.y < -8 || p.x < -8 || p.x > width + 8 || p.y > height + 8 || p.life > 1.6) {
          particles[i] = spawn(floating);
          continue;
        }
        const alpha = Math.max(0, Math.sin(Math.min(p.life, 1) * Math.PI)) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colors[p.hue];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      if (reduced.matches) {
        stop();
        ctx.clearRect(0, 0, width, height);
      } else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotion);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotion);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
