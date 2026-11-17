'use strict';
/*
 * Sound checks for Don't Crush It, with real pointer and keyboard input.
 *
 *   python3 -m http.server 8765        (from the project root, in another terminal)
 *   node tests/audio-e2e.js
 *
 * These check that each sound is triggered by the right game transition, that
 * nothing drones or rumbles, that muting/pausing/restarting silences everything, and
 * that the mixed signal is non-silent and below clipping (read from an
 * AnalyserNode). They cannot tell whether anything sounds good: that needs ears.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const URL = process.env.DCI_URL || 'http://localhost:8765/index.html';
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(true); console.log('ok   - ' + name); }
  catch (e) { results.push(false); console.log('FAIL - ' + name + '\n       ' + String(e.message).split('\n').join('\n       ')); }
}

const log = (page) => page.evaluate(() => DCI.sound.debug.log.slice());
const count = (arr, name) => arr.filter((n) => n === name).length;
const loops = (page) => page.evaluate(() => DCI.sound.debug.loops());
const ctxState = (page) => page.evaluate(() => DCI.sound.debug.state());
const peak = (page) => page.evaluate(() => DCI.sound.debug.peak());
const waitState = (page, states, timeout = 9000) =>
  page.waitForFunction((s) => s.includes(DCI.game.state), [].concat(states), { timeout, polling: 16 });

async function point(page, id, lx, ly) {
  const r = await page.evaluate((i) => document.getElementById(i).getBoundingClientRect().toJSON(), id);
  if (lx == null) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  return { x: r.left + (lx / 640) * r.width, y: r.top + (ly / 440) * r.height };
}
async function aimAt(page, type) {
  await page.waitForFunction(() => DCI.game.lineupT >= 1);
  const x = typeof type === 'number' ? type : await page.evaluate((t) => DCI.game.prizes.find((p) => p.type === t).x, type);
  const pt = await point(page, 'scene', x, 200);
  await page.mouse.move(pt.x, pt.y, { steps: 6 });
  await page.waitForTimeout(250);      // let the carriage arrive and the hum stop
}
async function press(page) {
  const a = await point(page, 'action');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down(); await page.mouse.up();
}
/** policy(state) -> true to hold. Returns when the grip/lift phase is over. */
async function grip(page, policy, during) {
  const a = await point(page, 'action');
  await page.mouse.move(a.x, a.y);
  let down = false;
  for (;;) {
    const g = await page.evaluate(() => {
      const gm = DCI.game, d = gm.target ? DCI.sim.PRIZES[gm.target.type] : null;
      return { s: gm.state, p: gm.pressure, t: gm.t, mid: d ? (d.min + d.max) / 2 : 0, max: d ? d.max : 0 };
    });
    if (g.s !== 'GRIPPING' && g.s !== 'LIFTING') break;
    if (during) await during(g);
    const want = policy(g);
    if (want && !down) { await page.mouse.down(); down = true; }
    if (!want && down) { await page.mouse.up(); down = false; }
    await page.waitForTimeout(12);
  }
  if (down) await page.mouse.up();
}
const gentle = (g) => g.p < g.mid;
const squeezeHard = () => true;
const gripThenLetGo = (g) => g.s === 'GRIPPING' ? g.p < g.mid : false;

