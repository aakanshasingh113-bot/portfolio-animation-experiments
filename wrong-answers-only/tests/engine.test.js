'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Q, E, seeded, memStorage, makeGame } = require('./helpers');
const S = E.STATES;

function startRun(g, mode) {
  g.engine.start({ mode: mode || 'timed', practice: false });
  assert.equal(g.s().state, S.RULE_TRANSITION, 'first question is announced');
  assert.ok(g.until(S.QUESTION_ACTIVE));
}
function nextActive(g) { assert.ok(g.until(S.QUESTION_ACTIVE)); }

test('rule scheduling: first five wrong, never consecutive normal, ~20% after', () => {
  const r = seeded(11);
  let prev = null, normals = 0, eligible = 0;
  for (let run = 0; run < 400; run++) {
    prev = null;
    for (let n = 1; n <= 40; n++) {
      const rule = E.decideRule(n, prev, r);
      if (n <= 5) assert.equal(rule, 'wrong');
      if (prev === 'normal') assert.equal(rule, 'wrong');
      if (n > 5 && prev !== 'normal') { eligible++; if (rule === 'normal') normals++; }
      prev = rule;
    }
  }
  const p = normals / eligible;
  assert.ok(p > 0.17 && p < 0.23, 'p=' + p);
});

test('time limits by question number and never below 2.2s', () => {
  assert.equal(E.timeLimitFor(1), 3000);
  assert.equal(E.timeLimitFor(5), 3000);
  assert.equal(E.timeLimitFor(6), 2600);
  assert.equal(E.timeLimitFor(15), 2600);
  assert.equal(E.timeLimitFor(16), 2200);
  assert.equal(E.timeLimitFor(500), 2200);
});

test('correct mapping in WRONG rounds: false option scores, true option costs a life', () => {
  const g = makeGame({ seed: 3 });
  startRun(g);
  const c = g.s().current;
  assert.equal(c.rule, 'wrong');
  const falseId = c.question.options.find((o) => o.id !== c.question.correctId).id;
  assert.ok(g.engine.answer(g.sideOf(falseId), c.token));
  assert.equal(g.s().score, 1);
  assert.equal(g.s().lives, 3);
  nextActive(g);
  const c2 = g.s().current;
  g.engine.answer(g.sideOf(c2.question.correctId), c2.token);
  assert.equal(g.s().score, 1);
  assert.equal(g.s().lives, 2);
  const last = g.s().mistakes[0];
  assert.equal(last.rule, 'wrong');
  assert.equal(last.selected, Q.optionById(c2.question, c2.question.correctId).label);
});

test('correct mapping in NORMAL rounds: true option scores', () => {
  // Drive until a normal round appears, answering correctly to stay alive.
  for (let seed = 1; seed < 50; seed++) {
    const g = makeGame({ seed });
    startRun(g);
    for (let i = 0; i < 40; i++) {
      const c = g.s().current;
      if (c.rule === 'normal') {
        assert.ok(c.n > 5);
        const before = g.s().score;
        g.engine.answer(g.sideOf(c.question.correctId), c.token);
        assert.equal(g.s().score, before + 1);
        assert.equal(g.s().lastResult.factuallyCorrect, true);
        return;
      }
      g.engine.answer(g.winningSide(), c.token);
      nextActive(g);
    }
  }
  assert.fail('no normal round found');
});

test('randomised positions never change which option wins', () => {
  const g = makeGame({ seed: 5 });
  startRun(g);
  let lefts = 0;
  for (let i = 0; i < 60; i++) {
    const c = g.s().current;
    const winId = Q.winningOptionId(c.question, c.rule);
    if (c.layout[0] === winId) lefts++;
    g.engine.answer(g.winningSide(), c.token);
    assert.equal(g.s().lastResult.success, true);
    assert.equal(g.s().lastResult.optionId, winId);
    nextActive(g);
  }
  assert.ok(lefts > 15 && lefts < 45, 'winning side distribution ' + lefts);
});

test('three mistakes end the run; no negative scores or lives', () => {
  const g = makeGame({ seed: 9 });
  startRun(g);
  for (let i = 0; i < 3; i++) {
    const c = g.s().current;
    g.engine.answer(g.losingSide(), c.token);
    if (i < 2) nextActive(g);
  }
  assert.equal(g.s().lives, 0);
  assert.equal(g.s().state, S.FEEDBACK);
  assert.ok(g.until(S.GAME_OVER));
  assert.equal(g.s().summary.survived, 3);
  assert.equal(g.s().score, 0);
  assert.equal(g.engine.answer('left', 999), false);
  assert.equal(g.s().lives, 0);
});

