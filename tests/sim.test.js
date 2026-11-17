'use strict';
// Run with:  node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../js/sim.js');
const { S, C, PRIZES, TYPES, createGame, evaluateBest } = sim;

function rngFrom(seed) {            // mulberry32
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 1 / 60;
function run(g, seconds, each) {
  for (let t = 0; t < seconds; t += DT) { if (each) each(); g.update(DT); }
}
function settle(g) { run(g, C.INTRO_TIME + 0.1); }
function prizeOf(g, type) { return g.prizes.find((p) => p.type === type); }
function dropOn(g, type) {
  settle(g);
  assert.equal(g.aim(prizeOf(g, type).x), true);
  assert.equal(g.drop(), true);
  run(g, C.LOWER_TIME + 0.05);
}
/** Bang-bang controller: squeeze when under the middle of the band. */
function gentle(g) {
  const d = PRIZES[g.target.type];
  g.setHold(g.pressure < (d.min + d.max) / 2);
}
function playUntilResult(g, controller) {
  let guard = 0;
  while (g.state !== S.ATTEMPT_RESULT && g.state !== S.ROUND_OVER && guard++ < 2000) {
    if (controller && (g.state === S.GRIPPING || g.state === S.LIFTING) && g.target) controller(g);
    g.update(DT);
  }
  assert.ok(guard < 2000, 'attempt should finish');
}

test('a new round starts idle with one of each prize, clearly separated', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = createGame({ rng: rngFrom(seed) });
    assert.equal(g.state, S.READY);
    assert.equal(g.attempt, 1);
    assert.equal(g.score, 0);
    assert.equal(g.aimX, C.START_X);
    assert.deepEqual(g.prizes.map((p) => p.type).sort(), TYPES.slice().sort());
    const xs = g.prizes.map((p) => p.x);
    for (let i = 1; i < xs.length; i++) {
      const a = g.prizes[i - 1], b = g.prizes[i];
      // capture zones never overlap, so a drop always has one unambiguous target
      assert.ok(b.x - PRIZES[b.type].capture > a.x + PRIZES[a.type].capture + 20);
    }
  }
});

test('nothing happens until the player acts', () => {
  const g = createGame({ rng: rngFrom(2) });
  run(g, 5);
  assert.equal(g.state, S.READY);
  assert.equal(g.attempt, 1);
});

test('aim is clamped to the chamber and locked after the drop', () => {
  const g = createGame({ rng: rngFrom(3) });
  settle(g);
  g.aim(-500); assert.equal(g.aimX, C.AIM_MIN);
  g.aim(5000); assert.equal(g.aimX, C.AIM_MAX);
  assert.equal(g.state, S.AIMING);
  g.aim(300);
  assert.equal(g.drop(), true);
  assert.equal(g.aim(100), false);
  assert.equal(g.dropX, 300);
  assert.equal(g.clawX, 300);
});

test('repeated drop inputs are ignored', () => {
  const g = createGame({ rng: rngFrom(4) });
  settle(g);
  g.aim(prizeOf(g, 'soap').x);
  assert.equal(g.drop(), true);
  assert.equal(g.drop(), false);
  assert.equal(g.drop(), false);
  assert.equal(g.events.filter((e) => e.type === 'drop').length, 1);
});

test('target is the nearest prize whose capture zone is hit; no snapping', () => {
  const g = createGame({ rng: rngFrom(5) });
  const p = g.prizes[1], cap = PRIZES[p.type].capture;
  assert.equal(g.pick(p.x), p);
  assert.equal(g.pick(p.x + cap), p);          // boundary is inclusive
  assert.equal(g.pick(p.x + cap + 1), null);
  assert.equal(g.pick((g.prizes[1].x + g.prizes[2].x) / 2), null);
});

test('a badly aligned drop is an empty grab that costs exactly one attempt', () => {
  const g = createGame({ rng: rngFrom(6) });
  settle(g);
  g.aim((g.prizes[2].x + g.prizes[3].x) / 2);
  g.drop();
  playUntilResult(g);
  assert.equal(g.state, S.ATTEMPT_RESULT);
  assert.equal(g.outcome.cause, 'miss');
  assert.equal(g.score, 0);
  assert.equal(g.results.length, 1);
  assert.equal(g.next(), true);
  assert.equal(g.attempt, 2);
  assert.equal(g.state, S.READY);
});

