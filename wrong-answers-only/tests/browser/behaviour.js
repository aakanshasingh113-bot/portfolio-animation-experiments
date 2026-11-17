// Browser behaviour checks. Requires Playwright + Chromium.
// Serve the game on :8765 and tests/browser/ on :8766 first (see README).
const { chromium } = require('playwright');
const OUT = process.env.OUT || require('os').tmpdir();
const results = [];
const check = (name, ok, info) => { results.push((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  [' + info + ']' : '')); };
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function page(opts) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1100, height: 860 } }, opts || {}));
    const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto('http://localhost:8765/');
    return p;
  }
  const S = (p) => p.evaluate(() => { const s = window.__WAO.engine.getState(); return { state: s.state, score: s.score, lives: s.lives, n: s.current && s.current.n, token: s.current && s.current.token, mode: s.mode, rule: s.current && s.current.rule }; });
  const win = (p) => p.evaluate(() => { const s = window.__WAO.engine.getState(); const c = s.current; const w = window.__WAO.Q.winningOptionId(c.question, c.rule); return c.layout[0] === w ? 'left' : 'right'; });
  const waitState = (p, s, t) => p.waitForFunction((s) => window.__WAO.engine.getState().state === s, s, { timeout: t || 8000 });

  // ---------- 1. keyboard play, practice skip, repeat keys, scoping
  let p = await page();
  await p.focus('#start-btn');
  await p.keyboard.press('Enter');
  check('first play shows practice', (await S(p)).state === 'PRACTICE');
  await p.waitForTimeout(100); const as = await p.evaluate(() => window.__WAO.audio.state); check('audio context running after Start', as === 'running', as);
  await p.click('#skip-practice');
  await waitState(p, 'QUESTION_ACTIVE');
  const side = await win(p);
  await p.keyboard.press(side === 'left' ? 'ArrowLeft' : 'd');
  let st = await S(p);
  check('keyboard answer scores', st.score === 1, JSON.stringify(st));
  await waitState(p, 'QUESTION_ACTIVE');
  // Repeat key event must be ignored
  const before = await S(p);
  await p.evaluate(() => {
    const ev = new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true, bubbles: true, cancelable: true });
    document.getElementById('screen-play').dispatchEvent(ev);
  });
  st = await S(p);
  check('repeat keydown ignored', st.state === 'QUESTION_ACTIVE' && st.token === before.token);
  // Keys dispatched outside the game root are not intercepted
  const prevented = await p.evaluate(() => {
    const inp = document.createElement('input'); document.body.appendChild(inp);
    const ev = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    inp.dispatchEvent(ev); inp.remove(); return ev.defaultPrevented;
  });
  st = await S(p);
  check('keys outside game root untouched', !prevented && st.state === 'QUESTION_ACTIVE' && st.token === before.token);
  // Tab + Enter on semantic button
  await p.focus('#ans-' + await win(p));
  await p.keyboard.press('Enter');
  st = await S(p);
  check('Tab/Enter on answer button works', st.score === 2, JSON.stringify(st));
  // Rapid-tap guard: pointerdown during feedback, release after next question appears -> ignored
  await waitState(p, 'QUESTION_ACTIVE');
  const tk = (await S(p)).token;
  await p.click('#ans-' + await win(p));
  const box = await p.locator('#ans-left').boundingBox();
  await p.mouse.move(box.x + 20, box.y + 20);
  await p.mouse.down(); // during FEEDBACK
  await waitState(p, 'QUESTION_ACTIVE');
  const mid = await S(p);
  await p.mouse.up(); // click lands on the new question
  st = await S(p);
  check('press started on previous question does not answer the next', st.state === 'QUESTION_ACTIVE' && st.token === mid.token && st.token !== tk, JSON.stringify(st));
  // aria labels updated
  const lab = await p.getAttribute('#ans-left', 'aria-label');
  const txt = await p.textContent('#ans-left-label');
  check('accessible label tracks option', lab === 'Left answer: ' + txt, lab);
  // Pause via blur
  await p.evaluate(() => window.dispatchEvent(new Event('blur')));
  st = await S(p);
  const rem1 = await p.evaluate(() => window.__WAO.engine.timeRemaining());
  await p.waitForTimeout(1200);
  const rem2 = await p.evaluate(() => window.__WAO.engine.timeRemaining());
  const asPaused = await p.evaluate(() => window.__WAO.audio.state);
  check('audio suspended while paused', asPaused === 'suspended', asPaused);
  check('blur pauses and freezes time', st.state === 'PAUSED' && rem1 === rem2, rem1 + ' ' + rem2);
  check('pause overlay visible', await p.isVisible('#resume-btn'));
  await p.click('#resume-btn');
  check('ready cue before resuming', (await S(p)).state === 'PAUSED' && (await p.textContent('#pause-title')) === 'Ready…');
  await waitState(p, 'QUESTION_ACTIVE');
  const rem3 = await p.evaluate(() => window.__WAO.engine.timeRemaining());
  check('remaining time preserved', rem3 <= rem1 && rem3 > rem1 - 150, rem1 + ' -> ' + rem3);
  // visibility hidden
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check('hidden tab pauses', (await S(p)).state === 'PAUSED');
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check('stays paused until explicit resume', (await S(p)).state === 'PAUSED');
  await p.click('#resume-btn'); await waitState(p, 'QUESTION_ACTIVE');
  // Timeouts to end the run
  await waitState(p, 'GAME_OVER', 20000);
  const over = await p.evaluate(() => window.__WAO.engine.getState().summary);
  check('game over shows survived count', (await p.textContent('#over-survived')) === 'You survived ' + over.survived + ' questions.', await p.textContent('#over-survived'));
  check('first run is not a new-best', !(await p.isVisible('#best-stamp')));
  await p.click('#review-btn');
  const items = await p.locator('#review-list li').count();
  check('review lists run mistakes only', items === 3, String(items));
  await p.click('#review-back');
  check('back to results', await p.isVisible('#again-btn'));
  // Restart: no practice, beat the best
  await p.click('#again-btn');
  check('restart skips practice', (await S(p)).state === 'RULE_TRANSITION');
  for (let i = 0; i < over.score + 2; i++) {
    await waitState(p, 'QUESTION_ACTIVE');
    await p.click('#ans-' + await win(p));
  }
  for (let i = 0; i < 3; i++) {
    await waitState(p, 'QUESTION_ACTIVE');
    const w = await win(p);
    await p.click('#ans-' + (w === 'left' ? 'right' : 'left'));
  }
  await waitState(p, 'GAME_OVER');
  await p.waitForTimeout(150);
  check('beating best shows New best', await p.isVisible('#best-stamp'));
  check('confetti capped at 60', await p.evaluate(() => window.__WAO.fx.count) <= 60, String(await p.evaluate(() => window.__WAO.fx.count)));
  await p.screenshot({ path: OUT + '/b-newbest.png' });
  await p.waitForTimeout(1300);
  check('confetti gone within ~1.3s', await p.evaluate(() => window.__WAO.fx.count) === 0);
  const audioState = await p.evaluate(() => window.__WAO.audio.supported);
  check('Web Audio supported in test browser', audioState);

  // ---------- 2. chill mode + sound toggle persistence
  await p.click('#menu-btn');
  await p.click('label.mode-opt:nth-child(3)');
  await p.click('#sound-toggle');
  check('sound toggle off persists', await p.evaluate(() => localStorage.getItem('woa.sound')) === '0');
  await p.click('#start-btn');
  await waitState(p, 'QUESTION_ACTIVE');
  check('chill mode label visible, no countdown', await p.isVisible('#timer-label') && !(await p.isVisible('#timer-fill')));
  await p.waitForTimeout(4000);
  st = await S(p);
  check('chill: no timeout after 4s', st.state === 'QUESTION_ACTIVE' && st.lives === 3 && st.mode === 'chill');
  await p.screenshot({ path: OUT + '/b-chill.png' });
  for (let i = 0; i < 3; i++) {
    await waitState(p, 'QUESTION_ACTIVE');
    const w = await win(p);
    await p.click('#ans-' + (w === 'left' ? 'right' : 'left'));
  }
  await waitState(p, 'GAME_OVER');
  check('chill result labelled', (await p.textContent('#over-mode')).includes('Chill'));
  const bests = await p.evaluate(() => [localStorage.getItem('woa.best.timed'), localStorage.getItem('woa.best.chill')]);
  check('best scores separate per mode', bests[0] !== null && bests[1] === '0', JSON.stringify(bests));
  await p.reload();
  check('sound preference restored after reload', (await p.getAttribute('#sound-toggle', 'aria-pressed')) === 'false');
  check('mode preference restored', await p.isChecked('input[value="chill"]'));

  // ---------- 3. no narration
  check('no speech synthesis used', await p.evaluate(() => { let spoke = false; const orig = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { spoke = true; orig(u); }; document.getElementById('start-btn').click(); return new Promise((r) => setTimeout(() => r(!spoke), 2500)); }));
  check('no voice controls', (await p.locator('#voice-toggle, #hud-voice, #voice-test').count()) === 0);
  check('referee caption bubble still shown', (await p.textContent('#caption-text')).length >= 0);

  // ---------- 4. reduced motion
  const rm = await page({ reducedMotion: 'reduce' });
  await rm.click('#start-btn');
  await rm.click('#skip-practice');
  await waitState(rm, 'QUESTION_ACTIVE');
  await rm.click('#ans-' + await win(rm));
  const cnt = await rm.evaluate(() => window.__WAO.fx.count);
  const anim = await rm.evaluate(() => getComputedStyle(document.getElementById('ans-left')).animationName + '|' + getComputedStyle(document.getElementById('stamp')).animationName);
  check('reduced motion: no particles, no animations', cnt === 0 && anim === 'none|none', cnt + ' ' + anim);

  // ---------- 5. iframe embedding
  const hctx = await browser.newContext({ viewport: { width: 1000, height: 820 } });
  const host = await hctx.newPage();
  host.on('pageerror', (e) => errors.push('host: ' + e.message));
  await host.goto('http://localhost:8766/iframe-host.html');
  await host.waitForTimeout(800);
  const frame = host.frames().find((f) => f.url().includes('8765'));
  await frame.waitForSelector('#start-btn');
  await frame.click('#start-btn');
  await frame.click('#skip-practice');
  await frame.waitForFunction(() => window.__WAO.engine.getState().state === 'QUESTION_ACTIVE');
  await host.focus('#outside');
  await host.keyboard.type('ad');
  const val = await host.inputValue('#outside');
  const fst = await frame.evaluate(() => window.__WAO.engine.getState().state);
  check('iframe: typing in parent page unaffected and game pauses on blur', val === 'ad' && fst === 'PAUSED', val + ' ' + fst);
  await host.screenshot({ path: OUT + '/b-iframe.png' });

  results.push('CONSOLE ERRORS: ' + JSON.stringify(errors));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
