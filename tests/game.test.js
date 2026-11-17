'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CONFIG = require('../js/config.js');
const { Game, STATES, cupsForDelivery, rewardFor, scheduleBumps } = require('../js/game.js');
const RNG = require('../js/rng.js');

function memStorage(init) {
  const m = new Map(Object.entries(init || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

function newGame(opts) {
  const g = new Game(Object.assign({ seed: 1234, storage: memStorage({ 'dns.practiced': '1' }) }, opts || {}));
  return g;
}

/** Advance real time in fixed frame slices. */
function advance(g, seconds, frame) {
  frame = frame || 1 / 60;
  const n = Math.round(seconds / frame);
  for (let i = 0; i < n; i++) g.update(frame);
}

/** Simple proportional balancer so deliveries complete. */
function playBalanced(g, maxSeconds) {
  const frame = 1 / 60;
  for (let i = 0; i < maxSeconds / frame; i++) {
    if (g.state !== STATES.PLAYING && g.state !== STATES.TABLE_INTRO) break;
    const cups = g.sim.cups.filter((c) => !c.fallen);
    const avg = cups.reduce((s, c) => s + c.x + c.v * 0.6, 0) / cups.length;
    g.setInput(avg > 15, avg < -15);
    g.update(frame);
  }
  g.setInput(false, false);
}

function completeDelivery(g) {
  playBalanced(g, 20);
  assert.equal(g.state, STATES.DELIVERY_COMPLETE, 'delivery completed');
}

function forceFall(g) {
  while (g.state === STATES.TABLE_INTRO) g.update(1 / 60);
  assert.equal(g.state, STATES.PLAYING);
  g.setInput(false, true);
  advance(g, 8);
  g.setInput(false, false);
}

test('nothing simulates before Start', () => {
  const g = newGame();
  const xs = g.sim.cups.map((c) => c.x);
  g.setInput(false, true);
  advance(g, 3);
  assert.equal(g.state, STATES.INTRO);
  assert.equal(g.simTime, 0);
  assert.deepEqual(g.sim.cups.map((c) => c.x), xs);
});

test('first visit shows practice; after it, restarts skip it', () => {
  const storage = memStorage();
  const g = new Game({ seed: 1, storage });
  g.start();
  assert.equal(g.state, STATES.TUTORIAL);
  assert.equal(g.sim.cups.length, 1);
  assert.equal(g.finishTutorial(), false, 'cannot finish before tilting both ways');
  g.setInput(true, false); advance(g, 0.5);
  g.setInput(false, true); advance(g, 0.6);
  g.setInput(false, false); advance(g, 0.8);
  assert.equal(g.tutorial.phase, 'ready');
  assert.equal(g.unbanked, 0);
  assert.ok(g.finishTutorial());
  assert.equal(g.state, STATES.TABLE_INTRO);
  assert.equal(g.delivery, 1, 'practice is not a delivery');
  assert.equal(storage.map.get('dns.practiced'), '1');
  const g2 = new Game({ seed: 1, storage });
  g2.start();
  assert.equal(g2.state, STATES.TABLE_INTRO, 'practice not forced again');
});

test('skip practice goes straight to delivery 1', () => {
  const g = new Game({ seed: 1, storage: memStorage() });
  g.start();
  assert.ok(g.skipTutorial());
  assert.equal(g.state, STATES.TABLE_INTRO);
  assert.equal(g.delivery, 1);
  assert.equal(g.sim.cups.length, 2);
});

test('tilt target: left, right, both = neutral, eased with ~0.12 s response', () => {
  const g = newGame(); g.start(); advance(g, 1.4);
  assert.equal(g.state, STATES.PLAYING);
  g.setInput(true, false); assert.equal(g.targetDeg(), -9);
  g.setInput(false, true); assert.equal(g.targetDeg(), 9);
  g.setInput(true, true); assert.equal(g.targetDeg(), 0);
  g.setInput(false, true);
  const a0 = g.angle;
  advance(g, 0.12, 1 / 120);
  const frac = (g.angle - a0) / (9 * Math.PI / 180 - a0);
  assert.ok(frac > 0.55 && frac < 0.72, `~63% after one time constant, got ${frac}`);
});

test('updates are frame-rate independent', () => {
  function runAt(frame) {
    const g = newGame(); g.start();
    advance(g, 1.4, frame);
    g.setInput(false, true); advance(g, 0.8, frame);
    g.setInput(true, false); advance(g, 1.2, frame);
    g.setInput(false, false); advance(g, 1.0, frame);
    return g;
  }
  const a = runAt(1 / 30), b = runAt(1 / 144), c = runAt(1 / 60);
  for (const other of [b, c]) {
    a.sim.cups.forEach((cup, i) => {
      assert.ok(Math.abs(cup.x - other.sim.cups[i].x) < 1.5, `cup ${i} x ${cup.x} vs ${other.sim.cups[i].x}`);
    });
    assert.ok(Math.abs(a.simTime - other.simTime) < 0.05);
  }
});

test('a huge frame (returning from a hidden tab) cannot jump the physics', () => {
  const g = newGame(); g.start(); advance(g, 1.4);
  const t0 = g.simTime;
  g.update(30);
  assert.ok(g.simTime - t0 <= CONFIG.physics.maxCatchUp + 1e-9);
  g.update(NaN); g.update(-5);
  assert.ok(Number.isFinite(g.simTime));
});

test('pause freezes physics, progress and bumps; resume is explicit', () => {
  const g = newGame(); g.start(); advance(g, 1.4);
  g.setInput(false, true); advance(g, 0.4);
  assert.ok(g.pause('hidden'));
  assert.equal(g.input.right, false, 'held input cleared');
  const snap = JSON.stringify({ t: g.simTime, x: g.sim.cups.map((c) => c.x), b: g.bumps });
  advance(g, 5);
  assert.equal(JSON.stringify({ t: g.simTime, x: g.sim.cups.map((c) => c.x), b: g.bumps }), snap);
  assert.equal(g.state, STATES.PAUSED);
  assert.ok(g.resume());
  assert.equal(g.state, STATES.PLAYING);
  advance(g, 0.2);
  assert.ok(g.simTime > JSON.parse(snap).t);
  assert.equal(g.resume(), false);
});

test('delivery completes after 12 s of active simulation with the right reward', () => {
  const g = newGame(); g.start();
  completeDelivery(g);
  assert.ok(Math.abs(g.simTime - 12) < 0.02);
  const r = g.lastResult;
  assert.equal(r.base, 100);
  assert.equal(r.perfect, g.splashes === 0 ? 50 : 0);
  assert.equal(g.unbanked, r.total);
});

test('reward calculation', () => {
  assert.deepEqual(rewardFor(1, 0, CONFIG), { base: 100, perfect: 50, total: 150 });
  assert.deepEqual(rewardFor(2, 3, CONFIG), { base: 200, perfect: 0, total: 200 });
  assert.deepEqual(rewardFor(4, 0, CONFIG), { base: 400, perfect: 50, total: 450 });
});

test('splashes only reduce the bonus, never the base reward', () => {
  const g = newGame(); g.start(); advance(g, 1.4);
  g.splashes = 7;
  completeDelivery(g);
  assert.equal(g.lastResult.base, 100);
  assert.equal(g.lastResult.perfect, 0);
  assert.equal(g.unbanked, 100);
});

test('slow motion during the delivery stretches real time consistently', () => {
  const g = newGame(); g.start(); advance(g, 1.4);
  g.slowmoRemaining = 0.3;
  const t0 = g.simTime;
  advance(g, 0.3, 1 / 120);
  const simulated = g.simTime - t0;
  assert.ok(Math.abs(simulated - 0.3 * 0.65) < 0.02, `0.3 s real ≈ 0.195 s sim, got ${simulated}`);
  assert.equal(g.slowmoRemaining, 0);
});

test('entering danger triggers one slow-mo, with cooldown and re-arm rules', () => {
  const g = newGame(); g.start(); advance(g, 1.4);
  const c = g.sim.cups[1];
  const edge = CONFIG.tray.width / 2;
  c.x = edge - 10; c.v = 0;
  g.update(1 / 50);
  let ev = g.drainEvents().map((e) => e.type);
  assert.ok(ev.includes('slowmo') && ev.includes('danger'));
  // still in danger: no retrigger
  for (let i = 0; i < 30; i++) { c.x = edge - 10; c.v = 0; g.update(1 / 50); }
  ev = g.drainEvents().map((e) => e.type);
  assert.ok(!ev.includes('slowmo'));
  // leave danger, re-enter during cooldown: no slow-mo
  c.x = 0; c.v = 0; g.update(1 / 50);
  ev = g.drainEvents().map((e) => e.type);
  assert.ok(ev.includes('niceSave'));
  c.x = edge - 10; g.update(1 / 50);
  ev = g.drainEvents().map((e) => e.type);
  assert.ok(ev.includes('danger') && !ev.includes('slowmo'), 'cooldown respected');
});

test('one more table: preserves tips, adds a cup, resets cups safely', () => {
  const g = newGame(); g.start();
  completeDelivery(g);
  const tips = g.unbanked;
  assert.ok(g.continueShift());
  assert.equal(g.continueShift(), false, 'duplicate activation rejected');
  assert.equal(g.state, STATES.TABLE_INTRO);
  assert.equal(g.delivery, 2);
  assert.equal(g.unbanked, tips);
  assert.equal(g.sim.cups.length, 3);
  for (const c of g.sim.cups) { assert.equal(c.v, 0); assert.ok(Math.abs(c.x) < 120); }
  assert.equal(g.simTime, 0);
  assert.equal(g.splashes, 0);
});

test('cup count follows 2,3,4,5 and caps at five', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 12].map((n) => cupsForDelivery(n, CONFIG)), [2, 3, 4, 5, 5, 5, 5]);
});

