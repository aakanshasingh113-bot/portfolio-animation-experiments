# WRONG ANSWERS ONLY

> Being right is your biggest mistake.

A tiny browser game. Each question has two answers — pick the **factually false** one.
Unless a **NORMAL ROUND** appears: then pick the true one. Three mistakes end the run.

Plain HTML, CSS and JavaScript. No build step, no backend, no external fonts, images or audio.
Illustrations are inline SVG and sound effects are synthesised with the Web Audio API.
The referee reacts with text bubbles only — there is no spoken narration.

## Run

Open `index.html` directly, or serve the folder (recommended, so `localStorage` behaves consistently):

```bash
cd wrong-answers-only && python3 -m http.server 8080
```

Then visit http://localhost:8080. To embed it in a portfolio:

```html
<iframe src="wrong-answers-only/index.html" title="Wrong Answers Only" style="width:100%;height:760px;border:0"></iframe>
```

## Controls

- Click / tap an answer.
- **← / A** = left, **→ / D** = right. Tab + Enter/Space also work on the buttons.
- **Esc / P** pauses. The game also pauses when the tab is hidden or the window loses focus.
- **Chill mode** (start screen) removes the clock. Timed and Chill bests are stored separately.

## Code map

| File | Role |
| --- | --- |
| `js/questions.js` | Question templates, independent truth verification, shuffle-bag picker, practice items |
| `js/engine.js` | Authoritative state machine (`INTRO`, `PRACTICE`, `RULE_TRANSITION`, `QUESTION_ACTIVE`, `FEEDBACK`, `PAUSED`, `GAME_OVER`); all answers and timeouts pass through one guarded `resolve()` |
| `js/input.js` | Pure keyboard mapping (ignores repeats/modifiers) |
| `js/main.js` | DOM rendering, input wiring, interruptions, frame loop |
| `js/audio.js` / `js/effects.js` | Synth sounds, ink + confetti canvas |

Factual truth lives only in each question's `correctId`. The winning option is derived as
`wrong` rule → the option that is not `correctId`; `normal` rule → `correctId`. Button position
and display text are never used to decide correctness.

## Tests

```bash
npm test            # unit tests (Node 18+): question validity, rule mapping, races, pause, streaks, bests
```

Browser checks (needs Playwright + Chromium):

```bash
python3 -m http.server 8765                              # in wrong-answers-only/
(cd tests/browser && python3 -m http.server 8766)        # iframe host page
node tests/browser/behaviour.js
```
