'use strict';
const Q = require('../js/questions.js');
const E = require('../js/engine.js');

/** Seeded PRNG (mulberry32) for reproducible tests. */
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fake clock + timer queue. advance(ms) fires due timers in order. */
function fakeTime() {
  let t = 1000;
  let seq = 0;
  const queue = new Map();
  return {
    now: () => t,
    setTimeout(fn, ms) { const id = ++seq; queue.set(id, { at: t + Math.max(0, ms), fn, id }); return id; },
    clearTimeout(id) { queue.delete(id); },
    pending: () => queue.size,
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let next = null;
        for (const item of queue.values()) if (item.at <= end && (!next || item.at < next.at || (item.at === next.at && item.id < next.id))) next = item;
        if (!next) break;
        queue.delete(next.id);
        t = next.at;
        next.fn();
      }
      t = end;
    }
  };
}

function memStorage(init) {
  const m = new Map(Object.entries(init || {}));
  return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), map: m };
}

function makeGame(opts) {
  opts = opts || {};
  const time = fakeTime();
  const events = [];
  let speaking = false;
  const storage = opts.storage || memStorage();
  const engine = E.createEngine({
    questions: Q, now: time.now, setTimeout: time.setTimeout, clearTimeout: time.clearTimeout,
    random: opts.random || seeded(opts.seed || 1), storage,
    isSpeaking: () => speaking, cancelSpeech: () => { events.push(['cancelSpeech']); },
    onEvent: (type, data) => events.push([type, data]), debug: true
  });
  return {
    engine, time, events, storage,
    setSpeaking(v) { speaking = v; },
    s: () => engine.getState(),
    /** Advance until the engine reaches a state (bounded). */
    until(state, step, limit) {
      step = step || 50; limit = limit || 20000;
      let spent = 0;
      while (engine.getState().state !== state && spent < limit) { time.advance(step); spent += step; }
      return engine.getState().state === state;
    },
    /** Side that holds a given option id in the current layout. */
    sideOf(id) { return engine.getState().current.layout[0] === id ? 'left' : 'right'; },
    winningSide() { const c = engine.getState().current; return this.sideOf(Q.winningOptionId(c.question, c.rule)); },
    losingSide() { return this.winningSide() === 'left' ? 'right' : 'left'; }
  };
}

module.exports = { Q, E, seeded, fakeTime, memStorage, makeGame };
