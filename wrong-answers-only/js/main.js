/*
 * WRONG ANSWERS ONLY — UI controller.
 * The engine owns all game state; this file only renders it and forwards input.
 */
(function () {
  'use strict';

  const Q = window.WAOQuestions;
  const E = window.WAOEngine;
  const I = window.WAOInput;
  const S = E.STATES;
  const $ = (id) => document.getElementById(id);

  // -------------------------------------------------------------- storage
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable: keep playing */ } }
  };

  const reducedMotionMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const reduced = () => reducedMotionMq.matches;

  // -------------------------------------------------------------- services
  const audio = window.WAOAudio.createAudio(store.get('woa.sound') !== '0');
  const fx = window.WAOEffects.createEffects($('fx'));
  fx.setEnabled(!reduced());
  if (reducedMotionMq.addEventListener) reducedMotionMq.addEventListener('change', () => fx.setEnabled(!reduced()));

  // -------------------------------------------------------------- elements
  const game = $('game');
  const el = {
    play: $('screen-play'), over: $('screen-over'), review: $('screen-review'),
    rule: $('rule'), ruleMark: $('rule-mark'), ruleText: $('rule-text'),
    caption: $('caption'), captionText: $('caption-text'), qNum: $('q-num'),
    prompt: $('prompt'), visual: $('visual'), stamp: $('stamp'),
    tr: $('transition'), trKicker: $('tr-kicker'), trBig: $('tr-big'), trSmall: $('tr-small'),
    timer: $('timer'), timerFill: $('timer-fill'), timerLabel: $('timer-label'),
    left: $('ans-left'), right: $('ans-right'), leftLabel: $('ans-left-label'), rightLabel: $('ans-right-label'),
    feedback: $('feedback'), practiceBar: $('practice-bar'), prTag: $('pr-tag'), practiceNext: $('practice-next'),
    score: $('hud-score'), best: $('hud-best'), lives: $('lives'),
    pause: $('pause'), pauseKicker: $('pause-kicker'), pauseTitle: $('pause-title'), pauseSub: $('pause-sub'),
    live: $('live')
  };

  // One referee, moved between slots so it keeps a single identity.
  const ref = $('ref-template').content.firstElementChild.cloneNode(true);
  function placeRef(slot) {
    const target = document.querySelector('[data-ref-slot="' + slot + '"]');
    if (target && ref.parentNode !== target) target.appendChild(ref);
  }
  function mood(m) { ref.setAttribute('data-mood', m); }
  placeRef('intro');

  // -------------------------------------------------------------- engine
  const engine = E.createEngine({
    questions: Q,
    storage: store,
    onEvent: handle
  });

  // -------------------------------------------------------------- helpers
  let captionTimer = 0;
  function caption(text, speak, opts) {
    clearTimeout(captionTimer);
    el.captionText.textContent = text ? '“' + text + '”' : '';
    el.caption.classList.toggle('on', !!text);
    if (text) captionTimer = setTimeout(() => el.caption.classList.remove('on'), 2600);
  }
  function announce(text) {
    el.live.textContent = '';
    // Re-set on next frame so repeated messages are still announced.
    requestAnimationFrame(() => { el.live.textContent = text; });
  }
  function restartAnim(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth; // reflow so the animation replays
    node.classList.add(cls);
  }
  function showScreen(name) {
    game.dataset.screen = name;
    if (name === 'intro') placeRef('intro');
    else if (name === 'over' || name === 'review') placeRef('over');
    else placeRef('play');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function bestFor(mode) {
    const v = Number(store.get(E.bestKey(mode)));
    return isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  const RULES = {
    wrong: { mark: '✗', text: 'PICK THE WRONG ANSWER', sr: 'Pick the wrong answer.' },
    normal: { mark: '✓', text: 'NORMAL ROUND · PICK THE CORRECT ANSWER', sr: 'Normal round. Pick the correct answer.' }
  };
  function setRule(rule) {
    game.dataset.rule = rule;
    el.ruleMark.textContent = RULES[rule].mark;
    el.ruleText.textContent = RULES[rule].text;
  }

  function setAnswersEnabled(on) {
    [el.left, el.right].forEach((b) => {
      b.setAttribute('aria-disabled', on ? 'false' : 'true');
      b.classList.remove('is-picked', 'pop', 'wobble');
      b.removeAttribute('data-mark');
    });
  }
  function clearAnswers() {
    el.leftLabel.textContent = '—'; el.rightLabel.textContent = '—';
    el.left.setAttribute('aria-label', 'Left answer'); el.right.setAttribute('aria-label', 'Right answer');
    setAnswersEnabled(false);
  }

  /** Render a question exactly from its data. */
  function renderQuestion(current) {
    const q = current.question;
    const left = Q.optionById(q, current.layout[0]);
    const right = Q.optionById(q, current.layout[1]);
    el.prompt.textContent = q.prompt;
    el.visual.innerHTML = '';
    if (q.visual) el.visual.appendChild(renderVisual(q.visual));
    el.visual.classList.toggle('has', !!q.visual);
    el.leftLabel.textContent = left.label;
    el.rightLabel.textContent = right.label;
    el.left.setAttribute('aria-label', 'Left answer: ' + left.label);
    el.right.setAttribute('aria-label', 'Right answer: ' + right.label);
    el.left.dataset.token = el.right.dataset.token = String(current.token);
    clearStamp();
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';
    el.tr.classList.remove('on');
    setAnswersEnabled(true);
  }

  const SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function renderVisual(v) {
    const svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'vis vis-' + v.type });
    if (v.type === 'dots') {
      v.dots.forEach((d) => svg.appendChild(svgEl('circle', { cx: d.x.toFixed(1), cy: d.y.toFixed(1), r: 8.5, class: 'dot' })));
    } else if (v.type === 'shape') {
      if (v.shape === 'circle') svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 36, class: 'shape' }));
      else if (v.shape === 'square') svg.appendChild(svgEl('rect', { x: 18, y: 18, width: 64, height: 64, class: 'shape' }));
      else {
        const pts = [];
        const n = v.sides;
        const r = 40, cy = n === 3 ? 58 : 50;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + i * 2 * Math.PI / n;
          pts.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
        }
        svg.appendChild(svgEl('polygon', { points: pts.join(' '), class: 'shape' }));
      }
    }
    return svg;
  }

  function renderLives(lives) {
    const spans = el.lives.querySelectorAll('.life');
    spans.forEach((s, i) => s.classList.toggle('lost', i >= lives));
    el.lives.setAttribute('aria-label', lives + ' of ' + E.MAX_LIVES + ' lives left');
  }
  function renderHud() {
    const st = engine.getState();
    el.score.textContent = st.score;
    el.best.textContent = Math.max(bestFor(st.mode), 0);
    renderLives(st.lives);
  }

  // -------------------------------------------------------------- lines
  const LINES = {
    start: 'Finally. A game for bad decisions.',
    success: 'Beautifully wrong.',
    mistake: 'Unfortunately, that was correct.',
    normal: 'Plot twist. Be right.',
    backToWrong: 'Back to being wrong.',
    scoreMilestone: 'You’re getting worse. Excellent.',
    gameOver: 'Too much common sense.',
    newBest: 'A new personal worst. I mean best.'
  };

  // -------------------------------------------------------------- events
  function handle(type, d) {
    switch (type) {
      case 'state': onState(d); break;
      case 'practice': onPractice(d); break;
      case 'practiceResult': onPracticeResult(d); break;
      case 'runStart': onRunStart(d); break;
      case 'transition': onTransition(d); break;
      case 'question': onQuestion(d); break;
      case 'resolve': onResolve(d); break;
      case 'pause': onPause(d); break;
      case 'ready': onReady(d); break;
      case 'resume': onResume(d); break;
      case 'gameover': onGameOver(d); break;
    }
  }

  function onState(d) {
    game.dataset.state = d.to;
    if (d.to !== S.PAUSED) { el.pause.hidden = true; if (game.dataset.screen === 'play') placeRef('play'); }
    if (d.to !== S.QUESTION_ACTIVE && d.to !== S.PRACTICE) {
      [el.left, el.right].forEach((b) => b.setAttribute('aria-disabled', 'true'));
    }
  }

  function onPractice(d) {
    showScreen('play');
    const c = d.current;
    el.practiceBar.hidden = false;
    el.practiceNext.hidden = true;
    el.prTag.textContent = 'Practice ' + (d.index + 1) + ' / ' + d.total + ' · untimed';
    game.dataset.timed = 'practice';
    el.timerLabel.textContent = 'Practice · no clock';
    el.qNum.textContent = 'P.' + pad(d.index + 1);
    const prevRule = game.dataset.rule;
    setRule(c.rule);
    renderQuestion(c);
    el.feedback.textContent = c.rule === 'wrong' ? 'Pick the answer that is false.' : 'NORMAL ROUND: this time pick the answer that is true.';
    el.feedback.className = 'feedback hint';
    if (c.rule === 'normal') {
      restartAnim(el.rule, 'flip');
      audio.play('ruleSwitch');
      mood('surprised');
      caption(LINES.normal, true, { force: true });
    } else {
      mood('smug');
      if (prevRule === 'normal') restartAnim(el.rule, 'flip');
    }
    announce('Practice. ' + RULES[c.rule].sr + ' ' + c.question.prompt);
    focusPlay();
    renderHud();
  }

  function onPracticeResult(d) {
    const btn = d.side === 'right' ? el.right : el.left;
    markButtons(d.current, d.optionId);
    if (d.success) {
      restartAnim(btn, 'pop');
      burstFrom(btn);
      audio.play(d.current.rule === 'normal' ? 'normalWin' : 'wrongWin');
      mood('approve');
      if (d.index === 0) caption(LINES.success, true, { force: true });
    } else {
      if (!reduced()) restartAnim(btn, 'wobble');
      audio.play('mistake');
      mood('disappointed');
      if (d.index === 0) caption(LINES.mistake, true, { force: true });
    }
    showStamp(d.success ? (d.current.rule === 'normal' ? 'Correct. Oddly.' : 'Beautifully wrong') : (d.current.rule === 'normal' ? 'Wrong moment' : 'Too correct'),
      d.success ? 'good-' + d.current.rule : 'bad');
    el.feedback.textContent = d.line;
    el.feedback.className = 'feedback ' + (d.success ? 'good' : 'bad');
    [el.left, el.right].forEach((b) => b.setAttribute('aria-disabled', 'true'));
    el.practiceNext.hidden = false;
    el.practiceNext.textContent = d.index === 0 ? 'Next' : 'Start for real';
    el.practiceNext.focus({ preventScroll: true });
    announce(d.line);
  }

  function onRunStart(d) {
    showScreen('play');
    el.practiceBar.hidden = true;
    game.dataset.timed = d.mode === 'chill' ? 'chill' : 'timed';
    el.timerLabel.textContent = d.mode === 'chill' ? 'Chill mode · no clock' : '';
    el.timerFill.style.transform = 'scaleX(1)';
    renderHud();
    focusPlay();
  }

  function onTransition(d) {
    setRule(d.rule);
    clearAnswers();
    el.prompt.innerHTML = '&nbsp;';
    el.visual.innerHTML = '';
    el.visual.classList.remove('has');
    clearStamp();
    el.feedback.textContent = '';
    el.qNum.textContent = 'Q.' + pad(d.current.n);
    el.timerFill.style.transform = 'scaleX(1)';
    el.timerFill.classList.remove('low');
    if (d.rule === 'normal') {
      el.trKicker.textContent = 'Plot twist';
      el.trBig.textContent = 'NORMAL ROUND';
      el.trSmall.innerHTML = '<span class="mark">✓</span> Pick the correct answer';
      mood('surprised');
      caption(LINES.normal, true, { force: true });
    } else {
      el.trKicker.textContent = d.first ? 'The rule' : 'Back to normal (abnormal)';
      el.trBig.textContent = d.first ? 'WRONG ANSWERS ONLY' : 'WRONG AGAIN';
      el.trSmall.innerHTML = '<span class="mark">✗</span> Pick the wrong answer';
      mood('smug');
      if (!d.first) caption(LINES.backToWrong, true, { force: true });
    }
    el.tr.dataset.rule = d.rule;
    restartAnim(el.tr, 'on');
    restartAnim(el.rule, 'flip');
    audio.play('ruleSwitch');
    announce((d.rule === 'normal' ? 'Normal round! ' : '') + RULES[d.rule].sr);
  }

  function onQuestion(d) {
    const c = d.current;
    el.qNum.textContent = 'Q.' + pad(c.n);
    renderQuestion(c);
    if (ref.getAttribute('data-mood') !== 'surprised' || c.rule !== 'normal') mood('neutral');
    // Keep the rule reminder visible on NORMAL ROUND; otherwise clear stale lines.
    if (!(c.rule === 'normal' && el.captionText.textContent.indexOf(LINES.normal) !== -1)) caption('');
    el.timerFill.classList.remove('low');
    el.timerFill.style.transform = 'scaleX(1)';
    const q = c.question;
    announce(RULES[c.rule].sr + ' ' + q.prompt + ' Left: ' + el.leftLabel.textContent + '. Right: ' + el.rightLabel.textContent + '.');
  }

  function markButtons(current, chosenId) {
    const winId = Q.winningOptionId(current.question, current.rule);
    [el.left, el.right].forEach((b, i) => {
      const id = current.layout[i];
      if (id === chosenId) b.classList.add('is-picked');
      if (id === winId) b.setAttribute('data-mark', id === chosenId ? 'yes' : 'needed');
      else if (id === chosenId) b.setAttribute('data-mark', 'no');
    });
  }

  function clearStamp() {
    el.stamp.className = 'stamp';
    el.stamp.textContent = '';
    el.stamp.parentNode.classList.remove('stamped');
  }
  function showStamp(text, kind) {
    el.stamp.textContent = text;
    el.stamp.className = 'stamp ' + kind;
    restartAnim(el.stamp, 'on');
    el.stamp.parentNode.classList.add('stamped');
  }

  function burstFrom(btn) {
    const r = btn.getBoundingClientRect();
    fx.ink(r.left + r.width / 2, r.top + r.height / 2, game.dataset.rule === 'normal' ? '#3454D1' : '#E34B36');
  }

  function onResolve(r) {
    const st = engine.getState();
    const current = st.current;
    const btn = r.side === 'right' ? el.right : r.side === 'left' ? el.left : null;
    markButtons(current, r.optionId);
    renderLives(r.lives);
    el.score.textContent = r.score;

    if (r.success) {
      restartAnim(btn, 'pop');
      restartAnim(el.score, 'bump');
      burstFrom(btn);
      audio.play(r.rule === 'normal' ? 'normalWin' : 'wrongWin');
      mood('approve');
      showStamp(r.rule === 'normal' ? 'Correct. Oddly.' : 'Beautifully wrong', 'good-' + r.rule);
      el.feedback.textContent = '';
      if (r.milestone) {
        audio.play('streak');
        caption(r.milestone.text, true, { force: true });
        el.feedback.textContent = 'Streak ' + r.milestone.streak + '. ' + r.milestone.text;
        el.feedback.className = 'feedback good';
        announce('Streak ' + r.milestone.streak + '. ' + r.milestone.text);
      }
      if (r.scoreMilestone) {
        fx.confetti('small');
        if (!r.milestone) {
          audio.play('streak');
          caption(LINES.scoreMilestone, true, { force: true });
          el.feedback.textContent = r.scoreMilestone + ' points. ' + LINES.scoreMilestone;
          el.feedback.className = 'feedback good';
        }
      }
      if (!r.milestone) announce('Yes. Score ' + r.score + '.');
    } else {
      if (btn && !reduced()) restartAnim(btn, 'wobble');
      const life = el.lives.querySelectorAll('.life')[r.lives];
      if (life) restartAnim(life, 'cross');
      mood('disappointed');
      let line, stamp;
      if (r.kind === 'timeout') { line = 'Overthinking counts too.'; stamp = 'Time’s up'; audio.play('timeout'); }
      else if (r.rule === 'normal') { line = 'Normal round! This time, choose the true answer.'; stamp = 'Wrong moment'; audio.play('mistake'); }
      else { line = 'Too correct. You needed the false answer.'; stamp = 'Too correct'; audio.play('mistake'); }
      showStamp(stamp, 'bad');
      el.feedback.innerHTML = '';
      const strong = document.createElement('strong'); strong.textContent = line;
      const fact = document.createElement('span'); fact.textContent = ' ' + r.question.explanation;
      el.feedback.append(strong, fact);
      el.feedback.className = 'feedback bad';
      announce(line + ' ' + r.question.explanation + ' ' + r.lives + (r.lives === 1 ? ' life' : ' lives') + ' left.');
    }
    if (st.state === S.FEEDBACK) el.timerFill.classList.remove('low');
  }

  let pauseFromBtn = false;
  function onPause(d) {
    el.pause.hidden = false;
    el.pauseKicker.textContent = d.reason === 'hidden' || d.reason === 'blur' ? 'You wandered off' : 'Game paused';
    el.pauseTitle.textContent = 'Paused.';
    el.pauseSub.textContent = 'The clock is frozen. Take your time being wrong.';
    $('resume-btn').hidden = false;
    $('quit-btn').hidden = false;
    placeRef('pause');
    mood('sleepy');
    audio.suspend();
    clearHeld();
    if (pauseFromBtn || d.reason === 'key') $('resume-btn').focus({ preventScroll: true });
    pauseFromBtn = false;
    announce('Paused. Press Resume to continue.');
  }
  function onReady() {
    audio.wake();
    el.pauseKicker.textContent = 'Back in';
    el.pauseTitle.textContent = 'Ready…';
    el.pauseSub.textContent = 'Clock restarts in a moment.';
    $('resume-btn').hidden = true;
    $('quit-btn').hidden = true;
    mood('neutral');
    setTimeout(() => audio.play('ready'), 30);
    announce('Ready.');
    focusPlay();
  }
  function onResume() {
    el.pause.hidden = true;
    placeRef('play');
    setAnswersEnabled(true);
    clearHeld();
  }

  function onGameOver(sum) {
    showScreen('over');
    mood(sum.isNewBest ? 'approve' : 'disappointed');
    $('over-mode').textContent = sum.mode === 'chill' ? 'Chill mode · untimed' : 'Timed mode';
    $('over-score').textContent = sum.score;
    $('over-num-label').textContent = sum.score === 1 ? 'point' : 'points';
    $('over-best').textContent = sum.best;
    $('over-streak').textContent = sum.longestStreak;
    $('over-mistakes').textContent = sum.mistakes.length;
    $('over-survived').textContent = 'You survived ' + sum.survived + (sum.survived === 1 ? ' question.' : ' questions.');
    $('best-stamp').hidden = !sum.isNewBest;
    $('review-btn').disabled = sum.mistakes.length === 0;
    if (sum.isNewBest) {
      restartAnim($('best-stamp'), 'on');
      audio.play('newBest');
      fx.confetti('big');
      caption(LINES.newBest, true, { force: true });
    } else {
      audio.play('gameOver');
      caption(LINES.gameOver, true, { force: true });
    }
    renderReview(sum);
    announce('Game over. Score ' + sum.score + '. Best ' + sum.best + '.' + (sum.isNewBest ? ' New best!' : ''));
    $('again-btn').focus({ preventScroll: true });
    updateIntroBest();
  }

  function renderReview(sum) {
    const list = $('review-list');
    list.innerHTML = '';
    sum.mistakes.forEach((m) => {
      const li = document.createElement('li');
      li.className = 'rv rv-' + m.rule;
      li.innerHTML =
        '<span class="rv-n"></span><span class="rv-rule"></span>' +
        '<span class="rv-prompt"></span>' +
        '<span class="rv-row"><span class="rv-k">You</span><span class="rv-you"></span></span>' +
        '<span class="rv-row"><span class="rv-k">Needed</span><span class="rv-need"></span></span>' +
        '<span class="rv-fact"></span>';
      li.querySelector('.rv-n').textContent = 'Q.' + pad(m.n);
      li.querySelector('.rv-rule').textContent = m.rule === 'normal' ? '✓ Normal round · pick true' : '✗ Pick the false one';
      li.querySelector('.rv-prompt').textContent = m.prompt;
      li.querySelector('.rv-you').textContent = m.kind === 'timeout' ? 'Timed out' : m.selected;
      li.querySelector('.rv-need').textContent = m.required;
      li.querySelector('.rv-fact').textContent = 'Fact: ' + m.explanation;
      list.appendChild(li);
    });
  }

  // -------------------------------------------------------------- input
  // Held-input guard: a pointer press must begin on the question it answers.
  let downToken = null;
  function clearHeld() { downToken = null; }
  function currentToken() { const c = engine.getState().current; return c ? c.token : null; }
  function answerable() {
    const st = engine.getState();
    return st.state === S.QUESTION_ACTIVE || (st.state === S.PRACTICE && st.practice && !st.practice.result);
  }

  [el.left, el.right].forEach((btn) => {
    btn.addEventListener('pointerdown', () => {
      downToken = answerable() ? currentToken() : null;
    });
    btn.addEventListener('click', (e) => {
      if (btn.getAttribute('aria-disabled') === 'true' || !answerable()) return;
      const token = Number(btn.dataset.token);
      // Pointer clicks (detail > 0) must have started on this very question.
      if (e.detail > 0 && downToken !== token) return;
      submit(btn.dataset.side, token);
    });
    btn.addEventListener('keydown', (e) => { if (I.isRepeatActivation(e)) e.preventDefault(); });
  });

  function submit(side, token) {
    audio.play('click');
    engine.answer(side, token);
  }

  // Shortcuts are scoped to the game: events from inside the game root, or from the
  // bare document body when focus was dropped (e.g. a control was hidden). Keys typed
  // into anything else on the page are never intercepted.
  function inGameScope(target) {
    return target === document.body || target === document.documentElement || game.contains(target);
  }
  document.addEventListener('keydown', (e) => {
    if (!inGameScope(e.target)) return;
    if (I.isRepeatActivation(e)) { e.preventDefault(); return; }
    const st = engine.getState().state;
    if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && !e.repeat &&
        (st === S.QUESTION_ACTIVE || st === S.RULE_TRANSITION || st === S.FEEDBACK)) {
      e.preventDefault();
      engine.pause('key');
      return;
    }
    const side = I.keyToSide(e);
    if (!side) {
      // swallow repeats of answer keys so they never leak into the next question
      if (e.repeat && /^(ArrowLeft|ArrowRight|a|A|d|D)$/.test(e.key) && game.dataset.screen === 'play') e.preventDefault();
      return;
    }
    if (game.dataset.screen !== 'play') return;
    if (!answerable()) { if (st !== S.INTRO) e.preventDefault(); return; }
    e.preventDefault();
    const btn = side === 'left' ? el.left : el.right;
    btn.classList.add('kbd');
    setTimeout(() => btn.classList.remove('kbd'), 120);
    submit(side, currentToken());
  });

  function focusPlay() {
    const a = document.activeElement;
    if (a && el.play.contains(a) && a.getClientRects().length && !a.closest('.pause')) return;
    el.play.focus({ preventScroll: true });
  }

  // -------------------------------------------------------------- buttons
  function selectedMode() {
    const r = document.querySelector('input[name="mode"]:checked');
    return r && r.value === 'chill' ? 'chill' : 'timed';
  }
  document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', () => {
    store.set('woa.mode', selectedMode());
  }));
  if (store.get('woa.mode') === 'chill') document.querySelector('input[value="chill"]').checked = true;

  function startGame(practice) {
    audio.unlock(); // inside the click: creates/resumes the AudioContext
    fx.clear();
    const mode = selectedMode();
    caption(LINES.start, true, { force: true });
    mood('smug');
    engine.start({ mode, practice });
  }

  $('start-btn').addEventListener('click', () => startGame(store.get('woa.practiceDone') !== '1'));
  $('practice-again').addEventListener('click', () => startGame(true));
  $('skip-practice').addEventListener('click', () => { audio.play('click'); caption(''); engine.skipPractice(); });
  el.practiceNext.addEventListener('click', () => {
    audio.play('click');
    if (engine.getState().practice && engine.getState().practice.index === 1) caption('');
    engine.practiceNext();
  });
  $('pause-btn').addEventListener('click', () => { pauseFromBtn = true; engine.pause('button'); });
  $('resume-btn').addEventListener('click', () => { audio.unlock(); engine.resume(); });
  $('quit-btn').addEventListener('click', () => { engine.toIntro(); toIntro(); });
  $('again-btn').addEventListener('click', () => {
    audio.unlock(); fx.clear(); caption('');
    engine.start({ mode: engine.getState().mode, practice: false });
  });
  $('review-btn').addEventListener('click', () => { showScreen('review'); $('review-back').focus({ preventScroll: true }); });
  $('review-back').addEventListener('click', () => { showScreen('over'); $('review-btn').focus({ preventScroll: true }); });
  $('menu-btn').addEventListener('click', () => { engine.toIntro(); toIntro(); });

  function toIntro() {
    fx.clear(); caption('');
    showScreen('intro');
    mood('smug');
    updateIntroBest();
    $('start-btn').focus({ preventScroll: true });
  }

  function updateIntroBest() {
    $('intro-best').textContent = 'Best — timed ' + bestFor('timed') + ' · chill ' + bestFor('chill');
    $('practice-again').hidden = store.get('woa.practiceDone') !== '1';
  }

  // Sound toggle (start screen and HUD stay in sync)
  function syncToggles() {
    ['sound-toggle', 'hud-sound'].forEach((id) => $(id).setAttribute('aria-pressed', String(audio.enabled)));
    $('hud-sound').setAttribute('aria-label', audio.enabled ? 'Sound on' : 'Sound off');
  }
  function toggleSound() {
    audio.unlock();
    audio.setEnabled(!audio.enabled);
    store.set('woa.sound', audio.enabled ? '1' : '0');
    if (audio.enabled) { audio.wake(); audio.play('click'); }
    syncToggles();
  }
  $('sound-toggle').addEventListener('click', toggleSound);
  $('hud-sound').addEventListener('click', toggleSound);
  syncToggles();
  updateIntroBest();

  // -------------------------------------------------------------- interruptions
  function interrupt(reason) {
    clearHeld();
    engine.pause(reason);
    if (engine.getState().state !== S.PAUSED) audio.suspend();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) interrupt('hidden');
    else if (engine.getState().state !== S.PAUSED) audio.wake();
  });
  window.addEventListener('blur', () => interrupt('blur'));
  window.addEventListener('focus', () => { if (engine.getState().state !== S.PAUSED) audio.wake(); });
  window.addEventListener('pagehide', () => { audio.suspend(); });

  // -------------------------------------------------------------- frame loop
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    engine.tick();
    const st = engine.getState();
    if (st.current && st.current.timeLimit) {
      const rem = engine.timeRemaining();
      if (st.state === S.QUESTION_ACTIVE || st.state === S.PAUSED) {
        const frac = Math.max(0, Math.min(1, rem / st.current.timeLimit));
        el.timerFill.style.transform = 'scaleX(' + frac.toFixed(4) + ')';
        el.timerFill.classList.toggle('low', frac < 0.34);
      }
    }
    fx.update(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test hook (read-only access for automated browser checks).
  window.__WAO = { engine, audio, fx, Q };
})();
