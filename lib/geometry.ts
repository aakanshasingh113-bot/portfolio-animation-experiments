import { bag, type Item, type Placement } from '@/data/items';

export type Layout = { w: number; h: number; mobile: boolean };
export type Pose = { x: number; y: number; a: number }; // px, px, degrees

const DESKTOP_REF = 1200;
const MOBILE_REF = 560;

export function stageScale(l: Layout) {
  return l.w / (l.mobile ? MOBILE_REF : DESKTOP_REF);
}

/** Visual size (art) and hit size (button) of an item, in px. */
export function itemBox(item: Item, l: Layout) {
  const s = stageScale(l);
  const vw = item.size.w * s;
  const vh = item.size.h * s;
  const min = l.mobile ? 64 : 44;
  return { vw, vh, bw: Math.max(vw, min), bh: Math.max(vh, min) };
}

function rotatedExtents(w: number, h: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { ex: (c * w + s * h) / 2, ey: (s * w + c * h) / 2 };
}

function clamp(v: number, lo: number, hi: number) {
  return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));
}

/** Keep a box of size w×h, rotated by deg, fully inside the stage. */
export function clampToStage(p: Pose, w: number, h: number, l: Layout, margin = 4): Pose {
  const { ex, ey } = rotatedExtents(w, h, p.a);
  return {
    x: clamp(p.x, ex + margin, l.w - ex - margin),
    y: clamp(p.y, ey + margin, l.h - ey - margin),
    a: p.a,
  };
}

function fromPlacement(p: Placement, l: Layout): Pose {
  return { x: (p.x / 100) * l.w, y: (p.y / 100) * l.h, a: p.rot };
}

export function targetPose(item: Item, l: Layout): Pose {
  const { vw, vh } = itemBox(item, l);
  const p = fromPlacement(l.mobile ? item.target.mobile : item.target.desktop, l);
  return clampToStage(p, vw, vh, l);
}

export function bagSize(l: Layout) {
  const s = stageScale(l) * (l.mobile ? bag.mobileScale : 1);
  return { w: bag.size.w * s, h: bag.size.h * s, s };
}

export function bagPose(l: Layout, state: 'idle' | 'tipped'): Pose {
  const src = state === 'idle' ? bag.idle : bag.target;
  return fromPlacement(l.mobile ? src.mobile : src.desktop, l);
}

function rotate(x: number, y: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}

/** The yoga mat follows the bag: same rotation, fixed offset in bag space. */
export function matPose(b: Pose, l: Layout): Pose {
  const { s } = bagSize(l);
  const o = rotate(bag.matOffset.x * s, bag.matOffset.y * s, b.a);
  return { x: b.x + o.x, y: b.y + o.y, a: b.a };
}

/** Centre of the bag opening, plus the unit direction it faces. */
export function bagMouth(b: Pose, l: Layout) {
  const { h } = bagSize(l);
  const o = rotate(0, -h * 0.42, b.a);
  const d = rotate(0, -1, b.a);
  return { x: b.x + o.x, y: b.y + o.y, dx: d.x, dy: d.y };
}

/** Smallest signed difference to rotate from a to b, in degrees. */
export function angleDelta(a: number, b: number) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
