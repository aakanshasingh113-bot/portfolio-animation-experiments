/*
 * Canvas 2D presentation. Reads game state; never writes to it.
 * Logical view is 520 x 650; physics stays in tray-local units.
 */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});

  const VW = 520, VH = 650;
  const C = {
    cream: '#FFF3D8', cherry: '#C83C32', butter: '#EDC96B', espresso: '#332921',
    mint: '#8FAF9A', pink: '#DFA5A0',
    cherryDark: '#93291F', creamShade: '#EADBB9', coffee: '#5B3722', crema: '#B9814E',
  };
  const FONT = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';
  const TRAY = { cx: 260, cy: 470, k: 1.1, KZ: 0.6, KY: 0.8, D: 700 };
  const TILE_H = 1300;
  const TRAVEL_PX = 92; // scenery pixels per simulated second
  const DEST_Y = 318;  // where the destination table stops, just beyond the tray
  const CUP = { R: 21, Rb: 15.5, H: 31 };
  const CUP_STYLES = [
    { body: C.cream, stripe: C.cherry, kind: 'bands', latte: true },
    { body: C.mint, stripe: C.cream, kind: 'vertical' },
    { body: C.butter, stripe: C.espresso, kind: 'pin', latte: true },
    { body: C.pink, stripe: C.cream, kind: 'wide' },
    { body: C.cream, stripe: C.mint, kind: 'vertical', latte: true },
  ];
  const SKIN = ['#F1C9A5', '#D9A27A', '#B57A55', '#8A5A3C', '#E8B896', '#C98F68'];
  const HAIR = ['#332921', '#5B3A29', '#C9A04E', '#8C3B2A', '#9A8F86', '#1F1813'];
  const SHIRT = [C.mint, C.pink, C.butter, C.cherry, '#6F8C7B', C.cream];

  function hash(a, b) {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) * (1 - t); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function makeRng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /** Slightly irregular ellipse path: the illustrated outline. */
  function wobEllipse(ctx, cx, cy, rx, ry, seed, amt, rot) {
    const n = 26;
    const cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const th = (i % n) / n * Math.PI * 2;
      const j = 1 + (hash(seed, i % n) - 0.5) * (amt == null ? 0.04 : amt);
      const x = Math.cos(th) * rx * j, y = Math.sin(th) * ry * j;
      const px = cx + x * cr - y * sr, py = cy + x * sr + y * cr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function polyPath(ctx, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }

  function roundRectPts(hw, hd, r, per) {
    const pts = [];
    const corners = [[hw - r, hd - r, 0], [-hw + r, hd - r, Math.PI / 2], [-hw + r, -hd + r, Math.PI], [hw - r, -hd + r, Math.PI * 1.5]];
    for (const [cx, cz, a0] of corners) {
      for (let i = 0; i <= per; i++) {
        const a = a0 + (i / per) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
      }
    }
    return pts;
  }

  // ---------------------------------------------------------------- projector
  function trayProjector(angle, offX, offY) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const { cx, cy, k, KZ, KY, D } = TRAY;
    return function (x, y, z) {
      const X = x * ca + y * sa;
      const Y = -x * sa + y * ca;
      const persp = D / (D - Y);
      return [cx + (X + offX) * k * persp, cy + ((z * KZ - Y * KY) * k + offY) * persp];
    };
  }
  function flatProjector(sx, sy, sc) {
    const { k, KZ, KY } = TRAY;
    return (x, y, z) => [sx + x * k * sc, sy + (z * KZ - y * KY) * k * sc];
  }

  // ---------------------------------------------------------------- cups
  function ring(P, y, rad, n, seed, jit) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      const j = 1 + (hash(seed, i) - 0.5) * (jit || 0);
      pts.push(P(Math.cos(th) * rad * j, y, Math.sin(th) * rad * j));
    }
    return pts;
  }
  function frontArc(P, y, rad, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const th = Math.PI - (i / n) * Math.PI;
      pts.push(P(Math.cos(th) * rad, y, Math.sin(th) * rad));
    }
    return pts;
  }
  function radAt(y) { return CUP.Rb + (CUP.R - CUP.Rb) * (y / CUP.H); }

  function drawCup(ctx, P, styleIdx, cup, opts) {
    opts = opts || {};
    const st = CUP_STYLES[styleIdx % CUP_STYLES.length];
    const { R, Rb, H } = CUP;
    const seed = styleIdx * 17 + 3;
    const hs = styleIdx % 2 === 0 ? 1 : -1; // handle side
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // Handle (behind the body edge)
    const h1 = P(hs * R * 0.9, H * 0.8, 0), h2 = P(hs * (R + 10), H * 0.86, 0),
      h3 = P(hs * (R + 10), H * 0.18, 0), h4 = P(hs * Rb * 1.02, H * 0.2, 0);
    ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.bezierCurveTo(h2[0], h2[1], h3[0], h3[1], h4[0], h4[1]);
    ctx.strokeStyle = C.espresso; ctx.lineWidth = 6.4; ctx.stroke();
    ctx.strokeStyle = st.body; ctx.lineWidth = 3.6; ctx.stroke();

    // Body: base front arc up to rim front arc
    const base = frontArc(P, 0, Rb, 16), rim = frontArc(P, H, R, 16);
    const body = base.concat(rim.slice().reverse());
    polyPath(ctx, body);
    ctx.fillStyle = st.body; ctx.fill();
    ctx.save();
    polyPath(ctx, body); ctx.clip();
    drawStripes(ctx, P, st);
    const lx = rim[0][0], rx = rim[rim.length - 1][0];
    const g = ctx.createLinearGradient(lx, 0, rx, 0);
    g.addColorStop(0, 'rgba(255,250,235,0.0)');
    g.addColorStop(0.18, 'rgba(255,250,235,0.42)');
    g.addColorStop(0.34, 'rgba(255,250,235,0.0)');
    g.addColorStop(0.78, 'rgba(51,41,33,0.10)');
    g.addColorStop(1, 'rgba(51,41,33,0.28)');
    ctx.fillStyle = g; ctx.fillRect(lx - 4, Math.min(rim[8][1], base[0][1]) - 40, rx - lx + 8, 90);
    ctx.restore();
    polyPath(ctx, body);
    ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.35; ctx.stroke();

    // Rim lip and opening
    const lip = ring(P, H, R, 28, seed, 0.03);
    polyPath(ctx, lip); ctx.fillStyle = '#FFF9EC'; ctx.fill();
    ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.35; ctx.stroke();
    const inner = ring(P, H - 0.4, R * 0.83, 28, seed + 1, 0.02);
    polyPath(ctx, inner); ctx.fillStyle = C.creamShade; ctx.fill();

    // Coffee, clipped to the opening; the surface lags and piles to one side.
    if (!opts.empty) {
      ctx.save();
      polyPath(ctx, inner); ctx.clip();
      const s = cup ? cup.s : 0;
      const dx = clamp(-s * 30, -10, 10);
      const ry = 0; // the cup interior is shallow from above
      const surf = ring((x, y, z) => P(x + dx, y, z + ry), H - 4.5, R * 0.86, 24, seed + 2, 0.015);
      polyPath(ctx, surf); ctx.fillStyle = C.coffee; ctx.fill();
      ctx.strokeStyle = C.crema; ctx.lineWidth = 1.6; ctx.stroke();
      const c0 = P(dx, H - 4.5, 0);
      const pr = P(dx + R, H - 4.5, 0);
      const sc = Math.abs(pr[0] - c0[0]) / R;
      if (st.latte) {
        ctx.save();
        ctx.translate(c0[0], c0[1]);
        ctx.transform(1, 0, -s * 0.9, TRAY.KZ * 1.05, 0, 0);
        ctx.scale(sc, sc);
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.bezierCurveTo(-11, -1, -6, -10, 0, -4);
        ctx.bezierCurveTo(6, -10, 11, -1, 0, 7);
        ctx.fillStyle = '#E8CFA8'; ctx.globalAlpha = 0.85; ctx.fill();
        ctx.restore();
      } else {
        // a soft crema swirl
        ctx.beginPath();
        ctx.ellipse(c0[0] + 1.5 * sc, c0[1] - 0.5, 7 * sc, 3.2 * sc, 0.2, 0.3, Math.PI * 1.6);
        ctx.strokeStyle = 'rgba(214,170,120,0.65)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      // specular glint
      ctx.beginPath();
      ctx.ellipse(c0[0] - 8 * sc, c0[1] - 2.6 * sc, 3 * sc, 1.2 * sc, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,248,230,0.55)'; ctx.fill();
      ctx.restore();
    }
    polyPath(ctx, inner);
    ctx.strokeStyle = 'rgba(51,41,33,0.45)'; ctx.lineWidth = 0.9; ctx.stroke();
  }

  function drawStripes(ctx, P, st) {
    const { H, R } = CUP;
    ctx.fillStyle = st.stripe;
    const band = (y1, y2) => {
      const a = frontArc(P, y1, radAt(y1) + 0.4, 16), b = frontArc(P, y2, radAt(y2) + 0.4, 16);
      polyPath(ctx, a.concat(b.reverse())); ctx.fill();
    };
    if (st.kind === 'bands') { band(6, 10); band(15, 19.5); }
    else if (st.kind === 'wide') { band(10, 21); ctx.fillStyle = C.cherry; band(23.5, 25); }
    else if (st.kind === 'pin') { band(6, 7.4); band(13, 14.4); band(20, 21.4); }
    else if (st.kind === 'vertical') {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const th = Math.PI * (i + 0.5) / n, w = 0.11;
        const pts = [
          P(Math.cos(th - w) * CUP.Rb, 0, Math.sin(th - w) * CUP.Rb),
          P(Math.cos(th + w) * CUP.Rb, 0, Math.sin(th + w) * CUP.Rb),
          P(Math.cos(th + w) * R, H, Math.sin(th + w) * R),
          P(Math.cos(th - w) * R, H, Math.sin(th - w) * R),
        ];
        polyPath(ctx, pts); ctx.fill();
      }
    }
  }

  // ---------------------------------------------------------------- people
  function drawPatron(ctx, x, y, facing, p, look, mood, scale) {
    const s = scale || 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.3;
    // shoulders
    wobEllipse(ctx, 0, 4, 15, 11.5, p.seed, 0.05);
    ctx.fillStyle = p.shirt; ctx.fill();
    if (p.striped) {
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(255,243,216,0.7)'; ctx.lineWidth = 2.2;
      for (let i = -16; i < 18; i += 6) { ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i, 18); ctx.stroke(); }
      ctx.restore();
      wobEllipse(ctx, 0, 4, 15, 11.5, p.seed, 0.05);
    }
    ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.3; ctx.stroke();
    // arm towards the table
    if (p.arm !== false) {
      ctx.beginPath(); ctx.moveTo(facing * 9, 7); ctx.quadraticCurveTo(facing * 18, 14, facing * 25, 9);
      ctx.strokeStyle = C.espresso; ctx.lineWidth = 7.2; ctx.stroke();
      ctx.strokeStyle = p.shirt; ctx.lineWidth = 4.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(facing * 26.5, 8.5, 3.3, 0, Math.PI * 2);
      ctx.fillStyle = p.skin; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.1; ctx.stroke();
    }
    // head
    const hx = facing * 2.5, hy = -5;
    ctx.beginPath(); ctx.arc(hx, hy, 9.6, 0, Math.PI * 2);
    ctx.fillStyle = p.hair; ctx.fill();
    if (p.style === 'bun') { ctx.beginPath(); ctx.arc(hx - facing * 7, hy - 6, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (p.style === 'bob') { ctx.beginPath(); ctx.ellipse(hx - facing * 1.5, hy + 2, 11, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(hx, hy, 9.6, 0, Math.PI * 2);
    ctx.fillStyle = p.hair; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.3; ctx.stroke();
    // face (3/4 towards the lane)
    const fx = hx + facing * 2.6, fy = hy + 1.6;
    wobEllipse(ctx, fx, fy, 7.1, 7.4, p.seed + 5, 0.04);
    ctx.fillStyle = p.skin; ctx.fill();
    ctx.lineWidth = 1; ctx.stroke();
    if (p.style === 'beanie') {
      ctx.beginPath(); ctx.arc(hx, hy - 1, 10, Math.PI * 1.02, Math.PI * 1.98);
      ctx.lineTo(hx + 10, hy - 1); ctx.closePath();
      ctx.fillStyle = p.hat; ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.cream; ctx.fillRect(hx - 9.5, hy - 3.2, 19, 2.2);
    } else {
      // fringe
      ctx.beginPath(); ctx.ellipse(fx - facing * 1.5, fy - 6, 6.5, 2.8, facing * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = p.hair; ctx.fill();
    }
    // eyes follow the tray
    const lx = clamp(look[0], -1, 1) * 1.1, ly = clamp(look[1], -1, 1) * 0.9;
    ctx.fillStyle = C.espresso;
    const e1 = fx - facing * 1.0, e2 = fx + facing * 3.4;
    for (const ex of [e1, e2]) { ctx.beginPath(); ctx.arc(ex + lx, fy - 0.8 + ly, mood === 'shock' ? 1.35 : 1.1, 0, Math.PI * 2); ctx.fill(); }
    if (mood === 'worried' || mood === 'shock') {
      ctx.strokeStyle = C.espresso; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(e1 - 1.6, fy - 4); ctx.lineTo(e1 + 1.2, fy - 4.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e2 - 1.2, fy - 4.8); ctx.lineTo(e2 + 1.6, fy - 4); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(223,120,110,0.55)';
    ctx.beginPath(); ctx.arc(fx + facing * 4.4, fy + 2.4, 1.7, 0, Math.PI * 2); ctx.fill();
    // mouth
    const mx = fx + facing * 1.6, my = fy + 3.6;
    ctx.strokeStyle = C.espresso; ctx.fillStyle = '#7A2E26'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (mood === 'worried') { ctx.ellipse(mx, my, 1.3, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (mood === 'shock' || mood === 'oops') { ctx.ellipse(mx, my + 0.3, 1.9, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (mood === 'happy') { ctx.arc(mx, my - 1, 2.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fill(); }
    else { ctx.arc(mx, my - 1.2, 2, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
    ctx.restore();
  }

  function makePatron(rng, i) {
    const styles = ['short', 'bun', 'bob', 'beanie', 'short'];
    return {
      seed: i * 7 + 1,
      skin: SKIN[Math.floor(rng() * SKIN.length)],
      hair: HAIR[Math.floor(rng() * HAIR.length)],
      shirt: SHIRT[Math.floor(rng() * SHIRT.length)],
      striped: rng() < 0.35,
      style: styles[Math.floor(rng() * styles.length)],
      hat: rng() < 0.5 ? C.cherry : C.mint,
    };
  }

  // ---------------------------------------------------------------- renderer
  class Renderer {
    constructor(canvas, game, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.game = game;
      this.reduced = (opts && opts.reducedMotion) || (() => false);
      this.cssW = VW; this.cssH = VH; this.dpr = 1; this.scale = 1;
      this.tile = null;
      this.time = 0;
      this.particles = [];
      this.stains = [];
      this.sparks = [];
      this.confetti = [];
      this.floaters = [];
      this.impact = null;
      this.lastRun = -1;
      this._buildLayout();
    }

    _buildLayout() {
      const rng = makeRng(20240611);
      this.booths = [];
      this.patrons = [];
      const BL = TILE_H / 4;
      let pi = 0;
      for (const side of [-1, 1]) {
        for (let b = 0; b < 4; b++) {
          const y0 = b * BL + (side > 0 ? BL / 2 : 0);
          const booth = { side, y0, BL, pastry: Math.floor(rng() * 4), napkin: rng() < 0.7, cup: Math.floor(rng() * 5), plant: rng() < 0.6, sugar: rng() < 0.5 };
          this.booths.push(booth);
          const n = rng() < 0.55 ? 2 : 1;
          for (let k = 0; k < n; k++) {
            const p = makePatron(rng, pi++);
            p.side = side;
            p.y = y0 + BL / 2 + (n === 2 ? (k ? 34 : -34) : (rng() - 0.5) * 30);
            this.patrons.push(p);
          }
        }
      }
      this.lanePropsSeed = rng() * 1000;
      this.walker = makePatron(makeRng(99), 40);
      this.walker.shirt = C.cherry; this.walker.striped = true; this.walker.style = 'beanie'; this.walker.hat = C.butter;
      this.diner = makePatron(makeRng(7), 41);
      this.diner.shirt = C.pink; this.diner.style = 'bun';
    }

    resize(cssW, cssH) {
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      if (!(cssW > 0 && cssH > 0)) return;
      if (cssW === this.cssW && cssH === this.cssH && dpr === this.dpr && this.tile) return;
      this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
      this.scale = cssW / VW;
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this._buildTile();
    }

    _buildTile() {
      const ps = this.scale * this.dpr;
      const c = document.createElement('canvas');
      c.width = Math.round(VW * ps); c.height = Math.round(TILE_H * ps);
      const t = c.getContext('2d');
      t.scale(ps, ps);
      this._paintFloor(t);
      for (const b of this.booths) this._paintBooth(t, b);
      this.tile = c;
    }

    // ---- static scenery, painted once per size ----
    _paintFloor(t) {
      const woods = ['#C08A57', '#B47D4B', '#C99766', '#B98450', '#AE7646'];
      const BW = 40;
      t.fillStyle = '#B9814F'; t.fillRect(0, 0, VW, TILE_H);
      for (let col = 0; col * BW < VW; col++) {
        const x = col * BW;
        const m = 3 + Math.floor(hash(col, 1) * 3);
        const L = TILE_H / m;
        const off = hash(col, 2) * L;
        for (let j = -1; j < m + 1; j++) {
          const y = off + j * L;
          t.fillStyle = woods[Math.floor(hash(col, j + 10) * woods.length)];
          t.fillRect(x, y, BW, L);
          // grain
          t.strokeStyle = 'rgba(90,55,30,0.14)'; t.lineWidth = 0.8;
          for (let g = 0; g < 4; g++) {
            const gx = x + 5 + hash(col * 3 + g, j) * (BW - 10);
            t.beginPath(); t.moveTo(gx, y + 4);
            t.bezierCurveTo(gx + 3, y + L * 0.3, gx - 3, y + L * 0.6, gx + 1, y + L - 4);
            t.stroke();
          }
          if (hash(col, j + 40) < 0.35) {
            const kx = x + 10 + hash(col, j + 41) * 20, ky = y + 30 + hash(col, j + 42) * (L - 60);
            t.beginPath(); t.ellipse(kx, ky, 2.6, 5, 0, 0, Math.PI * 2);
            t.fillStyle = 'rgba(90,55,30,0.28)'; t.fill();
            t.beginPath(); t.ellipse(kx, ky, 5, 10, 0, 0, Math.PI * 2);
            t.strokeStyle = 'rgba(90,55,30,0.12)'; t.stroke();
          }
          t.fillStyle = 'rgba(51,41,33,0.45)';
          t.fillRect(x, y - 0.6, BW, 1.2);
          t.fillStyle = 'rgba(51,41,33,0.35)';
          t.beginPath(); t.arc(x + 6, y + 5, 0.9, 0, Math.PI * 2); t.arc(x + BW - 6, y + 5, 0.9, 0, Math.PI * 2); t.fill();
        }
        t.fillStyle = 'rgba(51,41,33,0.5)'; t.fillRect(x - 0.6, 0, 1.2, TILE_H);
        t.fillStyle = 'rgba(255,243,216,0.07)'; t.fillRect(x + 0.6, 0, 1.2, TILE_H);
      }
      // pendant light pools
      for (const ly of [180, 830]) {
        const g = t.createRadialGradient(260, ly, 10, 260, ly, 210);
        g.addColorStop(0, 'rgba(255,236,190,0.20)'); g.addColorStop(1, 'rgba(255,236,190,0)');
        t.fillStyle = g; t.fillRect(40, ly - 220, 440, 440);
      }
      // tiny lane details: sugar packets, crumbs, a straw wrapper
      const r = makeRng(31337);
      for (let i = 0; i < 4; i++) {
        const x = 150 + r() * 220, y = 80 + r() * (TILE_H - 160);
        t.save(); t.translate(x, y); t.rotate(r() * Math.PI);
        if (i % 2 === 0) {
          t.fillStyle = C.cream; t.fillRect(-6, -3.5, 12, 7);
          t.fillStyle = i === 0 ? C.pink : C.mint; t.fillRect(-6, -1, 12, 2);
          t.strokeStyle = 'rgba(51,41,33,0.6)'; t.lineWidth = 0.7; t.strokeRect(-6, -3.5, 12, 7);
        } else {
          t.beginPath(); t.moveTo(-10, 0); t.bezierCurveTo(-4, -6, 2, 6, 10, -1);
          t.strokeStyle = C.cream; t.lineWidth = 2; t.stroke();
          t.strokeStyle = 'rgba(200,60,50,0.6)'; t.lineWidth = 0.7; t.setLineDash([2, 2]); t.stroke(); t.setLineDash([]);
        }
        t.restore();
      }
      t.fillStyle = 'rgba(237,201,107,0.55)';
      for (let i = 0; i < 26; i++) { t.beginPath(); t.arc(120 + r() * 280, r() * TILE_H, 0.6 + r() * 0.9, 0, Math.PI * 2); t.fill(); }
    }

    _paintBooth(t, b) {
      const draws = [b.y0];
      if (b.y0 + b.BL > TILE_H) draws.push(b.y0 - TILE_H);
      if (b.y0 < 0) draws.push(b.y0 + TILE_H);
      for (const y0 of draws) {
        t.save();
        if (b.side > 0) { t.translate(VW, 0); t.scale(-1, 1); }
        t.lineJoin = 'round';
        // wall + wainscot
        t.fillStyle = C.mint; t.fillRect(0, y0, 13, b.BL);
        t.fillStyle = 'rgba(51,41,33,0.18)'; t.fillRect(11, y0, 2, b.BL);
        t.fillStyle = 'rgba(255,243,216,0.25)'; t.fillRect(3, y0, 1.4, b.BL);
        // bench with striped upholstery
        const by = y0 + 16, bh = b.BL - 32;
        t.save();
        t.beginPath(); t.roundRect(13, by, 28, bh, 6); t.clip();
        t.fillStyle = C.cream; t.fillRect(13, by, 28, bh);
        t.fillStyle = C.cherry;
        for (let y = by; y < by + bh; y += 12) t.fillRect(13, y, 28, 6);
        t.fillStyle = 'rgba(51,41,33,0.16)'; t.fillRect(13, by, 7, bh);
        t.fillStyle = 'rgba(255,255,255,0.12)'; t.fillRect(30, by, 4, bh);
        t.restore();
        t.beginPath(); t.roundRect(13, by, 28, bh, 6);
        t.strokeStyle = C.espresso; t.lineWidth = 1.4; t.stroke();
        t.beginPath(); t.moveTo(21, by + 4); t.lineTo(21, by + bh - 4);
        t.strokeStyle = 'rgba(51,41,33,0.35)'; t.lineWidth = 1; t.stroke();
        // divider + plant
        t.fillStyle = '#6B4A33';
        t.beginPath(); t.roundRect(0, y0 - 7, 48, 14, 3); t.fill();
        t.strokeStyle = C.espresso; t.lineWidth = 1.3; t.stroke();
        if (b.plant) {
          t.beginPath(); t.arc(30, y0, 8, 0, Math.PI * 2); t.fillStyle = C.pink; t.fill(); t.stroke();
          t.fillStyle = '#6F8C7B';
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2 + 0.3;
            t.beginPath(); t.ellipse(30 + Math.cos(a) * 7, y0 + Math.sin(a) * 7, 6, 3, a, 0, Math.PI * 2); t.fill();
          }
          t.fillStyle = C.mint; t.beginPath(); t.arc(30, y0, 4.5, 0, Math.PI * 2); t.fill();
        }
        // table
        const tx = 62, ty = y0 + b.BL / 2;
        t.beginPath(); t.ellipse(tx + 4, ty + 6, 30, 29, 0, 0, Math.PI * 2);
        t.fillStyle = 'rgba(51,41,33,0.22)'; t.fill();
        wobEllipse(t, tx, ty, 29, 29, b.y0 + b.side, 0.025);
        t.fillStyle = C.butter; t.fill(); t.strokeStyle = C.espresso; t.lineWidth = 1.5; t.stroke();
        t.beginPath(); t.arc(tx, ty, 24, 0, Math.PI * 2); t.strokeStyle = 'rgba(160,120,40,0.35)'; t.lineWidth = 1; t.stroke();
        t.beginPath(); t.arc(tx - 9, ty - 10, 9, Math.PI * 1.1, Math.PI * 1.6); t.strokeStyle = 'rgba(255,250,230,0.6)'; t.lineWidth = 2; t.stroke();
        // plate + pastry
        const px = tx + 4, py = ty - 8;
        t.beginPath(); t.arc(px, py, 11.5, 0, Math.PI * 2); t.fillStyle = C.cream; t.fill(); t.strokeStyle = C.espresso; t.lineWidth = 1; t.stroke();
        t.beginPath(); t.arc(px, py, 9.5, 0, Math.PI * 2); t.strokeStyle = C.pink; t.lineWidth = 1.2; t.stroke();
        this._paintPastry(t, px, py, b.pastry);
        // napkin
        if (b.napkin) {
          t.save(); t.translate(tx - 10, ty + 12); t.rotate(-0.4);
          t.beginPath(); t.moveTo(-7, -5); t.lineTo(8, -5); t.lineTo(-7, 8); t.closePath();
          t.fillStyle = b.side < 0 ? C.mint : C.pink; t.fill(); t.strokeStyle = C.espresso; t.lineWidth = 0.9; t.stroke();
          t.beginPath(); t.moveTo(-7, -5); t.lineTo(1, 2); t.strokeStyle = 'rgba(51,41,33,0.35)'; t.stroke();
          t.restore();
        }
        // small cup, seen from above
        const cx = tx + 12, cy = ty + 12;
        const st = CUP_STYLES[b.cup];
        t.beginPath(); t.arc(cx, cy, 6.5, 0, Math.PI * 2); t.fillStyle = st.body; t.fill(); t.strokeStyle = C.espresso; t.lineWidth = 1; t.stroke();
        t.beginPath(); t.arc(cx, cy, 4.4, 0, Math.PI * 2); t.fillStyle = C.coffee; t.fill();
        t.beginPath(); t.arc(cx + 8, cy, 2.2, -1.2, 1.2); t.strokeStyle = C.espresso; t.lineWidth = 1.6; t.stroke();
        if (b.sugar) {
          t.save(); t.translate(tx + 16, ty - 16); t.rotate(0.6);
          t.fillStyle = C.cream; t.fillRect(-4, -2.5, 8, 5); t.fillStyle = C.cherry; t.fillRect(-4, -0.6, 8, 1.2);
          t.restore();
        }
        t.restore();
      }
    }

    _paintPastry(t, x, y, kind) {
      t.save(); t.translate(x, y);
      t.strokeStyle = C.espresso; t.lineWidth = 0.9;
      if (kind === 0) { // croissant
        for (let i = -2; i <= 2; i++) {
          const a = i * 0.42;
          t.beginPath(); t.ellipse(Math.sin(a) * 5.5, -Math.cos(a) * 3 + 2, 2.6 + (2 - Math.abs(i)) * 0.7, 3.5, a, 0, Math.PI * 2);
          t.fillStyle = Math.abs(i) % 2 ? '#C98A45' : '#DDA45A'; t.fill(); t.stroke();
        }
      } else if (kind === 1) { // cherry tart
        t.beginPath(); t.arc(0, 0, 6.5, 0, Math.PI * 2); t.fillStyle = '#E3B66C'; t.fill(); t.stroke();
        t.fillStyle = C.cherry;
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; t.beginPath(); t.arc(Math.cos(a) * 3, Math.sin(a) * 3, 1.7, 0, Math.PI * 2); t.fill(); }
      } else if (kind === 2) { // cinnamon roll
        t.beginPath(); t.arc(0, 0, 6.3, 0, Math.PI * 2); t.fillStyle = '#D29752'; t.fill(); t.stroke();
        t.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = a * 0.38; t.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        t.strokeStyle = '#8C5A2E'; t.lineWidth = 1; t.stroke();
      } else { // macarons
        for (const [mx, col] of [[-3.5, C.pink], [3.5, C.mint]]) {
          t.beginPath(); t.arc(mx, 0, 3.8, 0, Math.PI * 2); t.fillStyle = col; t.fill(); t.stroke();
          t.beginPath(); t.arc(mx, 0, 2.2, 0, Math.PI * 2); t.strokeStyle = 'rgba(255,243,216,0.7)'; t.stroke(); t.strokeStyle = C.espresso;
        }
      }
      t.restore();
    }

    // ---- events from the game ----
    onEvent(e) {
      const g = this.game;
      if (e.runId !== g.runId) return;
      const reduced = this.reduced();
      switch (e.type) {
        case 'tableIntro':
        case 'tutorialStart':
        case 'practiceReset':
          this.resetEffects(); break;
        case 'splash': this._spawnDroplets(e.id, e.side); break;
        case 'clink': if (!reduced && e.speed > 10) this._spawnSparks(e.x, e.z); break;
        case 'niceSave': this.floaters.push({ text: 'Nice save!', t: 0, life: 1.2 }); break;
        case 'deliveryComplete': if (e.perfect) this._confetti(); break;
        case 'banked': if (e.newBest) this._confetti(); break;
        default: break;
      }
    }

    resetEffects() {
      this.particles = []; this.stains = []; this.sparks = []; this.floaters = []; this.impact = null; this.confetti = [];
    }

    _spawnDroplets(id, side) {
      const cup = this.game.sim.cups[id];
      if (!cup) return;
      const n = 4;
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: cup.x + side * CUP.R * 0.7, y: CUP.H + 1, z: cup.z + (Math.random() - 0.5) * 14,
          vx: side * (40 + Math.random() * 60), vy: 90 + Math.random() * 90, vz: (Math.random() - 0.5) * 50,
          life: 1.2, r: 1.4 + Math.random() * 1.3,
        });
      }
    }

    _spawnSparks(x, z) {
      if (this.sparks.length > 12) return;
      this.sparks.push({ x, z, t: 0 });
    }

    _confetti() {
      if (this.reduced()) return;
      const pieces = [];
      for (let i = 0; i < 48; i++) {
        pieces.push({
          x: 70 + Math.random() * 380, y: -10 - Math.random() * 60,
          vx: (Math.random() - 0.5) * 90, vy: 140 + Math.random() * 130,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 9,
          t: 0, life: 0.9 + Math.random() * 0.4, ph: Math.random() * 6,
          tint: Math.random() < 0.3 ? C.pink : Math.random() < 0.5 ? C.butter : C.cream,
        });
      }
      this.confetti = pieces; // only one system at a time
    }

    // ---- per frame ----
    frame(realDt) {
      const g = this.game;
      const S = NS.Game.STATES;
      const ctx = this.ctx;
      const reduced = this.reduced();
      this.time += realDt;
      if (g.runId !== this.lastRun) { this.lastRun = g.runId; this.resetEffects(); }

      ctx.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
      ctx.clearRect(0, 0, VW, VH);

      // scenery
      const scroll = reduced ? 0 : g.travel * TRAVEL_PX;
      const off = ((scroll % TILE_H) + TILE_H) % TILE_H;
      if (this.tile) {
        ctx.drawImage(this.tile, 0, off - TILE_H, VW, TILE_H);
        ctx.drawImage(this.tile, 0, off, VW, TILE_H);
      }

      const angle = g.angle * 0.85; // presentation only; physics uses g.angle
      const sway = reduced ? 0 : g.lastAmbient * 0.15;
      const jolt = reduced ? 0 : g.jolt * 7;
      const P = trayProjector(angle, sway + jolt, 0);
      const trayScreen = P(0, 0, 0);

      // seated customers watch the tray
      const anyDanger = g.sim.cups.some((c) => c.danger && !c.fallen);
      let mood = 'calm';
      if (g.state === S.SPILLING || g.state === S.GAME_OVER) mood = 'shock';
      else if (g.state === S.DELIVERY_COMPLETE || g.state === S.SHIFT_COMPLETE) mood = 'happy';
      else if (anyDanger) mood = 'worried';
      for (const p of this.patrons) {
        for (const yy of [((p.y + off) % TILE_H), ((p.y + off) % TILE_H) - TILE_H]) {
          if (yy < -40 || yy > VH + 40) continue;
          const x = p.side < 0 ? 27 : VW - 27;
          const dx = trayScreen[0] - x, dy = trayScreen[1] - yy;
          const d = Math.hypot(dx, dy) || 1;
          drawPatron(ctx, x, yy, -p.side, p, [dx / d, dy / d], mood, 1.12);
        }
      }

      this._drawDestination(ctx, g, S);

      // floor shadow under the tray
      ctx.save();
      ctx.translate(trayScreen[0] + 14, trayScreen[1] + 70);
      ctx.scale(1, 0.2);
      const sg = ctx.createRadialGradient(0, 0, 60, 0, 0, 230);
      sg.addColorStop(0, 'rgba(51,41,33,0.24)'); sg.addColorStop(1, 'rgba(51,41,33,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 230, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      if (this.impact) this._drawPuddle(ctx, realDt);
      this._drawBumper(ctx, g, P, reduced);
      this._drawArms(ctx, P, false);
      this._drawTray(ctx, P, g);
      this._drawTrayCups(ctx, P, g, S, reduced);
      this._drawArms(ctx, P, true);
      this._updateParticles(ctx, P, realDt);
      this._drawFalling(ctx, P, g, S);
      this._drawHandoff(ctx, g, S, P, reduced);
      this._drawBumpCue(ctx, g, P, reduced);
      this._drawEdgeWarnings(ctx, P, g);
      this._drawFloaters(ctx, realDt, reduced);
      this._drawConfetti(ctx, realDt);

      if (g.slowmoRemaining > 0) {
        const vg = ctx.createRadialGradient(260, 400, 180, 260, 400, 420);
        vg.addColorStop(0, 'rgba(51,41,33,0)'); vg.addColorStop(1, 'rgba(51,41,33,0.22)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
      }
      // gentle warm vignette
      const v = ctx.createRadialGradient(260, 360, 260, 260, 360, 470);
      v.addColorStop(0, 'rgba(51,41,33,0)'); v.addColorStop(1, 'rgba(51,41,33,0.16)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
    }

    _destY(g, S) {
      const dur = g.cfg.delivery.duration;
      if (g.state === S.DELIVERY_COMPLETE || g.state === S.SHIFT_COMPLETE) return DEST_Y;
      if (g.state !== S.PLAYING && !(g.state === S.PAUSED && g.prevState === S.PLAYING)) return null;
      const rem = dur - g.simTime;
      const lead = (DEST_Y + 110) / TRAVEL_PX; // moves with the scenery
      if (rem > lead) return null;
      return DEST_Y - rem * TRAVEL_PX;
    }

    _drawDestination(ctx, g, S) {
      const y = this._destY(g, S);
      if (y == null) return;
      ctx.save();
      ctx.lineJoin = 'round';
      const happy = g.state === S.DELIVERY_COMPLETE || g.state === S.SHIFT_COMPLETE;
      drawPatron(ctx, 300, y - 50, 1, Object.assign({}, this.diner, { arm: false }), [0, 1], happy ? 'happy' : 'calm', 1.15);
      ctx.beginPath(); ctx.roundRect(166 + 5, y - 30 + 6, 190, 62, 10); ctx.fillStyle = 'rgba(51,41,33,0.22)'; ctx.fill();
      ctx.beginPath(); ctx.roundRect(166, y - 30, 190, 62, 10);
      ctx.fillStyle = C.butter; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.6; ctx.stroke();
      // striped runner
      ctx.save(); ctx.beginPath(); ctx.rect(176, y - 30, 170, 62); ctx.clip();
      ctx.fillStyle = C.cream; ctx.fillRect(176, y - 12, 170, 26);
      ctx.fillStyle = C.pink; for (let x = 176; x < 346; x += 14) ctx.fillRect(x, y - 12, 6, 26);
      ctx.restore();
      ctx.strokeStyle = 'rgba(51,41,33,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(176, y - 12, 170, 26);
      // order ticket on a little stand
      ctx.save(); ctx.translate(196, y - 22); ctx.rotate(-0.08);
      ctx.fillStyle = '#FFFBF0'; ctx.fillRect(-13, -14, 26, 30);
      ctx.strokeStyle = C.espresso; ctx.lineWidth = 1; ctx.strokeRect(-13, -14, 26, 30);
      ctx.fillStyle = C.espresso; ctx.font = 'bold 6px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('TABLE', 0, -5);
      ctx.font = 'bold 12px ' + FONT; ctx.fillText(String(Math.max(1, g.delivery)), 0, 8);
      ctx.restore();
      ctx.restore();
    }

    _drawTray(ctx, P, g) {
      const hw = g.cfg.tray.width / 2, hd = g.cfg.tray.depth / 2;
      const outer = roundRectPts(hw, hd, 26, 6);
      const inner = roundRectPts(hw - 9, hd - 9, 18, 6);
      const proj = (pts, y) => pts.map(([x, z]) => P(x, y, z));
      ctx.lineJoin = 'round';
      // side thickness
      polyPath(ctx, proj(outer, -7)); ctx.fillStyle = C.cherryDark; ctx.fill();
      ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.6; ctx.stroke();
      // rim
      const rimPts = proj(outer, 3);
      polyPath(ctx, rimPts); ctx.fillStyle = C.cream; ctx.fill(); ctx.stroke();
      // surface
      const surf = proj(inner, 0.4);
      polyPath(ctx, surf); ctx.fillStyle = C.cherry; ctx.fill();
      ctx.save(); polyPath(ctx, surf); ctx.clip();
      // inner rim shadow along the back edge, sheen across
      const a = P(-hw, 0, -hd), b = P(-hw, 0, -hd + 30);
      const sh = ctx.createLinearGradient(0, a[1], 0, b[1]);
      sh.addColorStop(0, 'rgba(51,41,33,0.30)'); sh.addColorStop(1, 'rgba(51,41,33,0)');
      ctx.fillStyle = sh; ctx.fillRect(0, a[1] - 20, VW, b[1] - a[1] + 20);
      const s1 = P(-hw * 0.6, 0, -hd), s2 = P(-hw * 0.2, 0, -hd), s3 = P(hw * 0.1, 0, hd), s4 = P(-hw * 0.3, 0, hd);
      polyPath(ctx, [s1, s2, s3, s4]); ctx.fillStyle = 'rgba(255,243,216,0.09)'; ctx.fill();
      // printed emblem: a pair of cherries in a ring
      const em = ring(P, 0.4, 26, 30, 9, 0.02);
      polyPath(ctx, em); ctx.strokeStyle = 'rgba(255,243,216,0.20)'; ctx.lineWidth = 1.4; ctx.stroke();
      const ec = P(0, 0.4, 0), ek = TRAY.k;
      ctx.fillStyle = 'rgba(120,30,24,0.35)';
      ctx.beginPath(); ctx.ellipse(ec[0] - 5 * ek, ec[1] + 3, 5 * ek, 3 * ek, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ec[0] + 5 * ek, ec[1] + 4, 5 * ek, 3 * ek, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ec[0] - 5 * ek, ec[1] + 1); ctx.quadraticCurveTo(ec[0], ec[1] - 10, ec[0] + 3, ec[1] - 9);
      ctx.moveTo(ec[0] + 5 * ek, ec[1] + 2); ctx.quadraticCurveTo(ec[0] + 3, ec[1] - 5, ec[0] + 3, ec[1] - 9);
      ctx.strokeStyle = 'rgba(120,30,24,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      // stains from little splashes
      for (const s of this.stains) {
        const p = P(s.x, 0.5, s.z);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], s.r * TRAY.k, s.r * TRAY.k * TRAY.KZ, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(70,35,20,' + (0.45 * clamp(s.life / 1.6, 0, 1)).toFixed(3) + ')'; ctx.fill();
      }
      ctx.restore();
      polyPath(ctx, surf); ctx.strokeStyle = 'rgba(51,41,33,0.55)'; ctx.lineWidth = 1.1; ctx.stroke();
      // handle slots
      for (const sd of [-1, 1]) {
        const slot = roundRectPts(3.2, 17, 3, 3).map(([x, z]) => P(sd * (hw - 4.6) + x, 3.1, z));
        polyPath(ctx, slot); ctx.fillStyle = 'rgba(51,41,33,0.85)'; ctx.fill();
      }
      // rim outline
      polyPath(ctx, rimPts); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.6; ctx.stroke();
      // highlight on the near rim edge
      const n1 = P(-hw + 30, 3, hd), n2 = P(hw - 30, 3, hd);
      ctx.beginPath(); ctx.moveTo(n1[0], n1[1] - 2); ctx.lineTo(n2[0], n2[1] - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    }

    _cupProjector(P, cup, half, reduced) {
      const R = CUP.R;
      const over = (Math.abs(cup.x) - (half - R)) / R;
      const frac = clamp(over, 0, 1);
      const side = cup.x >= 0 ? 1 : -1;
      const tip = side * frac * 0.42;
      const jitter = !reduced && cup.danger ? Math.sin(this.time * 75 + cup.id * 2) * 0.9 : 0;
      const cx = cup.x + jitter;
      if (frac <= 0) return (x, y, z) => P(cx + x, y + 0.4, cup.z + z);
      const pivot = side * half;
      const ct = Math.cos(tip), stn = Math.sin(tip);
      return (x, y, z) => {
        const lx = cx + x - pivot, ly = y + 0.4;
        return P(pivot + lx * ct + ly * stn, -lx * stn + ly * ct, cup.z + z);
      };
    }

    _drawTrayCups(ctx, P, g, S, reduced) {
      const half = g.cfg.tray.width / 2;
      if (g.state === S.DELIVERY_COMPLETE || g.state === S.SHIFT_COMPLETE) {
        if (g.state === S.SHIFT_COMPLETE || reduced || g.phaseT > 0.25) return; // being collected
      }
      const cups = g.sim.cups.filter((c) => !c.fallen).slice().sort((a, b) => a.z - b.z || a.x - b.x);
      const hw = half, hd = g.cfg.tray.depth / 2;
      // shadows (clipped to the tray: an overhanging cup loses its shadow)
      ctx.save();
      polyPath(ctx, roundRectPts(hw, hd, 26, 6).map(([x, z]) => P(x, 3, z))); ctx.clip();
      for (const c of cups) {
        const p = P(c.x + 5 + g.angle * 30, 0.4, c.z + 6);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], CUP.R * 1.05 * TRAY.k, CUP.R * 0.62 * TRAY.k, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(51,41,33,0.26)'; ctx.fill();
      }
      ctx.restore();
      for (const c of cups) drawCup(ctx, this._cupProjector(P, c, half, reduced), c.id, c);
    }

    _drawArms(ctx, P, thumbs) {
      const hw = this.game.cfg.tray.width / 2;
      for (const sd of [-1, 1]) {
        const grip = P(sd * (hw - 8), -4, 26);
        const top = P(sd * (hw - 3), 3, 16);
        if (!thumbs) {
          // the waiter's forearms: cream shirt sleeves with cherry cuffs
          const sx = 260 + sd * 175, sy = VH + 30;
          const ex = grip[0] + sd * 4, ey = grip[1] + 22;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - sd * 4, ey + 60, ex, ey);
          ctx.strokeStyle = C.espresso; ctx.lineWidth = 25; ctx.stroke();
          ctx.strokeStyle = '#F3E3C0'; ctx.lineWidth = 21.5; ctx.stroke();
          ctx.strokeStyle = 'rgba(51,41,33,0.10)'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(sx + sd * 6, sy); ctx.quadraticCurveTo(sx + sd * 2, ey + 60, ex + sd * 5, ey + 4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex + sd * 1, ey + 12); ctx.lineTo(ex, ey + 2);
          ctx.strokeStyle = C.cherry; ctx.lineWidth = 22; ctx.lineCap = 'butt'; ctx.stroke();
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.ellipse(grip[0] + sd * 2, grip[1] + 6, 10, 12, sd * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = '#E3AE86'; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.3; ctx.stroke();
        } else {
          // thumb hooked over the rim
          ctx.beginPath(); ctx.ellipse(top[0] - sd * 2, top[1] + 1, 4.2, 7, sd * -0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#E3AE86'; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(top[0] - sd * 3, top[1] - 3, 2, 1.4, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,240,225,0.7)'; ctx.fill();
        }
      }
    }

    _updateParticles(ctx, P, dt) {
      const half = this.game.cfg.tray.width / 2;
      const keep = [];
      for (const d of this.particles) {
        d.vy -= 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.life -= dt;
        const onTray = Math.abs(d.x) < half - 8;
        if (d.y <= 0.5 && onTray) {
          if (this.stains.length < 40) this.stains.push({ x: d.x, z: clamp(d.z, -60, 60), r: d.r * 1.6, life: 1.6 });
          continue;
        }
        if (d.y < -95 || d.life <= 0) continue;
        const p = P(d.x, d.y, d.z);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], d.r, d.r * 1.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.coffee; ctx.fill();
        ctx.beginPath(); ctx.arc(p[0] - d.r * 0.3, p[1] - d.r * 0.4, d.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,240,220,0.6)'; ctx.fill();
        keep.push(d);
      }
      this.particles = keep;
      this.stains = this.stains.filter((s) => (s.life -= dt * 0.5) > 0);
      ctx.strokeStyle = 'rgba(255,250,235,0.9)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      this.sparks = this.sparks.filter((s) => {
        s.t += dt;
        if (s.t > 0.2) return false;
        const p = P(s.x, 18, s.z);
        const r1 = 4 + s.t * 40, r2 = r1 + 4;
        for (const a of [-1.9, -1.57, -1.2]) {
          ctx.beginPath(); ctx.moveTo(p[0] + Math.cos(a) * r1, p[1] + Math.sin(a) * r1);
          ctx.lineTo(p[0] + Math.cos(a) * r2, p[1] + Math.sin(a) * r2); ctx.stroke();
        }
        return true;
      });
    }

    _drawFalling(ctx, P, g, S) {
      if (!g.fallen || (g.state !== S.SPILLING && g.state !== S.GAME_OVER)) return;
      const f = g.fallen;
      const cup = g.sim.cups[f.id];
      const half = g.cfg.tray.width / 2;
      const t = g.state === S.GAME_OVER ? 9 : g.phaseT;
      const floorY = -95;
      const drop = 0.5 * 1100 * t * t;
      const out = Math.max(35, Math.abs(f.v)) * t * 0.9;
      const x = f.side * (half + 4) + f.side * out;
      const y = 3 - drop;
      if (y <= floorY) {
        if (!this.impact) {
          const p = P(x, floorY, cup.z);
          this.impact = { x: p[0], y: p[1], t: 0, side: f.side, style: f.id };
          for (let i = 0; i < 8; i++) {
            this.particles.push({ x, y: floorY + 2, z: cup.z, vx: (Math.random() - 0.5) * 160, vy: 120 + Math.random() * 120, vz: (Math.random() - 0.5) * 60, life: 0.5, r: 1.6 + Math.random() * 1.4 });
          }
        }
        return;
      }
      const tip = f.side * Math.min(2.0, 0.45 + t * 5.2);
      const ct = Math.cos(tip), st = Math.sin(tip);
      const Pc = (px, py, pz) => {
        const yy = py - CUP.H / 2;
        return P(x + px * ct + yy * st, y + CUP.H / 2 - px * st + yy * ct, cup.z + pz);
      };
      drawCup(ctx, Pc, f.id, cup);
    }

    _drawPuddle(ctx, dt) {
      const im = this.impact;
      im.t += dt;
      const r = 30 * easeOut(im.t / 0.35);
      ctx.save();
      ctx.translate(im.x, im.y);
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const rr = r * (0.78 + hash(i, 3) * 0.4);
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.55;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(91,55,34,0.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(51,41,33,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.12, r * 0.25, r * 0.08, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,240,220,0.35)'; ctx.fill();
      // ceramic shards
      const st = CUP_STYLES[im.style % CUP_STYLES.length];
      for (let i = 0; i < 4; i++) {
        const a = hash(i, 9) * Math.PI * 2, d = 10 + r * 0.9 + hash(i, 8) * 12;
        ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d * 0.55); ctx.rotate(a * 2);
        ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(6, -2); ctx.lineTo(1, 5); ctx.closePath();
        ctx.fillStyle = i % 2 ? st.stripe : st.body; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    _drawHandoff(ctx, g, S, P, reduced) {
      if (g.state !== S.DELIVERY_COMPLETE && g.state !== S.SHIFT_COMPLETE) return;
      const T = g.state === S.SHIFT_COMPLETE || reduced ? 99 : g.phaseT;
      const destY = DEST_Y;
      const cups = g.sim.cups.filter((c) => !c.fallen);
      const slots = cups.map((c, i) => [262 - (cups.length - 1) * 17 + i * 34, destY - 2]);
      // hand reaches down, cups lift to the table, hand returns
      const reach = T < 0.35 ? easeOut(T / 0.35) : T < 0.8 ? 1 : 1 - easeInOut((T - 0.8) / 0.3);
      cups.forEach((c, i) => {
        const t0 = 0.22 + i * 0.09;
        const u = clamp((T - t0) / 0.38, 0, 1);
        if (T < t0 && T <= 0.25) return; // still drawn on tray by _drawTrayCups
        const from = P(c.x, 0, c.z);
        const e = easeInOut(u);
        const sx = from[0] + (slots[i][0] - from[0]) * e;
        const sy = from[1] + (slots[i][1] - from[1]) * e - Math.sin(u * Math.PI) * 40;
        const sc = 1 - 0.38 * e;
        drawCup(ctx, flatProjector(sx, sy, sc), c.id, u >= 1 ? null : c);
      });
      if (reach > 0.001) {
        const hx = 262, hy0 = destY + 16;
        const hy = hy0 + (P(0, 0, -40)[1] - 6 - hy0) * reach;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx + 44, destY - 44); ctx.quadraticCurveTo(hx + 26, (destY + hy) / 2, hx, hy - 14);
        ctx.strokeStyle = C.espresso; ctx.lineWidth = 19; ctx.stroke();
        ctx.strokeStyle = C.mint; ctx.lineWidth = 15.5; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx, hy, 12, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#C98F68'; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.3; ctx.stroke();
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.ellipse(hx - 8 + i * 5.4, hy + 9, 2.6, 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#C98F68'; ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(hx + 13, hy + 1, 3, 5.5, -0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }

    _drawBumper(ctx, g, P, reduced) {
      const b = g.activeBump();
      if (!b) return;
      const t = g.simTime;
      const hwPx = (g.cfg.tray.width / 2) * TRAY.k;
      const contactX = 260 + b.side * (hwPx + 30);
      const y = TRAY.cy - 8;
      const startX = b.side < 0 ? -40 : VW + 40;
      let x, yy = y, mood = 'calm', alpha = 1;
      if (reduced) {
        x = contactX + b.side * 24; alpha = t < b.at ? 0.9 : clamp(1 - (t - b.at) / 0.9, 0, 1);
      } else if (t < b.at) {
        const u = clamp((t - b.warnAt) / (b.at - b.warnAt), 0, 1);
        x = startX + (contactX - startX) * easeOut(u * 1.05);
      } else {
        const u = clamp((t - b.at) / 0.9, 0, 1);
        x = contactX + b.side * 30 * easeOut(u);
        yy = y + 120 * u * u;
        mood = 'oops';
        alpha = 1 - clamp((u - 0.6) / 0.4, 0, 1);
      }
      if (t >= b.at - 0.15 && t < b.at + 0.4) mood = 'oops';
      ctx.save();
      ctx.globalAlpha = alpha;
      const walk = reduced ? 0 : Math.sin(t * 11);
      // pastry box swinging in the outer hand
      if (t >= b.at && t < b.at + 0.35 && !reduced) {
        // impact burst at the tray edge
        const ex = 260 + b.side * (hwPx + 4), u = (t - b.at) / 0.35;
        ctx.save(); ctx.translate(ex, y + 4); ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = C.cream; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const a = (i - 2) * 0.45 + (b.side < 0 ? 0 : Math.PI);
          const r1 = 10 + u * 12, r2 = r1 + 10;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save(); ctx.translate(x + b.side * 4, yy + 30 + walk * 3);
      ctx.fillStyle = C.butter; ctx.strokeStyle = C.espresso; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.roundRect(-11, -7, 22, 15, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.cherry; ctx.fillRect(-11, -1.5, 22, 3);
      ctx.restore();
      drawPatron(ctx, x, yy, -b.side, this.walker, [-b.side, 0.2], mood, 1.6);
      ctx.restore();
    }

    _drawBumpCue(ctx, g, P, reduced) {
      const b = g.activeBump();
      if (!b || g.simTime >= b.at) return;
      const t = g.simTime;
      const left = clamp((b.at - t) / (b.at - b.warnAt), 0, 1);
      const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(this.time * 10);
      // label ticket on the customer's side
      const lx = b.side < 0 ? 112 : VW - 112, ly = 292;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(b.side * -0.03);
      ctx.fillStyle = '#FFFBF0'; ctx.strokeStyle = C.cherry; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.roundRect(-84, -21, 168, 42, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.espresso; ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Bump incoming!', 0, -5);
      // countdown bar
      ctx.fillStyle = 'rgba(51,41,33,0.15)'; ctx.fillRect(-70, 9, 140, 5);
      ctx.fillStyle = C.cherry; ctx.fillRect(-70, 9, 140 * left, 5);
      ctx.restore();
      // arrow at the screen edge where the customer enters
      const ax = b.side < 0 ? 22 : VW - 22, ay = TRAY.cy - 8;
      ctx.save(); ctx.translate(ax, ay); ctx.scale(-b.side, 1);
      ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.moveTo(-13, -16); ctx.lineTo(13, 0); ctx.lineTo(-13, 16); ctx.lineTo(-7, 0); ctx.closePath();
      ctx.fillStyle = C.cherry; ctx.fill(); ctx.strokeStyle = C.cream; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      // chevrons across the tray show which way the cups will be pushed
      const c0 = P(0, 40, -40);
      const slide = reduced ? 0 : ((this.time * 1.6) % 1) * 14;
      ctx.save();
      ctx.translate(c0[0], c0[1] - 8);
      ctx.scale(b.dir, 1);
      for (let i = 0; i < 3; i++) {
        const cx = -26 + i * 24 + slide;
        ctx.globalAlpha = (0.45 + 0.18 * i) * pulse;
        ctx.beginPath(); ctx.moveTo(cx - 7, -11); ctx.lineTo(cx + 6, 0); ctx.lineTo(cx - 7, 11);
        ctx.strokeStyle = C.espresso; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.strokeStyle = C.cream; ctx.lineWidth = 4; ctx.stroke();
      }
      ctx.restore();
    }

    _drawEdgeWarnings(ctx, P, g) {
      const half = g.cfg.tray.width / 2, hd = g.cfg.tray.depth / 2;
      const sides = new Set();
      for (const c of g.sim.cups) if (c.danger && !c.fallen) sides.add(c.dangerSide);
      for (const sd of sides) {
        const pts = [];
        for (let i = 0; i <= 10; i++) { const z = -hd + 14 + (i / 10) * (2 * hd - 28); pts.push(P(sd * (half + 1), 3.5, z)); }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.strokeStyle = C.cream; ctx.lineWidth = 6; ctx.stroke();
        ctx.setLineDash([6, 6]); ctx.lineDashOffset = this.reduced() ? 0 : -this.time * 30;
        ctx.strokeStyle = C.cherry; ctx.lineWidth = 6; ctx.stroke();
        ctx.setLineDash([]);
        // warning triangle beside the edge
        const m = P(sd * (half + 26), 10, 0);
        ctx.translate(m[0], m[1] - 34);
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(12, 9); ctx.lineTo(-12, 9); ctx.closePath();
        ctx.fillStyle = C.butter; ctx.fill(); ctx.strokeStyle = C.espresso; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.fillStyle = C.espresso; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 2);
        ctx.restore();
      }
    }

    _drawFloaters(ctx, dt, reduced) {
      this.floaters = this.floaters.filter((f) => {
        f.t += dt;
        if (f.t > f.life) return false;
        const a = 1 - clamp((f.t - f.life + 0.3) / 0.3, 0, 1);
        const y = TRAY.cy - 92 - (reduced ? 0 : f.t * 26);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(260, y); ctx.rotate(-0.04);
        ctx.font = 'bold 18px ' + FONT;
        const w = ctx.measureText(f.text).width + 26;
        ctx.fillStyle = C.mint; ctx.strokeStyle = C.espresso; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-w / 2, -16, w, 32, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.espresso; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(f.text, 0, 1);
        ctx.restore();
        return true;
      });
    }

    _drawConfetti(ctx, dt) {
      if (!this.confetti.length) return;
      this.confetti = this.confetti.filter((p) => {
        p.t += dt;
        if (p.t > p.life) return false;
        p.vy += 220 * dt; p.vx *= Math.exp(-1.5 * dt);
        p.x += (p.vx + Math.sin(p.t * 7 + p.ph) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.save();
        ctx.globalAlpha = 1 - clamp((p.t - p.life + 0.3) / 0.3, 0, 1);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.t * 6 + p.ph));
        ctx.fillStyle = p.tint; ctx.fillRect(-4, -7, 8, 14);
        ctx.strokeStyle = 'rgba(51,41,33,0.55)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-2.5, -3); ctx.lineTo(2.5, -3); ctx.moveTo(-2.5, 0); ctx.lineTo(1.5, 0); ctx.moveTo(-2.5, 3); ctx.lineTo(2.5, 3); ctx.stroke();
        ctx.restore();
        return true;
      });
    }
  }

  NS.Renderer = Renderer;
  NS.VIEW = { width: VW, height: VH };
})(typeof globalThis !== 'undefined' ? globalThis : this);
