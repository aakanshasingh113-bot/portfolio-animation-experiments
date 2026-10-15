'use client';

import { m } from 'framer-motion';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Layout } from '@/lib/geometry';

export type Anchor = { x: number; y: number; bw: number; bh: number };

type Props = {
  id: string;
  anchor: Anchor;
  layout: Layout;
  calm: boolean;
  width?: number;
  children: ReactNode;
  role?: string;
  label?: string;
};

const clamp = (v: number, lo: number, hi: number) => (lo > hi ? lo : Math.min(hi, Math.max(lo, v)));

/** Paper tag on a string. Positions itself next to the item and never leaves the stage. */
export function Tag({ id, anchor, layout, calm, width = 236, children, role, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(110);

  useLayoutEffect(() => {
    if (ref.current && ref.current.offsetHeight !== h) setH(ref.current.offsetHeight);
  });

  const W = Math.min(width, layout.w - 16);
  const gap = 24;
  let left: number;
  let top: number;
  let hole: { x: number; y: number };
  let holeAtBottom = false;

  if (!layout.mobile) {
    left = anchor.x + anchor.bw / 2 + gap;
    let side: 'right' | 'left' = 'right';
    if (left + W > layout.w - 8) {
      left = anchor.x - anchor.bw / 2 - gap - W;
      side = 'left';
    }
    left = clamp(left, 8, layout.w - W - 8);
    top = clamp(anchor.y - anchor.bh / 2 + 4, 8, layout.h - h - 8);
    hole = { x: side === 'right' ? left + 20 : left + W - 20, y: top + 18 };
  } else {
    left = clamp(anchor.x - W / 2, 8, layout.w - W - 8);
    top = anchor.y + anchor.bh / 2 + 16;
    const holeX = clamp(anchor.x, left + 20, left + W - 20);
    hole = { x: holeX, y: top + 18 };
    if (top + h > layout.h - 8) {
      top = Math.max(8, anchor.y - anchor.bh / 2 - 16 - h);
      hole = { x: holeX, y: top + h - 18 };
      holeAtBottom = true;
    }
  }

  const attach = {
    x: clamp(hole.x, anchor.x - anchor.bw / 2 + 10, anchor.x + anchor.bw / 2 - 10),
    y: clamp(hole.y, anchor.y - anchor.bh / 2 + 10, anchor.y + anchor.bh / 2 - 10),
  };

  return (
    <>
      <m.svg
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        width={layout.w}
        height={layout.h}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <line x1={attach.x} y1={attach.y} x2={hole.x} y2={hole.y} stroke="var(--muted)" strokeWidth="1.2" />
        <circle cx={attach.x} cy={attach.y} r="2" fill="var(--muted)" />
      </m.svg>
      <m.div
        ref={ref}
        id={id}
        role={role}
        aria-label={label}
        className="tag-shadow absolute"
        style={{ left, top, width: W, transformOrigin: `${hole.x - left}px ${hole.y - top}px` }}
        initial={{ rotate: calm ? 3 : -12, opacity: 0 }}
        animate={{ rotate: 3, opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={
          calm
            ? { duration: 0.2 }
            : { rotate: { type: 'spring', stiffness: 240, damping: 9 }, opacity: { duration: 0.12 } }
        }
      >
        <div className={`tag-paper relative px-4 ${holeAtBottom ? 'pb-8 pt-3.5' : 'pb-3.5 pt-8'}`}>
          <span
            className="absolute size-2.5 rounded-full border-[1.5px] border-[var(--muted)] bg-floor"
            style={{ left: hole.x - left - 5, top: hole.y - top - 5 }}
            aria-hidden="true"
          />
          {children}
        </div>
      </m.div>
    </>
  );
}
