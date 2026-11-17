'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CONFIG = require('../js/config.js');
const { TraySim, LAYOUTS } = require('../js/physics.js');

const DT = CONFIG.physics.fixedDt;
const DEG = Math.PI / 180;
const HALF = CONFIG.tray.width / 2;
const R = CONFIG.tray.cupRadius;

function sim(n) { const s = new TraySim(CONFIG); s.reset(n); return s; }

test('tilting right accelerates cups right, left accelerates left', () => {
  const r = sim(1); r.step(DT, 9 * DEG, 0);
  const l = sim(1); l.step(DT, -9 * DEG, 0);
  assert.ok(r.cups[0].v > 0 && r.cups[0].x > 0);
  assert.ok(l.cups[0].v < 0 && l.cups[0].x < 0);
  const expected = CONFIG.physics.gravity * Math.sin(9 * DEG) * DT * Math.exp(-CONFIG.physics.damping * DT);
  assert.ok(Math.abs(r.cups[0].v - expected) < 1e-9, 'acceleration follows 600 * sin(angle)');
});

test('a level tray with no ambient leaves cups at rest', () => {
  const s = sim(5);
  const before = s.cups.map((c) => c.x);
  for (let i = 0; i < 600; i++) s.step(DT, 0, 0);
  s.cups.forEach((c, i) => { assert.equal(c.x, before[i]); assert.equal(c.v, 0); });
});

test('initial layouts are inside the tray, gapped, and at most two rows', () => {
  for (let n = 1; n <= 5; n++) {
    const s = sim(n);
    assert.equal(s.cups.length, n);
    for (const c of s.cups) assert.ok(Math.abs(c.x) + R < HALF - 30, 'safely inside');
    const rows = new Set(s.cups.map((c) => c.row));
    assert.ok(rows.size <= 2);
    for (const row of s.rows) {
      for (let i = 1; i < row.length; i++) assert.ok(row[i].x - row[i - 1].x > 2 * R + 2, 'initial gap');
    }
  }
  assert.ok(LAYOUTS[5]);
});

test('reset clamps cup count to the configured maximum of five', () => {
  assert.equal(sim(9).cups.length, 5);
  assert.equal(sim(0).cups.length, 1);
});

test('collisions separate overlapping cups equally and preserve ordering', () => {
  const s = sim(2);
  s.cups[0].x = -10; s.cups[1].x = 10; // overlap of 2r - 20 = 22
  s.step(DT, 0, 0);
  const [a, b] = s.cups;
  assert.ok(b.x - a.x >= 2 * R - 1e-9, 'no persistent overlap');
  assert.ok(Math.abs(a.x + b.x) < 1e-9, 'equal separation about the midpoint');
  assert.ok(a.x < b.x, 'ordering kept');
});

test('approaching cups receive a bounded low-restitution response', () => {
  const s = sim(2);
  s.cups[0].x = -21.5; s.cups[1].x = 21.5;
  s.cups[0].v = 120; s.cups[1].v = -120;
  s.cups[0].lastV = 120; s.cups[1].lastV = -120;
  const res = s.step(DT, 0, 0);
  assert.ok(res.collisions.length >= 1);
  const [a, b] = s.cups;
  assert.ok(b.v - a.v >= 0, 'no longer approaching');
  assert.ok(Math.abs(a.v) < 60 && Math.abs(b.v) < 60, 'no explosive rebound');
  assert.ok(a.x < b.x && b.x - a.x >= 2 * R - 1e-9);
});

test('separating cups are not given an impulse', () => {
  const s = sim(2);
  s.cups[0].x = -20; s.cups[1].x = 20;
  s.cups[0].v = -30; s.cups[1].v = 30;
  s.cups[0].lastV = -30; s.cups[1].lastV = 30;
  const res = s.step(DT, 0, 0);
  assert.equal(res.collisions.length, 0);
});

test('crossing cups are pushed back into order rather than swapping', () => {
  const s = sim(2);
  s.cups[0].x = 5; s.cups[1].x = -5;
  s.step(DT, 0, 0);
  assert.ok(s.cups[0].x < s.cups[1].x);
});