test('pressure follows the documented rates and stays within 0..100', () => {
  const g = createGame({ rng: rngFrom(7) });
  dropOn(g, 'soap');
  assert.equal(g.state, S.GRIPPING);
  assert.equal(g.pressure, 0);
  g.setHold(true);
  g.update(0.1); g.update(0.1); g.update(0.1); g.update(0.1); g.update(0.1);
  assert.ok(Math.abs(g.pressure - 35) < 1e-6, 'holds rise at 70/s, got ' + g.pressure);
  g.setHold(false);
  g.update(0.1); g.update(0.1);
  assert.ok(Math.abs(g.pressure - 26) < 1e-6, 'release falls at 45/s, got ' + g.pressure);
  run(g, 1.5);
  assert.equal(g.pressure, 0);

  // jam the control with erratic input for many rounds: never out of range
  const h = createGame({ rng: rngFrom(8) });
  const r = rngFrom(99);
  for (let i = 0; i < 20000; i++) {
    if (h.state === S.READY || h.state === S.AIMING) { h.aim(r() * 700 - 30); if (r() < 0.2) h.drop(); }
    if (h.state === S.ATTEMPT_RESULT) h.next();
    if (h.state === S.ROUND_OVER) h.restart();
    h.setHold(r() < 0.8);
    h.update(r() * 0.2);
    assert.ok(h.pressure >= 0 && h.pressure <= 100);
    assert.ok(h.crush >= 0 && h.crush <= 1 && h.slip >= 0 && h.slip <= 1);
    assert.ok(h.attempt >= 1 && h.attempt <= C.ATTEMPTS);
    assert.ok(h.score >= 0);
  }
});

test('safe-band edges count as safe', () => {
  const g = createGame({ rng: rngFrom(9) });
  dropOn(g, 'egg');
  g.pressure = PRIZES.egg.min; assert.equal(g.zone(), 'safe');
  g.pressure = PRIZES.egg.max; assert.equal(g.zone(), 'safe');
  g.pressure = PRIZES.egg.min - 0.01; assert.equal(g.zone(), 'low');
  g.pressure = PRIZES.egg.max + 0.01; assert.equal(g.zone(), 'high');
});

test('every prize can be captured with controlled input, on every seed and attempt', () => {
  for (let seed = 1; seed <= 25; seed++) {
    for (const type of TYPES) {
      const g = createGame({ rng: rngFrom(seed) });
      // burn a variable number of attempts first so later attempts (no easing) are covered
      for (let burn = 0; burn < seed % 3; burn++) {
        settle(g); g.aim(C.AIM_MIN); g.drop(); playUntilResult(g); g.next();
      }
      const before = g.score;
      dropOn(g, type);
      assert.equal(g.target.type, type);
      playUntilResult(g, gentle);
      assert.equal(g.outcome.ok, true, type + ' seed ' + seed);
      assert.equal(g.outcome.points, PRIZES[type].points);
      assert.equal(g.outcome.grade, 'perfect', 'never left the band');
      assert.equal(g.outcome.bonus, C.PERFECT_BONUS);
      assert.equal(g.outcome.aim, C.BULLSEYE_BONUS, 'dropped dead centre');
      assert.equal(g.outcome.streak, 1, 'missed attempts reset the streak');
      assert.equal(g.score - before, PRIZES[type].points + C.PERFECT_BONUS + C.BULLSEYE_BONUS);
      assert.equal(g.captured[g.captured.length - 1], type);
    }
  }
});

test('identical inputs give identical results (no hidden randomness)', () => {
  function play(seed) {
    const g = createGame({ rng: rngFrom(seed) });
    for (let a = 0; a < 3; a++) {
      dropOn(g, TYPES[a]);
      playUntilResult(g, gentle);
      g.next();
    }
    return JSON.stringify([g.score, g.captured, g.results]);
  }
  assert.equal(play(42), play(42));
});

test('grip begins lifting only after 250 ms continuously in the band', () => {
  const g = createGame({ rng: rngFrom(10) });
  dropOn(g, 'egg');
  g.setHold(true);
  let liftedAt = null, enteredAt = null, t = 0;
  while (g.state === S.GRIPPING && t < 3) {
    g.update(1 / 240); t += 1 / 240;
    if (enteredAt === null && g.pressure >= 20) enteredAt = t;
  }
  liftedAt = t;
  assert.equal(g.state, S.LIFTING);
  assert.ok(liftedAt - enteredAt >= C.HOLD_REQ - 0.01 && liftedAt - enteredAt <= C.HOLD_REQ + 0.03);
});

test('never establishing grip within 2.5 s makes the prize slip', () => {
  const g = createGame({ rng: rngFrom(11) });
  dropOn(g, 'soap');
  run(g, C.GRIP_WINDOW - 0.1);
  assert.equal(g.state, S.GRIPPING);
  playUntilResult(g);
  assert.equal(g.outcome.cause, 'slip');
  assert.equal(g.captured.length, 0);
});

