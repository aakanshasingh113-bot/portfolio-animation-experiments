# portfolio-animation-experiments

## Don’t Crush It

A miniature claw machine full of squishy prizes. Line it up, drop the claw, hold gently.

Plain HTML, CSS and JavaScript — no build step, no dependencies, no external assets. All artwork is drawn with Canvas paths and CSS.

### Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8765
```

then visit `http://localhost:8765/`. To embed it in a portfolio page, point an `<iframe>` at `index.html`; the cabinet scales to fit the frame.

### Controls

- **Mouse:** move over the chamber to aim, click **Drop claw**, then press and hold **Hold to grip**.
- **Touch:** drag across the chamber to aim, tap to drop, press and hold to grip.
- **Keyboard:** focus the chamber or the main button, ← → to aim, Space to drop, hold Space to grip.

### Files

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Cabinet, controls, help dialog |
| `js/sim.js` | Deterministic game rules and state machine (no DOM) |
| `js/prizes.js` | Prize and face artwork |
| `js/render.js` | Chamber, claw, tray and effects rendering |
| `js/audio.js` | Web Audio sound effects (off by default) |
| `js/main.js` | Input, the animation loop, UI sync, storage |
| `tests/` | Automated checks |

### Tests

```bash
node --test tests/sim.test.js
```

Browser checks need Playwright with Chromium and the local server above running:

```bash
node tests/e2e.js
```
