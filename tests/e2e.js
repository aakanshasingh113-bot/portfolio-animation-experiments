'use strict';
/*
 * Browser checks for Don't Crush It, driven with real pointer and keyboard input.
 *
 *   python3 -m http.server 8765        (from the project root, in another terminal)
 *   node tests/e2e.js [--shots <dir>]
 *
 * Needs Playwright with Chromium available to Node.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const URL = process.env.DCI_URL || 'http://localhost:8765/index.html';
const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > -1 ? process.argv[shotsAt + 1] : null;

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['ok', name]); console.log('ok   - ' + name); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL - ' + name + '\n       ' + String(e.message).split('\n').join('\n       ')); }
}

const st = (page) => page.evaluate(() => {
  const g = DCI.game;
  return { state: g.state, attempt: g.attempt, score: g.score, pressure: g.pressure, hold: g.hold, zone: g.zone(),
    target: g.target && g.target.type, outcome: g.outcome, captured: g.captured.slice(), aimX: g.aimX, dropX: g.dropX,
    results: g.results.length, round: g.round, lineupT: g.lineupT };
});
const waitState = (page, states, timeout = 8000) =>
  page.waitForFunction((s) => s.includes(DCI.game.state), [].concat(states), { timeout, polling: 16 });
async function shot(page, name) { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }

async function chamberPoint(page, logicalX, logicalY = 200) {
  const r = await page.evaluate(() => document.getElementById('scene').getBoundingClientRect().toJSON());
  return { x: r.left + (logicalX / 640) * r.width, y: r.top + (logicalY / 440) * r.height };
}
async function actionPoint(page) {
  const r = await page.evaluate(() => document.getElementById('action').getBoundingClientRect().toJSON());
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
async function aimAt(page, typeOrX) {
  await page.waitForFunction(() => DCI.game.lineupT >= 1);
  const x = typeof typeOrX === 'number' ? typeOrX
    : await page.evaluate((t) => DCI.game.prizes.find((p) => p.type === t).x, typeOrX);
  const pt = await chamberPoint(page, x);
  await page.mouse.move(pt.x, pt.y);
  await page.waitForTimeout(40);
  return x;
}
async function clickAction(page) {
  const a = await actionPoint(page);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down(); await page.mouse.up();
}

/** Hold/release the main button with the mouse to keep pressure near the middle of the band. */
async function gripWithMouse(page, opts = {}) {
  const a = await actionPoint(page);
  await page.mouse.move(a.x, a.y);
  let down = false, shots = 0;
  for (;;) {
    const s = await page.evaluate(() => {
      const g = DCI.game, d = g.target ? DCI.sim.PRIZES[g.target.type] : null;
      return { state: g.state, p: g.pressure, mid: d ? (d.min + d.max) / 2 : 0, t: g.t };
    });
    if (s.state !== 'GRIPPING' && s.state !== 'LIFTING') break;
    const want = opts.always != null ? opts.always : s.p < s.mid;
    if (want && !down) { await page.mouse.down(); down = true; }
    if (!want && down) { await page.mouse.up(); down = false; }
    if (opts.shotAt && s.state === 'LIFTING' && s.t > opts.shotAt && !shots++) await shot(page, opts.shotName);
    await page.waitForTimeout(12);
  }
  if (down) await page.mouse.up();
}