test('squeezing too hard during the lift crushes; letting go slips', () => {
  for (const type of TYPES) {
    const a = createGame({ rng: rngFrom(12) });
    dropOn(a, type);
    playUntilResult(a, (g) => g.setHold(true));
    assert.equal(a.outcome.cause, 'crush', type);
    assert.equal(prizeOf(a, type).status, 'crushed');

    const b = createGame({ rng: rngFrom(12) });
    dropOn(b, type);
    playUntilResult(b, (g) => { if (g.state === S.GRIPPING) gentle(g); else g.setHold(false); });
    assert.equal(b.outcome.cause, 'slip', type);
    assert.equal(b.score, 0);
  }
});

test('brief deviations are recoverable', () => {
  const g = createGame({ rng: rngFrom(13) });
  dropOn(g, 'cactus');
  let t = 0;
  playUntilResult(g, (gm) => {
    if (gm.state === S.LIFTING) {
      t += DT;
      if (t > 0.6 && t < 1.0) { gm.setHold(true); return; }   // 0.4 s of over-squeezing
    }
    gentle(gm);
  });
  assert.equal(g.outcome.ok, true);
  assert.ok(g.maxCrush > C.GENTLE_MAX, 'the wobble registered as damage');
  assert.equal(g.outcome.bonus, 0, 'and cost the grip bonus');
  assert.equal(g.outcome.grade, 'ok');
});

test('the first attempt accumulates damage at 0.75x', () => {
  function crushAfter(attemptIndex) {
    const g = createGame({ rng: rngFrom(14) });
    for (let i = 0; i < attemptIndex; i++) { settle(g); g.aim(C.AIM_MIN); g.drop(); playUntilResult(g); g.next(); }
    dropOn(g, 'egg');
    g.setHold(true);
    while (g.state === S.GRIPPING) g.update(DT);
    while (g.pressure <= PRIZES.egg.max) g.update(1 / 240);
    const c0 = g.crush;
    run(g, 0.5);
    return g.crush - c0;
  }
  const first = crushAfter(0), second = crushAfter(1);
  assert.ok(Math.abs(first / second - C.FIRST_ATTEMPT_EASE) < 0.02, first + ' vs ' + second);
  assert.ok(Math.abs(second - C.CRUSH_RATE * 0.5) < 0.02);
});

test('hold input is only accepted while gripping or lifting', () => {
  const g = createGame({ rng: rngFrom(15) });
  assert.equal(g.setHold(true), false);
  settle(g); g.aim(prizeOf(g, 'cake').x); g.drop();
  assert.equal(g.setHold(true), false, 'not while lowering');
  run(g, C.LOWER_TIME + 0.05);
  assert.equal(g.hold, false, 'a press made earlier is not carried into the grip');
  assert.equal(g.setHold(true), true);
  playUntilResult(g, gentle);
  assert.equal(g.hold, false, 'grip input is locked after the lift');
  assert.equal(g.setHold(true), false);
});

test('a round is exactly three attempts, each counted once', () => {
  const g = createGame({ rng: rngFrom(16) });
  for (let a = 1; a <= 3; a++) {
    assert.equal(g.attempt, a);
    dropOn(g, 'soap');
    playUntilResult(g, gentle);
    assert.equal(g.results.length, a);
    // soap 100 + perfect 100 + bullseye 25, plus 50 for each capture in a row after the first
    assert.equal(g.outcome.streakBonus, (a - 1) * 50);
    assert.equal(g.score, a * 225 + [0, 0, 50, 150][a]);
    assert.equal(g.next(), true);
    assert.equal(g.next(), false, 'double "next" does nothing');
  }
  assert.equal(g.state, S.ROUND_OVER);
  assert.equal(g.attempt, 3);
  assert.equal(g.captured.length, 3);
  assert.equal(g.drop(), false);
  assert.equal(g.next(), false);
  run(g, 3);
  assert.equal(g.score, 825);
  assert.equal(g.events.filter((e) => e.type === 'collected').length, 3);
});

test('the last result moves on to the round summary by itself', () => {
  const g = createGame({ rng: rngFrom(17) });
  for (let a = 1; a <= 3; a++) { settle(g); g.aim(C.AIM_MIN); g.drop(); playUntilResult(g); if (a < 3) g.next(); }
  assert.equal(g.state, S.ATTEMPT_RESULT);
  run(g, C.FINAL_HOLD + 0.1);
  assert.equal(g.state, S.ROUND_OVER);
});