test('finish shift banks exactly once and records best', () => {
  const storage = memStorage({ 'dns.practiced': '1' });
  const g = new Game({ seed: 99, storage });
  g.start(); completeDelivery(g);
  const tips = g.unbanked;
  assert.ok(g.finishShift());
  assert.equal(g.finishShift(), false);
  assert.equal(g.continueShift(), false);
  assert.equal(g.state, STATES.SHIFT_COMPLETE);
  assert.equal(g.sessionBanked, tips);
  assert.equal(g.unbanked, 0);
  assert.equal(g.best, tips);
  assert.equal(g.lastShift.newBest, true);
  assert.equal(storage.map.get('dns.best'), String(tips));
  // A smaller second shift does not overwrite best
  g.restart(); completeDelivery(g); g.splashes = 0;
  g.finishShift();
  assert.equal(g.sessionBanked, tips + g.lastShift.banked);
  assert.equal(g.best, Math.max(tips, g.lastShift.banked));
});

test('failure loses only unbanked tips and cannot be banked', () => {
  const g = newGame(); g.start();
  completeDelivery(g); g.finishShift();
  const banked = g.sessionBanked;
  g.restart(); completeDelivery(g);
  const atRisk = g.unbanked;
  g.continueShift();
  forceFall(g);
  assert.ok(g.state === STATES.SPILLING || g.state === STATES.GAME_OVER);
  assert.equal(g.finishShift(), false, 'no banking after a fall');
  advance(g, 2);
  assert.equal(g.state, STATES.GAME_OVER);
  assert.equal(g.lastFail.lost, atRisk);
  assert.equal(g.lastFail.previouslyBanked, banked);
  assert.equal(g.sessionBanked, banked);
  assert.equal(g.unbanked, 0);
});

