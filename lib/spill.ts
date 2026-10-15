import type MatterNS from "matter-js";
import type { Body as MatterBody } from "matter-js";
import { easeOutBack, lerp, nearestAngle, type Cancel } from "./motion";

type Matter = typeof MatterNS;

export type SpillBody = {
  id: string;
  w: number;
  h: number;
  to: { x: number; y: number; rot: number }; // px, degrees
};

export type Pose = { x: number; y: number; rot: number; scale: number; opacity: number };

type Options = {
  Matter: Matter;
  bodies: SpillBody[];
  mouth: { x: number; y: number };
  bounds: { w: number; h: number };
  onFrame: (id: string, pose: Pose) => void;
  onDone: () => void;
  physicsMs?: number;
  settleMs?: number;
  stagger?: number;
};

const STEP = 1000 / 60;
const AIR = 0.06;

/**
 * Pours bodies out of the bag mouth with matter-js, then eases every body to
 * its preset resting place so the flat-lay always ends up the same.
 */
export function spill({
  Matter,
  bodies,
  mouth,
  bounds,
  onFrame,
  onDone,
  physicsMs = 640,
  settleMs = 560,
  stagger = 22,
}: Options): Cancel {
  const { Engine, Bodies, Body, Composite } = Matter;
  const engine = Engine.create({ gravity: { x: 0, y: 0.3 } });
  const wall = 200;
  const { w: W, h: H } = bounds;
  Composite.add(engine.world, [
    Bodies.rectangle(W / 2, -wall / 2, W + wall * 2, wall, { isStatic: true }),
    Bodies.rectangle(W / 2, H + wall / 2, W + wall * 2, wall, { isStatic: true }),
    Bodies.rectangle(-wall / 2, H / 2, wall, H + wall * 2, { isStatic: true }),
    Bodies.rectangle(W + wall / 2, H / 2, wall, H + wall * 2, { isStatic: true }),
  ]);

  // Expected glide distance with air friction over the physics window.
  const steps = (physicsMs - stagger * bodies.length * 0.5) / STEP;
  const reach = (1 - Math.pow(1 - AIR, steps)) / AIR;

  const live = new Map<string, { body: MatterBody; born: number }>();
  let raf = 0;
  let start = -1;
  let last = 0;
  let settleFrom: Map<string, Pose> | null = null;
  let finished = false;

  const spawn = (b: SpillBody, now: number) => {
    const jitter = (n: number) => (Math.random() - 0.5) * n;
    const body = Bodies.rectangle(mouth.x + jitter(12), mouth.y + jitter(12), b.w * 0.9, b.h * 0.9, {
      label: b.id,
      angle: (jitter(30) * Math.PI) / 180,
      restitution: 0.35,
      friction: 0.2,
      frictionAir: AIR,
      chamfer: { radius: Math.min(b.w, b.h) * 0.2 },
      // Things slide past each other and only bounce off the stage edges, so
      // nothing gets knocked far off course on its way to its mark.
      collisionFilter: { group: -1 },
    });
    const dx = b.to.x - mouth.x;
    const dy = b.to.y - mouth.y;
    const aim = 0.82 / reach;
    Body.setVelocity(body, { x: dx * aim + jitter(1.5), y: dy * aim - 1.2 + jitter(1.5) });
    Body.setAngularVelocity(body, jitter(0.12));
    Composite.add(engine.world, body);
    live.set(b.id, { body, born: now });
  };

  const frame = (now: number) => {
    if (finished) return;
    if (start < 0) {
      start = now;
      last = now;
    }
    const t = now - start;

    if (t < physicsMs) {
      bodies.forEach((b, i) => {
        if (!live.has(b.id) && t >= i * stagger) spawn(b, now);
      });
      // Fixed steps keep the motion the same on 60Hz and 120Hz screens.
      let dt = Math.min(now - last, 50);
      while (dt >= STEP * 0.5) {
        Engine.update(engine, STEP);
        dt -= STEP;
      }
      last = now;
      live.forEach(({ body, born }, id) => {
        const age = now - born;
        onFrame(id, {
          x: body.position.x,
          y: body.position.y,
          rot: (body.angle * 180) / Math.PI,
          scale: Math.min(1, 0.55 + (age / 160) * 0.45),
          opacity: Math.min(1, age / 90),
        });
      });
    } else {
      if (!settleFrom) {
        settleFrom = new Map();
        for (const b of bodies) {
          const entry = live.get(b.id);
          const p = entry?.body.position ?? mouth;
          const rot = entry ? (entry.body.angle * 180) / Math.PI : b.to.rot;
          settleFrom.set(b.id, { x: p.x, y: p.y, rot: nearestAngle(rot, b.to.rot), scale: 1, opacity: 1 });
        }
        Composite.clear(engine.world, false);
        Engine.clear(engine);
      }
      const k = Math.min(1, (t - physicsMs) / settleMs);
      const e = easeOutBack(k);
      for (const b of bodies) {
        const f = settleFrom.get(b.id)!;
        onFrame(b.id, {
          x: lerp(f.x, b.to.x, e),
          y: lerp(f.y, b.to.y, e),
          rot: lerp(f.rot, b.to.rot, e),
          scale: 1,
          opacity: 1,
        });
      }
      if (k >= 1) {
        finished = true;
        onDone();
        return;
      }
    }
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => {
    finished = true;
    cancelAnimationFrame(raf);
    Composite.clear(engine.world, false);
    Engine.clear(engine);
  };
}
