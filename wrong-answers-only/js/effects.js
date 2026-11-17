/*
 * Ink bursts and confetti on one pointer-transparent canvas.
 * Capped particle count, ~1 s lifetime, fully independent of scoring.
 */
(function (root) {
  'use strict';
  const COLORS = ['#24211E', '#E34B36', '#3454D1', '#E7EF63'];
  const MAX = 60;

  function createEffects(canvas) {
    const ctx = canvas.getContext('2d');
    let parts = [];
    let dpr = 1, w = 0, h = 0;
    let enabled = true;

    function resize() {
      dpr = Math.min(2, root.devicePixelRatio || 1);
      w = root.innerWidth; h = root.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    root.addEventListener('resize', resize);

    function add(p) {
      if (parts.length >= MAX) parts.shift();
      parts.push(p);
    }

    /** Small ink splat from a point (button centre). */
    function ink(x, y, color) {
      if (!enabled) return;
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 140 + Math.random() * 220;
        add({ kind: 'ink', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
          r: 2 + Math.random() * 4, life: 0, max: 0.45 + Math.random() * 0.25,
          color: Math.random() < 0.7 ? '#24211E' : color });
      }
    }

    /** Confetti from the two lower page corners, travelling up the margins. */
    function confetti(size) {
      if (!enabled) return;
      const n = size === 'big' ? 56 : 26;
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0;
        add({ kind: 'paper', x: left ? -6 : w + 6, y: h * (0.55 + Math.random() * 0.45),
          vx: (left ? 1 : -1) * (160 + Math.random() * 260), vy: -(380 + Math.random() * 380),
          r: 4 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
          life: 0, max: 0.8 + Math.random() * 0.25, color: COLORS[i % COLORS.length] });
      }
    }

    function update(dt) {
      if (!parts.length) return false;
      ctx.clearRect(0, 0, w, h);
      parts = parts.filter((p) => (p.life += dt) < p.max);
      for (const p of parts) {
        p.vy += (p.kind === 'ink' ? 700 : 900) * dt;
        p.vx *= p.kind === 'ink' ? 0.9 : 0.985;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.color;
        if (p.kind === 'ink') {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + 0.4 * k), 0, Math.PI * 2); ctx.fill();
        } else {
          p.rot += p.vr * dt;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (!parts.length) ctx.clearRect(0, 0, w, h);
      return true;
    }

    function clear() { parts = []; ctx.clearRect(0, 0, w, h); }

    return {
      ink, confetti, update, clear, resize,
      setEnabled(v) { enabled = !!v; if (!enabled) clear(); },
      get count() { return parts.length; }
    };
  }

  root.WAOEffects = { createEffects };
})(typeof self !== 'undefined' ? self : this);
