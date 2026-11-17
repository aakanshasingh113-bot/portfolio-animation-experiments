# DO NOT SPILL

A small browser arcade game. Carry a tray of coffee through a busy café, keep every cup aboard, then decide whether to risk your unbanked tips on one more table.

*Steady hands. Questionable career choice.*

## Run it

There's no build step and nothing to install. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080. It also works inside an `<iframe>`. Add `?seed=123` to get a reproducible run, which helps when debugging.

## Controls

- **Hold ← / → or A / D** while the game has focus. Holding both keeps the tray level. **P** or **Esc** pauses.
- **Tilt left / Tilt right buttons**: press and hold. These work with touch and mouse, and support several fingers at once.
- Switching tabs or clicking away from the window pauses the game. You resume with the Resume button.

## Structure

| File | Role |
| --- | --- |
| `js/config.js` | Every tuning value in one place |
| `js/physics.js` | Tray-local cup simulation: slide, same-row collisions, liquid spring, splashes, edge loss |
| `js/game.js` | Authoritative state machine, fixed-step loop, bumps, slow motion, scoring, banking |
| `js/render.js` | Canvas 2D illustration; reads state only |
| `js/audio.js` | Procedural Web Audio effects and ambience |
| `js/voice.js` | SpeechSynthesis café manager; captions always shown |
| `js/input.js` | Keyboard scoped to the game region; pointer-capture hold buttons |
| `js/main.js` | Glue: one rAF loop, panels, focus, live-region announcements, interruptions |

`config`, `physics` and `game` have no DOM dependencies and are tested in Node.

## Tests

```bash
npm test
```

This runs deterministic tests with `node:test`: tilt direction, frame-rate independence, collisions, edge falls, splash cooldowns, pause/resume, rewards, banking once, losing only unbanked tips, the cup cap, bump scheduling, and restart.

## Single-file build

`npm run build` writes `dist/do-not-spill.html`, a standalone copy of the game with the CSS and JS inlined. Rebuild it after you change the source.
