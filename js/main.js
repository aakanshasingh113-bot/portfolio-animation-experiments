/*
 * Don't Crush It — browser glue.
 *
 * Wires input, the single animation loop, the HTML controls and the effects
 * to the simulation. The simulation decides everything about the rules; this
 * file only feeds it input and reflects its state.
 */
(function (root) {
  'use strict';
  var DCI = root.DCI, sim = DCI.sim, S = sim.S, C = sim.C, PRIZES = sim.PRIZES;
  var doc = root.document;
  function $(id) { return doc.getElementById(id); }

  var el = {
    machine: $('machine'), scene: $('scene'), tray: $('tray'), confetti: $('confetti'),
    action: $('action'), help: $('help'), helpBtn: $('helpBtn'), helpClose: $('helpClose'), soundBtn: $('soundBtn'),
    plate: doc.querySelector('.plate'), plateMsg: $('plateMsg'), attempt: $('attemptVal'), score: $('scoreVal'), best: $('bestVal'),
    meter: $('meter'), band: $('band'), needle: $('needle'), fill: $('meterFill'), zone: $('zoneLabel'),
    slip: $('slipFill'), crush: $('crushFill'),
    card: $('card'), cardMsg: $('cardMsg'), cardScore: $('cardScore'), cardMinis: $('cardMinis'), cardBest: $('cardBest'),
    pause: $('pause'), resume: $('resumeBtn'), live: $('live')
  };

  var game = sim.createGame();
  var renderer = DCI.render.createRenderer(el.scene);
  var audio = DCI.audio.createAudio();
  DCI.game = game;   // handy for debugging and the automated browser checks
  DCI.sound = audio;

  var COPY = {
    aim: 'Aim above a prize, then drop.',
    firstGrip: 'Hold to squeeze. Release to loosen.',
    grip: 'Squeeze into the safe band.',
    lift: 'Keep it in the band.',
    carry: 'Got it. Bringing it home.',
    empty: 'Nothing under the claw.',
    paused: 'Paused.',
    fail: { crush: 'Too tight.', slip: 'Slipped away.', miss: 'Missed it.' },
    zone: { low: 'Too loose', safe: 'Just right', high: 'Too tight' },
    round: ['The prizes won this round.', 'One safe landing.', 'You’ve got a gentle touch.', 'Claw machine whisperer.']
  };
  var BEST_KEY = 'dont-crush-it.best';

  // --------------------------------------------------------- environment ---

  var motionQuery = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduced = !!(motionQuery && motionQuery.matches);
  if (motionQuery) {
    var onMotion = function (e) { reduced = e.matches; if (reduced) stopConfetti(); };
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotion);
    else if (motionQuery.addListener) motionQuery.addListener(onMotion);
  }

  function readBest() {
    try {
      var raw = root.localStorage.getItem(BEST_KEY);
      if (raw === null) return null;
      var n = Number(raw);
      return isFinite(n) && n >= 0 ? n : null;
    } catch (e) { return null; }   // storage blocked (private mode, sandboxed iframe…)
  }
  function writeBest(n) { try { root.localStorage.setItem(BEST_KEY, String(n)); } catch (e) {} }
  var best = readBest();

  function dpr() { return Math.min(root.devicePixelRatio || 1, 2); }

  // ------------------------------------------------------------- visuals ---

  var view = { x: game.clawX, sway: 0, swayV: 0, time: 0, dt: 0, reduced: reduced };
  var trayItems = [];
  var firstGripPending = true, hintThisGrip = false;

  var confetti = { active: false, t: 0, parts: [] };

  function sizeCanvases() {
    var w = el.scene.clientWidth;
    if (w > 0) renderer.resize(w, dpr());
    var tw = el.tray.clientWidth, th = el.tray.clientHeight;
    if (tw > 0 && th > 0) { el.tray.width = Math.round(tw * dpr()); el.tray.height = Math.round(th * dpr()); }
    if (confetti.active) sizeConfetti();
  }
  // Shrink the cabinet when the viewport (or a portfolio iframe) is too short for it.
  // Minimum text and touch sizes mean height is not proportional to width, so iterate.
  function fitMachine() {
    var m = el.machine, avail = root.innerHeight - 30;
    m.style.removeProperty('--fit');
    var w = m.offsetWidth, floorW = Math.min(w, 300);
    for (var i = 0; i < 4; i++) {
      var h = m.offsetHeight;
      if (h <= avail || w <= floorW) break;
      w = Math.max(floorW, Math.floor(w * avail / h));
      m.style.setProperty('--fit', w + 'px');
    }
  }
  fitMachine();
  root.addEventListener('resize', fitMachine);

  if (root.ResizeObserver) {
    var ro = new root.ResizeObserver(sizeCanvases);   // never touches game state
    ro.observe(el.scene); ro.observe(el.tray);
  } else {
    root.addEventListener('resize', sizeCanvases);
  }
  sizeCanvases();

  // confetti: one bounded system, fired from the cabinet's top corners
  var CONFETTI_COLORS = ['#D94732', '#F2CB65', '#467E78', '#E8A6AC', '#292522'];

  function sizeConfetti() {
    var c = el.confetti, d = dpr();
    c.width = Math.round(root.innerWidth * d); c.height = Math.round(root.innerHeight * d);
  }
  function stopConfetti() {
    if (!confetti.active && !confetti.parts.length) return;
    confetti.active = false; confetti.parts.length = 0;
    var c = el.confetti; c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }
  function fireConfetti() {
    stopConfetti();                       // never two at once
    if (reduced) return;
    sizeConfetti();
    var r = doc.querySelector('.cabinet').getBoundingClientRect();
    var n = 64, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < n; i++) {
      var left = i % 2 === 0, a = (left ? -1 : 1) * (0.25 + rnd() * 0.75), sp = 260 + rnd() * 380;
      confetti.parts.push({
        x: left ? r.left + 14 : r.right - 14, y: r.top + 14,
        vx: Math.sin(a) * sp * -1, vy: -Math.cos(a) * sp,
        w: 5 + rnd() * 5, h: 8 + rnd() * 6, rot: rnd() * 6, vr: (rnd() - 0.5) * 14,
        c: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      });
    }
    confetti.active = true; confetti.t = 0;
  }
  function stepConfetti(dt) {
    if (!confetti.active) return;
    confetti.t += dt;
    if (confetti.t >= 1.5) { stopConfetti(); return; }
    var c = el.confetti, ctx = c.getContext('2d'), d = dpr();
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = Math.min(1, (1.5 - confetti.t) / 0.35);
    for (var i = 0; i < confetti.parts.length; i++) {
      var p = confetti.parts[i];
      p.vy += 900 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2 * Math.cos(p.rot * 1.3), p.w, p.h * Math.cos(p.rot * 1.3));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // --------------------------------------------------------------- input ---

  // What the main button means right now. A press only counts for the mode it
  // began in, so a key held across a phase change can never trigger the next action.
  var mode = 'drop', modeSerial = 0;
  var presses = {};            // source -> modeSerial at press time
  var arrows = { ArrowLeft: false, ArrowRight: false };
  var lastKeyRelease = 0;

  function currentMode() {
    switch (game.state) {
      case S.READY: case S.AIMING: return 'drop';
      case S.GRIPPING: return game.target ? 'grip' : 'none';
      case S.LIFTING: return 'grip';
      case S.ATTEMPT_RESULT: return 'next';
      case S.ROUND_OVER: return 'again';
      default: return 'none';
    }
  }
  function syncMode() {
    var m = currentMode();
    if (m !== mode) { mode = m; modeSerial += 1; }
  }
  function anyPress() { for (var k in presses) return true; return false; }
  function gripHeld() { for (var k in presses) if (presses[k] === modeSerial) return true; return false; }

  function act() {
    var done = false;
    if (mode === 'drop') done = game.drop();
    else if (mode === 'next') done = game.next();
    else if (mode === 'again') done = game.restart();
    if (done) audio.click();
    syncMode();
  }

  function pressStart(src) {
    syncMode();
    if (presses[src] != null) return;
    presses[src] = modeSerial;
    el.action.classList.add('is-down');            // immediate tactile feedback
    if (mode === 'grip') game.setHold(true);
  }
  function pressEnd(src, commit) {
    if (presses[src] == null) return;
    var serial = presses[src];
    delete presses[src];
    syncMode();
    if (!anyPress()) el.action.classList.remove('is-down');
    if (mode === 'grip') { game.setHold(gripHeld()); return; }
    if (commit && serial === modeSerial) act();
  }
  function clearInput() {
    presses = {};
    arrows.ArrowLeft = arrows.ArrowRight = false;
    game.setHold(false);
    el.action.classList.remove('is-down');
  }

  function isActionKey(e) { return e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter'; }
  function onGameControl(t) { return t === el.scene || t === el.action; }

  // Keys are scoped to the chamber and the main button; anything else on the page is left alone.
  el.machine.addEventListener('keydown', function (e) {
    if (!onGameControl(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); arrows[e.key] = true; return; }
    if (isActionKey(e)) {
      e.preventDefault();                 // no page scroll, no native click
      if (e.repeat) return;               // auto-repeat is not a new press
      pressStart('key:' + e.code);
    }
  });
  root.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { arrows[e.key] = false; return; }
    if (isActionKey(e) && presses['key:' + e.code] != null) {
      if (onGameControl(e.target)) e.preventDefault();
      lastKeyRelease = root.performance.now();
      pressEnd('key:' + e.code, true);
    }
  });

  el.action.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    try { el.action.setPointerCapture(e.pointerId); } catch (err) {}
    pressStart('ptr');
  });
  el.action.addEventListener('pointerup', function (e) {
    var r = el.action.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    pressEnd('ptr', inside);
  });
  el.action.addEventListener('pointercancel', function () { pressEnd('ptr', false); });
  el.action.addEventListener('lostpointercapture', function () { pressEnd('ptr', false); });
  el.action.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  // Activation that arrives without a physical press (assistive tech, scripts).
  el.action.addEventListener('click', function (e) {
    if (e.detail !== 0 || anyPress() || root.performance.now() - lastKeyRelease < 400) return;
    syncMode();
    if (mode !== 'grip' && mode !== 'none') act();
  });

  // aiming with the pointer: hover with a mouse, drag with a finger
  var dragging = {};
  function aimFromEvent(e) {
    var r = el.scene.getBoundingClientRect();
    if (r.width > 0) game.aim((e.clientX - r.left) / r.width * C.W);
  }
  el.scene.addEventListener('pointerdown', function (e) {
    dragging[e.pointerId] = true;
    try { el.scene.setPointerCapture(e.pointerId); } catch (err) {}
    aimFromEvent(e);
  });
  el.scene.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || dragging[e.pointerId]) aimFromEvent(e);
  });
  function endDrag(e) { delete dragging[e.pointerId]; }
  el.scene.addEventListener('pointerup', endDrag);
  el.scene.addEventListener('pointercancel', endDrag);

  // pausing: any time-based phase stops when the tab is hidden and needs an explicit resume
  function pauseGame() {
    clearInput();
    if (game.pause()) { el.pause.hidden = false; return true; }
    return false;
  }
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { pauseGame(); audio.halt(); sound.motor = { hum: false, lift: false }; }
    else audio.wake();
    lastFrame = 0;
  });
  root.addEventListener('blur', clearInput);
  root.addEventListener('pagehide', function () { pauseGame(); audio.halt(); });
  root.addEventListener('pageshow', function () { if (!doc.hidden) audio.wake(); });
  el.resume.addEventListener('click', function () {
    if (el.help.open) return;
    clearInput();
    game.resume();
    el.pause.hidden = true;
    lastFrame = 0;
    el.action.focus({ preventScroll: true });
  });

  // help
  function openHelp() {
    pauseGame();
    if (el.help.showModal) { try { el.help.showModal(); return; } catch (e) {} }
    el.help.setAttribute('open', '');
  }
  function closeHelp() {
    if (el.help.close) { try { el.help.close(); } catch (e) {} }
    el.help.removeAttribute('open');
  }
  el.helpBtn.addEventListener('click', openHelp);
  el.helpClose.addEventListener('click', closeHelp);
  el.help.addEventListener('close', function () {
    (game.state === S.PAUSED ? el.resume : el.helpBtn).focus({ preventScroll: true });
  });
  el.help.addEventListener('click', function (e) { if (e.target === el.help) closeHelp(); });

  // ---------------------------------------------------------------- sound --

  // Audio starts inside the first intentional click, tap or key press (browsers
  // block it before that), unless the player muted it on an earlier visit.
  function unlockAudio(e) {
    if (e.type === 'keydown' && (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta')) return;
    audio.unlock();
    if (el.soundBtn.getAttribute('data-sound') !== audio.status()) refreshSoundBtn();
  }
  ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'].forEach(function (type) {
    doc.addEventListener(type, unlockAudio, true);
  });

  function refreshSoundBtn() {
    var st = audio.status();
    el.soundBtn.setAttribute('data-sound', st);
    el.soundBtn.setAttribute('aria-label', st === 'on' ? 'Mute sound' : st === 'muted' ? 'Enable sound' : 'Sound unavailable');
    el.soundBtn.title = el.soundBtn.getAttribute('aria-label');
    if (st === 'unavailable') el.soundBtn.setAttribute('aria-disabled', 'true'); else el.soundBtn.removeAttribute('aria-disabled');
  }
  el.soundBtn.addEventListener('click', function () {
    if (audio.status() !== 'unavailable') {
      audio.setMuted(!audio.isMuted());
      sound.motor = { hum: false, lift: false };   // let the loops re-sync with the game
      audio.click();
    }
    refreshSoundBtn();
  });
  el.helpBtn.addEventListener('click', function () { audio.click(); });
  el.helpClose.addEventListener('click', function () { audio.click(); });
  el.resume.addEventListener('click', function () { audio.click(); });

  // Sound bookkeeping. Everything is triggered by a change in game state:
  // a loop turning on or off, a ratchet tooth passed, a warning pulse coming due.
  var sound = { motor: { hum: false, lift: false }, moving: false, tooth: 0, nextWarn: 0 };

  function setMotor(name, on, progress, remaining) {
    if (sound.motor[name] === on) return;
    sound.motor[name] = on;
    audio.loop(name, on, progress, remaining);
  }

  function syncSound(speed) {
    var st = game.state, gripping = !!game.target && (st === S.GRIPPING || st === S.LIFTING);

    // carriage motor: only while the claw is actually travelling
    var travelling = st === S.READY || st === S.AIMING || (st === S.RETURNING && game.carrying);
    if (!travelling) sound.moving = false;
    else if (speed > 30) sound.moving = true;
    else if (speed < 8) sound.moving = false;
    setMotor('hum', sound.moving);

    // winch: runs for the lift, rising in pitch
    setMotor('lift', st === S.LIFTING, game.t / C.LIFT_TIME, C.LIFT_TIME - game.t);

    // ratchet: one soft click per tooth as the grip tightens
    var tooth = gripping ? Math.floor(game.pressure / 7) : 0;
    if (gripping && game.hold && tooth > sound.tooth) audio.ratchet(tooth);
    sound.tooth = tooth;

    // warning pulse while damage builds, quicker the nearer it is to failing
    if (st === S.LIFTING && game.zone() !== 'safe') {
      if (view.time >= sound.nextWarn) {
        var z = game.zone(), dmg = z === 'high' ? game.crush : game.slip;
        audio.warn(z);
        sound.nextWarn = view.time + sim.lerp(0.44, 0.13, sim.clamp(dmg, 0, 1));
      }
    } else {
      sound.nextWarn = 0;
    }
  }

  function failSound(ev) {
    var type = ev.prize && ev.prize.type;
    if (ev.cause === 'miss') return;                 // the empty clack already played
    if (ev.cause === 'slip') { audio.whistle(); if (type === 'soap') audio.pops(); return; }
    if (type === 'cake') audio.squish();
    else if (type === 'egg') audio.crack();
    else if (type === 'cactus') audio.squeak();
    else { audio.squish(); audio.pops(); }           // soap squeezed out of shape
  }

  // ------------------------------------------------------------------ UI ---

  var ui = {};
  function setText(node, key, value) { if (ui[key] !== value) { ui[key] = value; node.textContent = value; } }
  function setAttr(node, key, name, value) { if (ui[key] !== value) { ui[key] = value; node.setAttribute(name, value); } }
  function setStyle(node, key, prop, value) { if (ui[key] !== value) { ui[key] = value; node.style[prop] = value; } }
  function announce(text) { el.live.textContent = text; }

  function outcomeText(o) {
    if (!o) return '';
    if (!o.ok) return COPY.fail[o.cause];
    var name = PRIZES[o.type].name;
    return name + ' +' + o.points + (o.bonus ? ' · Gentle hands +' + o.bonus : '');
  }

  function instruction(phase) {
    if (game.state === S.PAUSED) return [COPY.paused, ''];
    switch (phase) {
      case S.GRIPPING:
        if (!game.target) return [COPY.empty, ''];
        return [hintThisGrip ? COPY.firstGrip : COPY.grip, ''];
      case S.LIFTING: return [hintThisGrip ? COPY.firstGrip : COPY.lift, ''];
      case S.RETURNING: case S.DROPPING:
        if (game.outcome && !game.outcome.ok) return [outcomeText(game.outcome), 'bad'];
        return [COPY.carry, 'good'];
      case S.ATTEMPT_RESULT: return [outcomeText(game.outcome), game.outcome && game.outcome.ok ? 'good' : 'bad'];
      case S.ROUND_OVER: return [COPY.round[game.captured.length], ''];
      default: return [COPY.aim, ''];
    }
  }

  var LABELS = { drop: 'Drop claw', grip: 'Hold to grip', next: 'Next grab', again: 'Play again' };

  function syncUI() {
    var phase = game.phase();
    syncMode();

    setText(el.attempt, 'attempt', game.attempt + ' / ' + C.ATTEMPTS);
    setText(el.score, 'score', String(game.score));
    setText(el.best, 'best', best === null ? '—' : String(best));

    var msg = instruction(phase);
    setText(el.plateMsg, 'msg', msg[0]);
    setAttr(el.plate, 'tone', 'data-tone', msg[1]);

    // main button: the label only changes when a new action becomes available
    if (mode !== 'none') {
      var label = mode === 'next' && game.attempt >= C.ATTEMPTS ? 'See score' : LABELS[mode];
      setText(el.action, 'label', label);
      setAttr(el.action, 'btnMode', 'data-mode', mode);
    }
    setAttr(el.action, 'disabled', 'aria-disabled', String(mode === 'none'));

    // pressure meter
    var active = !!game.target && (phase === S.GRIPPING || phase === S.LIFTING);
    setAttr(el.meter, 'meterActive', 'data-active', String(active));
    if (active) {
      var d = PRIZES[game.target.type], z = game.zone();
      setStyle(el.band, 'bandL', 'left', d.min + '%');
      setStyle(el.band, 'bandW', 'width', (d.max - d.min) + '%');
      setStyle(el.needle, 'needle', 'left', game.pressure.toFixed(1) + '%');
      setStyle(el.fill, 'fill', 'width', game.pressure.toFixed(1) + '%');
      setAttr(el.meter, 'zone', 'data-zone', z);
      setText(el.zone, 'zoneText', COPY.zone[z]);
      setStyle(el.slip, 'slip', 'width', Math.round(game.slip * 100) + '%');
      setStyle(el.crush, 'crush', 'width', Math.round(game.crush * 100) + '%');
    } else {
      setAttr(el.meter, 'zone', 'data-zone', 'none');
      setText(el.zone, 'zoneText', 'Grip pressure');
      setStyle(el.slip, 'slip', 'width', '0%');
      setStyle(el.crush, 'crush', 'width', '0%');
    }
  }

  function showRoundOver() {
    var n = game.captured.length;
    var res = sim.evaluateBest(best, game.score);
    best = res.best;
    writeBest(best);

    el.cardMsg.textContent = COPY.round[n];
    el.cardScore.textContent = String(game.score);
    el.cardBest.textContent = res.isNew ? 'New personal best!' : res.first ? 'That’s your score to beat.' : 'Personal best ' + best;
    el.cardMinis.textContent = '';
    for (var i = 0; i < C.ATTEMPTS; i++) {
      if (i < n) {
        var c = doc.createElement('canvas');
        DCI.render.drawMini(c, game.captured[i], dpr());
        el.cardMinis.appendChild(c);
      } else {
        el.cardMinis.appendChild(doc.createElement('i'));
      }
    }
    el.card.hidden = false;
    if (n === C.ATTEMPTS || res.isNew) { fireConfetti(); audio.flourish(); }   // together
    else audio.closing();
    announce('Round over. ' + COPY.round[n] + ' Score ' + game.score + '.' + (res.isNew ? ' New personal best.' : '') + ' Press Play again for another round.');
  }

  function handleEvent(ev) {
    renderer.onEvent(ev, game, reduced);
    switch (ev.type) {
      case 'restart':
        trayItems.length = 0; el.card.hidden = true; el.pause.hidden = true; stopConfetti();
        audio.stopAll(); sound.motor = { hum: false, lift: false }; sound.tooth = 0; sound.nextWarn = 0;
        announce('New round. Attempt 1 of ' + C.ATTEMPTS + '. ' + COPY.aim);
        break;
      case 'next':
        announce('Attempt ' + game.attempt + ' of ' + C.ATTEMPTS + '. ' + COPY.aim);
        break;
      case 'drop': audio.lower(); break;
      case 'touch':
        hintThisGrip = firstGripPending; firstGripPending = false;
        announce('The claw is on the ' + PRIZES[ev.prize.type].name.toLowerCase() + '. Hold to squeeze, release to loosen. Pressure is shown on the meter.');
        break;
      case 'empty': audio.clack(); break;
      case 'lift-start':
        audio.safe();
        announce('Lifting. Keep the pressure in the safe band.'); break;
      case 'fail': failSound(ev); break;
      case 'thud': audio.thud(); break;
      case 'collected':
        trayItems.push({ type: ev.prize.type, at: view.time });
        audio.landed();
        audio.points(ev.outcome.bonus > 0);
        break;
      case 'result':
        hintThisGrip = false;
        announce(outcomeText(ev.outcome) + (game.attempt < C.ATTEMPTS ? ' Press Next grab.' : ''));
        break;
      case 'round-over': showRoundOver(); break;
      case 'pause':
        audio.stopAll(); sound.motor = { hum: false, lift: false };
        announce('Paused. Press Resume to continue.'); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- loop ---

  var lastFrame = 0;
  function frame(now) {
    root.requestAnimationFrame(frame);          // the one and only loop
    var dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
    lastFrame = now;
    if (doc.hidden) return;

    // keyboard aiming, by elapsed time
    var dir = (arrows.ArrowRight ? 1 : 0) - (arrows.ArrowLeft ? 1 : 0);
    if (dir) game.aim(game.aimX + dir * 300 * dt);

    game.update(dt);
    var evs = game.events.splice(0, game.events.length);
    for (var i = 0; i < evs.length; i++) handleEvent(evs[i]);

    // soft carriage movement and a tiny settle; the cable itself stays vertical
    view.time += dt; view.dt = dt; view.reduced = reduced;
    var prevX = view.x;
    view.x += (game.clawX - view.x) * (1 - Math.exp(-dt / 0.045));
    if (Math.abs(game.clawX - view.x) < 0.05) view.x = game.clawX;
    if (reduced || dt === 0) { view.sway = 0; view.swayV = 0; }
    else {
      var target = sim.clamp(-(view.x - prevX) / dt * 0.00045, -0.1, 0.1);
      view.swayV += ((target - view.sway) * 170 - view.swayV * 11) * dt;
      view.sway += view.swayV * dt;
    }

    syncSound(dt > 0 ? Math.abs(view.x - prevX) / dt : 0);

    renderer.draw(game, view);
    DCI.render.drawTray(el.tray, trayItems, view.time, reduced);
    stepConfetti(dt);
    syncUI();
  }

  // deliver the opening 'restart' event quietly: nothing is announced before the player acts
  game.events.length = 0;
  refreshSoundBtn();
  syncUI();
  root.requestAnimationFrame(frame);
})(typeof self !== 'undefined' ? self : this);
