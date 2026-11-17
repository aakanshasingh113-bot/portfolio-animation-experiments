/*
 * WRONG ANSWERS ONLY — authoritative game engine.
 *
 * Pure logic. Clock, timers, randomness, storage and side-effect hooks are
 * injected so the whole thing runs deterministically under Node tests.
 *
 * Every answer and every timeout goes through resolve(), which is guarded by
 * state + question token, so exactly one outcome is accepted per question.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WAOEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const S = Object.freeze({
    INTRO: 'INTRO',
    PRACTICE: 'PRACTICE',
    RULE_TRANSITION: 'RULE_TRANSITION',
    QUESTION_ACTIVE: 'QUESTION_ACTIVE',
    FEEDBACK: 'FEEDBACK',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  });

  const MAX_LIVES = 3;
  const STREAK_MESSAGES = {
    5: 'Suspiciously good at this.',
    10: 'Professional wrong person.',
    15: 'Your teacher would be concerned.'
  };
  const SCORE_CONFETTI = [10, 20, 30];

  /** Rule for scored question number n (1-based). */
  function decideRule(n, prevRule, random) {
    if (n <= 5) return 'wrong';
    if (prevRule === 'normal') return 'wrong';
    return random() < 0.2 ? 'normal' : 'wrong';
  }

  /** Time limit in ms for scored question n. Never below 2200. */
  function timeLimitFor(n) {
    if (n <= 5) return 3000;
    if (n <= 15) return 2600;
    return 2200;
  }

  function bestKey(mode) { return 'woa.best.' + (mode === 'chill' ? 'chill' : 'timed'); }

  function createEngine(cfg) {
    const Q = cfg.questions;
    const now = cfg.now || (() => performance.now());
    const setT = cfg.setTimeout || ((f, ms) => setTimeout(f, ms));
    const clearT = cfg.clearTimeout || ((h) => clearTimeout(h));
    const random = cfg.random || Math.random;
    const storage = cfg.storage || { get: () => null, set: () => {} };
    const emitHook = cfg.onEvent || function () {};
    const isSpeaking = cfg.isSpeaking || (() => false);
    const cancelSpeech = cfg.cancelSpeech || function () {};
    const T = Object.assign({
      success: 400, mistake: 950,
      transitionMin: 950, transitionMax: 1800,
      milestoneMin: 1000, milestoneMax: 1800,
      readyCue: 750, poll: 100
    }, cfg.timing);

    let runId = 0;
    let tokenSeq = 0;
    const timers = new Set();
    let s = freshState('timed');

    function freshState(mode) {
      return {
        state: S.INTRO, mode, score: 0, lives: MAX_LIVES, streak: 0, longestStreak: 0,
        resolved: 0, mistakes: [], prevRule: null, current: null, pending: null,
        paused: null, practice: null, lastResult: null, summary: null
      };
    }

    function emit(type, data) {
      try { emitHook(type, data, api); } catch (e) { /* UI errors never break the game */ if (cfg.debug) throw e; }
    }

    function setState(next) {
      const prev = s.state;
      s.state = next;
      emit('state', { from: prev, to: next });
    }

    // ---- timers: tagged with runId so callbacks from old runs are inert
    function schedule(fn, ms) {
      const myRun = runId;
      const h = setT(() => {
        timers.delete(h);
        if (myRun !== runId) return;
        fn();
      }, ms);
      timers.add(h);
      return h;
    }
    function cancelTimers() {
      timers.forEach((h) => clearT(h));
      timers.clear();
    }

    /** Continue with a named action after ms, remembered so pause can defer it. */
    function setPending(action, ms) {
      s.pending = action;
      schedule(() => runPending(action), ms);
    }
    /** Wait at least min, and while speech is playing up to max, then run action. */
    function hold(action, min, max) {
      s.pending = action;
      const start = now();
      const check = () => {
        const elapsed = now() - start;
        if (elapsed >= max || !isSpeaking()) runPending(action);
        else schedule(check, Math.min(T.poll, max - elapsed));
      };
      schedule(check, min);
    }
    function runPending(action) {
      if (s.pending !== action) return;
      s.pending = null;
      if (action === 'activate') activate();
      else if (action === 'next') nextQuestion();
      else if (action === 'gameover') gameOver();
    }

    // ------------------------------------------------------------ lifecycle
    function start(opts) {
      opts = opts || {};
      cancelTimers();
      runId++;
      cancelSpeech();
      const mode = opts.mode === 'chill' ? 'chill' : 'timed';
      s = freshState(mode);
      s.picker = Q.createPicker(random);
      if (opts.practice) {
        s.practice = { index: 0, items: Q.practiceQuestions(random), result: null };
        presentPractice();
      } else {
        beginRun();
      }
    }

    function toIntro() {
      cancelTimers();
      runId++;
      cancelSpeech();
      const mode = s.mode;
      s = freshState(mode);
      setState(S.INTRO);
    }

    function layoutFor(question) {
      const [a, b] = question.options;
      return random() < 0.5 ? [a.id, b.id] : [b.id, a.id];
    }

    // ------------------------------------------------------------- practice
    function presentPractice() {
      const item = s.practice.items[s.practice.index];
      s.practice.result = null;
      s.current = {
        token: ++tokenSeq, n: s.practice.index + 1, rule: item.rule, question: item.question,
        layout: layoutFor(item.question), timeLimit: null, deadline: Infinity,
        activatedAt: now(), practice: true
      };
      setState(S.PRACTICE);
      emit('practice', { index: s.practice.index, total: s.practice.items.length, current: s.current });
    }

    function practiceAnswer(side, token) {
      if (s.state !== S.PRACTICE || !s.current || s.practice.result) return false;
      if (token !== undefined && token !== s.current.token) return false;
      const item = s.practice.items[s.practice.index];
      const optionId = s.current.layout[side === 'right' ? 1 : 0];
      const success = optionId === Q.winningOptionId(item.question, item.rule);
      s.practice.result = { success, side, optionId, line: success ? item.success : item.failure };
      emit('practiceResult', Object.assign({ index: s.practice.index, current: s.current }, s.practice.result));
      return true;
    }

    function practiceNext() {
      if (s.state !== S.PRACTICE || !s.practice.result) return false;
      if (s.practice.index < s.practice.items.length - 1) {
        s.practice.index++;
        presentPractice();
      } else finishPractice();
      return true;
    }

    function skipPractice() {
      if (s.state !== S.PRACTICE) return false;
      finishPractice();
      return true;
    }

    function finishPractice() {
      storage.set('woa.practiceDone', '1');
      s.practice = null;
      beginRun();
    }

    // ------------------------------------------------------------- scored run
    function beginRun() {
      s.score = 0; s.lives = MAX_LIVES; s.streak = 0; s.longestStreak = 0;
      s.resolved = 0; s.mistakes = []; s.prevRule = null;
      emit('runStart', { mode: s.mode });
      nextQuestion();
    }

    function nextQuestion() {
      const n = s.resolved + 1;
      const rule = decideRule(n, s.prevRule, random);
      const question = s.picker.next();
      const changed = rule !== s.prevRule;
      const first = s.prevRule === null;
      s.prevRule = rule;
      s.current = {
        token: ++tokenSeq, n, rule, question, layout: layoutFor(question),
        timeLimit: s.mode === 'chill' ? null : timeLimitFor(n),
        deadline: Infinity, startedAt: null, activatedAt: null
      };
      if (changed) {
        setState(S.RULE_TRANSITION);
        emit('transition', { rule, first, current: s.current });
        hold('activate', first ? 1100 : T.transitionMin, T.transitionMax);
      } else {
        activate();
      }
    }

    function activate() {
      cancelSpeech(); // never let a line run into a timed question
      setState(S.QUESTION_ACTIVE);
      emit('question', { current: s.current }); // UI renders + enables synchronously
      startClock(s.current.timeLimit);
    }

    function startClock(ms) {
      const c = s.current;
      const t = now();
      c.activatedAt = t;
      c.startedAt = t;
      if (ms === null || ms === Infinity) { c.deadline = Infinity; return; }
      c.deadline = t + ms;
      const token = c.token;
      schedule(() => timeout(token), ms);
    }

    function timeRemaining() {
      const c = s.current;
      if (!c || c.timeLimit === null) return null;
      if (s.state === S.QUESTION_ACTIVE) return Math.max(0, c.deadline - now());
      if (s.state === S.PAUSED && s.paused && s.paused.from === S.QUESTION_ACTIVE) return s.paused.remaining;
      if (s.state === S.RULE_TRANSITION) return c.timeLimit;
      return 0;
    }

    /** Player input. side: 'left' | 'right'. */
    function answer(side, token) {
      if (s.state === S.PRACTICE) return practiceAnswer(side, token);
      if (s.state !== S.QUESTION_ACTIVE || !s.current) return false;
      if (token !== undefined && token !== s.current.token) return false;
      if (side !== 'left' && side !== 'right') return false;
      if (now() >= s.current.deadline) return resolve({ kind: 'timeout' });
      return resolve({ kind: 'choice', side });
    }

    function timeout(token) {
      if (!s.current || token !== s.current.token) return false;
      return resolve({ kind: 'timeout' });
    }

    /** Called each frame by the UI as a backstop to the scheduled timeout. */
    function tick() {
      if (s.state === S.QUESTION_ACTIVE && s.current && now() >= s.current.deadline) {
        resolve({ kind: 'timeout' });
      }
    }

    /** The single gate through which every scored outcome passes. */
    function resolve(input) {
      if (s.state !== S.QUESTION_ACTIVE || !s.current || s.current.resolved) return false;
      const c = s.current;
      c.resolved = true;
      cancelTimers();
      setState(S.FEEDBACK);

      const q = c.question;
      const winId = Q.winningOptionId(q, c.rule);
      let optionId = null, success = false;
      if (input.kind === 'choice') {
        optionId = c.layout[input.side === 'right' ? 1 : 0];
        success = optionId === winId;
      }
      s.resolved++;
      const result = {
        token: c.token, n: c.n, rule: c.rule, kind: input.kind, side: input.side || null,
        optionId, success, winningId: winId,
        factuallyCorrect: optionId ? Q.isFactuallyCorrect(q, optionId) : null,
        question: q, milestone: null, scoreMilestone: null, gameOver: false
      };

      if (success) {
        s.score++;
        s.streak++;
        if (s.streak > s.longestStreak) s.longestStreak = s.streak;
        if (STREAK_MESSAGES[s.streak]) result.milestone = { streak: s.streak, text: STREAK_MESSAGES[s.streak] };
        if (SCORE_CONFETTI.indexOf(s.score) !== -1) result.scoreMilestone = s.score;
      } else {
        s.lives = Math.max(0, s.lives - 1);
        s.streak = 0;
        s.mistakes.push({
          n: c.n, prompt: q.prompt, rule: c.rule, kind: input.kind,
          selected: optionId ? Q.optionById(q, optionId).label : null,
          required: Q.optionById(q, winId).label, explanation: q.explanation
        });
        if (s.lives === 0) result.gameOver = true;
      }
      result.score = s.score; result.lives = s.lives; result.streak = s.streak;
      s.lastResult = result;
      emit('resolve', result);

      if (result.gameOver) setPending('gameover', T.mistake);
      else if (!success) setPending('next', T.mistake);
      else if (result.milestone || result.scoreMilestone) hold('next', T.milestoneMin, T.milestoneMax);
      else setPending('next', T.success);
      return true;
    }

    function gameOver() {
      const key = bestKey(s.mode);
      const raw = storage.get(key);
      const prev = raw === null || raw === undefined || raw === '' || !isFinite(Number(raw)) ? null : Math.max(0, Math.floor(Number(raw)));
      const isNewBest = prev !== null && s.score > prev;
      const best = prev === null ? s.score : Math.max(prev, s.score);
      if (prev === null || s.score > prev) storage.set(key, String(best));
      s.summary = {
        mode: s.mode, score: s.score, best, previousBest: prev, isNewBest, firstRun: prev === null,
        longestStreak: s.longestStreak, survived: s.resolved, mistakes: s.mistakes.slice()
      };
      s.current = null;
      setState(S.GAME_OVER);
      emit('gameover', s.summary);
    }

    // ------------------------------------------------------------ pause
    const PAUSABLE = [S.QUESTION_ACTIVE, S.RULE_TRANSITION, S.FEEDBACK];

    function pause(reason) {
      if (s.state === S.PAUSED) {
        if (s.paused.phase === 'ready') { // interrupted during the ready cue
          cancelTimers();
          s.paused.phase = 'paused';
          emit('pause', { reason, from: s.paused.from });
        }
        return true;
      }
      if (PAUSABLE.indexOf(s.state) === -1) return false;
      let remaining = null;
      if (s.state === S.QUESTION_ACTIVE) {
        if (now() >= s.current.deadline) { resolve({ kind: 'timeout' }); }
        else remaining = s.current.timeLimit === null ? null : s.current.deadline - now();
      }
      const from = s.state;
      const pending = s.pending;
      cancelTimers();
      cancelSpeech();
      s.paused = { from, remaining, pending, phase: 'paused', reason };
      setState(S.PAUSED);
      emit('pause', { reason, from });
      return true;
    }

    function resume() {
      if (s.state !== S.PAUSED || s.paused.phase !== 'paused') return false;
      s.paused.phase = 'ready';
      emit('ready', { from: s.paused.from });
      schedule(finishResume, T.readyCue);
      return true;
    }

    function finishResume() {
      const p = s.paused;
      s.paused = null;
      if (p.from === S.QUESTION_ACTIVE) {
        setState(S.QUESTION_ACTIVE);
        emit('resume', { current: s.current });
        startClock(p.remaining);
      } else if (p.from === S.RULE_TRANSITION) {
        s.pending = null;
        activate();
      } else { // FEEDBACK
        setState(S.FEEDBACK);
        s.pending = p.pending;
        runPending(p.pending || 'next');
      }
    }

    function getState() { return s; }

    const api = {
      start, toIntro, answer, tick, pause, resume, timeRemaining,
      practiceNext, skipPractice, getState,
      _resolve: resolve, _timeout: timeout,
      get state() { return s.state; }
    };
    return api;
  }

  return { createEngine, decideRule, timeLimitFor, bestKey, STATES: S, STREAK_MESSAGES, MAX_LIVES };
});
