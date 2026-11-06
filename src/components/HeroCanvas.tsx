import { useEffect, useRef } from 'react';

/**
 * A small Canvas2D "POP" sketch for the home page: a grid of points displaced by a flowing
 * noise field, rotated in 3D and drawn with additive blending. Honors prefers-reduced-motion.
 */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, raf = 0;
    const N = 74, M = 40;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const n3 = (x: number, y: number, z: number) =>
      Math.sin(x * 1.7 + z) * Math.cos(y * 1.3 - z * 0.7) * 0.6 + Math.sin(x * 3.1 - y * 2.3 + z * 1.3) * 0.25 + Math.cos(y * 4.1 + x * 0.7 - z) * 0.12;
    const draw = (t: number) => {
      const time = reduce ? 8 : t * 0.00022;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const rot = time * 0.6 + 0.6;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const tilt = 0.95, ct = Math.cos(tilt), st = Math.sin(tilt);
      const scale = Math.min(w, h * 1.6) * 0.42;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < M; j++) {
          const u = i / (N - 1) - 0.5, v = j / (M - 1) - 0.5;
          let x = u * 2.6, z = v * 1.6;
          const hgt = n3(x, z, time * 3) * 0.32;
          let y = hgt;
          // rotate around Y then tilt around X
          const x1 = x * cr - z * sr;
          const z1 = x * sr + z * cr;
          const y2 = y * ct - z1 * st;
          const z2 = y * st + z1 * ct;
          x = x1;
          y = y2;
          z = z2;
          const persp = 1.6 / (2.4 - z);
          const px = w * 0.5 + x * scale * persp;
          const py = h * 0.56 - y * scale * persp;
          const k = (hgt + 0.32) / 0.64;
          const r = 0.6 + persp * 1.1;
          const hue = 20 + k * 260;
          ctx.fillStyle = `hsla(${hue}, 85%, ${45 + k * 25}%, ${0.16 + 0.55 * persp * 0.6})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}
