"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

export type Anchor = { x: number; y: number; w: number; h: number }; // stage px, centre + size

type Props = {
  anchor: Anchor;
  stage: { w: number; h: number; mobile: boolean };
  personal: string;
  project?: string;
  status?: string;
  calm: boolean;
};

const GAP = 14;
const EDGE = 8;

/**
 * The paper tag that hangs off an item on a string. It sits beside the item on
 * desktop (flipping sides near the right edge) and below it on phones, and is
 * always kept inside the stage.
 */
export function Tag({ anchor, stage, personal, project, status, calm }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight });
  }, [personal, project, status, stage.mobile]);

  const tw = size?.w ?? 0;
  const th = size?.h ?? 0;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  let left: number;
  let top: number;
  let hole: { x: number; y: number };
  let from: { x: number; y: number };

  if (stage.mobile) {
    const below = anchor.y + anchor.h / 2 + GAP + th <= stage.h - EDGE;
    left = clamp(anchor.x - tw / 2, EDGE, stage.w - tw - EDGE);
    top = below ? anchor.y + anchor.h / 2 + GAP : anchor.y - anchor.h / 2 - GAP - th;
    top = clamp(top, EDGE, stage.h - th - EDGE);
    hole = { x: clamp(anchor.x, left + 18, left + tw - 18), y: below ? top + 12 : top + th - 12 };
    from = { x: anchor.x, y: below ? anchor.y + anchor.h * 0.35 : anchor.y - anchor.h * 0.35 };
  } else {
    const right = anchor.x + anchor.w / 2 + GAP + tw <= stage.w - EDGE && anchor.x < stage.w * 0.66;
    left = right ? anchor.x + anchor.w / 2 + GAP : anchor.x - anchor.w / 2 - GAP - tw;
    left = clamp(left, EDGE, stage.w - tw - EDGE);
    top = clamp(anchor.y - anchor.h / 2 - 4, EDGE, stage.h - th - EDGE);
    hole = { x: right ? left + 18 : left + tw - 18, y: top + 16 };
    from = { x: anchor.x + (right ? anchor.w * 0.3 : -anchor.w * 0.3), y: anchor.y - anchor.h * 0.25 };
  }

  const ready = size !== null;
  const origin = `${hole.x - left}px ${hole.y - top}px`;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-50">
      {ready && (
        <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <motion.path
            d={`M${from.x} ${from.y} Q${(from.x + hole.x) / 2} ${Math.max(from.y, hole.y) + 18} ${hole.x} ${hole.y}`}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.2"
            initial={{ pathLength: calm ? 1 : 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: calm ? 0.15 : 0.18 }}
          />
        </svg>
      )}
      <motion.div
        ref={ref}
        className="absolute w-[min(250px,calc(100%-16px))] rounded-[6px] bg-tag px-4 pb-3 pt-6 text-text shadow-[0_10px_24px_rgb(var(--shadow))]"
        style={{ left, top, transformOrigin: origin, visibility: ready ? "visible" : "hidden" }}
        initial={calm ? { opacity: 0 } : { opacity: 0, rotate: -12 }}
        animate={calm ? { opacity: 1 } : { opacity: 1, rotate: 3 }}
        transition={calm ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 11, mass: 0.7 }}
      >
        <span
          className="absolute h-2.5 w-2.5 rounded-full border border-line bg-floor"
          style={{ left: hole.x - left - 5, top: hole.y - top - 5 }}
        />
        <p className="font-hand text-[1.45rem] leading-[1.1]">{personal}</p>
        {project && <p className="mt-2 text-[0.82rem] leading-snug text-muted">{project}</p>}
        {status && (
          <p className="mt-2.5 inline-block rounded-full border border-line px-2 py-0.5 font-mono text-[0.64rem] uppercase tracking-[0.08em]">
            {status}
          </p>
        )}
      </motion.div>
    </div>
  );
}
