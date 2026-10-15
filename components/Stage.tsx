'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type * as MatterNS from 'matter-js';
import { bag, contact, items, type Item } from '@/data/items';
import { BagArt, TrekPhoto, art } from '@/components/illustrations';
import { Tag } from '@/components/Tag';
import { angleDelta, bagMouth, bagPose, bagSize, itemBox, matPose, targetPose, type Layout } from '@/lib/geometry';
import { ease, lerpPose, rand, type Easing, type Pose } from '@/lib/anim';
import { setCalm, usePrefs } from '@/lib/prefs';
import { playRustle, playTap } from '@/lib/sound';

type Matter = typeof MatterNS;
type Phase = 'idle' | 'tipping' | 'settled' | 'opening' | 'packing';
type Track = { id: string; from: Pose; to: Pose; dur: number; delay?: number; ease: Easing };
type Ticker = (now: number) => boolean; // return false when finished

const spill = items.filter((i) => i.kind !== 'toggle');
const mat = items.find((i) => i.kind === 'toggle');
const STEP = 1000 / 60;

let matterPromise: Promise<Matter> | null = null;
const loadMatter = () => (matterPromise ??= import('matter-js').then((mod) => mod.default ?? (mod as unknown as Matter)));

function destination(item: Item) {
  if (!item.href) return undefined;
  return item.protected ? `/protected?next=${encodeURIComponent(item.href)}` : item.href;
}

function ariaLabel(item: Item, calm: boolean) {
  const raw = item.statusLabel ?? item.status ?? '';
  const status = raw.charAt(0).toLowerCase() + raw.slice(1);
  switch (item.kind) {
    case 'project':
      return `${item.label}: ${item.project?.name ?? ''} case study, ${status}`;
    case 'toggle':
      return `${item.label}: calm mode, ${calm ? 'on' : 'off'}`;
    case 'easter-egg':
      return `${item.label}: easter egg`;
    default:
      if (item.href === '/about') return `${item.label}: About page`;
      if (item.href?.endsWith('.pdf')) return `${item.label}: Résumé (PDF)`;
      if (!item.href) return `${item.label}: contact details`;
      return item.label;
  }
}

