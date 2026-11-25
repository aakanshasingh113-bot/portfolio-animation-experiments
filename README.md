# Sharp · Daily Brain Workout

A mobile-first daily brain workout in a single self-contained `index.html`: vanilla HTML/CSS/JS, no libraries (Google Fonts only).

- 3 games × 60 s a day, picked by date seed from 8 adaptive mini-games across 6 skills (Memory, Logic, Math, Focus, Speed, Spatial)
- Adaptive staircase difficulty (levels 1–30, targets ~80% success)
- Skill crystals that evolve through 5 stages, XP & 50 player levels, streaks with freezes, daily/weekly quests, chests & cosmetics, 30 achievements, personal weekly league, ghost-of-yesterday racing
- Practice, Focus on weakness and Zen modes; stats with radar and 30-day trend charts
- Installable (inline manifest), offline via the optional `sw.js` next to `index.html`

## Run

Open `index.html` directly, or serve the folder for install/offline support:

```bash
python3 -m http.server 8000
```

Debug panel: **Shift+D**, or tap the logo 5 times. It can fake dates, add XP, grant chests, raise skill levels and simulate 14 days of play.

Keyboard: 1–4 answer · Space match · P pause · Esc home.