test('cups in different rows do not collide', () => {
  const s = sim(3); // back row: one cup, front row: two cups
  const back = s.cups.find((c) => c.row === 0);
  const front = s.cups.find((c) => c.row === 1);
  back.x = 0; front.x = 1;
  const res = s.step(DT, 0, 0);
  assert.equal(res.collisions.length, 0);
  assert.equal(back.x, 0);
});

for (const side of [-1, 1]) {
  test(`a cup falls off the ${side < 0 ? 'left' : 'right'} edge once its centre passes the rim`, () => {
    const s = sim(1);
    const c = s.cups[0];
    c.x = side * (HALF - 0.5);
    let res = s.step(DT, 0, 0);
    assert.equal(c.fallen, false, 'not yet past the threshold');
    c.v = side * 120;
    res = s.step(DT, 0, 0);
    assert.equal(c.fallen, true);
    assert.equal(res.falls.length, 1);
    assert.equal(res.falls[0].side, side);
    assert.ok(Math.abs(c.x) > HALF, 'not clamped back onto the tray');
  });
}

test('sustained tilt eventually drops a cup at the matching edge', () => {
  for (const side of [-1, 1]) {
    const s = sim(2);
    let fell = null;
    for (let i = 0; i < 120 * 10 && !fell; i++) {
      const r = s.step(DT, side * 9 * DEG, 0);
      if (r.falls.length) fell = r.falls[0];
    }
    assert.ok(fell, 'something fell');
    assert.equal(fell.side, side);
  }
});

test('bump impulse is bounded and directional', () => {
  const s = sim(5);
  s.applyImpulse(1, 22);
  for (const c of s.cups) {
    assert.ok(c.v > 0);
    assert.ok(c.v <= 22 + 1e-9 && c.v >= 22 * CONFIG.bumps.farSideFactor - 1e-9);
  }
  const l = sim(2); l.applyImpulse(-1, 14);
  for (const c of l.cups) assert.ok(c.v < 0 && c.v >= -14);
});

test('a single strong bump from rest is recoverable and does not splash', () => {
  const s = sim(5);
  s.applyImpulse(1, CONFIG.bumps.maxImpulse);
  let splashes = 0;
  for (let i = 0; i < 600; i++) {
    const r = s.step(DT, 0, 0);
    splashes += r.splashes.length;
    assert.equal(r.falls.length, 0);
  }
  assert.equal(splashes, 0);
});

test('splashes are rate-limited by a per-cup cooldown', () => {
  const s = sim(1);
  let splashes = 0; let ang = 0;
  const steps = 120 * 3;
  for (let i = 0; i < steps; i++) {
    const tgt = (Math.floor(i / 36) % 2 ? 1 : -1) * 9 * DEG; // frantic flipping
    ang += (tgt - ang) * (1 - Math.exp(-DT / CONFIG.tilt.responseTime));
    s.step(DT, ang, 0).splashes.forEach(() => splashes++);
    s.cups[0].x = 0; // keep it aboard; we only test the liquid
  }
  assert.ok(splashes >= 1, 'violent sloshing splashes');
  const maxPossible = Math.ceil(3 / CONFIG.splash.cooldown) + 1;
  assert.ok(splashes <= maxPossible, `at most ${maxPossible} splashes in 3 s, got ${splashes}`);
});

test('liquid surface lags behind the tray and stays within plausible bounds', () => {
  const s = sim(1);
  s.step(DT, 9 * DEG, 0);
  const c = s.cups[0];
  assert.ok(Math.abs(c.s) < 9 * DEG * 0.5, 'surface has not yet caught up');
  for (let i = 0; i < 1200; i++) {
    s.step(DT, (i % 50 < 25 ? 1 : -1) * 9 * DEG, 0);
    c.x = 0;
    assert.ok(Math.abs(c.s) <= CONFIG.liquid.maxSurface + 1e-12);
    assert.ok(Number.isFinite(c.s) && Number.isFinite(c.sw));
  }
});