export function Stage({ photos }: { photos: Record<string, boolean> }) {
  const router = useRouter();
  const { calm } = usePrefs();

  const stageRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const [phase, _setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    _setPhase(p);
  };

  const [active, setActive] = useState<string | null>(null); // hover / focus / first tap
  const activeRef = useRef(active);
  activeRef.current = active;
  const tapWasActive = useRef(false);
  const [egg, setEgg] = useState<string | null>(null); // easter egg showing its text
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [contactOpen, setContactOpen] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [onTop, setOnTop] = useState<string | null>(null); // last item dragged stays on top
  const [leaving, setLeaving] = useState(false);

  const poses = useRef(new Map<string, Pose>());
  const els = useRef(new Map<string, HTMLDivElement>());
  const arts = useRef(new Map<string, HTMLDivElement>());
  const tickers = useRef(new Set<Ticker>());
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const dragWorld = useRef<{ M: Matter; engine: MatterNS.Engine; bodies: Map<string, MatterNS.Body> } | null>(null);
  const bagBtn = useRef<HTMLButtonElement>(null);
  const phoneBtn = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusAfterSettle = useRef(false);
  const pointerType = useRef<string>('mouse');
  const suppressClick = useRef(false);
  const drag = useRef<{
    id: string;
    pointerId: number;
    sx: number;
    sy: number;
    start: Pose;
    moved: boolean;
    vx: number;
    vy: number;
    t: number;
  } | null>(null);

  /* ---------------- geometry helpers ---------------- */

  const boxOf = useCallback((id: string, l: Layout) => {
    if (id === 'bag') {
      const b = bagSize(l);
      return { vw: b.w, vh: b.h, bw: b.w, bh: b.h };
    }
    const item = items.find((i) => i.id === id)!;
    if (item.kind === 'toggle') {
      const s = bagSize(l).s;
      const vw = item.size.w * s;
      const vh = item.size.h * s;
      return { vw, vh, bw: Math.max(vw, l.mobile ? 44 : 32), bh: vh };
    }
    return itemBox(item, l);
  }, []);

  const pose = (id: string) => poses.current.get(id) ?? { x: 0, y: 0, a: 0, s: 1, o: 1 };
  const full = (p: { x: number; y: number; a: number }, s = 1, o = 1): Pose => ({ ...p, s, o });

  /* ---------------- rendering loop ---------------- */

  const applyAll = useCallback(() => {
    const l = layoutRef.current;
    if (!l) return;
    if (mat) poses.current.set(mat.id, full(matPose(pose('bag'), l)));
    for (const [id, el] of els.current) {
      const p = poses.current.get(id);
      if (!p) continue;
      const b = boxOf(id, l);
      el.style.transform = `translate3d(${p.x - b.bw / 2}px, ${p.y - b.bh / 2}px, 0) scale(${p.s})`;
      el.style.opacity = String(p.o);
      const a = arts.current.get(id);
      if (a) a.style.transform = `translate(-50%, -50%) rotate(${p.a}deg)`;
    }
  }, [boxOf]);

  const frame = useCallback(
    (now: number) => {
      for (const t of tickers.current) if (!t(now)) tickers.current.delete(t);
      applyAll();
      raf.current = tickers.current.size ? requestAnimationFrame(frame) : 0;
    },
    [applyAll],
  );

  const addTicker = (t: Ticker) => {
    tickers.current.add(t);
    if (!raf.current) raf.current = requestAnimationFrame(frame);
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const stopAll = () => {
    tickers.current.clear();
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    drag.current = null;
  };

  const tween = (tracks: Track[], onDone?: () => void) => {
    const t0 = performance.now();
    addTicker((now) => {
      let done = true;
      for (const tr of tracks) {
        const k = Math.min(1, Math.max(0, (now - t0 - (tr.delay ?? 0)) / tr.dur));
        if (k < 1) done = false;
        poses.current.set(tr.id, lerpPose(tr.from, tr.to, tr.ease(k)));
      }
      if (done) onDone?.();
      return !done;
    });
  };

  /* ---------------- states ---------------- */

  const snapIdle = useCallback(() => {
    const l = layoutRef.current;
    if (!l) return;
    stopAll();
    dragWorld.current = null;
    const b = bagPose(l, 'idle');
    poses.current.set('bag', full(b));
    const mouth = bagMouth(bagPose(l, 'tipped'), l);
    for (const it of spill) poses.current.set(it.id, { x: mouth.x, y: mouth.y, a: 0, s: 0.4, o: 0 });
    setPhase('idle');
    applyAll();
  }, [applyAll]);

  const snapSettled = useCallback(() => {
    const l = layoutRef.current;
    if (!l) return;
    stopAll();
    dragWorld.current = null;
    poses.current.set('bag', full(bagPose(l, 'tipped')));
    for (const it of spill) poses.current.set(it.id, full(targetPose(it, l)));
    setPhase('settled');
    setOpening(null);
    applyAll();
  }, [applyAll]);

  const remember = (tipped: boolean) => {
    try {
      if (tipped) sessionStorage.setItem('bag-tipped', '1');
      else sessionStorage.removeItem('bag-tipped');
    } catch {
      /* ignore */
    }
  };

  /* ---------------- tip → spill → settle ---------------- */

  const settle = () => {
    const l = layoutRef.current!;
    const tracks: Track[] = spill.map((it) => {
      const to = full(targetPose(it, l));
      const from = { ...pose(it.id), s: pose(it.id).s, o: pose(it.id).o };
      from.a = to.a - angleDelta(from.a, to.a);
      return { id: it.id, from, to, dur: 600, ease: ease.outBack(0.9) };
    });
    tween(tracks, () => {
      setPhase('settled');
      for (let i = 0; i < 4; i++) playTap(i * 0.06);
      if (focusAfterSettle.current) {
        focusAfterSettle.current = false;
        stageRef.current?.querySelector<HTMLElement>('[data-item]')?.focus();
      }
    });
  };

  const startSpill = (M: Matter) => {
    const l = layoutRef.current;
    if (!l || phaseRef.current !== 'tipping') return;
    const k = l.w / (l.mobile ? 560 : 1200);
    const engine = M.Engine.create({ gravity: { x: 0, y: l.mobile ? 0.6 : 0.35, scale: 0.001 } });
    const t = 400;
    M.Composite.add(engine.world, [
      M.Bodies.rectangle(l.w / 2, -t / 2, l.w + 2 * t, t, { isStatic: true }),
      M.Bodies.rectangle(l.w / 2, l.h + t / 2, l.w + 2 * t, t, { isStatic: true }),
      M.Bodies.rectangle(-t / 2, l.h / 2, t, l.h + 2 * t, { isStatic: true }),
      M.Bodies.rectangle(l.w + t / 2, l.h / 2, t, l.h + 2 * t, { isStatic: true }),
    ]);
    const mouth = bagMouth(bagPose(l, 'tipped'), l);
    const px = -mouth.dy;
    const py = mouth.dx;
    const queue = spill.map((it, i) => {
      const { vw, vh } = itemBox(it, l);
      const speed = rand(7, 15) * k * (l.mobile ? 1.1 : 1.6);
      const spread = rand(-0.6, 0.6);
      const body = M.Bodies.rectangle(mouth.x, mouth.y, vw, vh, {
        chamfer: { radius: Math.min(vw, vh) * 0.2 },
        restitution: 0.4,
        friction: 0.05,
        frictionAir: 0.025,
        angle: rand(-0.6, 0.6),
        collisionFilter: { group: -1 }, // items pass over each other; walls still stop them
      });
      return {
        id: it.id,
        body,
        at: i * 24,
        v: { x: (mouth.dx + px * spread) * speed, y: (mouth.dy + py * spread) * speed },
        spin: rand(-0.12, 0.12),
        added: false,
      };
    });
    const t0 = performance.now();
    addTicker((now) => {
      if (phaseRef.current !== 'tipping') return false;
      const elapsed = now - t0;
      for (const q of queue) {
        if (!q.added && elapsed >= q.at) {
          M.Composite.add(engine.world, q.body);
          M.Body.setVelocity(q.body, q.v);
          M.Body.setAngularVelocity(q.body, q.spin);
          q.added = true;
        }
      }
      M.Engine.update(engine, STEP);
      for (const q of queue) {
        if (!q.added) continue;
        const age = elapsed - q.at;
        poses.current.set(q.id, {
          x: q.body.position.x,
          y: q.body.position.y,
          a: (q.body.angle * 180) / Math.PI,
          s: Math.min(1, 0.55 + (age / 140) * 0.45),
          o: Math.min(1, age / 90),
        });
      }
      if (elapsed >= 650) {
        M.Composite.clear(engine.world, false);
        M.Engine.clear(engine);
        settle();
        return false;
      }
      return true;
    });
  };

  const tip = useCallback(() => {
    const l = layoutRef.current;
    if (!l || phaseRef.current !== 'idle') return;
    remember(true);
    setActive(null);
    if (document.activeElement === bagBtn.current) focusAfterSettle.current = true;
    if (calm) {
      snapSettled();
      if (focusAfterSettle.current) {
        focusAfterSettle.current = false;
        requestAnimationFrame(() => stageRef.current?.querySelector<HTMLElement>('[data-item]')?.focus());
      }
      return;
    }
    setPhase('tipping');
    playRustle();
    tween([{ id: 'bag', from: pose('bag'), to: full(bagPose(l, 'tipped')), dur: 520, ease: ease.outBack(1.1) }]);
    const go = loadMatter();
    later(() => {
      go.then(startSpill).catch(() => snapSettled());
    }, 150);
  }, [calm, snapSettled]);

  /* ---------------- pack it back ---------------- */

  const pack = () => {
    const l = layoutRef.current;
    if (!l || phaseRef.current !== 'settled') return;
    setPhase('packing');
    setActive(null);
    setEgg(null);
    setContactOpen(false);
    dragWorld.current = null;
    remember(false);
    const mouth = bagMouth(bagPose(l, 'tipped'), l);
    const tracks: Track[] = spill.map((it, i) => {
      const from = pose(it.id);
      return {
        id: it.id,
        from,
        to: { x: mouth.x, y: mouth.y, a: from.a + rand(-120, 120), s: 0.35, o: 0 },
        dur: 600,
        delay: i * 14,
        ease: ease.inCubic,
      };
    });
    tracks.push({ id: 'bag', from: pose('bag'), to: full(bagPose(l, 'idle')), dur: 460, delay: 620, ease: ease.outBack(1.2) });
    playRustle();
    tween(tracks, () => {
      setPhase('idle');
      bagBtn.current?.focus({ preventScroll: true });
    });
  };

  /* ---------------- open an item ---------------- */

  const openItem = (item: Item) => {
    const l = layoutRef.current;
    const href = destination(item);
    if (!l || !href) return;
    setPhase('opening');
    setActive(null);
    setOpening(item.id);
    tween([
      {
        id: item.id,
        from: pose(item.id),
        to: { x: l.w / 2, y: l.h / 2, a: 0, s: 1.6, o: 1 },
        dur: calm ? 1 : 420,
        ease: ease.inOutCubic,
      },
    ]);
    later(() => setLeaving(true), calm ? 0 : 220);
    later(
      () => {
        if (href.endsWith('.pdf')) window.location.assign(href);
        else router.push(href);
      },
      calm ? 400 : 620,
    );
  };

  /* ---------------- drag ---------------- */

  const ensureBody = async (id: string) => {
    const l = layoutRef.current!;
    if (!dragWorld.current) {
      const M = await loadMatter();
      const engine = M.Engine.create({ gravity: { x: 0, y: 0 } });
      const t = 400;
      M.Composite.add(engine.world, [
        M.Bodies.rectangle(l.w / 2, -t / 2, l.w + 2 * t, t, { isStatic: true }),
        M.Bodies.rectangle(l.w / 2, l.h + t / 2, l.w + 2 * t, t, { isStatic: true }),
        M.Bodies.rectangle(-t / 2, l.h / 2, t, l.h + 2 * t, { isStatic: true }),
        M.Bodies.rectangle(l.w + t / 2, l.h / 2, t, l.h + 2 * t, { isStatic: true }),
      ]);
      dragWorld.current = { M, engine, bodies: new Map() };
    }
    const w = dragWorld.current;
    let body = w.bodies.get(id);
    if (!body) {
      const { vw, vh } = boxOf(id, l);
      body = w.M.Bodies.rectangle(0, 0, vw, vh, {
        chamfer: { radius: Math.min(vw, vh) * 0.2 },
        restitution: 0.5,
        frictionAir: 0.07,
        collisionFilter: { group: -1 },
      });
      w.M.Composite.add(w.engine.world, body);
      w.bodies.set(id, body);
    }
    const p = pose(id);
    w.M.Body.setPosition(body, { x: p.x, y: p.y });
    w.M.Body.setAngle(body, (p.a * Math.PI) / 180);
    return { w, body };
  };

  const onItemPointerDown = (e: PointerEvent<HTMLElement>, item: Item) => {
    pointerType.current = e.pointerType;
    tapWasActive.current = activeRef.current === item.id;
    if (e.button !== 0 || calm || phaseRef.current !== 'settled' || item.kind === 'toggle') return;
    drag.current = {
      id: item.id,
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      start: { ...pose(item.id) },
      moved: false,
      vx: 0,
      vy: 0,
      t: performance.now(),
    };
  };

  const onItemPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const l = layoutRef.current;
    if (!d || !l || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      setOnTop(d.id);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setActive(null);
      setEgg(null);
      void loadMatter();
    }
    const b = boxOf(d.id, l);
    const prev = pose(d.id);
    const x = Math.min(l.w - b.vw / 3, Math.max(b.vw / 3, d.start.x + dx));
    const y = Math.min(l.h - b.vh / 3, Math.max(b.vh / 3, d.start.y + dy));
    const now = performance.now();
    const dt = Math.max(1, now - d.t);
    d.vx = 0.6 * d.vx + 0.4 * (((x - prev.x) / dt) * STEP);
    d.vy = 0.6 * d.vy + 0.4 * (((y - prev.y) / dt) * STEP);
    d.t = now;
    poses.current.set(d.id, { ...prev, x, y });
    applyAll();
  };

  const onItemPointerUp = async (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    if (calm) return;
    const { w, body } = await ensureBody(d.id);
    const cap = 40;
    w.M.Body.setVelocity(body, { x: Math.max(-cap, Math.min(cap, d.vx)), y: Math.max(-cap, Math.min(cap, d.vy)) });
    w.M.Body.setAngularVelocity(body, d.vx * 0.004);
    const t0 = performance.now();
    addTicker((now) => {
      if (phaseRef.current !== 'settled' || drag.current?.id === d.id) return false;
      w.M.Engine.update(w.engine, STEP);
      poses.current.set(d.id, {
        x: body.position.x,
        y: body.position.y,
        a: (body.angle * 180) / Math.PI,
        s: 1,
        o: 1,
      });
      return body.speed > 0.05 && now - t0 < 1500;
    });
  };

  /* ---------------- item activation ---------------- */

  const onItemClick = (e: MouseEvent<HTMLElement>, item: Item) => {
    const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
    if (suppressClick.current) {
      e.preventDefault();
      suppressClick.current = false;
      return;
    }
    if (phaseRef.current !== 'settled') {
      e.preventDefault();
      return;
    }
    if (item.href && modified) return; // let the browser open a new tab
    // Touch: the first tap shows the tag, the second one opens.
    if (pointerType.current === 'touch' && item.kind !== 'easter-egg' && !tapWasActive.current) {
      e.preventDefault();
      setActive(item.id);
      setEgg(null);
      return;
    }
    switch (item.kind) {
      case 'project':
      case 'page':
        if (item.href) {
          e.preventDefault();
          openItem(item);
        } else {
          setContactOpen((o) => !o);
          setActive(null);
        }
        break;
      case 'toggle':
        setCalm(!calm);
        break;
      case 'easter-egg':
        if (item.easterEgg?.image) setFlipped((f) => ({ ...f, [item.id]: !f[item.id] }));
        setEgg((cur) => (cur === item.id ? null : item.id));
        setActive(null);
        break;
    }
    pointerType.current = 'mouse';
  };

  /* ---------------- effects ---------------- */

  // Measure the stage and keep the layout in sync with its size.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const mq = window.matchMedia('(max-width: 639px)');
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = { w: Math.round(r.width), h: Math.round(r.height), mobile: mq.matches };
      const prev = layoutRef.current;
      if (prev && prev.w === next.w && prev.h === next.h && prev.mobile === next.mobile) return;
      layoutRef.current = next;
      setLayout(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Whenever the layout changes, put everything where it belongs for the current state.
  const firstLayout = useRef(true);
  useLayoutEffect(() => {
    if (!layout) return;
    if (firstLayout.current) {
      firstLayout.current = false;
      let tipped = false;
      try {
        tipped = sessionStorage.getItem('bag-tipped') === '1';
      } catch {
        /* ignore */
      }
      if (tipped || calm) snapSettled();
      else snapIdle();
      stageRef.current?.setAttribute('data-ready', '');
      return;
    }
    const p = phaseRef.current;
    if (p === 'idle' || p === 'packing') snapIdle();
    else snapSettled();
  }, [layout]);

  // Calm mode on: everything goes still, already laid out.
  useEffect(() => {
    if (!layoutRef.current || firstLayout.current) return;
    if (calm && phaseRef.current !== 'settled' && phaseRef.current !== 'opening') snapSettled();
  }, [calm, snapSettled]);

  // Fetch matter.js after first paint so the tip feels instant.
  useEffect(() => {
    if (calm) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => void loadMatter()) : window.setTimeout(() => void loadMatter(), 1200);
    return () => {
      if (!w.requestIdleCallback) clearTimeout(id);
    };
  }, [calm]);

  // Idle hint: one wobble after 3 s without input. The first scroll attempt tips the bag.
  useEffect(() => {
    if (phase !== 'idle' || calm) return;
    let wobbleTimer = 0;
    const arm = () => {
      clearTimeout(wobbleTimer);
      wobbleTimer = window.setTimeout(() => {
        if (phaseRef.current !== 'idle') return;
        const base = pose('bag');
        const t0 = performance.now();
        addTicker((now) => {
          if (phaseRef.current !== 'idle') return false;
          const k = Math.min(1, (now - t0) / 700);
          poses.current.set('bag', { ...base, a: base.a + 4 * Math.sin(k * Math.PI * 3) * (1 - k) });
          return k < 1;
        });
      }, 3000);
    };
    const reset = () => arm();
    const onScrollIntent = () => {
      const r = stageRef.current?.getBoundingClientRect();
      if (r && r.top < window.innerHeight && r.bottom > 0) tip();
    };
    arm();
    window.addEventListener('pointermove', reset, { passive: true });
    window.addEventListener('keydown', reset);
    window.addEventListener('wheel', onScrollIntent, { passive: true, once: true });
    window.addEventListener('touchmove', onScrollIntent, { passive: true, once: true });
    return () => {
      clearTimeout(wobbleTimer);
      window.removeEventListener('pointermove', reset);
      window.removeEventListener('keydown', reset);
      window.removeEventListener('wheel', onScrollIntent);
      window.removeEventListener('touchmove', onScrollIntent);
    };
  }, [phase, calm, tip]);

  // Escape closes tags and panels; a tap outside does too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (contactOpen) phoneBtn.current?.focus();
      setActive(null);
      setEgg(null);
      setContactOpen(false);
    };
    const onDown = (e: globalThis.PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest('[data-item], [data-panel]')) return;
      setEgg(null);
      setContactOpen(false);
      if (e.pointerType === 'touch') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [contactOpen]);

  useEffect(() => {
    if (contactOpen) panelRef.current?.querySelector<HTMLElement>('a')?.focus();
  }, [contactOpen]);

  // Coming back from the PDF via the back button: lift the fade and lay things out again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setLeaving(false);
      snapSettled();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [snapSettled]);

  useEffect(() => () => stopAll(), []);

  /* ---------------- render ---------------- */

  const settled = phase === 'settled';
  const showItems = phase !== 'idle';
  const tagFor = (active && items.find((i) => i.id === active && i.kind !== 'easter-egg')) || null;
  const eggItem = (egg && items.find((i) => i.id === egg)) || null;

  const anchorOf = (id: string) => {
    const l = layoutRef.current!;
    const p = pose(id);
    const b = boxOf(id, l);
    return { x: p.x, y: p.y, bw: b.bw, bh: b.bh };
  };

  const register = (id: string) => (el: HTMLDivElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  };
  const registerArt = (id: string) => (el: HTMLDivElement | null) => {
    if (el) arts.current.set(id, el);
    else arts.current.delete(id);
  };

  const renderItem = (item: Item, i: number) => {
    if (!layout) return null;
    const b = boxOf(item.id, layout);
    const isToggle = item.kind === 'toggle';
    const lifted = active === item.id || egg === item.id || (item.id === 'phone' && contactOpen);
    const interactive = isToggle || settled;
    const z = opening === item.id ? 45 : lifted ? 40 : onTop === item.id ? 30 : isToggle ? 2 : 3 + i;
    const href = destination(item);
    const describedBy = tagFor?.id === item.id || eggItem?.id === item.id ? `tag-${item.id}` : undefined;
    const common = {
      'data-item': item.id,
      className: 'item-hit',
      'aria-label': ariaLabel(item, calm),
      'aria-describedby': describedBy,
      tabIndex: interactive ? 0 : -1,
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'touch' && !drag.current && interactive) setActive(item.id);
      },
      onPointerLeave: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'touch') setActive((a) => (a === item.id ? null : a));
      },
      onFocus: () => interactive && setActive(item.id),
      onBlur: () => setActive((a) => (a === item.id ? null : a)),
      onPointerDown: (e: PointerEvent<HTMLElement>) => onItemPointerDown(e, item),
      onPointerMove: onItemPointerMove,
      onPointerUp: onItemPointerUp,
      onPointerCancel: () => (drag.current = null),
      onClick: (e: MouseEvent<HTMLElement>) => {
        if (isToggle) {
          if (pointerType.current === 'touch' && !tapWasActive.current) {
            setActive(item.id);
            return;
          }
          setCalm(!calm);
          pointerType.current = 'mouse';
          return;
        }
        onItemClick(e, item);
      },
    };

    const Art = art[item.id];
    const face = photos[item.id] ? (
      <Image
        src={item.image}
        alt=""
        fill
        sizes={`${Math.min(400, Math.ceil(b.vw))}px`}
        priority={item.kind === 'project'}
        draggable={false}
        className="object-contain"
      />
    ) : Art ? (
      <Art />
    ) : null;

    const egged = item.easterEgg?.image;
    const back = egged ? (
      photos[`${item.id}:egg`] ? (
        <Image src={egged} alt="" fill sizes="200px" className="rounded-md object-cover" />
      ) : (
        <TrekPhoto />
      )
    ) : null;

    return (
      <div
        key={item.id}
        ref={register(item.id)}
        className="entity"
        data-lift={lifted && interactive ? 'true' : 'false'}
        style={{
          width: b.bw,
          height: b.bh,
          zIndex: z,
          visibility: isToggle || showItems ? 'visible' : 'hidden',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      >
        {href ? (
          <a {...common} href={href} draggable={false} />
        ) : (
          <button
            {...common}
            ref={item.id === 'phone' ? phoneBtn : undefined}
            type="button"
            aria-pressed={isToggle ? calm : undefined}
            aria-expanded={item.id === 'phone' ? contactOpen : undefined}
          />
        )}
        <div ref={registerArt(item.id)} className="item-art pointer-events-none" style={{ width: b.vw, height: b.vh }}>
          {back ? (
            <div className="flip" data-flipped={flipped[item.id] ? 'true' : 'false'}>
              <div>{face}</div>
              <div className="flip-back">{back}</div>
            </div>
          ) : (
            face
          )}
        </div>
      </div>
    );
  };

  const bagBox = layout ? boxOf('bag', layout) : null;
  const idleBag = layout ? bagPose(layout, 'idle') : null;

  const projects = items.filter((i) => i.kind === 'project' || i.kind === 'page');
  const rest = items.filter((i) => i.kind === 'toggle' || i.kind === 'easter-egg');

  return (
    <LazyMotion features={domAnimation} strict>
      <div ref={stageRef} className="stage select-none" aria-label="What's in my bag" role="region">
        {layout && bagBox && idleBag && (
          <>
            {/* The bag */}
            <div
              ref={register('bag')}
              className="entity"
              data-lift={phase === 'idle' && active === 'bag' ? 'true' : 'false'}
              style={{ width: bagBox.bw, height: bagBox.bh, zIndex: 1 }}
            >
              {phase === 'idle' ? (
                <button
                  ref={bagBtn}
                  type="button"
                  className="item-hit"
                  style={{ touchAction: 'pan-y' }}
                  aria-label={`${bag.label}: tip it over to see my work`}
                  onClick={tip}
                  onPointerEnter={() => setActive('bag')}
                  onPointerLeave={() => setActive(null)}
                  onPointerDown={(e) => {
                    const sx = e.clientX;
                    const sy = e.clientY;
                    const el = e.currentTarget;
                    const move = (ev: globalThis.PointerEvent) => {
                      const dx = ev.clientX - sx;
                      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(ev.clientY - sy)) {
                        cleanup();
                        tip();
                      }
                    };
                    const cleanup = () => {
                      el.removeEventListener('pointermove', move);
                      window.removeEventListener('pointerup', cleanup);
                    };
                    el.addEventListener('pointermove', move);
                    window.addEventListener('pointerup', cleanup);
                  }}
                />
              ) : null}
              <div ref={registerArt('bag')} className="item-art pointer-events-none" style={{ width: bagBox.vw, height: bagBox.vh }}>
                {photos.bag ? (
                  <Image src={bag.image} alt="" fill sizes="300px" priority className="object-contain" />
                ) : (
                  <BagArt open={phase !== 'idle'} />
                )}
              </div>
            </div>

            {/* Prompt */}
            <p
              aria-hidden="true"
              className="tip-label pointer-events-none absolute -translate-x-1/2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition-opacity duration-300"
              style={{
                left: idleBag.x,
                top: idleBag.y + bagBox.vh / 2 + 18,
                opacity: phase === 'idle' ? undefined : 0,
                visibility: phase === 'idle' ? 'visible' : 'hidden',
              }}
            >
              Tip it over
            </p>

            {/* Projects and pages first, then the mat and easter eggs (keyboard order) */}
            {projects.map((it) => renderItem(it, items.indexOf(it)))}
            {rest.map((it) => renderItem(it, items.indexOf(it)))}

            {/* Tags */}
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 56 }}>
              <AnimatePresence>
                {tagFor && !contactOpen && phase !== 'opening' && (
                  <Tag key={tagFor.id} id={`tag-${tagFor.id}`} anchor={anchorOf(tagFor.id)} layout={layout} calm={calm}>
                    <p className="font-hand text-[22px] leading-[1.1]">{tagFor.tagPersonal}</p>
                    {tagFor.tagProject && <p className="mt-2 text-[13px] leading-snug">{tagFor.tagProject}</p>}
                    {(tagFor.statusLabel || tagFor.status) && (
                      <p className="mt-2.5">
                        <span className="inline-block rounded-full border border-[var(--muted)] px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">
                          {tagFor.statusLabel ?? tagFor.status}
                        </span>
                      </p>
                    )}
                    {tagFor.kind === 'toggle' && (
                      <p className="mt-2.5">
                        <span className="inline-block rounded-full border border-[var(--muted)] px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">
                          Calm mode · {calm ? 'on' : 'off'}
                        </span>
                      </p>
                    )}
                  </Tag>
                )}
                {eggItem && (
                  <Tag key={`egg-${eggItem.id}`} id={`tag-${eggItem.id}`} anchor={anchorOf(eggItem.id)} layout={layout} calm={calm} width={220}>
                    <p className="font-hand text-[22px] leading-[1.15]">{eggItem.easterEgg?.text}</p>
                  </Tag>
                )}
                {contactOpen && (
                  <Tag key="contact" id="tag-phone" anchor={anchorOf('phone')} layout={layout} calm={calm} width={250} role="dialog" label="Contact">
                    <div ref={panelRef} data-panel className="pointer-events-auto">
                      <p className="font-hand text-[26px] leading-none">Say hi.</p>
                      <ul className="mt-3 space-y-1 text-[14px]">
                        <li>
                          <a className="underline underline-offset-4" href={`mailto:${contact.email}`}>
                            {contact.email}
                          </a>
                        </li>
                        <li>
                          <a className="underline underline-offset-4" href={contact.linkedin} target="_blank" rel="noreferrer">
                            LinkedIn
                          </a>
                        </li>
                        <li>
                          <a className="underline underline-offset-4" href={contact.behance} target="_blank" rel="noreferrer">
                            Behance
                          </a>
                        </li>
                      </ul>
                    </div>
                  </Tag>
                )}
              </AnimatePresence>
            </div>

            {/* Pack it back */}
            {!calm && (
              <button
                type="button"
                onClick={pack}
                tabIndex={settled ? 0 : -1}
                className="absolute right-0 top-[calc(100%+8px)] rounded-full border border-line bg-tag px-4 py-2.5 text-[14px] font-medium shadow-[0_4px_14px_rgb(var(--shadow-rgb)/0.14)] transition-opacity duration-300 hover:shadow-[0_6px_18px_rgb(var(--shadow-rgb)/0.2)] sm:bottom-4 sm:right-4 sm:top-auto"
                style={{ zIndex: 55, opacity: settled ? 1 : 0, pointerEvents: settled ? 'auto' : 'none' }}
                aria-hidden={!settled}
              >
                Pack it back
              </button>
            )}
          </>
        )}
        <p className="sr-only" aria-live="polite">
          {eggItem?.easterEgg?.text ?? ''}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-floor transition-opacity duration-[400ms]"
        style={{ zIndex: 60, opacity: leaving ? 1 : 0 }}
      />
    </LazyMotion>
  );
}