async function grab(page, type, opts) {
  await aimAt(page, type);
  await clickAction(page);
  await waitState(page, 'GRIPPING');
  await gripWithMouse(page, opts);
  await waitState(page, ['ATTEMPT_RESULT', 'ROUND_OVER']);
  return st(page);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(ctxOpts = {}, init) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, ctxOpts));
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.DCI && DCI.game);
    return page;
  }

  // ------------------------------------------------------------ desktop --
  let page = await open();

  await check('starts idle: prizes visible, nothing begins on its own', async () => {
    await page.waitForTimeout(700);
    const s = await st(page);
    assert.equal(s.state, 'READY'); assert.equal(s.attempt, 1); assert.equal(s.score, 0);
    assert.equal(await page.textContent('#plateMsg'), 'Aim above a prize, then drop.');
    assert.equal(await page.textContent('#action'), 'Drop claw');
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Mute sound');
    assert.equal(await page.evaluate(() => DCI.sound.debug.state()), 'none', 'no audio before any interaction');
    await shot(page, 'desktop-1-ready');
  });

  await check('a rapid double click starts exactly one drop', async () => {
    await aimAt(page, 'cake');
    const a = await actionPoint(page);
    await page.mouse.move(a.x, a.y);
    await page.mouse.click(a.x, a.y, { clickCount: 2, delay: 20 });
    const s = await st(page);
    assert.equal(s.state, 'LOWERING');
    assert.equal(s.target, 'cake');
    assert.equal(await page.evaluate(() => DCI.game.events.length + 0), 0);
  });

  await check('moving the pointer after the drop does not move the claw', async () => {
    const before = (await st(page)).dropX;
    const pt = await chamberPoint(page, 560);
    await page.mouse.move(pt.x, pt.y);
    await page.waitForTimeout(60);
    assert.equal((await st(page)).dropX, before);
    assert.equal(await page.evaluate(() => DCI.game.clawX), before);
  });

  await check('first grip shows the squeeze hint and an obvious safe band', async () => {
    await waitState(page, 'GRIPPING');
    assert.equal(await page.textContent('#plateMsg'), 'Hold to squeeze. Release to loosen.');
    assert.equal(await page.textContent('#action'), 'Hold to grip');
    assert.equal(await page.getAttribute('#meter', 'data-active'), 'true');
    await page.waitForTimeout(350);
    const band = await page.evaluate(() => { const b = document.getElementById('band'); return [b.style.left, b.style.width, getComputedStyle(b).opacity]; });
    assert.deepEqual(band, ['30%', '25%', '1']);
  });

  await check('cake: controlled grip captures it, scored once with the gentle bonus', async () => {
    await gripWithMouse(page, { shotAt: 1.0, shotName: 'desktop-2-lifting' });
    await waitState(page, 'ATTEMPT_RESULT');
    const s = await st(page);
    assert.equal(s.outcome.ok, true); assert.equal(s.score, 200); assert.deepEqual(s.captured, ['cake']);
    assert.equal(await page.textContent('#plateMsg'), 'Strawberry cake +150 · Gentle hands +50');
    assert.equal(await page.textContent('#action'), 'Next grab');
    assert.equal(await page.textContent('#scoreVal'), '200');
    await page.waitForTimeout(250);
    await shot(page, 'desktop-3-success');
  });

  await check('next grab refreshes the lineup and waits for the player', async () => {
    await clickAction(page);
    await page.waitForTimeout(60);
    const s = await st(page);
    assert.equal(s.state, 'READY'); assert.equal(s.attempt, 2);
    assert.equal(await page.textContent('#attemptVal'), '2 / 3');
    await page.waitForTimeout(1200);
    assert.equal((await st(page)).state, 'READY');
  });

  await check('egg: captured with a light touch', async () => {
    const s = await grab(page, 'egg');
    assert.equal(s.outcome.ok, true); assert.equal(s.outcome.type, 'egg'); assert.equal(s.score, 450);
    await clickAction(page);
  });

  await check('soap: captured with a firm grip; third result leads to the summary', async () => {
    const s = await grab(page, 'soap');
    assert.equal(s.outcome.ok, true); assert.equal(s.score, 600);
    assert.equal(await page.textContent('#action'), 'See score');
    await waitState(page, 'ROUND_OVER');
    await page.waitForTimeout(500);
    assert.equal(await page.textContent('#cardMsg'), 'Claw machine whisperer.');
    assert.equal(await page.textContent('#cardScore'), '600');
    assert.equal(await page.locator('#cardMinis canvas').count(), 3);
    assert.equal(await page.textContent('#cardBest'), 'That’s your score to beat.');
    assert.equal(await page.textContent('#action'), 'Play again');
    assert.equal(await page.evaluate(() => localStorage.getItem('dont-crush-it.best')), '600');
    await shot(page, 'desktop-4-round-over');
    const s2 = await st(page);
    assert.equal(s2.results, 3); assert.equal(s2.attempt, 3);
  });

  await check('play again clears the round', async () => {
    await clickAction(page);
    await page.waitForTimeout(60);
    const s = await st(page);
    assert.equal(s.state, 'READY'); assert.equal(s.attempt, 1); assert.equal(s.score, 0); assert.deepEqual(s.captured, []);
    assert.equal(await page.isHidden('#card'), true);
    assert.equal(await page.textContent('#scoreVal'), '0');
    assert.equal(await page.textContent('#bestVal'), '600');
  });

  await check('cactus: captured; its wiggle changes nothing', async () => {
    const s = await grab(page, 'cactus');
    assert.equal(s.outcome.ok, true); assert.equal(s.outcome.total, 175);
    await clickAction(page);
  });

  await check('squeezing flat out crushes: "Too tight."', async () => {
    await aimAt(page, 'egg');
    await clickAction(page);
    await waitState(page, 'GRIPPING');
    await gripWithMouse(page, { always: true });
    await page.waitForTimeout(120);
    await shot(page, 'desktop-5-crushed');
    assert.equal(await page.textContent('#plateMsg'), 'Too tight.');
    await waitState(page, 'ATTEMPT_RESULT');
    const s = await st(page);
    assert.equal(s.outcome.cause, 'crush'); assert.equal(s.score, 175); assert.equal(s.results, 2);
    const p = await page.evaluate(() => DCI.game.pressure);
    assert.ok(p >= 0 && p <= 100);
    await clickAction(page);
  });

  await check('a drop between prizes misses: "Missed it."', async () => {
    const gap = await page.evaluate(() => (DCI.game.prizes[2].x + DCI.game.prizes[3].x) / 2);
    await aimAt(page, gap);
    await clickAction(page);
    await waitState(page, 'ATTEMPT_RESULT');
    assert.equal(await page.textContent('#plateMsg'), 'Missed it.');
    await waitState(page, 'ROUND_OVER');
    assert.equal(await page.textContent('#cardMsg'), 'One safe landing.');
    assert.equal(await page.textContent('#cardBest'), 'Personal best 600');
    await clickAction(page);
  });

  await check('never gripping lets it slip: "Slipped away."', async () => {
    await aimAt(page, 'soap');
    await clickAction(page);
    await waitState(page, 'ATTEMPT_RESULT', 9000);
    assert.equal(await page.textContent('#plateMsg'), 'Slipped away.');
    assert.equal((await st(page)).outcome.cause, 'slip');
    await clickAction(page);
  });

  await check('releasing outside the button stops the grip', async () => {
    await aimAt(page, 'soap');
    await clickAction(page);
    await waitState(page, 'GRIPPING');
    const a = await actionPoint(page);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.waitForTimeout(150);
    assert.equal((await st(page)).hold, true);
    await page.mouse.move(a.x - 400, a.y - 300);
    assert.equal((await st(page)).hold, true, 'still held while the button is down');
    await page.mouse.up();
    assert.equal((await st(page)).hold, false);
    const s1 = await st(page);
    await page.waitForTimeout(150);
    assert.ok((await st(page)).pressure < s1.pressure + 0.001);
  });

  await check('window blur clears a held grip', async () => {
    const a = await actionPoint(page);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    assert.equal((await st(page)).hold, true);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal((await st(page)).hold, false);
    await page.mouse.up();
    await waitState(page, 'ATTEMPT_RESULT', 9000);
    await clickAction(page);
  });

  await check('hiding the tab pauses; time away never causes a loss; resume is explicit', async () => {
    await aimAt(page, 'cake');
    await clickAction(page);
    await waitState(page, 'GRIPPING');
    const a = await actionPoint(page);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await waitState(page, 'LIFTING');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.mouse.up();
    const before = await page.evaluate(() => [DCI.game.state, DCI.game.pressure, DCI.game.slip, DCI.game.t, DCI.game.hold]);
    assert.equal(before[0], 'PAUSED'); assert.equal(before[4], false);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => [DCI.game.state, DCI.game.pressure, DCI.game.slip, DCI.game.t, DCI.game.hold]);
    assert.deepEqual(after, before, 'frozen until resumed');
    assert.equal(await page.isVisible('#resumeBtn'), true);
    await shot(page, 'desktop-6-paused');
    await page.click('#resumeBtn');
    assert.equal((await st(page)).state, 'LIFTING');
    assert.equal((await st(page)).hold, false);
    await gripWithMouse(page);
    await waitState(page, ['ATTEMPT_RESULT', 'ROUND_OVER']);
    assert.equal((await st(page)).outcome.ok, true, 'still winnable after resuming');
  });

  await check('resizing mid-round keeps the round, target and score', async () => {
    await page.evaluate(() => DCI.game.restart());
    await aimAt(page, 'cactus');
    await clickAction(page);
    await waitState(page, 'GRIPPING');
    const before = await st(page);
    await page.setViewportSize({ width: 820, height: 620 });
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(100);
    const after = await st(page);
    assert.equal(after.target, before.target); assert.equal(after.dropX, before.dropX);
    assert.equal(after.attempt, before.attempt); assert.equal(after.round, before.round);
    const crisp = await page.evaluate(() => { const c = document.getElementById('scene'); return Math.abs(c.width - Math.round(c.clientWidth * Math.min(devicePixelRatio, 2))) <= 1; });
    assert.ok(crisp, 'canvas backing store follows the new size');
    await page.evaluate(() => DCI.game.restart());
  });

  await check('keyboard: arrows aim, Space drops, a held Space never leaks into the next phase', async () => {
    await page.waitForFunction(() => DCI.game.lineupT >= 1);
    await page.focus('#scene');
    const x0 = (await st(page)).aimX;
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.up('ArrowLeft');
    const x1 = (await st(page)).aimX;
    assert.ok(x1 < x0 - 20, 'moved left');
    await page.waitForTimeout(100);
    assert.equal((await st(page)).aimX, x1, 'stops on key release');
    // line up on the soap with the keyboard
    for (let i = 0; i < 400; i++) {
      const d = await page.evaluate(() => DCI.game.prizes.find((p) => p.type === 'soap').x - DCI.game.aimX);
      if (Math.abs(d) < 12) break;
      const k = d > 0 ? 'ArrowRight' : 'ArrowLeft';
      await page.keyboard.down(k); await page.waitForTimeout(Math.min(120, Math.abs(d) * 3)); await page.keyboard.up(k);
    }
    const y0 = await page.evaluate(() => window.scrollY);
    // hold Space from before the drop, through lowering, into the grip phase
    await page.keyboard.down('Space');
    assert.equal((await st(page)).state, 'AIMING', 'drop happens on release, not on press');
    await page.keyboard.up('Space');
    assert.equal((await st(page)).state, 'LOWERING');
    await page.keyboard.down('Space');                      // pressed while lowering…
    await waitState(page, 'GRIPPING');
    await page.waitForTimeout(200);
    let s = await st(page);
    assert.equal(s.hold, false, '…does not become a grip');
    assert.equal(s.pressure, 0);
    await page.keyboard.up('Space');
    assert.equal((await st(page)).state, 'GRIPPING');
    // now grip properly; auto-repeat must not count as new presses
    await page.keyboard.down('Space');
    await page.keyboard.down('Space'); await page.keyboard.down('Space');
    assert.equal((await st(page)).hold, true);
    let down = true;
    for (;;) {
      const g = await page.evaluate(() => ({ s: DCI.game.state, p: DCI.game.pressure, t: DCI.game.t }));
      if (g.s !== 'GRIPPING' && g.s !== 'LIFTING') break;
      if (g.s === 'LIFTING' && g.t > 2.2) { if (!down) { await page.keyboard.down('Space'); down = true; } await page.waitForTimeout(12); continue; }
      const want = g.p < 67;
      if (want && !down) { await page.keyboard.down('Space'); down = true; }
      if (!want && down) { await page.keyboard.up('Space'); down = false; }
      await page.waitForTimeout(12);
    }
    // Space is still (or again) held as the lift completes and the result arrives
    if (!down) await page.keyboard.down('Space');
    await waitState(page, 'ATTEMPT_RESULT');
    await page.waitForTimeout(150);
    await page.keyboard.up('Space');
    s = await st(page);
    assert.equal(s.state, 'ATTEMPT_RESULT', 'releasing the old hold does not press "Next grab"');
    assert.equal(s.attempt, 1);
    assert.equal(s.outcome.ok, true);
    assert.equal(await page.evaluate(() => window.scrollY), y0, 'Space did not scroll the page');
    await page.keyboard.press('Space');
    assert.equal((await st(page)).attempt, 2, 'a fresh press does');
  });

  await check('keys are ignored while another control has focus', async () => {
    await page.waitForFunction(() => DCI.game.lineupT >= 1);
    await page.focus('#helpBtn');
    const x = (await st(page)).aimX;
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(100); await page.keyboard.up('ArrowRight');
    assert.equal((await st(page)).aimX, x);
    await page.keyboard.press('Space');            // activates Help natively instead
    assert.equal(await page.evaluate(() => document.getElementById('help').open), true);
    assert.equal((await st(page)).state, 'READY');
    await shot(page, 'desktop-7-help');
    await page.click('#helpClose');
    assert.equal(await page.evaluate(() => document.getElementById('help').open), false);
  });

  await check('script/assistive activation of the main button works', async () => {
    await page.evaluate(() => document.getElementById('action').click());
    assert.equal((await st(page)).state, 'LOWERING');
    await waitState(page, 'ATTEMPT_RESULT', 9000);
    assert.ok((await page.textContent('#live')).length > 0, 'outcome announced');
  });

  await check('sound can be muted and unmuted during play without errors', async () => {
    await page.click('#soundBtn');
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Enable sound');
    await page.evaluate(() => DCI.game.restart());
    await grab(page, 'egg');
    await page.click('#soundBtn');
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Mute sound');
  });

  await check('beating the best celebrates with one bounded confetti burst', async () => {
    await page.evaluate(() => { localStorage.setItem('dont-crush-it.best', '100'); });
    await page.reload();
    await page.waitForFunction(() => window.DCI && DCI.game);
    assert.equal(await page.textContent('#bestVal'), '100');
    await grab(page, 'egg');
    await clickAction(page);
    await page.evaluate(() => { DCI.game.aim(60); });
    await page.waitForFunction(() => DCI.game.lineupT >= 1);
    await clickAction(page); await waitState(page, 'ATTEMPT_RESULT'); await clickAction(page);
    await page.waitForFunction(() => DCI.game.lineupT >= 1);
    await page.evaluate(() => { DCI.game.aim(60); });
    await clickAction(page); await waitState(page, 'ROUND_OVER');
    await page.waitForTimeout(350);
    assert.equal(await page.textContent('#cardBest'), 'New personal best!');
    const painted = await page.evaluate(() => {
      const c = document.getElementById('confetti'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false;
    });
    assert.ok(painted, 'confetti is running');
    await shot(page, 'desktop-8-new-best');
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('confetti')).pointerEvents), 'none');
    await page.waitForTimeout(1500);
    const cleared = await page.evaluate(() => {
      const c = document.getElementById('confetti'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true;
    });
    assert.ok(cleared, 'gone within 1.5 s');
    assert.equal(await page.evaluate(() => localStorage.getItem('dont-crush-it.best')), '250');
  });
  await page.context().close();

  // ---------------------------------------------------- storage disabled --
  page = await open({}, () => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage disabled'); } });
  });
  await check('storage disabled: a full round still completes', async () => {
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(() => DCI.game.lineupT >= 1);
      await page.evaluate(() => DCI.game.aim(60));
      await clickAction(page);
      await waitState(page, ['ATTEMPT_RESULT', 'ROUND_OVER']);
      if (i < 2) await clickAction(page);
    }
    await waitState(page, 'ROUND_OVER');
    assert.equal(await page.textContent('#cardMsg'), 'The prizes won this round.');
    assert.equal(await page.textContent('#cardScore'), '0');
  });
  await page.context().close();

  // ------------------------------------------------------ audio missing --
  page = await open({}, () => { delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await check('audio unavailable: toggle says so, game unaffected', async () => {
    const s = await grab(page, 'soap');
    assert.equal(s.outcome.ok, true);
    assert.equal(await page.getAttribute('#soundBtn', 'data-sound'), 'unavailable');
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Sound unavailable');
    await page.evaluate(() => document.getElementById('soundBtn').click());   // still harmless to press
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Sound unavailable');
  });
  await page.context().close();

  // ------------------------------------------------------ reduced motion --
  page = await open({ reducedMotion: 'reduce' });
  await check('reduced motion: playable, static feedback, no confetti', async () => {
    await page.evaluate(() => localStorage.setItem('dont-crush-it.best', '1'));
    await page.reload();
    await page.waitForFunction(() => window.DCI && DCI.game);
    await aimAt(page, 'cake'); await clickAction(page); await waitState(page, 'GRIPPING');
    await gripWithMouse(page, { always: true });
    assert.equal(await page.textContent('#plateMsg'), 'Too tight.');
    await page.waitForTimeout(200);
    await shot(page, 'reduced-crushed');
    await waitState(page, 'ATTEMPT_RESULT'); await clickAction(page);
    await grab(page, 'egg'); await clickAction(page);
    await grab(page, 'soap');
    await waitState(page, 'ROUND_OVER');
    await page.waitForTimeout(300);
    assert.equal(await page.textContent('#cardBest'), 'New personal best!');
    const painted = await page.evaluate(() => {
      const c = document.getElementById('confetti'), d = c.getContext('2d').getImageData(0, 0, Math.max(1, c.width), Math.max(1, c.height)).data;
      for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false;
    });
    assert.equal(painted, false);
  });
  await page.context().close();

  // -------------------------------------------------------------- mobile --
  for (const vp of [{ width: 375, height: 700 }, { width: 320, height: 568 }]) {
    page = await open({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    const tag = vp.width + 'x' + vp.height;
    await check('mobile ' + tag + ': no horizontal overflow, touch targets ≥ 44px, DPR capped', async () => {
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => {
        const box = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), r.left, r.right]; };
        const c = document.getElementById('scene');
        let minFont = 99;
        document.querySelectorAll('.cabinet *').forEach((n) => {
          if (n.children.length === 0 && n.textContent.trim() && n.getClientRects().length) minFont = Math.min(minFont, parseFloat(getComputedStyle(n).fontSize));
        });
        const over = [];
        document.querySelectorAll('.cabinet *').forEach((n) => { const r = n.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 0.5 || r.left < -0.5)) over.push(n.className || n.id || n.tagName); });
        return { sw: document.documentElement.scrollWidth, iw: innerWidth, action: box('action'), help: box('helpBtn'), sound: box('soundBtn'),
          ratio: c.width / c.clientWidth, sceneW: c.clientWidth, minFont, over };
      });
      assert.equal(m.sw, m.iw, 'no horizontal scroll');
      assert.deepEqual(m.over, [], 'nothing pokes outside the viewport');
      for (const b of [m.action, m.help, m.sound]) assert.ok(b[0] >= 44 && b[1] >= 44, 'target ' + b);
      assert.ok(Math.abs(m.ratio - 2) < 0.02, 'backing store capped at 2x, got ' + m.ratio);
      assert.ok(m.minFont >= 11, 'smallest label ' + m.minFont + 'px');
      await shot(page, 'mobile-' + tag + '-ready');
    });
    await check('mobile ' + tag + ': drag to aim, tap to drop, hold to grip', async () => {
      await page.waitForFunction(() => DCI.game.lineupT >= 1);
      const x = await page.evaluate(() => DCI.game.prizes.find((p) => p.type === 'cactus').x);
      const from = await chamberPoint(page, 320, 150), to = await chamberPoint(page, x, 150);
      const cdp = await page.context().newCDPSession(page);
      const touch = (type, pt) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pt ? [{ x: pt.x, y: pt.y }] : [] });
      await touch('touchStart', from);
      for (let i = 1; i <= 6; i++) await touch('touchMove', { x: from.x + (to.x - from.x) * i / 6, y: from.y });
      await touch('touchEnd');
      await page.waitForTimeout(80);
      assert.ok(Math.abs((await st(page)).aimX - x) < 2, 'claw follows the finger');
      const a = await actionPoint(page);
      await touch('touchStart', a); await touch('touchEnd');
      assert.equal((await st(page)).state, 'LOWERING');
      await waitState(page, 'GRIPPING');
      let down = false;
      for (;;) {
        const g = await page.evaluate(() => ({ s: DCI.game.state, p: DCI.game.pressure }));
        if (g.s !== 'GRIPPING' && g.s !== 'LIFTING') break;
        const want = g.p < 57;
        if (want && !down) { await touch('touchStart', a); down = true; }
        if (!want && down) { await touch('touchEnd'); down = false; }
        if (g.s === 'LIFTING' && !page._shot) { page._shot = true; await shot(page, 'mobile-' + tag + '-lifting'); }
        await page.waitForTimeout(12);
      }
      if (down) await touch('touchEnd');
      await waitState(page, 'ATTEMPT_RESULT');
      assert.equal((await st(page)).outcome.ok, true);
      const a2 = await actionPoint(page);
      await touch('touchStart', a2); await touch('touchEnd');
      await page.evaluate(() => DCI.game.aim(60));
      for (let i = 0; i < 2; i++) {
        await page.waitForFunction(() => DCI.game.lineupT >= 1);
        const b = await actionPoint(page);
        await touch('touchStart', b); await touch('touchEnd');
        await waitState(page, ['ATTEMPT_RESULT']);
        if (i === 0) { await touch('touchStart', b); await touch('touchEnd'); await page.evaluate(() => DCI.game.aim(60)); }
      }
      await waitState(page, 'ROUND_OVER');
      await page.waitForTimeout(450);
      const fits = await page.evaluate(() => {
        const g = document.querySelector('.glass').getBoundingClientRect(), c = document.querySelector('.card__paper').getBoundingClientRect();
        return c.top >= g.top - 1 && c.bottom <= g.bottom + 1 && c.left >= g.left && c.right <= g.right;
      });
      await shot(page, 'mobile-' + tag + '-round-over');
      assert.ok(fits, 'summary ticket fits inside the chamber');
    });
    await page.context().close();
  }

  // -------------------------------------------------------------- iframe --
  page = await open();
  await check('works inside an iframe', async () => {
    await page.setContent('<body style="margin:0;background:#888"><iframe id="f" src="' + URL + '" style="width:520px;height:640px;border:0;margin:40px"></iframe></body>');
    const frame = await (await page.$('#f')).contentFrame();
    await frame.waitForFunction(() => window.DCI && DCI.game && DCI.game.lineupT >= 0);
    await page.waitForTimeout(500);
    const m = await frame.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight,
      bottom: document.getElementById('machine').getBoundingClientRect().bottom, top: document.getElementById('machine').getBoundingClientRect().top }));
    assert.equal(m.sw, m.iw);
    assert.ok(m.top >= 0 && m.bottom <= m.ih, 'whole cabinet fits the frame: ' + m.top + '..' + m.bottom + ' in ' + m.ih);
    await shot(page, 'iframe');
  });
  await page.context().close();

  await check('no console errors in any scenario', async () => { assert.deepEqual(errors, []); });

  await browser.close();
  const failed = results.filter((r) => r[0] !== 'ok').length;
  console.log('\n' + (results.length - failed) + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