test('timeout consumes exactly one life and is recorded', () => {
  const g = makeGame({ seed: 4 });
  startRun(g);
  const c = g.s().current;
  assert.equal(c.timeLimit, 3000);
  g.time.advance(2999);
  assert.equal(g.s().state, S.QUESTION_ACTIVE);
  g.time.advance(1);
  assert.equal(g.s().state, S.FEEDBACK);
  assert.equal(g.s().lives, 2);
  assert.equal(g.s().lastResult.kind, 'timeout');
  assert.equal(g.s().mistakes[0].selected, null);
  g.engine.tick();
  assert.equal(g.s().lives, 2);
});

test('click landing exactly at the deadline loses to the timeout', () => {
  const g = makeGame({ seed: 4 });
  startRun(g);
  const c = g.s().current;
  g.time.advance(3000); // due timer fires first; the click is now stale
  assert.equal(g.engine.answer(g.winningSide(), c.token), false);
  assert.equal(g.s().lives, 2);
  assert.equal(g.s().score, 0);
});

test('late answer with an unfired timer is a timeout (deadline check)', () => {
  // Engine with a clock that we can move without firing timers.
  let t = 0;
  const timers = [];
  const engine = E.createEngine({
    questions: Q, now: () => t, random: seeded(2), storage: memStorage(),
    setTimeout: (fn, ms) => { timers.push({ fn, at: t + ms }); return timers.length; },
    clearTimeout: () => {}, debug: true
  });
  engine.start({ mode: 'timed' });
  // finish the announcement
  t += 1100; timers.splice(0).forEach((x) => x.fn());
  assert.equal(engine.getState().state, S.QUESTION_ACTIVE);
  const c = engine.getState().current;
  t += 3500; // timer not delivered (e.g. throttled tab)
  assert.equal(engine.answer('left', c.token), true);
  assert.equal(engine.getState().lastResult.kind, 'timeout');
  assert.equal(engine.getState().lives, 2);
});

test('double click and click+timeout race consume one outcome', () => {
  const g = makeGame({ seed: 6 });
  startRun(g);
  const c = g.s().current;
  const side = g.losingSide();
  assert.equal(g.engine.answer(side, c.token), true);
  assert.equal(g.engine.answer(side, c.token), false);
  assert.equal(g.engine.answer(side === 'left' ? 'right' : 'left', c.token), false);
  assert.equal(g.engine._timeout(c.token), false);
  g.engine.tick();
  assert.equal(g.s().lives, 2);
  // Stale token from previous question is rejected on the next one.
  nextActive(g);
  const before = g.s().lives;
  assert.equal(g.engine.answer(side, c.token), false);
  assert.equal(g.s().lives, before);
  // Timeout first, then click: still one life.
  g.time.advance(g.s().current.timeLimit);
  assert.equal(g.engine.answer('left', g.s().current.token), false);
  assert.equal(g.s().lives, before - 1);
});

test('input is rejected during transitions and feedback', () => {
  const g = makeGame({ seed: 8 });
  g.engine.start({ mode: 'timed' });
  assert.equal(g.s().state, S.RULE_TRANSITION);
  const tok = g.s().current.token;
  assert.equal(g.engine.answer('left', tok), false);
  assert.equal(g.engine.timeRemaining(), 3000, 'timer stopped during transition');
  nextActive(g);
  g.engine.answer(g.winningSide(), g.s().current.token);
  assert.equal(g.s().state, S.FEEDBACK);
  assert.equal(g.engine.answer('left', g.s().current.token), false);
  assert.equal(g.s().score, 1);
});

test('success continues after ~400ms, mistake after ~950ms', () => {
  const g = makeGame({ seed: 12 });
  startRun(g);
  g.engine.answer(g.winningSide(), g.s().current.token);
  g.time.advance(399);
  assert.equal(g.s().state, S.FEEDBACK);
  g.time.advance(1);
  assert.notEqual(g.s().state, S.FEEDBACK);
  nextActive(g);
  g.engine.answer(g.losingSide(), g.s().current.token);
  g.time.advance(949);
  assert.equal(g.s().state, S.FEEDBACK);
  g.time.advance(1);
  assert.notEqual(g.s().state, S.FEEDBACK);
});

