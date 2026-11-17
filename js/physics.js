/*
 * Tray-local cup simulation. Pure logic: no DOM, no rendering, no randomness.
 * x is horizontal across the tray (negative = left), z is a fixed row depth.
 */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});
  if (!NS.CONFIG && typeof require === 'function') require('./config.js');

  // Initial layouts: back row (row 0) is drawn first; collisions only within a row.
  const LAYOUTS = {
    1: [{ x: 0, row: 1, z: 'single' }],
    2: [{ x: -55, row: 1, z: 'single' }, { x: 55, row: 1, z: 'single' }],
    3: [{ x: 0, row: 0, z: 'back' }, { x: -62, row: 1, z: 'front' }, { x: 62, row: 1, z: 'front' }],
    4: [{ x: -42, row: 0, z: 'back' }, { x: 42, row: 0, z: 'back' },
        { x: -86, row: 1, z: 'front' }, { x: 86, row: 1, z: 'front' }],
    5: [{ x: -46, row: 0, z: 'back' }, { x: 46, row: 0, z: 'back' },
        { x: -92, row: 1, z: 'front' }, { x: 0, row: 1, z: 'front' }, { x: 92, row: 1, z: 'front' }],
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  class TraySim {
    constructor(config) {
      this.cfg = config || NS.CONFIG;
      this.cups = [];
      this.rows = [[], []];
    }

    reset(count) {
      const n = clamp(Math.floor(count) || 1, 1, this.cfg.delivery.maxCups);
      const layout = LAYOUTS[n];
      this.cups = layout.map((p, i) => ({
        id: i,
        x: p.x,
        v: 0,
        lastV: 0,
        row: p.row,
        z: this.cfg.tray.rowZ[p.z],
        s: 0,          // liquid surface tilt relative to the cup (radians)
        sw: 0,         // its angular velocity
        sEq: 0,
        aSmooth: 0,
        splashHold: 0,
        splashCd: 0,
        fallen: false,
        fallSide: 0,
        danger: false,
        dangerSide: 0,
        slowmoArmed: true,
        grip: (this.cfg.physics.gripVariation || [1])[i % (this.cfg.physics.gripVariation || [1]).length],
      }));
      this.rows = [[], []];
      for (const c of this.cups) this.rows[c.row].push(c);
      for (const r of this.rows) r.sort((a, b) => a.x - b.x || a.id - b.id);
      return this.cups;
    }

    activeCups() { return this.cups.filter((c) => !c.fallen); }

    /**
     * Bump: horizontal velocity change in direction `dir` (+1 pushes right).
     * Cups nearest the customer receive the full magnitude; the farthest
     * receives `farSideFactor` of it, so the bump also nudges cups together.
     */
    applyImpulse(dir, mag) {
      const far = this.cfg.bumps.farSideFactor == null ? 1 : this.cfg.bumps.farSideFactor;
      const half = this.cfg.tray.width / 2;
      for (const c of this.cups) {
        if (c.fallen) continue;
        const near = clamp((half - dir * c.x) / (2 * half), 0, 1); // 1 at the customer's edge
        const dv = dir * mag * (far + (1 - far) * near);
        c.v = clamp(c.v + dv, -this.cfg.physics.maxSpeed, this.cfg.physics.maxSpeed);
      }
    }

    /**
     * Advance one fixed step.
     * @returns {{collisions: Array, falls: Array, splashes: Array}}
     */
    step(dt, angleRad, ambientAcc, opts) {
      const P = this.cfg.physics;
      const L = this.cfg.liquid;
      const S = this.cfg.splash;
      const half = this.cfg.tray.width / 2;
      const r = this.cfg.tray.cupRadius;
      const countSplashes = !opts || opts.countSplashes !== false;
      const out = { collisions: [], falls: [], splashes: [] };

      const acc = P.gravity * Math.sin(angleRad) + (ambientAcc || 0);
      for (const c of this.cups) {
        if (c.fallen) continue;
        c.v += acc * dt;
        c.v *= Math.exp(-P.damping * c.grip * dt);
        c.v = clamp(c.v, -P.maxSpeed, P.maxSpeed);
        c.x += c.v * dt;
      }

      // Same-row collisions. Row arrays keep a fixed left-to-right order, so
      // a pair can never swap: crossing produces a larger correction.
      const e = P.restitution;
      for (let pass = 0; pass < P.solverPasses; pass++) {
        let any = false;
        for (const row of this.rows) {
          let prev = null;
          for (const b of row) {
            if (b.fallen) continue;
            if (prev) {
              const a = prev;
              const gap = b.x - a.x;
              const min = 2 * r;
              if (gap < min) {
                any = true;
                const corr = (min - gap) / 2; // equal masses: equal separation
                a.x -= corr;
                b.x += corr;
                const rel = b.v - a.v;
                if (rel < 0) {
                  const j = ((1 + e) * rel) / 2;
                  a.v += j;
                  b.v -= j;
                  out.collisions.push({ a: a.id, b: b.id, speed: -rel, x: (a.x + b.x) / 2, z: a.z });
                }
              }
            }
            prev = b;
          }
        }
        if (!any) break;
      }

      // Liquid and splashes.
      const smoothK = 1 - Math.exp(-dt / L.accelSmoothing);
      for (const c of this.cups) {
        if (c.fallen) continue;
        const aCup = clamp((c.v - c.lastV) / dt, -4000, 4000);
        c.lastV = c.v;
        c.aSmooth += (aCup - c.aSmooth) * smoothK;
        c.sEq = -angleRad;
        const sw = c.sw + (-L.stiffness * (c.s - c.sEq) - L.damping * c.sw + L.accelCoupling * aCup) * dt;
        c.sw = clamp(sw, -L.maxSurfaceVel, L.maxSurfaceVel);
        c.s = clamp(c.s + c.sw * dt, -L.maxSurface, L.maxSurface);

        const quasiStatic = c.sEq + (L.accelCoupling * c.aSmooth) / L.stiffness;
        const dev = Math.abs(c.s - quasiStatic);
        c.splashCd = Math.max(0, c.splashCd - dt);
        if (dev > S.threshold) c.splashHold += dt; else c.splashHold = 0;
        if (c.splashHold >= S.persist && c.splashCd <= 0) {
          c.splashHold = 0;
          c.splashCd = S.cooldown;
          out.splashes.push({ id: c.id, side: c.s - quasiStatic < 0 ? 1 : -1, counted: countSplashes });
        }
      }

      // Edge loss: centre past the rim. Never clamp back.
      for (const c of this.cups) {
        if (c.fallen) continue;
        if (c.x > half || c.x < -half) {
          c.fallen = true;
          c.fallSide = c.x > 0 ? 1 : -1;
          out.falls.push({ id: c.id, side: c.fallSide, x: c.x, v: c.v });
        }
      }
      return out;
    }
  }

  NS.TraySim = TraySim;
  NS.CUP_LAYOUTS = LAYOUTS;
  if (typeof module !== 'undefined' && module.exports) module.exports = { TraySim, LAYOUTS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
