import { useEffect, useRef } from "react";

function canOrbit() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function usePointerOrbit<T extends HTMLElement>(maxTilt = 7) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !canOrbit()) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    let running = true;

    const render = () => {
      if (!running) return;
      current.x += (target.x - current.x) * 0.14;
      current.y += (target.y - current.y) * 0.14;
      const rx = (-current.y * maxTilt).toFixed(3);
      const ry = (current.x * maxTilt).toFixed(3);
      node.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      frame = window.requestAnimationFrame(render);
    };

    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;
      target.x = Math.max(-1, Math.min(1, (px - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, (py - 0.5) * 2));
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    frame = window.requestAnimationFrame(render);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      node.style.transform = "";
    };
  }, [maxTilt]);

  return ref;
}

export function useAtmosphereParallax<T extends HTMLElement>(range = 18) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !canOrbit()) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    let running = true;

    const render = () => {
      if (!running) return;
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      const x = (current.x * range).toFixed(2);
      const y = (current.y * range).toFixed(2);
      node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.08)`;
      frame = window.requestAnimationFrame(render);
    };

    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2;
      const ny = (event.clientY / window.innerHeight - 0.5) * 2;
      target.x = -nx;
      target.y = -ny;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = window.requestAnimationFrame(render);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      node.style.transform = "";
    };
  }, [range]);

  return ref;
}
