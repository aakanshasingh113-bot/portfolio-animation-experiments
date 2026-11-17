/*
 * Don't Crush It — game simulation.
 *
 * Pure, deterministic logic: no DOM, no timers, no rendering. Everything
 * advances through update(dt), so the same inputs always give the same result.
 * Loaded as a classic script in the browser (window.DCI.sim) and as a
 * CommonJS module in Node for the automated checks.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.DCI = root.DCI || {}; root.DCI.sim = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var S = {
    READY: 'READY', AIMING: 'AIMING', LOWERING: 'LOWERING', GRIPPING: 'GRIPPING',
    LIFTING: 'LIFTING', RETURNING: 'RETURNING', DROPPING: 'DROPPING',
    ATTEMPT_RESULT: 'ATTEMPT_RESULT', ROUND_OVER: 'ROUND_OVER', PAUSED: 'PAUSED'
  };

  var C = {
    // Logical world (the chamber), in px. Rendering scales this to any size.
    W: 640, H: 440,
    FLOOR_Y: 398,          // where prizes stand
    TOP_HUB_Y: 86,         // claw hub height when fully raised
    HUB_GAP: 8,            // gap between hub and the top of a gripped prize
    EMPTY_REACH: 58,       // how far above the floor the hub stops on a miss
    AIM_MIN: 56, AIM_MAX: 584, START_X: 320, CHUTE_X: 78,
    SLOTS: [172, 284, 400, 516], JITTER: 4,

    ATTEMPTS: 3,
    PRESS_UP: 70, PRESS_DOWN: 45,          // pressure units per second
    GRIP_WINDOW: 2.5, HOLD_REQ: 0.25, LIFT_TIME: 2.4,
    CRUSH_RATE: 0.75, SLIP_RATE: 0.85, RECOVER_RATE: 0.35,
    FIRST_ATTEMPT_EASE: 0.75,
    GENTLE_MAX: 0.15, GENTLE_BONUS: 50,

    LOWER_TIME: 0.8, EMPTY_TIME: 0.45, RISE_TIME: 0.7, CARRY_TIME: 0.9,
    DROP_TIME: 0.75, INTRO_TIME: 0.45, FINAL_HOLD: 1.8,
    GRAVITY: 2200,
    MAX_DT: 0.1, STEP: 1 / 120
  };

  // halfW / h describe the silhouette; capture is the half-width of the zone
  // the claw centre must land in; soft is how far the material gives when squeezed.
  var PRIZES = {
    cake:   { name: 'Strawberry cake', short: 'cake',   min: 30, max: 55, points: 150, halfW: 36, h: 68, capture: 28, soft: 0.34 },
    soap:   { name: 'Slippery soap',   short: 'soap',   min: 55, max: 80, points: 100, halfW: 38, h: 44, capture: 30, soft: 0.10 },
    egg:    { name: 'Egg',             short: 'egg',    min: 20, max: 40, points: 200, halfW: 26, h: 64, capture: 22, soft: 0.06 },
    cactus: { name: 'Cactus toy',      short: 'cactus', min: 45, max: 70, points: 125, halfW: 32, h: 82, capture: 26, soft: 0.28 }
  };
  var TYPES = ['cake', 'soap', 'egg', 'cactus'];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); }

  function grabHubY(type) {
    return type ? C.FLOOR_Y - PRIZES[type].h - C.HUB_GAP : C.FLOOR_Y - C.EMPTY_REACH;
  }

  /** Personal-best rule: the first finished round only establishes a best. */
  function evaluateBest(prev, score) {
    var hasPrev = typeof prev === 'number' && isFinite(prev);
    if (!hasPrev) return { best: score, isNew: false, first: true };
    if (score > prev) return { best: score, isNew: true, first: false };
    return { best: prev, isNew: false, first: false };
  }

  function createGame(opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var g = { S: S, events: [], round: 0 };

    function emit(type, data) { var e = data || {}; e.type = type; g.events.push(e); }

    function newLineup() {
      var types = TYPES.slice();
      for (var i = types.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var tmp = types[i]; types[i] = types[j]; types[j] = tmp;
      }
      g.prizes = types.map(function (type, k) {
        return {
          type: type,
          x: C.SLOTS[k] + Math.round((rng() * 2 - 1) * C.JITTER),
          status: 'idle', // idle | gripped | held | carried | dropping | collected | crushed | slipped
          h: 0, vy: 0, bounced: false
        };
      });
    }

    function resetAttempt() {
      g.aimX = C.START_X; g.clawX = C.START_X; g.dropX = null;
      g.target = null; g.pressure = 0; g.hold = false;
      g.crush = 0; g.slip = 0; g.maxCrush = 0; g.maxSlip = 0;
      g.inBand = 0; g.depth = 0; g.retFrom = 0; g.emptyClose = 0;
      g.carrying = false; g.outcome = null; g.t = 0; g.lineupT = 0;
      g.pausedFrom = null;
      newLineup();
      g.state = S.READY;
    }

    g.restart = function () {
      g.round += 1; g.attempt = 1; g.score = 0;
      g.captured = []; g.results = [];
      g.events.length = 0;
      resetAttempt();
      emit('restart');
      return true;
    };

    /** The state the machine is really in, looking through a pause. */
    g.phase = function () { return g.state === S.PAUSED ? g.pausedFrom : g.state; };

    g.zone = function () {
      if (!g.target) return null;
      var d = PRIZES[g.target.type];
      return g.pressure < d.min ? 'low' : g.pressure > d.max ? 'high' : 'safe';
    };

    g.hubY = function () {
      return lerp(C.TOP_HUB_Y, grabHubY(g.target && g.target.type), g.depth);
    };

    // ---- inputs: each one is ignored unless the current state accepts it ----

    g.aim = function (x) {
      if (g.state !== S.READY && g.state !== S.AIMING) return false;
      if (typeof x !== 'number' || !isFinite(x)) return false;
      g.aimX = clamp(x, C.AIM_MIN, C.AIM_MAX);
      g.clawX = g.aimX;
      if (g.state === S.READY) { g.state = S.AIMING; emit('aim-start'); }
      return true;
    };

    g.pick = function (x) {
      var best = null, bestD = Infinity;
      for (var i = 0; i < g.prizes.length; i++) {
        var p = g.prizes[i];
        if (p.status !== 'idle') continue;
        var d = Math.abs(p.x - x);
        if (d <= PRIZES[p.type].capture && d < bestD) { best = p; bestD = d; }
      }
      return best;
    };

    g.drop = function () {
      if (g.state !== S.READY && g.state !== S.AIMING) return false;
      if (g.lineupT < 1) return false;               // lineup still arriving
      g.dropX = g.aimX; g.clawX = g.dropX;           // decided once, here
      g.target = g.pick(g.dropX);
      g.state = S.LOWERING; g.t = 0; g.hold = false;
      emit('drop', { hit: !!g.target });
      return true;
    };

    g.setHold = function (on) {
      if (!on) { g.hold = false; return true; }
      var gripping = (g.state === S.GRIPPING && g.target) || g.state === S.LIFTING;
      if (!gripping) return false;
      g.hold = true;
      return true;
    };

    g.next = function () {
      if (g.state !== S.ATTEMPT_RESULT) return false;
      if (g.attempt >= C.ATTEMPTS) { roundOver(); return true; }
      g.attempt += 1;
      resetAttempt();
      emit('next');
      return true;
    };

    g.pause = function () {
      var s = g.state;
      if (s !== S.LOWERING && s !== S.GRIPPING && s !== S.LIFTING && s !== S.RETURNING && s !== S.DROPPING) return false;
      g.pausedFrom = s; g.state = S.PAUSED; g.hold = false;
      emit('pause');
      return true;
    };

    g.resume = function () {
      if (g.state !== S.PAUSED) return false;
      g.state = g.pausedFrom; g.pausedFrom = null; g.hold = false;
      emit('resume');
      return true;
    };

    // ---- transitions ----

    function roundOver() {
      g.state = S.ROUND_OVER; g.t = 0; g.hold = false;
      emit('round-over', { score: g.score, captures: g.captured.length });
    }

    function finishAttempt() {
      g.state = S.ATTEMPT_RESULT; g.t = 0; g.hold = false;
      g.results.push(g.outcome);
      emit('result', { outcome: g.outcome });
    }

    function fail(cause) {
      var p = g.target;
      g.outcome = { ok: false, cause: cause, type: p ? p.type : null, points: 0, bonus: 0, total: 0 };
      g.hold = false; g.retFrom = g.depth;
      if (p) {
        var lifted = g.state === S.LIFTING ? (1 - g.depth) * (grabHubY(p.type) - C.TOP_HUB_Y) : 0;
        p.status = cause === 'crush' ? 'crushed' : 'slipped';
        p.h = lifted; p.bounced = false;
        p.vy = lifted > 0 ? 0 : (cause === 'slip' ? -190 : 0);   // a little hop when it squirts free on the floor
      }
      g.state = S.RETURNING; g.t = 0;
      emit('fail', { cause: cause, prize: p });
    }

    function stepPressure(dt) {
      g.pressure = clamp(g.pressure + (g.hold ? C.PRESS_UP : -C.PRESS_DOWN) * dt, 0, 100);
    }

    function stepLoosePrizes(dt) {
      for (var i = 0; i < g.prizes.length; i++) {
        var p = g.prizes[i];
        if (p.status !== 'crushed' && p.status !== 'slipped') continue;
        if (p.h <= 0 && p.vy === 0) continue;
        p.vy += C.GRAVITY * dt;
        p.h -= p.vy * dt;
        if (p.h <= 0) {
          p.h = 0;
          if (p.vy > 260 && !p.bounced) { p.vy = -p.vy * 0.26; p.bounced = true; emit('thud', { prize: p }); }
          else p.vy = 0;
        }
      }
    }

    function step(dt) {
      var d, p = g.target;
      switch (g.state) {
        case S.READY:
        case S.AIMING:
          if (g.lineupT < 1) g.lineupT = Math.min(1, g.lineupT + dt / C.INTRO_TIME);
          break;

        case S.LOWERING:
          g.t += dt;
          g.depth = easeInOut(g.t / C.LOWER_TIME);
          if (g.t >= C.LOWER_TIME) {
            g.depth = 1; g.t = 0; g.pressure = 0; g.inBand = 0; g.hold = false;
            g.state = S.GRIPPING;
            if (p) { p.status = 'gripped'; emit('touch', { prize: p }); }
            else { g.emptyClose = 0; emit('empty'); }
          }
          break;

        case S.GRIPPING:
          g.t += dt;
          if (!p) {                                    // nothing under the claw
            g.emptyClose = clamp(g.t / C.EMPTY_TIME, 0, 1);
            if (g.t >= C.EMPTY_TIME) fail('miss');
            break;
          }
          d = PRIZES[p.type];
          stepPressure(dt);
          if (g.pressure >= d.min && g.pressure <= d.max) g.inBand += dt; else g.inBand = 0;
          if (g.inBand >= C.HOLD_REQ) {
            g.state = S.LIFTING; g.t = 0;
            g.crush = 0; g.slip = 0; g.maxCrush = 0; g.maxSlip = 0;
            p.status = 'held';
            emit('lift-start', { prize: p });
          } else if (g.t >= C.GRIP_WINDOW) {
            // Never got a steady hold. If the claw was clamped down at the end
            // the honest feedback is "too tight"; otherwise it slipped.
            fail(g.pressure > d.max ? 'crush' : 'slip');
          }
          break;

        case S.LIFTING:
          d = PRIZES[p.type];
          stepPressure(dt);
          var k = g.attempt === 1 ? C.FIRST_ATTEMPT_EASE : 1;
          if (g.pressure > d.max) g.crush += C.CRUSH_RATE * k * dt;
          else if (g.pressure < d.min) g.slip += C.SLIP_RATE * k * dt;
          else { g.crush -= C.RECOVER_RATE * dt; g.slip -= C.RECOVER_RATE * dt; }
          g.crush = clamp(g.crush, 0, 1); g.slip = clamp(g.slip, 0, 1);
          if (g.crush > g.maxCrush) g.maxCrush = g.crush;
          if (g.slip > g.maxSlip) g.maxSlip = g.slip;
          g.t += dt;
          g.depth = 1 - easeInOut(g.t / C.LIFT_TIME);
          if (g.crush >= 1) { fail('crush'); break; }
          if (g.slip >= 1) { fail('slip'); break; }
          if (g.t >= C.LIFT_TIME) {
            g.depth = 0; g.hold = false; g.carrying = true;
            p.status = 'carried';
            g.state = S.RETURNING; g.t = 0;
            emit('lifted', { prize: p });
          }
          break;

        case S.RETURNING:
          g.t += dt;
          if (g.carrying) {
            g.clawX = lerp(g.dropX, C.CHUTE_X, easeInOut(g.t / C.CARRY_TIME));
            if (g.t >= C.CARRY_TIME) {
              g.clawX = C.CHUTE_X; g.state = S.DROPPING; g.t = 0;
              p.status = 'dropping';
              emit('release', { prize: p });
            }
          } else {
            g.depth = g.retFrom * (1 - easeOut(g.t / C.RISE_TIME));
            g.pressure = clamp(g.pressure - 240 * dt, 0, 100);
            g.emptyClose = clamp(g.emptyClose - dt * 2.5, 0, 1);
            if (g.t >= C.RISE_TIME) { g.depth = 0; finishAttempt(); }
          }
          break;

        case S.DROPPING:
          g.t += dt;
          g.pressure = clamp(g.pressure - 300 * dt, 0, 100);
          if (g.t >= C.DROP_TIME) {
            d = PRIZES[p.type];
            var gentle = g.maxCrush <= C.GENTLE_MAX && g.maxSlip <= C.GENTLE_MAX;
            var bonus = gentle ? C.GENTLE_BONUS : 0;
            g.outcome = { ok: true, cause: null, type: p.type, points: d.points, bonus: bonus, total: d.points + bonus };
            g.score += g.outcome.total;
            g.captured.push(p.type);
            p.status = 'collected';
            g.carrying = false;
            emit('collected', { prize: p, outcome: g.outcome });
            finishAttempt();
          }
          break;

        case S.ATTEMPT_RESULT:
          g.t += dt;
          g.pressure = clamp(g.pressure - 300 * dt, 0, 100);
          if (g.attempt >= C.ATTEMPTS && g.t >= C.FINAL_HOLD) roundOver();
          break;

        default: break;   // ROUND_OVER, PAUSED: nothing advances
      }
      if (g.state !== S.PAUSED) stepLoosePrizes(dt);
    }

    /** Advance the simulation. Large gaps are clamped so lost time can never cause a failure. */
    g.update = function (dt) {
      if (!(dt > 0) || g.state === S.PAUSED) return;
      dt = Math.min(dt, C.MAX_DT);
      while (dt > 1e-9) {
        var h = Math.min(dt, C.STEP);
        step(h);
        dt -= h;
        if (g.state === S.PAUSED) break;
      }
    };

    g.restart();
    return g;
  }

  return {
    S: S, C: C, PRIZES: PRIZES, TYPES: TYPES,
    createGame: createGame, evaluateBest: evaluateBest, grabHubY: grabHubY,
    clamp: clamp, lerp: lerp, easeInOut: easeInOut, easeOut: easeOut
  };
});
