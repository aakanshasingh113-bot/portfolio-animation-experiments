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

- **Mouse:** click a prize to drop the claw on it (or hover to aim and click **Drop claw**), then press and hold **Hold to grip**.
- **Touch:** tap a prize to drop on it (dragging only aims), then press and hold **Hold to grip**.
- **Keyboard:** focus the chamber or the main button, ← → to aim, Space to drop, hold Space to grip.

### Scoring

Prize points, plus **Perfect** (+100, grip never left the band) or **Gentle** (+50), **Bullseye** (+25, dropped dead centre) and **Streak** (+50 for each capture in a row after the first). Rounds earn up to three stars.

### Files

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Cabinet, controls, help dialog |
| `js/sim.js` | Deterministic game rules and state machine (no DOM) |
| `js/prizes.js` | Prize and face artwork |
| `js/render.js` | Chamber, claw, tray and effects rendering |
| `js/audio.js` | Synthesised Web Audio sound design (starts on first interaction; mute is remembered) |
| `js/main.js` | Input, the animation loop, UI sync, storage |
| `tests/` | Automated checks |

### Tests

```bash
node --test tests/sim.test.js
```

Browser checks need Playwright with Chromium and the local server above running:

```bash
node tests/e2e.js
node tests/audio-e2e.js
```
