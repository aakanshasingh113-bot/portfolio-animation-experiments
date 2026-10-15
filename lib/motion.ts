// Tiny rAF tween helpers. They're used for the settle, the glide and pack it back.

export type Cancel = () => void;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
/** Soft overshoot, for the springy settle. */
export const easeOutBack = (t: number, s = 1.2) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

export function tween(
  duration: number,
  onUpdate: (t: number) => void,
  onDone?: () => void,
  delay = 0,
): Cancel {
  let raf = 0;
  let start = -1;
  const step = (now: number) => {
    if (start < 0) start = now + delay;
    const t = Math.min(1, Math.max(0, (now - start) / duration));
    if (now >= start) onUpdate(t);
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Start angle adjusted so the shortest turn is taken towards `to` (degrees). */
export function nearestAngle(from: number, to: number) {
  const diff = ((((to - from) % 360) + 540) % 360) - 180;
  return to - diff;
}
