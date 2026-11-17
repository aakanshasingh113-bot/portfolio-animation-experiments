/* Browser glue: one loop, UI panels, focus, audio/voice reactions, interruptions. */
(function () {
  'use strict';
  const NS = window.DNS;
  const S = NS.Game.STATES;
  const $ = (id) => document.getElementById(id);

  // ---------- storage that never throws ----------
  const storage = (function () {
    try {
      const k = '__dns_probe__';
      window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k);
      return window.localStorage;
    } catch (e) {
      const m = new Map();
      return { getItem: (key) => (m.has(key) ? m.get(key) : null), setItem: (key, v) => m.set(key, String(v)) };
    }
  })();
  const pref = (k, d) => { try { const v = storage.getItem('dns.' + k); return v == null ? d : v === '1'; } catch (e) { return d; } };
  const savePref = (k, v) => { try { storage.setItem('dns.' + k, v ? '1' : '0'); } catch (e) { /* ignore */ } };

  const params = new URLSearchParams(location.search);
  const seedParam = Number(params.get('seed'));
  const game = new NS.Game({ storage, seed: Number.isFinite(seedParam) && seedParam > 0 ? seedParam : undefined });

  const reducedMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const reduced = () => !!reducedMQ.matches;

  const prefs = { sound: pref('sound', true), voice: pref('voice', true) };
  const audio = new NS.AudioEngine();
  audio.enabled = prefs.sound;

  const el = {
    region: $('game'), stage: $('stage'), canvas: $('canvas'),
    delivery: $('stat-delivery'), tips: $('stat-tips'), progress: $('progress'), fill: $('progress-fill'),
    left: $('btn-left'), right: $('btn-right'), pause: $('btn-pause'),
    caption: $('caption'), captionText: $('caption-text'), announcer: $('announcer'),
    soundBtn: $('toggle-sound'), voiceBtn: $('toggle-voice'), testVoice: $('test-voice'), voiceStatus: $('voice-status'),
    ledgerSession: $('ledger-session'), ledgerBest: $('ledger-best'), introNote: $('intro-note'),
    panels: {
      intro: $('panel-intro'), tutorial: $('panel-tutorial'), ready: $('panel-ready'), table: $('panel-table'),
      result: $('panel-result'), pause: $('panel-pause'), shift: $('panel-shift'), fail: $('panel-fail'),
    },
  };

  // ---------- captions + voice ----------
  let captionTimer = 0;
  function showCaption(text) {
    el.captionText.textContent = text;
    el.caption.classList.remove('idle');
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => el.caption.classList.add('idle'), 3600);
  }
  const VOICE_STATUS = {
    unsupported: 'Voice isn’t supported in this browser. Captions stay on.',
    untested: 'Voice not yet confirmed. Captions always show.',
    working: 'Voice confirmed: the browser reported speech starting.',
    blocked: 'The browser blocked speech. Press Test voice to allow it.',
    failed: 'Speech failed in this browser. Captions stay on.',
    silent: 'No speech was reported. Your system may have no voices installed. Captions stay on.',
    off: 'Voice off. Captions stay on.',
  };
  function renderVoiceStatus() {
    let key = voice.status;
    if (voice.supported && !prefs.voice) key = 'off';
    el.voiceStatus.textContent = VOICE_STATUS[key] || VOICE_STATUS.untested;
  }
  const voice = new NS.VoiceEngine({ onCaption: showCaption, onStatus: renderVoiceStatus });
  voice.setEnabled(prefs.voice);

  let lastAnnounce = '';
  function announce(text) {
    if (text === lastAnnounce) text += ' ';
    lastAnnounce = text;
    el.announcer.textContent = text;
  }

  const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];
  const cupsWord = (n) => { const w = NUM_WORDS[n] || String(n); return w.charAt(0).toUpperCase() + w.slice(1) + (n === 1 ? ' cup' : ' cups'); };
  const sideWord = (s) => (s < 0 ? 'left' : 'right');

  // ---------- renderer + input ----------
  const renderer = new NS.Renderer(el.canvas, game, { reducedMotion: reduced });
  const input = new NS.InputController({
    region: el.region, leftBtn: el.left, rightBtn: el.right,
    onChange: (l, r) => game.setInput(l, r),
    onPauseKey: () => { if (game.pause('user')) { flush(); return true; } return false; },
    isActive: () => game.isTiltActive(),
  });

  const ro = new ResizeObserver(() => {
    const r = el.stage.getBoundingClientRect();
    renderer.resize(Math.round(r.width), Math.round(r.height));
  });
  ro.observe(el.stage);
  { const r = el.stage.getBoundingClientRect(); renderer.resize(Math.round(r.width) || 520, Math.round(r.height) || 650); }

  // ---------- panels + focus ----------
  let resultShown = false;
  function showPanel(name) {
    for (const k in el.panels) el.panels[k].hidden = k !== name;
  }
  function focusSafely(node) {
    if (!node) return;
    const a = document.activeElement;
    if (!a || a === document.body || el.region.contains(a) || a.closest('[hidden]')) {
      try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); }
    }
  }
  function enableButtons(panel, on) {
    panel.querySelectorAll('button').forEach((b) => { b.disabled = !on; });
  }

  function onState(from, to) {
    const ambient = to === S.TUTORIAL || to === S.TABLE_INTRO || to === S.PLAYING;
    if (!ambient) audio.stopAmbience(to === S.PAUSED || to === S.SPILLING);
    el.pause.disabled = !(to === S.TUTORIAL || to === S.TABLE_INTRO || to === S.PLAYING);
    if (to !== S.PLAYING && to !== S.TABLE_INTRO && to !== S.TUTORIAL) input.clearAll();

    switch (to) {
      case S.TUTORIAL:
        showPanel('tutorial'); enableButtons(el.panels.tutorial, true);
        updateChecks();
        focusSafely(el.region);
        break;
      case S.TABLE_INTRO: {
        const n = game.delivery, cups = game.sim.cups.length;
        $('table-title').textContent = 'Delivery ' + n + ' · ' + cupsWord(cups);
        $('table-sub').textContent = n === 1 ? 'Hold ← → or A / D, or the tilt buttons' : (n === 2 ? 'Watch for customers' : '');
        if (from !== S.PAUSED) showPanel('table'); else showPanel('table');
        focusSafely(el.region);
        break;
      }
      case S.PLAYING:
        showPanel(null);
        focusSafely(el.region);
        break;
      case S.PAUSED:
        showPanel('pause'); enableButtons(el.panels.pause, true);
        focusSafely($('btn-resume'));
        break;
      case S.DELIVERY_COMPLETE:
        resultShown = false;
        showPanel(null);
        break;
      case S.SPILLING:
        showPanel(null);
        break;
      case S.SHIFT_COMPLETE:
        fillShift();
        showPanel('shift'); enableButtons(el.panels.shift, true);
        focusSafely($('btn-again'));
        break;
      case S.GAME_OVER:
        $('fail-lost').textContent = String(game.lastFail.lost);
        $('fail-banked').textContent = String(game.lastFail.previouslyBanked);
        showPanel('fail'); enableButtons(el.panels.fail, true);
        focusSafely($('btn-retry'));
        break;
      default: break;
    }
  }

  function showResult() {
    const r = game.lastResult;
    resultShown = true;
    $('res-base').textContent = '+' + r.base;
    $('res-perfect-row').hidden = !(r.perfect > 0);
    $('res-perfect').textContent = '+' + r.perfect;
    $('res-splash-row').hidden = r.perfect > 0;
    $('res-splash').textContent = r.splashes === 1 ? '1 little splash' : r.splashes + ' little splashes';
    $('res-unbanked').textContent = String(r.unbanked);
    $('res-next').textContent = 'Next: Delivery ' + (r.delivery + 1) + ' · ' + cupsWord(r.nextCups) + ' · risking ' + r.unbanked;
    showPanel('result'); enableButtons(el.panels.result, true);
    focusSafely($('btn-more'));
    announce('Table served. Delivery tips plus ' + r.base + (r.perfect ? '. Perfect delivery plus ' + r.perfect : '') +
      '. Unbanked tips ' + r.unbanked + '. One more table, or finish shift?');
  }

  function fillShift() {
    const sh = game.lastShift;
    const dl = $('shift-lines');
    dl.textContent = '';
    for (const h of sh.history) {
      const row = document.createElement('div'); row.className = 'line';
      const dt = document.createElement('dt'); dt.textContent = 'Table ' + h.delivery + (h.perfect ? ' · perfect' : '');
      const dd = document.createElement('dd'); dd.textContent = String(h.base + h.perfect);
      row.append(dt, dd); dl.append(row);
    }
    $('shift-banked').textContent = 'Tips banked: ' + sh.banked;
    const best = $('shift-best');
    best.className = 'best' + (sh.newBest ? ' new' : '');
    best.textContent = sh.newBest ? 'New best shift!' : 'Best shift: ' + sh.best;
  }

  function updateChecks() {
    const tu = game.tutorial;
    $('chk-left').classList.toggle('done', !!(tu && tu.left));
    $('chk-right').classList.toggle('done', !!(tu && tu.right));
    $('chk-level').classList.toggle('done', !!(tu && tu.phase === 'ready'));
    const prompt = $('tut-prompt');
    if (!tu || (!tu.left && !tu.right)) prompt.textContent = 'Hold left, then right. Release to level.';
    else if (tu.left && !tu.right) prompt.textContent = 'Now hold right.';
    else if (!tu.left && tu.right) prompt.textContent = 'Now hold left.';
    else prompt.textContent = 'Release to level.';
  }

  // ---------- events from the game ----------
  const TABLE_LINES = { 2: 'They ordered another.', 3: 'Four cups. Deep breath.', 4: 'Five cups. Show-off.' };
  const LATER_LINES = ['They ordered another.', 'Still steady? Good.'];
  const BUMP_LINES = ['Coming through!', 'Behind you!', 'Mind the elbow!'];

  function handle(e) {
    if (e.runId !== game.runId) return; // stale run
    renderer.onEvent(e);
    switch (e.type) {
      case 'state': onState(e.from, e.to); break;
      case 'tutorialStart':
        voice.say('Quick practice first.', { priority: 2 });
        announce('Practice. One cup, nothing at risk. Hold left, then right, then release to level.');
        break;
      case 'tutorialProgress': updateChecks(); if (prefs.sound) audio.play('click'); break;
      case 'tutorialReady':
        updateChecks();
        showPanel('ready'); enableButtons(el.panels.ready, true);
        focusSafely($('btn-go'));
        voice.say('Ready when you are.', { priority: 1 });
        announce('Practice done. Ready for your first table?');
        break;
      case 'practiceReset': showCaption('Practice cup replaced. No harm done.'); break;
      case 'tableIntro': {
        const n = e.delivery;
        const line = n === 1 ? 'Table one. Nice and steady.' : (TABLE_LINES[n] || LATER_LINES[n % 2]);
        voice.say(line, { priority: 2 });
        announce('Delivery ' + n + '. ' + cupsWord(e.cups) + '.');
        break;
      }
      case 'deliveryStart': announce('Go.'); break;
      case 'bumpWarn':
        if (prefs.sound) audio.play('bumpWarn');
        if (e.index === 0) voice.say(e.first ? 'Coming through!' : BUMP_LINES[e.delivery % BUMP_LINES.length], { priority: 1, force: e.first });
        announce('Bump incoming from the ' + sideWord(e.side) + '. Cups will slide ' + sideWord(e.dir) + '.');
        break;
      case 'bump': if (prefs.sound) audio.play('bump'); break;
      case 'clink': if (prefs.sound) audio.play('tap', { intensity: Math.min(1, e.speed / 60) }); break;
      case 'creak': if (prefs.sound) audio.play('creak'); break;
      case 'splash': if (prefs.sound) audio.play('splash'); break;
      case 'danger': if (prefs.sound) audio.play('danger'); break;
      case 'rattle': if (prefs.sound) audio.play('rattle'); break;
      case 'deliveryComplete':
        if (prefs.sound) audio.play('chime', { perfect: e.perfect });
        voice.say(e.perfect ? 'Not a drop. Beautiful.' : 'All in one piece.', { priority: 2 });
        break;
      case 'banked':
        if (prefs.sound) { audio.play('receipt'); if (e.newBest) audio.play('best'); }
        voice.say('Clocking out. Good choice.', { priority: 2 });
        announce('Shift complete. Tips banked ' + e.banked + (e.newBest ? '. New best shift.' : '.'));
        break;
      case 'fall':
        voice.cancel();
        if (prefs.sound) audio.play('tumble');
        announce('A cup fell.');
        break;
      case 'gameOver':
        voice.say('We’ll call that a staff drink.', { priority: 2 });
        announce('That’s on the floor. Unbanked tips lost ' + game.lastFail.lost + '. Previously banked this session ' + game.lastFail.previouslyBanked + '.');
        break;
      case 'paused':
        voice.cancel();
        if (prefs.sound && e.reason === 'user') audio.play('pause');
        $('pause-reason').textContent = e.reason === 'user' ? 'The café will wait.' : 'Paused while you were away. Held keys were released.';
        announce('Paused.');
        break;
      case 'resumed': announce('Resumed.'); break;
      default: break;
    }
  }

  /** Process events immediately — used inside user gestures so speech/audio start in the gesture. */
  function flush() { for (const e of game.drainEvents()) handle(e); syncUI(); }

  // ---------- per-frame UI sync ----------
  let lastPct = -1, lastTips = -1, lastDel = '';
  function syncUI() {
    const del = game.state === S.TUTORIAL ? 'Practice' : String(Math.max(1, game.delivery));
    if (del !== lastDel) { el.delivery.textContent = del; lastDel = del; }
    if (game.unbanked !== lastTips) { el.tips.textContent = String(game.unbanked); lastTips = game.unbanked; }
    let pct = 0;
    if (game.state === S.PLAYING || game.state === S.SPILLING || (game.state === S.PAUSED && game.prevState === S.PLAYING)) pct = game.progress() * 100;
    else if (game.state === S.DELIVERY_COMPLETE || game.state === S.SHIFT_COMPLETE) pct = 100;
    el.fill.style.width = pct.toFixed(1) + '%';
    const rounded = Math.round(pct / 5) * 5;
    if (rounded !== lastPct) { lastPct = rounded; el.progress.setAttribute('aria-valuenow', String(rounded)); }
    el.ledgerSession.textContent = String(game.sessionBanked);
    el.ledgerBest.textContent = String(game.best);

    if (game.state === S.DELIVERY_COMPLETE && !resultShown && game.phaseT >= (reduced() ? 0 : 1.0)) showResult();

    const wantAmbience = prefs.sound && !document.hidden &&
      (game.state === S.TUTORIAL || game.state === S.TABLE_INTRO || game.state === S.PLAYING);
    if (wantAmbience && !audio.amb) audio.startAmbience();
    else if (!wantAmbience && audio.amb) audio.stopAmbience(true);
  }

  // ---------- the one loop ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt >= 0) || dt > 0.25) dt = 0; // returning from a hidden tab: no jump
    game.update(dt);
    for (const e of game.drainEvents()) handle(e);
    syncUI();
    renderer.frame(Math.min(dt, 0.05));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- commands ----------
  function command(btn, fn) {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (fn()) {
        const panel = btn.closest('.panel');
        if (panel) enableButtons(panel, false); // reject duplicate activations
        if (prefs.sound) audio.play('click');
      }
      flush();
    });
  }
  command($('btn-start'), () => {
    if (prefs.sound) audio.unlock(); // inside the gesture
    voice.cancel();
    return game.start();
  });
  command($('btn-skip'), () => game.skipTutorial());
  command($('btn-go'), () => game.finishTutorial());
  command($('btn-more'), () => game.continueShift());
  command($('btn-finish'), () => game.finishShift());
  command($('btn-resume'), () => { audio.wake(); return game.resume(); });
  command($('btn-again'), () => { voice.cancel(); return game.restart(); });
  command($('btn-retry'), () => { voice.cancel(); return game.restart(); });
  el.pause.addEventListener('click', () => { if (game.pause('user')) flush(); });
  // Tilt buttons are press-and-hold; a click by itself does nothing.
  for (const b of [el.left, el.right]) b.addEventListener('click', (e) => e.preventDefault());

  // ---------- settings ----------
  function renderToggles() {
    el.soundBtn.textContent = 'Sound: ' + (prefs.sound ? 'on' : 'off');
    el.soundBtn.setAttribute('aria-pressed', String(prefs.sound));
    el.voiceBtn.textContent = 'Voice: ' + (prefs.voice ? 'on' : 'off');
    el.voiceBtn.setAttribute('aria-pressed', String(prefs.voice));
    el.voiceBtn.disabled = !voice.supported;
    el.testVoice.disabled = !voice.supported;
    const parts = [];
    if (prefs.sound && prefs.voice && voice.supported) parts.push('Sound and voice on');
    else parts.push('Sound ' + (prefs.sound ? 'on' : 'off'), voice.supported ? 'voice ' + (prefs.voice ? 'on' : 'off') : 'captions only');
    el.introNote.textContent = parts.join(' · ') + ' · adjustable anytime.';
    renderVoiceStatus();
  }
  el.soundBtn.addEventListener('click', () => {
    prefs.sound = !prefs.sound; savePref('sound', prefs.sound);
    audio.setEnabled(prefs.sound);
    if (prefs.sound) audio.play('click');
    renderToggles();
  });
  el.voiceBtn.addEventListener('click', () => {
    prefs.voice = !prefs.voice; savePref('voice', prefs.voice);
    voice.setEnabled(prefs.voice);
    renderToggles();
  });
  let testToken = 0;
  el.testVoice.addEventListener('click', () => {
    if (!voice.supported) { renderVoiceStatus(); return; }
    if (!prefs.voice) { prefs.voice = true; savePref('voice', true); voice.setEnabled(true); renderToggles(); }
    const token = ++testToken;
    const before = voice.status;
    voice.say('Order up. This is your manager speaking.', { priority: 3, force: true });
    setTimeout(() => {
      if (token !== testToken) return;
      if (voice.status !== 'working' && voice.status === before) { voice.status = 'silent'; renderVoiceStatus(); }
    }, 3000);
  });
  renderToggles();

  // ---------- interruptions ----------
  function autoPause(reason) {
    input.clearAll();
    if (game.pause(reason)) flush();
    voice.cancel();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { autoPause('hidden'); audio.suspend(); }
    else { audio.wake(); last = performance.now(); }
  });
  window.addEventListener('blur', () => autoPause('blur'));
  window.addEventListener('pagehide', () => { voice.cancel(); audio.stopAmbience(true); clearTimeout(captionTimer); });
  if (reducedMQ.addEventListener) reducedMQ.addEventListener('change', () => renderer.resetEffects());

  el.caption.classList.add('idle');
  el.captionText.textContent = 'Your manager’s comments appear here.';
  showPanel('intro');

  NS.app = { game, audio, voice, renderer, input }; // handy for debugging in the console
})();
