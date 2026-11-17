/*
 * Authoritative game state machine. Pure logic: the browser layer feeds it
 * real frame time and input, then drains `events` for sound, voice and effects.
 */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});
  if (typeof require === 'function') {
    if (!NS.CONFIG) require('./config.js');
    if (!NS.RNG) require('./rng.js');
    if (!NS.TraySim) require('./physics.js');
  }

  const S = Object.freeze({
    INTRO: 'INTRO',
    TUTORIAL: 'TUTORIAL',
    TABLE_INTRO: 'TABLE_INTRO',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    DELIVERY_COMPLETE: 'DELIVERY_COMPLETE',
    SPILLING: 'SPILLING',
    SHIFT_COMPLETE: 'SHIFT_COMPLETE',
    GAME_OVER: 'GAME_OVER',
  });
  const PAUSABLE = [S.TUTORIAL, S.TABLE_INTRO, S.PLAYING];
  const DEG = Math.PI / 180;

  function finiteNonNeg(v) { return Number.isFinite(v) && v > 0 ? v : 0; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function cupsForDelivery(n, cfg) {
    const list = cfg.delivery.cupsByDelivery;
    const c = list[Math.min(Math.max(1, n), list.length) - 1];
    return Math.min(cfg.delivery.maxCups, c);
  }

  function rewardFor(delivery, splashes, cfg) {
    const base = cfg.delivery.baseReward * Math.max(1, Math.floor(delivery));
    const perfect = splashes === 0 ? cfg.delivery.perfectBonus : 0;
    return { base, perfect, total: base + perfect };
  }

  function ambientAmpFor(n, cfg) {
    const A = cfg.ambient;
    return Math.min(A.maxAmp, A.baseAmp + A.ampPerDelivery * (Math.max(1, n) - 1));
  }

  /** Deterministic bump schedule for one delivery. */
  function scheduleBumps(n, rng, cfg) {
    const B = cfg.bumps;
    const dur = cfg.delivery.duration;
    const list = B.countByDelivery;
    let count = list[Math.min(Math.max(1, n), list.length) - 1];
    if (n === 3) count = rng() < B.deliveryThreeSecondChance ? 2 : 1;
    count = Math.min(2, count);
    const early = Math.max(B.earliestImpact, B.edgeGuard, B.warnLead);
    const late = Math.min(dur - B.latestImpactFromEnd, dur - B.edgeGuard);
    const times = [];
    if (count === 1) {
      times.push(early + rng() * (late - early));
    } else if (count === 2) {
      const t1 = early + rng() * Math.max(0, late - B.minGap - early) * 0.5;
      const t2 = t1 + B.minGap + rng() * Math.max(0, late - t1 - B.minGap);
      times.push(t1, t2);
    }
    const lo = Math.min(B.minImpulse + (n - 2) * 1.5, B.maxImpulse - 3);
    const hi = Math.min(lo + 3, B.maxImpulse);
    return times.map((at, i) => {
      const side = rng() < 0.5 ? -1 : 1; // side the customer comes from
      const mag = clamp(lo + rng() * (hi - lo), B.minImpulse, B.maxImpulse);
      return { index: i, at, warnAt: at - B.warnLead, side, dir: -side, mag, warned: false, applied: false };
    });
  }

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.cfg = opts.config || NS.CONFIG;
      this.storage = opts.storage || null;
      this.baseSeed = (opts.seed >>> 0) || ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
      this.sim = new NS.TraySim(this.cfg);
      this.events = [];
      this.sessionBanked = 0;
      this.best = Math.floor(finiteNonNeg(Number(this._load('best'))));
      this.practiced = this._load('practiced') === '1';
      this.runId = 0;
      this.input = { left: false, right: false };
      this.prevState = null;
      this.realTime = 0;
      this.travel = 0;
      this._resetRun();
      this._resetDeliveryVars(1);
      this.sim.reset(cupsForDelivery(1, this.cfg));
      this.state = S.INTRO;
    }

    // ---------- storage (never throws) ----------
    _load(key) {
      try { return this.storage ? this.storage.getItem('dns.' + key) : null; } catch (e) { return null; }
    }
    _save(key, value) {
      try { if (this.storage) this.storage.setItem('dns.' + key, String(value)); } catch (e) { /* ignore */ }
    }

    _emit(type, data) {
      const ev = Object.assign({ type, runId: this.runId, delivery: this.delivery }, data || {});
      this.events.push(ev);
      if (this.events.length > 200) this.events.shift();
    }
    drainEvents() { const e = this.events; this.events = []; return e; }

    _setState(s) {
      const from = this.state;
      this.state = s;
      this._emit('state', { from, to: s });
    }

    _resetRun() {
      this.runId++;
      this.delivery = 0;
      this.unbanked = 0;
      this.history = [];
      this.lastResult = null;
      this.lastShift = null;
      this.lastFail = null;
      this.bumpLinesSaid = 0;
    }

    _resetDeliveryVars(n) {
      const cfg = this.cfg;
      this.delivery = n;
      this.rng = NS.RNG.mulberry32(NS.RNG.hashSeed(this.baseSeed, this.runId, n));
      this.simTime = 0;
      this.acc = 0;
      this.angle = 0;
      this.splashes = 0;
      this.bumps = [];
      this.ambientAmp = 0;
      this.ambientPhase = [this.rng() * Math.PI * 2, this.rng() * Math.PI * 2];
      this.slowmoRemaining = 0;
      this.slowmoCooldown = 0;
      this.niceSaveShown = false;
      this.phaseT = 0;
      this.introTimer = 0;
      this.jolt = 0;
      this.lastRattle = -1;
      this.fallen = null;
      this.lastAmbient = 0;
    }

    _beginDelivery(n) {
      this._resetDeliveryVars(n);
      this.ambientAmp = ambientAmpFor(n, this.cfg);
      this.bumps = scheduleBumps(n, this.rng, this.cfg);
      this.sim.reset(cupsForDelivery(n, this.cfg));
      this.introTimer = this.cfg.timing.tableIntro;
      this._setState(S.TABLE_INTRO);
      this._emit('tableIntro', { cups: this.sim.cups.length });
    }

    // ---------- public commands (each guarded by state) ----------
    start() {
      if (this.state !== S.INTRO) return false;
      if (this.practiced) { this._resetRun(); this._beginDelivery(1); }
      else this._startTutorial();
      return true;
    }

    _startTutorial() {
      this._resetDeliveryVars(1);
      this.delivery = 0;
      this.sim.reset(1);
      this.tutorial = { left: false, right: false, phase: 'practice' };
      this._setState(S.TUTORIAL);
      this._emit('tutorialStart');
    }

    skipTutorial() { return this._leaveTutorial(); }
    finishTutorial() {
      if (this.state !== S.TUTORIAL || !this.tutorial || this.tutorial.phase !== 'ready') return false;
      return this._leaveTutorial();
    }
    _leaveTutorial() {
      if (this.state !== S.TUTORIAL) return false;
      this.practiced = true;
      this._save('practiced', '1');
      this.tutorial = null;
      this._resetRun();
      this._beginDelivery(1);
      return true;
    }

    pause(reason) {
      if (PAUSABLE.indexOf(this.state) === -1) return false;
      this.prevState = this.state;
      this.input.left = this.input.right = false;
      this.acc = 0;
      this._setState(S.PAUSED);
      this._emit('paused', { reason: reason || 'user' });
      return true;
    }

    resume() {
      if (this.state !== S.PAUSED || !this.prevState) return false;
      this.acc = 0;
      const to = this.prevState;
      this.prevState = null;
      this._setState(to);
      this._emit('resumed');
      return true;
    }

    continueShift() {
      if (this.state !== S.DELIVERY_COMPLETE) return false;
      this._beginDelivery(this.delivery + 1);
      return true;
    }

    finishShift() {
      if (this.state !== S.DELIVERY_COMPLETE) return false;
      const banked = Math.floor(finiteNonNeg(this.unbanked));
      this.sessionBanked += banked;
      const newBest = banked > this.best;
      if (newBest) { this.best = banked; this._save('best', banked); }
      this.lastShift = { banked, newBest, best: this.best, history: this.history.slice(), sessionBanked: this.sessionBanked };
      this.unbanked = 0;
      this._setState(S.SHIFT_COMPLETE);
      this._emit('banked', { banked, newBest });
      return true;
    }

    restart() {
      if (this.state !== S.GAME_OVER && this.state !== S.SHIFT_COMPLETE) return false;
      this._resetRun();
      this._beginDelivery(1);
      return true;
    }

    setInput(left, right) {
      const prevTarget = this.targetDeg();
      this.input.left = !!left;
      this.input.right = !!right;
      const t = this.targetDeg();
      if (this.isTiltActive() && Math.abs(t - prevTarget) >= this.cfg.tilt.creakDeltaDeg - 1e-9) {
        this._emit('creak', { delta: t - prevTarget });
      }
    }

    isTiltActive() {
      return this.state === S.PLAYING || this.state === S.TABLE_INTRO ||
        (this.state === S.TUTORIAL && this.tutorial && this.tutorial.phase === 'practice');
    }

    targetDeg() {
      if (!this.isTiltActive()) return 0;
      const d = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      return d * this.cfg.tilt.maxDeg;
    }

    timeScale() { return this.slowmoRemaining > 0 ? this.cfg.slowmo.scale : 1; }
    progress() { return clamp(this.simTime / this.cfg.delivery.duration, 0, 1); }

    // ---------- time ----------
    update(realDt) {
      let dt = Number(realDt);
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      dt = Math.min(dt, this.cfg.physics.maxFrameDt);
      this.realTime += dt;
      this.jolt *= Math.exp(-dt * 9);

      switch (this.state) {
        case S.TUTORIAL:
          if (this.tutorial && this.tutorial.phase === 'practice') this._runFixed(dt);
          break;
        case S.TABLE_INTRO:
          this.introTimer -= dt;
          if (this.introTimer <= 0) { this.introTimer = 0; this._setState(S.PLAYING); this._emit('deliveryStart'); }
          break;
        case S.PLAYING: {
          const scale = this.timeScale();
          this._runFixed(dt * scale);
          // Slow-motion duration and cooldown are measured in real time.
          if (this.slowmoRemaining > 0) this.slowmoRemaining = Math.max(0, this.slowmoRemaining - dt);
          this.slowmoCooldown = Math.max(0, this.slowmoCooldown - dt);
          break;
        }
        case S.DELIVERY_COMPLETE:
        case S.SPILLING:
          this.phaseT += dt;
          if (this.state === S.SPILLING && this.phaseT >= this.cfg.timing.spill) this._toGameOver();
          break;
        default:
          break;
      }
    }

    _runFixed(dt) {
      const step = this.cfg.physics.fixedDt;
      this.acc = Math.min(this.acc + dt, this.cfg.physics.maxCatchUp);
      const state = this.state;
      const run = this.runId;
      while (this.acc >= step - 1e-12) {
        this.acc -= step;
        this._step(step);
        if (this.state !== state || this.runId !== run) { this.acc = 0; break; }
      }
    }

    _step(dt) {
      const cfg = this.cfg;
      const playing = this.state === S.PLAYING;
      this.simTime += dt;
      this.travel += dt * (playing ? cfg.delivery.travelSpeed : cfg.tutorial.travelScale);

      const target = this.targetDeg() * DEG;
      this.angle += (target - this.angle) * (1 - Math.exp(-dt / cfg.tilt.responseTime));

      const A = cfg.ambient;
      const t = this.simTime;
      const amb = playing
        ? this.ambientAmp * (A.weights[0] * Math.sin(2 * Math.PI * A.freqs[0] * t + this.ambientPhase[0]) +
                             A.weights[1] * Math.sin(2 * Math.PI * A.freqs[1] * t + this.ambientPhase[1]))
        : 0;
      this.lastAmbient = amb;

      if (playing) {
        for (const b of this.bumps) {
          if (!b.warned && t >= b.warnAt) {
            b.warned = true;
            this._emit('bumpWarn', { side: b.side, dir: b.dir, index: b.index, lead: b.at - t, first: this.bumpLinesSaid === 0 });
            this.bumpLinesSaid++;
          }
          if (!b.applied && t >= b.at) {
            b.applied = true;
            this.sim.applyImpulse(b.dir, b.mag);
            this.jolt = b.dir;
            this._emit('bump', { side: b.side, dir: b.dir, mag: b.mag });
          }
        }
      }

      const res = this.sim.step(dt, this.angle, amb, { countSplashes: playing });
      if (res.collisions.length) {
        let best = res.collisions[0];
        for (const c of res.collisions) if (c.speed > best.speed) best = c;
        this._emit('clink', { speed: best.speed, x: best.x, z: best.z });
      }
      for (const sp of res.splashes) {
        if (playing) this.splashes++;
        this._emit('splash', { id: sp.id, side: sp.side, counted: playing });
      }

      this._checkDanger(playing);

      if (res.falls.length) {
        if (playing) { this._startSpill(res.falls[0]); return; }
        // Practice: a dropped cup is simply replaced.
        this.sim.reset(1);
        this._emit('practiceReset');
      }

      if (this.state === S.TUTORIAL) this._checkTutorial();
      if (playing && this.simTime >= cfg.delivery.duration) this._completeDelivery();
    }

    _checkDanger(playing) {
      const T = this.cfg.tray;
      const half = T.width / 2;
      let anyDanger = false;
      for (const c of this.sim.cups) {
        if (c.fallen) continue;
        const dist = half - Math.abs(c.x);
        if (!c.danger && dist < T.dangerMargin) {
          c.danger = true;
          c.dangerSide = c.x > 0 ? 1 : -1;
          this._emit('danger', { id: c.id, side: c.dangerSide });
          if (playing && c.slowmoArmed && this.slowmoCooldown <= 0) {
            c.slowmoArmed = false;
            this.slowmoRemaining = this.cfg.slowmo.duration;
            this.slowmoCooldown = this.cfg.slowmo.cooldown;
            this._emit('slowmo');
          }
        } else if (c.danger && dist > T.dangerMargin + T.dangerHysteresis) {
          c.danger = false;
          c.slowmoArmed = true;
          if (playing && !this.niceSaveShown) {
            this.niceSaveShown = true;
            this._emit('niceSave', { id: c.id });
          }
        }
        if (c.danger) anyDanger = true;
      }
      if (anyDanger && this.simTime - this.lastRattle > 0.32) {
        this.lastRattle = this.simTime;
        this._emit('rattle');
      }
    }

    _checkTutorial() {
      const tu = this.tutorial;
      if (!tu || tu.phase !== 'practice') return;
      const deg = this.angle / DEG;
      const T = this.cfg.tutorial;
      if (!tu.left && deg <= -T.tiltDeg) { tu.left = true; this._emit('tutorialProgress', { left: true, right: tu.right }); }
      if (!tu.right && deg >= T.tiltDeg) { tu.right = true; this._emit('tutorialProgress', { left: tu.left, right: true }); }
      if (tu.left && tu.right && this.targetDeg() === 0 && Math.abs(deg) < T.levelDeg) {
        tu.phase = 'ready';
        this.input.left = this.input.right = false;
        this._emit('tutorialReady');
      }
    }

    _completeDelivery() {
      if (this.state !== S.PLAYING) return;
      for (const b of this.bumps) { b.warned = true; b.applied = true; } // stop scheduling
      const reward = rewardFor(this.delivery, this.splashes, this.cfg);
      this.unbanked += reward.total;
      this.history.push({ delivery: this.delivery, base: reward.base, perfect: reward.perfect, splashes: this.splashes });
      this.lastResult = Object.assign({ delivery: this.delivery, splashes: this.splashes, unbanked: this.unbanked,
        nextCups: cupsForDelivery(this.delivery + 1, this.cfg) }, reward);
      this.phaseT = 0;
      this.slowmoRemaining = 0;
      this._setState(S.DELIVERY_COMPLETE);
      this._emit('deliveryComplete', { perfect: reward.perfect > 0, total: reward.total });
    }

    _startSpill(fall) {
      if (this.state !== S.PLAYING) return;
      this.fallen = Object.assign({ t0: this.simTime }, fall);
      this.lastFail = { lost: Math.floor(finiteNonNeg(this.unbanked)), previouslyBanked: this.sessionBanked, delivery: this.delivery };
      this.unbanked = 0; // cannot be banked after a fall
      this.phaseT = 0;
      this.slowmoRemaining = 0;
      for (const b of this.bumps) { b.warned = true; b.applied = true; }
      this._setState(S.SPILLING);
      this._emit('fall', { side: fall.side, id: fall.id });
    }

    _toGameOver() {
      if (this.state !== S.SPILLING) return;
      this._setState(S.GAME_OVER);
      this._emit('gameOver', { lost: this.lastFail.lost });
    }

    /** Current bump of interest for presentation: warning or just applied. */
    activeBump() {
      if (this.state !== S.PLAYING && this.state !== S.PAUSED) return null;
      for (const b of this.bumps) {
        if (this.simTime >= b.warnAt && this.simTime < b.at + 0.9) return b;
      }
      return null;
    }
  }

  Game.STATES = S;
  NS.Game = Game;
  NS.GameUtil = { cupsForDelivery, rewardFor, scheduleBumps, ambientAmpFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = { Game, STATES: S, cupsForDelivery, rewardFor, scheduleBumps, ambientAmpFor };
})(typeof globalThis !== 'undefined' ? globalThis : this);