async function attempt(page, type, policy, during) {
  await aimAt(page, type);
  await press(page);
  await waitState(page, ['GRIPPING']);
  await grip(page, policy, during);
  await waitState(page, ['ATTEMPT_RESULT', 'ROUND_OVER']);
  await page.waitForTimeout(150);
}
async function next(page) { await press(page); await page.waitForTimeout(60); }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(init) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.DCI && DCI.game && DCI.sound);
    await page.waitForTimeout(500);
    return page;
  }

  const recordPitches = () => {
    window.__pitch = { min: Infinity, types: {} };
    const orig = BaseAudioContext.prototype.createOscillator;
    BaseAudioContext.prototype.createOscillator = function () {
      const o = orig.call(this), f = o.frequency;
      const note = (v) => { if (v < window.__pitch.min) window.__pitch.min = v; };
      const sv = f.setValueAtTime.bind(f), er = f.exponentialRampToValueAtTime.bind(f);
      f.setValueAtTime = (v, t) => { note(v); return sv(v, t); };
      f.exponentialRampToValueAtTime = (v, t) => { note(v); return er(v, t); };
      const start = o.start.bind(o);
      o.start = (t) => { window.__pitch.types[o.type] = true; return start(t); };
      return o;
    };
  };
  let page = await open(recordPitches);

  await check('no audio is created before the player interacts', async () => {
    const pt = await point(page, 'scene', 200, 200);
    await page.mouse.move(pt.x, pt.y);              // hovering is not an intentional interaction
    await page.waitForTimeout(300);
    assert.equal(await ctxState(page), 'none');
    assert.deepEqual(await log(page), []);
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Mute sound');
  });

  await check('first click starts audio and the drop sounds play', async () => {
    await aimAt(page, 'cake');
    await press(page);
    await page.waitForTimeout(100);
    assert.equal(await ctxState(page), 'running');
    const l = await log(page);
    assert.ok(l.includes('click'), 'button click');
    assert.ok(l.includes('lower'), 'lowering whirr');
  });

  await check('cake: ratchet, safe note, rising lift scale, bloop+chime, points, sparkle', async () => {
    await waitState(page, 'GRIPPING');
    let liftPeak = 0;
    await grip(page, gentle, async (g) => {
      if (g.s === 'LIFTING') liftPeak = Math.max(liftPeak, await peak(page));
    });
    assert.ok(liftPeak > 0.002, 'audible-level signal during the lift: ' + liftPeak);
    await waitState(page, 'ATTEMPT_RESULT');
    await page.waitForTimeout(150);
    const l = await log(page);
    assert.ok(count(l, 'ratchet') >= 3, 'ratchet clicks: ' + count(l, 'ratchet'));
    assert.equal(count(l, 'safe'), 1);
    assert.equal(count(l, 'liftNote'), 8, 'one note per step of the climb');
    assert.equal(count(l, 'landed'), 1);
    assert.equal(count(l, 'points'), 1);
    assert.equal(count(l, 'sparkle'), (await page.evaluate(() => DCI.game.outcome.grade)) === 'perfect' ? 1 : 0);
  });

  await check('carriage ticks only while the claw is moving', async () => {
    await next(page);
    await page.waitForFunction(() => DCI.game.lineupT >= 1);
    const a = await point(page, 'scene', 120, 200), b = await point(page, 'scene', 560, 200);
    await page.mouse.move(a.x, a.y); await page.waitForTimeout(350);
    const t0 = count(await log(page), 'tick');
    await page.mouse.move(b.x, b.y, { steps: 20 });
    await page.waitForTimeout(300);
    const t1 = count(await log(page), 'tick');
    assert.ok(t1 - t0 >= 8, 'ticks while travelling: ' + (t1 - t0));
    await page.waitForTimeout(200);
    const before = (await log(page)).length;
    await page.waitForTimeout(1000);
    assert.equal((await log(page)).length, before, 'nothing plays while idle (no per-frame sounds)');
  });

  await check('warning pulses speed up near failure; egg crush cracks', async () => {
    const times = [];
    let seen = 0;
    await attempt(page, 'egg', squeezeHard, async () => {
      const n = count(await log(page), 'warn');
      if (n > seen) { seen = n; times.push(Date.now()); }
    });
    const l = await log(page);
    assert.ok(count(l, 'warn') >= 3, 'warning pulses: ' + count(l, 'warn'));
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    assert.ok(gaps[gaps.length - 1] < gaps[0], 'pulses get closer: ' + gaps.join(','));
    assert.equal(count(l, 'crack'), 1, 'egg crack');
    assert.equal(count(l, 'squish'), 0);
  });

  await check('ordinary round end plays the closing sound, no flourish', async () => {
    await next(page);
    await page.waitForFunction(() => DCI.game.lineupT >= 1);
    const empty = await point(page, 'scene', 60, 300);
    await page.mouse.click(empty.x, empty.y);           // click-to-drop on empty floor
    await waitState(page, 'ROUND_OVER');
    await page.waitForTimeout(200);
    const l = await log(page);
    assert.equal(count(l, 'clack'), 1, 'empty grab clack');
    assert.equal(count(l, 'closing'), 1);
    assert.equal(count(l, 'flourish'), 0);
  });

  await check('cactus crush squeaks; cake crush squishes; soap crush squishes and pops', async () => {
    await next(page);                               // play again
    await attempt(page, 'cactus', squeezeHard);
    let l = await log(page);
    assert.equal(count(l, 'squeak'), 1);
    await next(page);
    await attempt(page, 'cake', squeezeHard);
    l = await log(page);
    assert.equal(count(l, 'squish'), 1);
    await next(page);
    await attempt(page, 'soap', squeezeHard);
    l = await log(page);
    assert.equal(count(l, 'squish'), 2);
    assert.equal(count(l, 'pops'), 1);
    assert.ok(count(l, 'thud') >= 1, 'a prize dropped mid-lift lands with a thud');
  });

  await check('slipping whistles; soap slipping also pops', async () => {
    await waitState(page, 'ROUND_OVER');
    await next(page);
    let l0 = await log(page);
    await attempt(page, 'egg', gripThenLetGo);
    let l = await log(page);
    assert.equal(count(l, 'whistle') - count(l0, 'whistle'), 1);
    assert.equal(count(l, 'pops') - count(l0, 'pops'), 0);
    await next(page);
    l0 = l;
    await attempt(page, 'soap', gripThenLetGo);
    l = await log(page);
    assert.equal(count(l, 'whistle') - count(l0, 'whistle'), 1);
    assert.equal(count(l, 'pops') - count(l0, 'pops'), 1);
  });

  await check('a new personal best plays the flourish together with the confetti', async () => {
    const closing0 = count(await log(page), 'closing');
    await next(page);
    await attempt(page, 'egg', gentle);
    await waitState(page, 'ROUND_OVER');
    const sync = await page.evaluate(() => new Promise((res) => {
      // the same frame that shows the ticket starts both
      const l = DCI.sound.debug.log, c = document.getElementById('confetti');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let painted = false; for (let i = 3; i < d.length; i += 4) if (d[i]) { painted = true; break; }
      res({ flourish: l.includes('flourish'), painted });
    }));
    await page.waitForTimeout(100);
    assert.equal(await page.textContent('#cardBest'), 'New personal best!');
    assert.ok(sync.flourish, 'flourish triggered');
    assert.ok(sync.painted, 'confetti already running');
    assert.equal(count(await log(page), 'closing'), closing0, 'no closing sound on a celebration');
  });

  await check('a perfect three-prize round also gets the flourish', async () => {
    const f0 = count(await log(page), 'flourish');
    await next(page);
    for (const t of ['soap', 'cactus', 'egg']) { await attempt(page, t, gentle); if (t !== 'egg') await next(page); }
    await waitState(page, 'ROUND_OVER');
    await page.waitForTimeout(150);
    assert.equal(count(await log(page), 'flourish'), f0 + 1);
  });

  await check('mute mid-lift silences everything at once and all later sounds', async () => {
    await next(page);
    await aimAt(page, 'cactus'); await press(page);
    await waitState(page, 'GRIPPING');
    let muted = false;
    await grip(page, gentle, async (g) => {
      if (!muted && g.s === 'LIFTING' && g.t > 0.6) {
        muted = true;
        await page.mouse.up();                        // a real mouse can't press two buttons at once
        await page.click('#soundBtn');
        assert.equal(await page.evaluate(() => DCI.sound.debug.voices()), 0, 'sounding notes cut immediately');
        assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Enable sound');
        await page.waitForTimeout(150);
        assert.ok((await peak(page)) < 0.0005, 'output silent: ' + (await peak(page)));
        const a = await point(page, 'action'); await page.mouse.move(a.x, a.y);
      }
    });
    await waitState(page, ['ATTEMPT_RESULT', 'ROUND_OVER']);
    const before = (await log(page)).length;
    await next(page);
    await attempt(page, 'soap', squeezeHard);
    assert.equal((await log(page)).length, before, 'nothing plays while muted');
    assert.equal(await page.evaluate(() => localStorage.getItem('dont-crush-it.sound')), 'off');
  });

  await check('the mute preference survives a reload: no audio even after interacting', async () => {
    await page.reload();
    await page.waitForFunction(() => window.DCI && DCI.sound);
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Enable sound');
    await aimAt(page, 'egg'); await press(page);
    await page.waitForTimeout(200);
    assert.equal(await ctxState(page), 'none', 'a muted player never gets an AudioContext');
    assert.deepEqual(await log(page), []);
    await page.click('#soundBtn');
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Mute sound');
    assert.equal(await ctxState(page), 'running');
    assert.ok((await log(page)).includes('click'), 'unmuting confirms with a click');
    assert.equal(await page.evaluate(() => localStorage.getItem('dont-crush-it.sound')), 'on');
    await waitState(page, ['ATTEMPT_RESULT']);
  });

  await check('hiding the tab mid-lift cuts sound and suspends; returning resumes safely', async () => {
    await next(page);
    await aimAt(page, 'cake'); await press(page);
    await waitState(page, 'GRIPPING');
    const a = await point(page, 'action');
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await waitState(page, 'LIFTING');
    await page.waitForTimeout(150);
    const notesBefore = count(await log(page), 'liftNote');
    assert.ok(notesBefore >= 1);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.mouse.up();
    await page.waitForTimeout(150);
    assert.equal(await ctxState(page), 'suspended');
    assert.equal(await page.evaluate(() => DCI.sound.debug.voices()), 0);
    const n = (await log(page)).length;
    await page.waitForTimeout(500);
    assert.equal((await log(page)).length, n, 'nothing triggered while hidden');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
    assert.equal(await ctxState(page), 'running');
    assert.equal(count(await log(page), 'liftNote'), notesBefore, 'still quiet while paused');
    await page.click('#resumeBtn');
    await waitState(page, 'LIFTING');
    await grip(page, gentle);
    await waitState(page, 'ATTEMPT_RESULT');
    await page.waitForTimeout(100);
    const lifted = count(await log(page), 'liftNote') - notesBefore;
    assert.ok(lifted >= 1 && lifted + 1 <= 8, 'scale continues after resume without repeating: ' + lifted);
  });

  await check('restarting mid-lift stops every sound', async () => {
    await next(page);
    await aimAt(page, 'soap'); await press(page);
    await waitState(page, 'GRIPPING');
    const a = await point(page, 'action');
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await waitState(page, 'LIFTING');
    await page.waitForTimeout(100);
    await page.evaluate(() => DCI.game.restart());
    await page.mouse.up();
    await page.waitForTimeout(80);
    const n0 = count(await log(page), 'liftNote');
    await page.waitForTimeout(500);
    assert.equal(count(await log(page), 'liftNote'), n0, 'the lift scale stopped with the round');
    assert.deepEqual(await loops(page), [], 'nothing continuous anywhere');
  });

  await check('nothing low or buzzy: every pitch ≥ 250 Hz, sine/triangle only', async () => {
    const p = await page.evaluate(() => ({ min: window.__pitch.min, types: Object.keys(window.__pitch.types) }));
    assert.ok(p.min >= 250, 'lowest pitch scheduled all session: ' + p.min.toFixed(1) + ' Hz');
    assert.deepEqual(p.types.filter((t) => t !== 'sine' && t !== 'triangle'), [], 'waveforms: ' + p.types);
  });

  await check('mixed output never clips during a busy moment', async () => {
    let max = 0;
    const id = setInterval(async () => { try { max = Math.max(max, await peak(page)); } catch (e) {} }, 15);
    await page.evaluate(() => { const s = DCI.sound; s.landed(); s.points({ aim: 25, grade: 'perfect', streak: 3 }); s.sparkle(); s.flourish(); s.squish(); s.pops(); s.crack(); s.squeak(); });
    await page.waitForTimeout(1200);
    clearInterval(id);
    assert.ok(max > 0.01 && max < 0.99, 'peak ' + max.toFixed(3));
  });
  await page.context().close();

  page = await open();
  await check('keyboard-only first interaction starts audio; Tab alone does not', async () => {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    assert.equal(await ctxState(page), 'none', 'moving focus is not an intentional game action');
    await page.focus('#scene');
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(150); await page.keyboard.up('ArrowRight');
    assert.equal(await ctxState(page), 'running');
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    const l = await log(page);
    assert.ok(l.includes('click') && l.includes('lower'), 'drop sounds from the keyboard: ' + l);
  });
  await page.context().close();

  page = await open(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage disabled'); } });
  });
  await check('storage disabled: sound still works and can be toggled', async () => {
    await aimAt(page, 60); await press(page);
    await page.waitForTimeout(100);
    assert.equal(await ctxState(page), 'running');
    await page.click('#soundBtn');
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Enable sound');
    await page.click('#soundBtn');
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Mute sound');
  });
  await page.context().close();

  page = await open(() => { window.AudioContext = function () { throw new Error('no audio device'); }; window.webkitAudioContext = undefined; });
  await check('AudioContext failing to start: game plays on, toggle shows unavailable', async () => {
    await attempt(page, 'soap', gentle);
    assert.equal((await page.evaluate(() => DCI.game.outcome)).ok, true);
    assert.equal(await page.getAttribute('#soundBtn', 'aria-label'), 'Sound unavailable');
  });
  await page.context().close();

  await check('no console errors', async () => { assert.deepEqual(errors, []); });

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log('\n' + (results.length - failed) + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
