import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  life: number;
  maxLife: number;
  tone: 0 | 1 | 2;
  trail: boolean;
};

const TONES: Array<[number, number, number]> = [
  [255, 252, 246],
  [217, 174, 134],
  [214, 148, 148],
];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function makeParticle(w: number, h: number, trail = false, x?: number, y?: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = trail ? 0.35 + Math.random() * 0.9 : 0.08 + Math.random() * 0.22;
  return {
    x: x ?? Math.random() * w,
    y: y ?? Math.random() * h,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: trail ? 0.8 + Math.random() * 1.4 : 0.6 + Math.random() * 1.8,
    a: trail ? 0.42 : 0.12 + Math.random() * 0.22,
    life: trail ? 48 + Math.random() * 28 : 1,
    maxLife: trail ? 76 : 1,
    tone: (Math.random() < 0.55 ? 0 : Math.random() < 0.55 ? 1 : 2) as 0 | 1 | 2,
    trail,
  };
}

export function PointerParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const ambientCount = coarse ? 22 : 46;
    const maxTrail = coarse ? 16 : 28;

    const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, active: false };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = true;
    let spawnCool = 0;
    const particles: Particle[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      particles.length = 0;
      for (let i = 0; i < ambientCount; i += 1) {
        particles.push(makeParticle(width, height));
      }
    };

    const onMove = (event: PointerEvent) => {
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };

    const onLeave = () => {
      pointer.active = false;
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      const speed =
        pointer.active && pointer.px > 0
          ? Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py)
          : 0;

      spawnCool = Math.max(0, spawnCool - 1);
      if (pointer.active && speed > 2.4 && spawnCool === 0) {
        const trailers = particles.filter((p) => p.trail).length;
        if (trailers < maxTrail) {
          particles.push(makeParticle(width, height, true, pointer.x, pointer.y));
          spawnCool = coarse ? 3 : 1;
        }
      }

      const dark = document.documentElement.classList.contains("dark");

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];

        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 160) {
            const pull = ((160 - dist) / 160) * 0.045;
            p.vx += (dx / dist) * pull;
            p.vy += (dy / dist) * pull;
          }
        }

        p.vx *= 0.986;
        p.vy *= 0.986;
        p.x += p.vx;
        p.y += p.vy;

        if (!p.trail) {
          if (p.x < -8) p.x = width + 8;
          if (p.x > width + 8) p.x = -8;
          if (p.y < -8) p.y = height + 8;
          if (p.y > height + 8) p.y = -8;
        } else {
          p.life -= 1;
          p.a = (p.life / p.maxLife) * 0.4;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
        }

        const [r, g, b] = TONES[p.tone];
        const alpha = dark ? p.a * 1.15 : p.a;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      pointer.px = pointer.x;
      pointer.py = pointer.y;
      frame = window.requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) frame = window.requestAnimationFrame(draw);
    };

    resize();
    seed();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    frame = window.requestAnimationFrame(draw);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-particles" aria-hidden="true" />;
}