test('restart clears old run state and old events are tagged with the old run', () => {
  const g = newGame(); g.start(); completeDelivery(g); g.continueShift();
  forceFall(g); advance(g, 2);
  const oldRun = g.runId;
  g.drainEvents();
  assert.ok(g.restart());
  assert.equal(g.restart(), false);
  assert.notEqual(g.runId, oldRun);
  assert.equal(g.delivery, 1);
  assert.equal(g.unbanked, 0);
  assert.equal(g.history.length, 0);
  assert.equal(g.lastFail, null);
  assert.equal(g.sim.cups.length, 2);
  assert.ok(g.sim.cups.every((c) => !c.fallen && c.v === 0));
  assert.ok(g.drainEvents().every((e) => e.runId === g.runId));
});

test('only relevant commands are accepted in each state', () => {
  const g = newGame();
  assert.equal(g.finishShift(), false);
  assert.equal(g.continueShift(), false);
  assert.equal(g.restart(), false);
  assert.equal(g.resume(), false);
  assert.equal(g.pause(), false, 'no pause on the intro');
  g.start();
  assert.equal(g.start(), false);
  assert.equal(g.restart(), false);
});

test('bump schedule obeys counts, telegraph, spacing and edge guards', () => {
  for (let seed = 1; seed < 400; seed++) {
    for (let n = 1; n <= 8; n++) {
      const rng = RNG.mulberry32(RNG.hashSeed(seed, n));
      const b = scheduleBumps(n, rng, CONFIG);
      if (n === 1) assert.equal(b.length, 0);
      if (n === 2) assert.equal(b.length, 1);
      if (n === 3) assert.ok(b.length >= 1 && b.length <= 2);
      if (n >= 4) assert.equal(b.length, 2);
      for (const x of b) {
        assert.ok(x.at - x.warnAt >= 1.2);
        assert.ok(x.at >= 2 && x.at <= CONFIG.delivery.duration - 2);
        assert.ok(x.mag >= 14 && x.mag <= 22);
        assert.equal(x.dir, -x.side);
      }
      if (b.length === 2) assert.ok(b[1].at - b[0].at >= 4 - 1e-9);
    }
  }
});

