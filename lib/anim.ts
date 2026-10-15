export type Pose = { x: number; y: number; a: number; s: number; o: number };

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  /** Soft overshoot; s controls how far past the target it goes. */
  outBack:
    (s = 1.2) =>
    (t: number) =>
      1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
};

export type Easing = (t: number) => number;

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    a: a.a + (b.a - a.a) * t,
    s: a.s + (b.s - a.s) * t,
    o: Math.min(1, Math.max(0, a.o + (b.o - a.o) * t)),
  };
}

export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