test('pausing freezes everything; lost time cannot cause a failure', () => {
  const g = createGame({ rng: rngFrom(18) });
  dropOn(g, 'egg');
  g.setHold(true);
  while (g.state === S.GRIPPING) g.update(DT);
  g.setHold(false);
  const snap = [g.pressure, g.slip, g.crush, g.t, g.depth];
  assert.equal(g.pause(), true);
  assert.equal(g.state, S.PAUSED);
  assert.equal(g.hold, false);
  assert.equal(g.setHold(true), false);
  for (let i = 0; i < 100; i++) g.update(10);
  assert.deepEqual([g.pressure, g.slip, g.crush, g.t, g.depth], snap);
  assert.equal(g.resume(), true);
  assert.equal(g.state, S.LIFTING);
  assert.equal(g.hold, false, 'resuming never resumes a hold');

  // even without a pause, one enormous frame is clamped
  g.update(60);
  assert.equal(g.state, S.LIFTING);
  assert.ok(g.slip < 0.2);

  const idle = createGame({ rng: rngFrom(19) });
  assert.equal(idle.pause(), false, 'nothing to pause while waiting for the player');
});

test('restart clears the previous round, including pending events', () => {
  const g = createGame({ rng: rngFrom(20) });
  dropOn(g, 'cake');
  g.setHold(true); run(g, 0.8);
  assert.equal(g.state, S.LIFTING);
  g.restart();
  assert.equal(g.state, S.READY);
  assert.equal(g.attempt, 1);
  assert.equal(g.score, 0);
  assert.equal(g.pressure, 0);
  assert.equal(g.hold, false);
  assert.equal(g.target, null);
  assert.deepEqual(g.captured, []);
  assert.deepEqual(g.events.map((e) => e.type), ['restart']);
  assert.ok(g.prizes.every((p) => p.status === 'idle'));
  run(g, 5);
  assert.equal(g.state, S.READY, 'nothing from the old round leaks into the new one');
});

test('personal best: first round establishes, only a higher score celebrates', () => {
  assert.deepEqual(evaluateBest(null, 300), { best: 300, isNew: false, first: true });
  assert.deepEqual(evaluateBest(NaN, 0), { best: 0, isNew: false, first: true });
  assert.deepEqual(evaluateBest(300, 300), { best: 300, isNew: false, first: false });
  assert.deepEqual(evaluateBest(300, 250), { best: 300, isNew: false, first: false });
  assert.deepEqual(evaluateBest(300, 350), { best: 350, isNew: true, first: false });
});

test('grades, bullseye and streak bonuses add up; a failure breaks the streak', () => {
  const g = createGame({ rng: rngFrom(31) });
  // off-centre but inside the zone: no bullseye
  settle(g);
  g.aim(prizeOf(g, 'cake').x + C.BULLSEYE + 6); g.drop(); run(g, C.LOWER_TIME + 0.05);
  assert.equal(g.target.type, 'cake');
  playUntilResult(g, gentle);
  assert.equal(g.outcome.aim, 0);
  assert.equal(g.outcome.total, 150 + 100);
  g.next();
  // gentle but not perfect: a short over-squeeze mid-lift
  dropOn(g, 'cactus');
  let t = 0;
  playUntilResult(g, (gm) => { if (gm.state === S.LIFTING) { t += DT; if (t > 0.5 && t < 0.73) { gm.setHold(true); return; } } gentle(gm); });
  assert.ok(g.maxCrush > C.PERFECT_MAX && g.maxCrush <= C.GENTLE_MAX, 'maxCrush ' + g.maxCrush);
  assert.equal(g.outcome.grade, 'gentle');
  assert.equal(g.outcome.streak, 2);
  assert.equal(g.outcome.total, 125 + 50 + 25 + 50);
  g.next();
  dropOn(g, 'egg');
  playUntilResult(g, (gm) => gm.setHold(true));
  assert.equal(g.outcome.ok, false);
  assert.equal(g.streak, 0);
  assert.equal(g.score, 250 + 250);
});

test('the claw locks on anywhere across a prize body, but gaps still miss', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const g = createGame({ rng: rngFrom(seed) });
    for (const p of g.prizes) {
      const d = PRIZES[p.type];
      assert.ok(d.capture >= d.halfW, p.type + ' zone covers its whole silhouette');
      assert.equal(g.pick(p.x - d.halfW), p); assert.equal(g.pick(p.x + d.halfW), p);
    }
  }
});

test('stars follow the round score', () => {
  assert.equal(sim.stars(0), 0); assert.equal(sim.stars(149), 0); assert.equal(sim.stars(150), 1);
  assert.equal(sim.stars(450), 2); assert.equal(sim.stars(799), 2); assert.equal(sim.stars(800), 3);
});