test('bump schedules are reproducible for a seed', () => {
  const a = new Game({ seed: 77, storage: memStorage({ 'dns.practiced': '1' }) });
  const b = new Game({ seed: 77, storage: memStorage({ 'dns.practiced': '1' }) });
  a.start(); b.start();
  for (const g of [a, b]) { completeDelivery(g); g.continueShift(); }
  assert.deepEqual(a.bumps, b.bumps);
  assert.equal(a.bumps.length, 1);
});

test('a telegraphed bump warns, then applies a bounded push', () => {
  const g = newGame(); g.start(); completeDelivery(g); g.continueShift();
  advance(g, 1.4);
  const b = g.bumps[0];
  let warnT = null, bumpT = null;
  for (let i = 0; i < 12 * 120 && g.state === STATES.PLAYING; i++) {
    const cups = g.sim.cups;
    const avg = cups.reduce((s, c) => s + c.x, 0) / cups.length;
    g.setInput(avg > 15, avg < -15);
    g.update(1 / 120);
    for (const e of g.drainEvents()) {
      if (e.type === 'bumpWarn') warnT = g.simTime;
      if (e.type === 'bump') { bumpT = g.simTime; assert.ok(e.mag >= 14 && e.mag <= 22); }
    }
  }
  assert.ok(warnT !== null && bumpT !== null);
  assert.ok(bumpT - warnT >= 1.2);
  assert.ok(Math.abs(bumpT - b.at) < 0.02);
});

test('storage failures never interrupt play', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
  const g = new Game({ seed: 5, storage: broken });
  g.start(); g.skipTutorial();
  completeDelivery(g);
  assert.ok(g.finishShift());
  assert.ok(g.best > 0);
});

test('counters stay finite and nonnegative', () => {
  const storage = memStorage({ 'dns.practiced': '1', 'dns.best': 'garbage' });
  const g = new Game({ seed: 5, storage });
  assert.equal(g.best, 0);
  g.start(); completeDelivery(g);
  for (const v of [g.unbanked, g.sessionBanked, g.best, g.delivery, g.splashes]) {
    assert.ok(Number.isFinite(v) && v >= 0);
  }
});