test('pause freezes remaining time; resume restores it after a ready cue', () => {
  const g = makeGame({ seed: 13 });
  startRun(g);
  const c = g.s().current;
  g.time.advance(1200);
  assert.equal(g.engine.pause('blur'), true);
  assert.equal(g.s().state, S.PAUSED);
  assert.equal(g.engine.timeRemaining(), 1800);
  g.time.advance(60000);
  assert.equal(g.s().state, S.PAUSED, 'requires explicit resume');
  assert.equal(g.s().lives, 3);
  assert.equal(g.engine.answer('left', c.token), false, 'no answers while paused');
  g.engine.resume();
  assert.equal(g.s().state, S.PAUSED, 'ready cue is untimed');
  g.time.advance(749);
  assert.equal(g.s().state, S.PAUSED);
  g.time.advance(1);
  assert.equal(g.s().state, S.QUESTION_ACTIVE);
  assert.equal(g.engine.timeRemaining(), 1800);
  g.time.advance(1799);
  assert.equal(g.s().lives, 3);
  g.time.advance(1);
  assert.equal(g.s().lives, 2);
});

test('pause during feedback and transitions resumes the flow', () => {
  const g = makeGame({ seed: 14 });
  g.engine.start({ mode: 'timed' });
  g.engine.pause('hidden');
  assert.equal(g.s().paused.from, S.RULE_TRANSITION);
  g.time.advance(5000);
  assert.equal(g.s().state, S.PAUSED);
  g.engine.resume(); g.time.advance(750);
  assert.equal(g.s().state, S.QUESTION_ACTIVE);
  assert.equal(g.engine.timeRemaining(), 3000);
  g.engine.answer(g.winningSide(), g.s().current.token);
  g.engine.pause('blur');
  assert.equal(g.s().paused.from, S.FEEDBACK);
  g.time.advance(5000);
  assert.equal(g.s().state, S.PAUSED);
  g.engine.resume(); g.time.advance(750);
  assert.ok([S.QUESTION_ACTIVE, S.RULE_TRANSITION].indexOf(g.s().state) !== -1);
  assert.equal(g.s().score, 1);
});

test('pause during the ready cue re-pauses without starting the clock', () => {
  const g = makeGame({ seed: 15 });
  startRun(g);
  g.time.advance(500);
  g.engine.pause('blur');
  g.engine.resume();
  g.time.advance(300);
  g.engine.pause('blur');
  g.time.advance(2000);
  assert.equal(g.s().state, S.PAUSED);
  assert.equal(g.engine.timeRemaining(), 2500);
});

test('restart cancels callbacks from the previous run', () => {
  const g = makeGame({ seed: 16 });
  startRun(g);
  g.engine.answer(g.losingSide(), g.s().current.token); // schedules "next" in 950ms
  g.engine.start({ mode: 'timed' }); // restart mid-feedback
  const fresh = g.s();
  assert.equal(fresh.lives, 3);
  assert.equal(fresh.score, 0);
  assert.equal(fresh.state, S.RULE_TRANSITION);
  g.time.advance(1100);
  assert.equal(g.s().state, S.QUESTION_ACTIVE);
  assert.equal(g.s().current.n, 1, 'old next() did not advance the new run');
  // old run's timeout for a stale token is inert
  g.time.advance(10);
  assert.equal(g.s().lives, 3);
  // restart during an active question cancels its timeout
  g.engine.start({ mode: 'timed' });
  g.time.advance(1100 + 2900);
  assert.equal(g.s().lives, 3);
});

test('rule transitions wait for speech, capped at 1.8s, and cancel speech before timing', () => {
  const g = makeGame({ seed: 17 });
  g.setSpeaking(true);
  g.engine.start({ mode: 'timed' });
  g.time.advance(1700);
  assert.equal(g.s().state, S.RULE_TRANSITION, 'waits while speaking');
  g.time.advance(100);
  assert.equal(g.s().state, S.QUESTION_ACTIVE, 'never waits beyond 1.8s');
  const ev = g.events.map((e) => e[0]);
  const qi = ev.lastIndexOf('question');
  assert.equal(ev.slice(0, qi).lastIndexOf('cancelSpeech') > ev.lastIndexOf('transition'), true);
  // When not speaking it proceeds at the minimum.
  const g2 = makeGame({ seed: 17 });
  g2.engine.start({ mode: 'timed' });
  g2.time.advance(1100);
  assert.equal(g2.s().state, S.QUESTION_ACTIVE);
});

