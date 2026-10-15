"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  accessibleName,
  bag,
  destination,
  items,
  spillItems,
  statusText,
  USE_PHOTOS,
  type Item,
  type Placement,
} from "@/data/items";
import { easeInCubic, easeOutCubic, lerp, tween, type Cancel } from "@/lib/motion";
import { openContact, setCalm, useCalm } from "@/lib/prefs";
import type { Pose } from "@/lib/spill";
import { BagArt, ItemArt, TrekPhoto } from "./art/ItemArt";
import { Tag, type Anchor } from "./Tag";

type Phase = "idle" | "tipping" | "settled" | "packing" | "leaving";
type Dims = { w: number; h: number; mobile: boolean };

const DESKTOP_REF = 1200; // item sizes in items.ts are px at this stage width
const MOBILE_REF = 580;
const TIP_MS = 500;
const SPILL_DELAY = 200; // items start pouring while the bag is still turning
const yogaMat = items.find((i) => i.strappedToBag)!;

const loadMatter = () => import("matter-js").then((m) => m.default ?? m);

export function BagStage() {
  const router = useRouter();
  const calm = useCalm();
  const stageRef = useRef<HTMLDivElement>(null);
  const bagBtnRef = useRef<HTMLButtonElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const poses = useRef(new Map<string, Pose>());
  const cancels = useRef<Cancel[]>([]);
  const dragRef = useRef<{
    id: string;
    pointer: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const lastPointer = useRef<string>("mouse");
  const autoTipped = useRef(false);
  const focusAfterSettle = useRef(false);

  const [dims, setDims] = useState<Dims | null>(null);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const calmRef = useRef(calm);
  calmRef.current = calm;
  const [bagTipped, setBagTipped] = useState(false);
  const [animateBag, setAnimateBag] = useState(false);
  const [wobble, setWobble] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [, setPoseTick] = useState(0);

  // ── Measuring ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      setDims((d) =>
        d && Math.abs(d.w - r.width) < 1 && Math.abs(d.h - r.height) < 1
          ? d
          : { w: r.width, h: r.height, mobile: r.height > r.width },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Warm up matter-js after first paint so the first tip has no wait.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    idle(() => void loadMatter());
  }, []);

  const layout = useMemo(() => {
    if (!dims) return null;
    const scale = dims.mobile ? dims.w / MOBILE_REF : dims.w / DESKTOP_REF;
    const minHit = dims.mobile ? 64 : 44;
    const mode = dims.mobile ? "mobile" : "desktop";
    const toPx = (p: Placement) => ({ x: (p.x / 100) * dims.w, y: (p.y / 100) * dims.h, rot: p.rot });
    const box = (i: Item) => {
      const w = i.size.w * scale;
      const h = i.size.h * scale;
      return { w, h, bw: Math.max(w, minHit), bh: Math.max(h, minHit) };
    };
    const bagW = bag.size.w * scale;
    const bagH = bag.size.h * scale;
    const bagIdle = toPx(bag.idle[mode]);
    const bagTip = toPx(bag.target[mode]);
    // The opening is at the top of the upright bag; rotate that point with the bag.
    const rad = (bagTip.rot * Math.PI) / 180;
    const lip = bagH * 0.4;
    const mouth = { x: bagTip.x + lip * Math.sin(rad), y: bagTip.y - lip * Math.cos(rad) };
    const targets = new Map(spillItems.map((i) => [i.id, toPx(i.target[mode])]));
    return { scale, box, bagW, bagH, bagIdle, bagTip, mouth, targets };
  }, [dims]);

  // ── Writing poses to the DOM (no React render per frame) ─────────────
  const write = useCallback(
    (id: string, pose: Pose) => {
      poses.current.set(id, pose);
      const el = els.current.get(id);
      const item = spillItems.find((i) => i.id === id);
      if (!el || !item || !layout) return;
      const { bw, bh } = layout.box(item);
      el.style.transform = `translate3d(${pose.x - bw / 2}px, ${pose.y - bh / 2}px, 0) rotate(${pose.rot}deg) scale(${pose.scale})`;
      el.style.opacity = String(pose.opacity);
    },
    [layout],
  );

  const placeAll = useCallback(
    (where: "targets" | "mouth") => {
      if (!layout) return;
      for (const item of spillItems) {
        const t = layout.targets.get(item.id)!;
        write(
          item.id,
          where === "targets"
            ? { ...t, scale: 1, opacity: 1 }
            : { x: layout.mouth.x, y: layout.mouth.y, rot: 0, scale: 0.5, opacity: 0 },
        );
      }
    },
    [layout, write],
  );

  const stopAll = useCallback(() => {
    cancels.current.forEach((c) => c());
    cancels.current = [];
  }, []);

  const settleNow = useCallback(() => {
    stopAll();
    setAnimateBag(false);
    setBagTipped(true);
    placeAll("targets");
    setPhase("settled");
  }, [placeAll, setPhase, stopAll]);

  const finishSettle = useCallback(() => {
    setPhase("settled");
    setAnnounce(`The bag tipped over. ${spillItems.length} things are on the floor.`);
  }, [setPhase]);

  // A keyboard tip moves focus to the first project once the items are focusable.
  useEffect(() => {
    if (phase !== "settled" || !focusAfterSettle.current) return;
    focusAfterSettle.current = false;
    els.current.get(spillItems[0].id)?.focus({ preventScroll: true });
  }, [phase]);

  // ── Tip ──────────────────────────────────────────────────────────────
  const tip = useCallback(async () => {
    if (!layout || phaseRef.current !== "idle") return;
    autoTipped.current = true;
    setWobble(false);
    if (document.activeElement === bagBtnRef.current) focusAfterSettle.current = true;

    if (calm) {
      settleNow();
      finishSettle();
      return;
    }

    setPhase("tipping");
    setAnimateBag(true);
    setBagTipped(true);
    placeAll("mouth");

    const Matter = await loadMatter();
    const { spill } = await import("@/lib/spill");
    let cancelSpill: Cancel = () => {};
    const timer = window.setTimeout(() => {
      cancelSpill = spill({
        Matter,
        mouth: layout.mouth,
        bounds: { w: dims!.w, h: dims!.h },
        bodies: spillItems.map((i) => {
          const { w, h } = layout.box(i);
          return { id: i.id, w, h, to: layout.targets.get(i.id)! };
        }),
        onFrame: write,
        onDone: finishSettle,
      });
    }, SPILL_DELAY);
    cancels.current.push(() => {
      window.clearTimeout(timer);
      cancelSpill();
    });
  }, [calm, dims, finishSettle, layout, placeAll, setPhase, settleNow, write]);

  // ── Pack it back ─────────────────────────────────────────────────────
  const pack = useCallback(() => {
    if (!layout || phaseRef.current !== "settled") return;
    setPinnedId(null);
    setHoverId(null);
    setFocusId(null);
    const done = () => {
      setPhase("idle");
      setAnnounce("Everything is back in the bag.");
      requestAnimationFrame(() => bagBtnRef.current?.focus({ preventScroll: true }));
    };
    if (calm) {
      placeAll("mouth");
      setAnimateBag(false);
      setBagTipped(false);
      done();
      return;
    }
    setPhase("packing");
    const order = [...spillItems].reverse();
    let remaining = order.length;
    order.forEach((item, i) => {
      const from = poses.current.get(item.id) ?? { ...layout.targets.get(item.id)!, scale: 1, opacity: 1 };
      cancels.current.push(
        tween(
          460,
          (t) => {
            const e = easeInCubic(t);
            write(item.id, {
              x: lerp(from.x, layout.mouth.x, e),
              y: lerp(from.y, layout.mouth.y, e) - Math.sin(t * Math.PI) * 30,
              rot: lerp(from.rot, from.rot + 90, e),
              scale: lerp(1, 0.45, e),
              opacity: t > 0.85 ? (1 - t) / 0.15 : 1,
            });
          },
          () => {
            remaining -= 1;
            if (remaining === 0) {
              setAnimateBag(true);
              setBagTipped(false);
              const t = window.setTimeout(done, 420);
              cancels.current.push(() => window.clearTimeout(t));
            }
          },
          i * 22,
        ),
      );
    });
  }, [calm, layout, placeAll, setPhase, write]);

  // ── Calm mode / resize ───────────────────────────────────────────────
  // On first measure and on resize, put things on their marks (finishing any
  // animation). Calm mode means the bag is already tipped and laid out.
  useLayoutEffect(() => {
    if (!layout) return;
    const p = phaseRef.current;
    if (p === "leaving") return;
    if (calmRef.current || p === "settled") settleNow();
    else if (p === "idle") placeAll("mouth");
    else {
      settleNow();
      finishSettle();
    }
    setPoseTick((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Switching calm mode on (yoga mat or system setting) snaps everything still.
  useLayoutEffect(() => {
    if (!calm || !layout) return;
    const p = phaseRef.current;
    if (p !== "leaving" && p !== "settled") settleNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calm]);

  useEffect(() => stopAll, [stopAll]);

  // ── Idle hint: one wobble after 3 s ──────────────────────────────────
  useEffect(() => {
    if (phase !== "idle" || calm || !layout) return;
    const t = window.setTimeout(() => setWobble(true), 3000);
    return () => window.clearTimeout(t);
  }, [phase, calm, layout]);

  // ── First scroll attempt tips the bag (never blocks the scroll) ──────
  useEffect(() => {
    if (phase !== "idle" || autoTipped.current) return;
    const onScroll = (e: Event) => {
      if (autoTipped.current) return;
      if (e.type === "wheel" && (e as WheelEvent).deltaY <= 0) return;
      const r = stageRef.current?.getBoundingClientRect();
      if (r && r.bottom > 0 && r.top < window.innerHeight) void tip();
    };
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [phase, tip]);

  // Coming back with the browser's back button can restore this page from cache.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setLeaving(false);
        if (phaseRef.current === "leaving") settleNow();
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [settleNow]);

  // ── Escape closes tags ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPinnedId(null);
      setHoverId(null);
      setFocusId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Tap or click outside an item un-pins its tag.
  useEffect(() => {
    if (!pinnedId) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-thing]")) setPinnedId(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [pinnedId]);

  // ── Opening an item ──────────────────────────────────────────────────
  const go = useCallback(
    (item: Item) => {
      const href = destination(item);
      if (!href || !layout || !dims) return;
      const navigate = () => {
        if (href.endsWith(".pdf")) window.location.assign(href);
        else router.push(href);
      };
      setPinnedId(null);
      setHoverId(null);
      setFocusId(null);
      if (calm) {
        navigate();
        return;
      }
      setPhase("leaving");
      if (!href.endsWith(".pdf")) router.prefetch(href);
      const from = poses.current.get(item.id)!;
      const el = els.current.get(item.id);
      if (el) el.style.zIndex = "60";
      cancels.current.push(
        tween(
          360,
          (t) => {
            const e = easeOutCubic(t);
            write(item.id, {
              x: lerp(from.x, dims.w / 2, e),
              y: lerp(from.y, dims.h / 2, e),
              rot: lerp(from.rot, 0, e),
              scale: lerp(1, 1.6, e),
              opacity: 1,
            });
          },
          () => {
            setLeaving(true);
            const t = window.setTimeout(() => {
              navigate();
              if (href.endsWith(".pdf")) {
                // A PDF may open in place or download; either way, put the item back.
                window.setTimeout(() => {
                  if (el) el.style.zIndex = "";
                  setLeaving(false);
                  placeAll("targets");
                  setPhase("settled");
                }, 600);
              }
            }, 400);
            cancels.current.push(() => window.clearTimeout(t));
          },
        ),
      );
    },
    [calm, dims, layout, placeAll, router, setPhase, write],
  );

  const onItemClick = (e: React.MouseEvent, item: Item) => {
    if (suppressClick.current) {
      e.preventDefault();
      suppressClick.current = false;
      return;
    }
    if (phase !== "settled") {
      e.preventDefault();
      return;
    }
    // Let cmd/ctrl/shift-click open in a new tab as usual.
    if (item.href && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;

    // Touch: the first tap shows the tag, the second one opens.
    const isTap = e.detail > 0 && lastPointer.current !== "mouse";
    if (isTap && pinnedId !== item.id) {
      e.preventDefault();
      setPinnedId(item.id);
      return;
    }

    if (item.href) {
      e.preventDefault();
      go(item);
    } else if (item.id === "phone") {
      openContact();
    } else if (item.kind === "easter-egg") {
      setPinnedId(item.id);
      if (item.easterEgg?.image) {
        setFlipped((s) => {
          const next = new Set(s);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      }
    }
  };

  // ── Dragging items around after they settle ──────────────────────────
  const onPointerDown = (e: React.PointerEvent, item: Item) => {
    lastPointer.current = e.pointerType;
    if (phase !== "settled" || e.button !== 0) return;
    const pose = poses.current.get(item.id);
    if (!pose) return;
    dragRef.current = {
      id: item.id,
      pointer: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: pose.x,
      oy: pose.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointer !== e.pointerId || !dims) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      setPinnedId(null);
    }
    const pose = poses.current.get(d.id)!;
    write(d.id, {
      ...pose,
      x: Math.max(0, Math.min(dims.w, d.ox + dx)),
      y: Math.max(0, Math.min(dims.h, d.oy + dy)),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointer !== e.pointerId) return;
    dragRef.current = null;
    if (d.moved) {
      suppressClick.current = true;
      // The click (if any) fires right after pointerup; clear the flag after it.
      window.setTimeout(() => (suppressClick.current = false), 0);
      setDragging(false);
      setPoseTick((n) => n + 1);
    }
  };

  // ── Bag gestures: click, or drag sideways ────────────────────────────
  const bagDrag = useRef<{ x: number; id: number } | null>(null);
  const onBagPointerDown = (e: React.PointerEvent) => {
    lastPointer.current = e.pointerType;
    bagDrag.current = { x: e.clientX, id: e.pointerId };
  };
  const onBagPointerMove = (e: React.PointerEvent) => {
    const d = bagDrag.current;
    if (d && d.id === e.pointerId && Math.abs(e.clientX - d.x) > 28) {
      bagDrag.current = null;
      void tip();
    }
  };

  // ── Rendering ────────────────────────────────────────────────────────
  const shownId = dragging || phase !== "settled" ? null : (hoverId ?? focusId ?? pinnedId);
  const shownItem = shownId ? items.find((i) => i.id === shownId) : undefined;

  const bagPose = layout ? (bagTipped ? layout.bagTip : layout.bagIdle) : null;
  const bagTransform = (pose: { x: number; y: number; rot: number }) =>
    `translate3d(${pose.x - layout!.bagW / 2}px, ${pose.y - layout!.bagH / 2}px, 0) rotate(${pose.rot}deg)`;
  const bagTransition = animateBag && !calm ? `transform ${TIP_MS}ms cubic-bezier(0.34, 1.3, 0.64, 1)` : "none";

  // The yoga mat rides on the left side of the bag.
  const mat = layout
    ? (() => {
        const w = yogaMat.size.w * layout.scale;
        const h = yogaMat.size.h * layout.scale;
        const ox = -layout.bagW / 2 + w * 0.15;
        const oy = layout.bagH * 0.06;
        return { w, h, left: layout.bagW / 2 + ox - w / 2, top: layout.bagH / 2 + oy - h / 2, ox, oy };
      })()
    : null;

  const anchorFor = (item: Item): Anchor | null => {
    if (!layout) return null;
    if (item.strappedToBag && mat && bagPose) {
      const rad = (bagPose.rot * Math.PI) / 180;
      const x = bagPose.x + mat.ox * Math.cos(rad) - mat.oy * Math.sin(rad);
      const y = bagPose.y + mat.ox * Math.sin(rad) + mat.oy * Math.cos(rad);
      const sideways = Math.abs(Math.sin(rad)) > 0.5;
      return { x, y, w: sideways ? mat.h : mat.w, h: sideways ? mat.w : mat.h };
    }
    const p = poses.current.get(item.id);
    if (!p) return null;
    const { w, h } = layout.box(item);
    const sideways = Math.abs(Math.sin((p.rot * Math.PI) / 180)) > 0.7;
    return { x: p.x, y: p.y, w: sideways ? h : w, h: sideways ? w : h };
  };

  const matShown = hoverId === yogaMat.id || focusId === yogaMat.id;
  const anchor = shownItem ? anchorFor(shownItem) : matShown && phase === "idle" ? anchorFor(yogaMat) : null;
  const tagItem = shownItem ?? (matShown && phase === "idle" ? yogaMat : undefined);
  const settledish = phase === "settled";

  return (
    <div className="relative">
      <div
        ref={stageRef}
        className="stage"
        data-phase={phase}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {layout && bagPose && (
          <>
            {/* The bag */}
            <div
              className="absolute left-0 top-0 z-10"
              style={{ width: layout.bagW, height: layout.bagH, transform: bagTransform(bagPose), transition: bagTransition }}
            >
              <div className={wobble && phase === "idle" ? "wobble h-full w-full" : "h-full w-full"}>
                <button
                  ref={bagBtnRef}
                  type="button"
                  className="thing !relative h-full w-full touch-pan-y"
                  aria-label="Tote bag: tip it over to see my work"
                  disabled={phase !== "idle"}
                  tabIndex={phase === "idle" ? 0 : -1}
                  aria-hidden={phase !== "idle" || undefined}
                  style={{ cursor: phase === "idle" ? "pointer" : "default" }}
                  onClick={() => void tip()}
                  onPointerDown={onBagPointerDown}
                  onPointerMove={onBagPointerMove}
                  onPointerUp={() => (bagDrag.current = null)}
                >
                  <span className="thing-visual">
                    <BagArt />
                  </span>
                </button>
              </div>
            </div>

            {phase === "idle" && (
              <p
                aria-hidden="true"
                className="pulse-soft pointer-events-none absolute z-20 -translate-x-1/2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-text"
                style={{ left: layout.bagIdle.x, top: layout.bagIdle.y + layout.bagH / 2 + 14 }}
              >
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
                Tip it over
              </p>
            )}
          </>
        )}

        {/* Things on the floor */}
        <div inert={!settledish} aria-hidden={!settledish || undefined}>
          {layout &&
            spillItems.map((item) => {
              const { w, h, bw, bh } = layout.box(item);
              const isFlipped = flipped.has(item.id);
              const visual = (
                <span className="thing-visual" style={{ width: w, height: h }}>
                  {isFlipped ? (
                    <motion.span
                      key="photo"
                      className="block h-full w-full"
                      initial={calm ? false : { rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <TrekPhoto />
                    </motion.span>
                  ) : USE_PHOTOS ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" width={w} height={h} draggable={false} className="h-full w-full object-contain" />
                  ) : (
                    <ItemArt id={item.id} w={item.size.w} h={item.size.h} />
                  )}
                </span>
              );
              const common = {
                ref: (el: HTMLElement | null) => {
                  if (el) els.current.set(item.id, el);
                  else els.current.delete(item.id);
                },
                "data-thing": item.id,
                "data-active": shownId === item.id ? "true" : undefined,
                "data-dragging": dragging && dragRef.current?.id === item.id ? "true" : undefined,
                className: "thing",
                style: { width: bw, height: bh, opacity: 0, touchAction: dims?.mobile ? "pan-y" : "none" },
                "aria-label": accessibleName(item),
                "aria-describedby": `desc-${item.id}`,
                onPointerDown: (e: React.PointerEvent) => onPointerDown(e, item),
                onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setHoverId(item.id),
                onPointerLeave: () => setHoverId((h) => (h === item.id ? null : h)),
                onFocus: () => setFocusId(item.id),
                onBlur: () => setFocusId((f) => (f === item.id ? null : f)),
                onClick: (e: React.MouseEvent) => onItemClick(e, item),
                onDragStart: (e: React.DragEvent) => e.preventDefault(),
              };
              const href = destination(item);
              return href ? (
                <a key={item.id} href={href} {...common}>
                  {visual}
                </a>
              ) : (
                <button key={item.id} type="button" aria-pressed={item.kind === "easter-egg" ? pinnedId === item.id : undefined} {...common}>
                  {visual}
                </button>
              );
            })}
        </div>

        {/* The yoga mat, strapped to the bag (after the pages in tab order) */}
        {layout && bagPose && mat && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-20"
            style={{ width: layout.bagW, height: layout.bagH, transform: bagTransform(bagPose), transition: bagTransition }}
          >
            <button
              type="button"
              data-thing={yogaMat.id}
              className="thing pointer-events-auto"
              style={{ width: mat.w, height: mat.h, transform: `translate(${mat.left}px, ${mat.top}px)` }}
              aria-label={`${yogaMat.label}: ${yogaMat.a11y}`}
              aria-pressed={calm}
              aria-describedby={`desc-${yogaMat.id}`}
              data-active={matShown ? "true" : undefined}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHoverId(yogaMat.id)}
              onPointerLeave={() => setHoverId((h) => (h === yogaMat.id ? null : h))}
              onFocus={() => setFocusId(yogaMat.id)}
              onBlur={() => setFocusId((f) => (f === yogaMat.id ? null : f))}
              onClick={() => setCalm(!calm)}
            >
              <span className="thing-visual">
                <ItemArt id={yogaMat.id} w={yogaMat.size.w} h={yogaMat.size.h} />
              </span>
            </button>
          </div>
        )}

        {/* Tags */}
        <AnimatePresence>
          {tagItem && anchor && dims && (
            <Tag
              key={tagItem.id}
              anchor={anchor}
              stage={dims}
              personal={tagItem.tagPersonal}
              project={tagItem.kind === "project" ? tagItem.tagProject : undefined}
              status={tagItem.kind === "toggle" ? `Calm mode · ${calm ? "on" : "off"}` : statusText(tagItem)}
              calm={calm}
            />
          )}
        </AnimatePresence>

        {/* Pack it back */}
        {settledish && (
          <button
            type="button"
            onClick={pack}
            className="absolute bottom-3 right-3 z-30 rounded-full border border-text/25 bg-tag px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-text shadow-sm transition-colors hover:border-accent-ink hover:text-accent-ink"
          >
            Pack it back
          </button>
        )}
      </div>

      {/* Tag text for screen readers, always present */}
      <div className="sr-only">
        {items.map((item) => (
          <p key={item.id} id={`desc-${item.id}`}>
            {[item.tagPersonal, item.kind === "project" ? item.tagProject : undefined].filter(Boolean).join(" ")}
          </p>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Crossfade to the next page */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100] bg-floor transition-opacity duration-[400ms] ease-out"
        style={{ opacity: leaving ? 1 : 0 }}
      />
    </div>
  );
}