test('chill mode has no timeout and no countdown', () => {
  const g = makeGame({ seed: 18 });
  startRun(g, 'chill');
  assert.equal(g.s().current.timeLimit, null);
  assert.equal(g.engine.timeRemaining(), null);
  g.time.advance(600000);
  g.engine.tick();
  assert.equal(g.s().lives, 3);
  assert.equal(g.s().state, S.QUESTION_ACTIVE);
  g.engine.pause('blur'); g.engine.resume(); g.time.advance(750);
  assert.equal(g.s().state, S.QUESTION_ACTIVE);
  g.time.advance(600000);
  assert.equal(g.s().lives, 3);
});

function playToEnd(g, wins) {
  for (let i = 0; i < wins; i++) { g.engine.answer(g.winningSide(), g.s().current.token); nextActive(g); }
  for (let i = 0; i < 3; i++) { g.engine.answer(g.losingSide(), g.s().current.token); if (i < 2) nextActive(g); }
  assert.ok(g.until(S.GAME_OVER));
  return g.s().summary;
}

test('best scores are separate per mode; first run establishes, not "beats"', () => {
  const storage = memStorage();
  const g = makeGame({ seed: 19, storage });
  startRun(g, 'timed');
  let sum = playToEnd(g, 4);
  assert.equal(sum.firstRun, true);
  assert.equal(sum.isNewBest, false);
  assert.equal(sum.best, 4);
  assert.equal(storage.get('woa.best.timed'), '4');
  assert.equal(storage.get('woa.best.chill'), null);

  startRun(g, 'chill');
  sum = playToEnd(g, 2);
  assert.equal(sum.firstRun, true);
  assert.equal(sum.best, 2);
  assert.equal(storage.get('woa.best.timed'), '4');

  startRun(g, 'timed');
  sum = playToEnd(g, 6);
  assert.equal(sum.isNewBest, true);
  assert.equal(sum.previousBest, 4);
  assert.equal(storage.get('woa.best.timed'), '6');

  startRun(g, 'timed');
  sum = playToEnd(g, 1);
  assert.equal(sum.isNewBest, false);
  assert.equal(sum.best, 6);
  assert.equal(sum.mode, 'timed');
});

test('storage failures never break the game', () => {
  // main.js wraps localStorage in try/catch; the engine also tolerates garbage values.
  const g = makeGame({ seed: 20, storage: memStorage({ 'woa.best.timed': 'garbage' }) });
  startRun(g);
  const sum = playToEnd(g, 1);
  assert.equal(sum.firstRun, true);
  assert.equal(sum.best, 1);
});

test('streaks: milestones at 5/10/15, reset on mistake, longest tracked', () => {
  const g = makeGame({ seed: 21 });
  startRun(g);
  const milestones = [];
  for (let i = 0; i < 5; i++) {
    g.engine.answer(g.winningSide(), g.s().current.token);
    if (g.s().lastResult.milestone) milestones.push(g.s().lastResult.milestone.streak);
    nextActive(g);
  }
  assert.deepEqual(milestones, [5]);
  assert.equal(g.s().streak, 5);
  g.engine.answer(g.losingSide(), g.s().current.token);
  assert.equal(g.s().streak, 0);
  assert.equal(g.s().longestStreak, 5);
  nextActive(g);
  for (let i = 0; i < 12; i++) {
    g.engine.answer(g.winningSide(), g.s().current.token);
    if (g.s().lastResult.milestone) milestones.push(g.s().lastResult.milestone.streak);
    nextActive(g);
  }
  assert.deepEqual(milestones, [5, 5, 10], 'each crossing shows once, again after reset');
  assert.equal(g.s().longestStreak, 12);
  assert.equal(g.s().score, 17, 'no hidden multiplier');
  assert.equal(E.STREAK_MESSAGES[15], 'Your teacher would be concerned.');
});

test('score milestones flag confetti at 10, 20, 30', () => {
  const g = makeGame({ seed: 22 });
  startRun(g);
  const flagged = [];
  for (let i = 0; i < 31; i++) {
    g.engine.answer(g.winningSide(), g.s().current.token);
    if (g.s().lastResult.scoreMilestone) flagged.push(g.s().lastResult.scoreMilestone);
    nextActive(g);
  }
  assert.deepEqual(flagged, [10, 20, 30]);
});

test('scored run never schedules consecutive normal rounds and starts with 5 wrong', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const g = makeGame({ seed });
    startRun(g);
    const rules = [];
    for (let i = 0; i < 50; i++) {
      rules.push(g.s().current.rule);
      g.engine.answer(g.winningSide(), g.s().current.token);
      nextActive(g);
    }
    assert.deepEqual(rules.slice(0, 5), ['wrong', 'wrong', 'wrong', 'wrong', 'wrong']);
    for (let i = 1; i < rules.length; i++) assert.ok(!(rules[i] === 'normal' && rules[i - 1] === 'normal'));
  }
});

test('every rule change is announced by an untimed transition', () => {
  const g = makeGame({ seed: 23 });
  startRun(g);
  let prev = 'wrong';
  for (let i = 0; i < 60; i++) {
    g.engine.answer(g.winningSide(), g.s().current.token);
    // step out of feedback
    while (g.s().state === S.FEEDBACK) g.time.advance(50);
    const c = g.s().current;
    if (c.rule !== prev) assert.equal(g.s().state, S.RULE_TRANSITION, 'rule change at Q' + c.n);
    else assert.equal(g.s().state, S.QUESTION_ACTIVE);
    prev = c.rule;
    nextActive(g);
  }
});

test('practice: two untimed questions, no score or lives, then the run', () => {
  const storage = memStorage();
  const g = makeGame({ seed: 24, storage });
  g.engine.start({ mode: 'timed', practice: true });
  assert.equal(g.s().state, S.PRACTICE);
  assert.equal(g.s().current.rule, 'wrong');
  g.time.advance(60000);
  assert.equal(g.s().state, S.PRACTICE, 'untimed');
  // answer wrongly (pick truth) — practice mistake is not counted
  g.engine.answer(g.sideOf(g.s().current.question.correctId), g.s().current.token);
  assert.equal(g.s().practice.result.success, false);
  assert.equal(g.engine.answer('left', g.s().current.token), false, 'one answer per practice question');
  g.engine.practiceNext();
  assert.equal(g.s().current.rule, 'normal');
  g.engine.answer(g.sideOf(g.s().current.question.correctId), g.s().current.token);
  assert.equal(g.s().practice.result.success, true);
  g.engine.practiceNext();
  assert.equal(g.s().state, S.RULE_TRANSITION);
  assert.equal(g.s().score, 0);
  assert.equal(g.s().lives, 3);
  assert.equal(g.s().mistakes.length, 0);
  assert.equal(storage.get('woa.practiceDone'), '1');
});

test('skip practice goes straight to the scored run', () => {
  const g = makeGame({ seed: 25 });
  g.engine.start({ mode: 'timed', practice: true });
  assert.equal(g.engine.skipPractice(), true);
  assert.equal(g.s().state, S.RULE_TRANSITION);
  assert.equal(g.storage.get('woa.practiceDone'), '1');
});

test('mistake review only includes this run, with rule, selection and requirement', () => {
  const g = makeGame({ seed: 26 });
  g.engine.start({ mode: 'timed', practice: true });
  g.engine.answer(g.sideOf(g.s().current.question.correctId), g.s().current.token); // practice mistake
  g.engine.skipPractice();
  nextActive(g);
  g.engine.answer(g.losingSide(), g.s().current.token);
  nextActive(g);
  g.time.advance(g.s().current.timeLimit); // timeout
  nextActive(g);
  g.engine.answer(g.losingSide(), g.s().current.token);
  assert.ok(g.until(S.GAME_OVER));
  const m = g.s().summary.mistakes;
  assert.equal(m.length, 3);
  assert.equal(m[1].kind, 'timeout');
  assert.equal(m[1].selected, null);
  m.forEach((x) => { assert.ok(x.prompt); assert.ok(x.required); assert.ok(x.rule); });
  // run 2 starts with a clean list
  g.engine.start({ mode: 'timed' });
  assert.equal(g.s().mistakes.length, 0);
});

test('counters stay finite and nonnegative over a long random session', () => {
  const g = makeGame({ seed: 27 });
  const r = seeded(99);
  for (let run = 0; run < 5; run++) {
    startRun(g);
    while (g.s().state !== S.GAME_OVER) {
      const st = g.s().state;
      if (st === S.QUESTION_ACTIVE) {
        const roll = r();
        if (roll < 0.1) g.time.advance(3100);
        else if (roll < 0.15) { g.engine.pause('blur'); g.engine.resume(); }
        else g.engine.answer(roll < 0.75 ? g.winningSide() : g.losingSide(), g.s().current.token);
      }
      g.time.advance(50);
      const s = g.s();
      [s.score, s.lives, s.streak, s.longestStreak, s.resolved].forEach((v) => assert.ok(Number.isFinite(v) && v >= 0));
      assert.ok(s.lives <= 3);
    }
    assert.equal(g.s().summary.survived, g.s().score + 3);
  }
});
