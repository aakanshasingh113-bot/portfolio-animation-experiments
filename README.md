# Aakansha Singh · Portfolio

A static portfolio site (no build step).

**The intro:** a red dot draws a coiled thread under the name, and each letter of "Aakansha Singh" rises into place as the dot passes it. The coil pulls straight, the bold name lifts away and the dot runs along the line like a pen, writing the name in script, and the dark screen splits open along the thread. Click, scroll or press Escape to skip. It is skipped automatically for people who prefer reduced motion.

**Play / Tidy up:** the switch at the bottom of the desk. Tidy up sweeps every object to the edges for a calm, focused intro; clicking any object (or Play) brings the desk back. The choice is remembered.

**The desk:** eleven objects you can drag anywhere. Each one does something when clicked:

| Object | Click |
| --- | --- |
| ID badge | swings on its lanyard and flips |
| Coffee | take a sip (then refill) |
| Sticky notes | peel off a user quote |
| Receipt | prints another skill |
| Photos | shuffle the stack |
| Cassette | plays lo-fi music |
| Folder | fans out the work, click again to jump to it |
| Plant | water it to grow a new version |
| about.md | types the next page |
| Postcard | flip it |
| Pencil | doodle on the desk |

**My design process:** a book you flip through (click a page, the arrows, or ← →). It opens on a framed poster of Dwight Schrute's "Would an idiot do that?" rule, turns to "Kidding.", then walks through the six real steps, each with a doodle that draws itself. On phones it becomes a swipeable stack of pages.

**Type:** the whole site uses two fonts. Bricolage Grotesque for everything, Caveat for the name and handwritten notes.

**Side B (off the clock):** what I do when I'm not designing, as tracks on a record. Pick a track and the arm drops, the record spins, the label changes colour and a little tune plays.

**Footer:** contact details next to a paper-toss game. Drag the ball back, let go, land it in the bin. Wind changes after every basket and the best streak is remembered.

Every sound is synthesized in the browser; the speaker button turns them off.

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html            markup: intro, desk, work, about, contact
assets/css/styles.css all styles (desk prop positions are near the "props" comment)
assets/js/sound.js    synthesized sounds and the cassette music
assets/js/intro.js    the thread / name intro
assets/js/desk.js     dragging and the click action of every desk object
assets/js/cases.js    case study text for the work pop-ups
assets/js/site.js     featured work, case study dialog, copy email, header highlight, scroll reveals
assets/js/process.js  the flip-through design process book
assets/js/experiments.js  AI experiments tabs, image viewer, videos, game player
assets/js/toss.js     the paper-toss game in the footer
assets/js/sideb.js    the Side B record player
assets/ai/            AI images, videos and games
```

## Make it yours

Some content is still sample text. Replace:

- **Email and links** in the contact section of `index.html`
- **Postcard back** (`[your city]`) and the badge text
- **Photos**: the three polaroids in `#photoStack` use drawn placeholders; swap in `<img>` tags
- **Case studies** ("Featured work"): Legrand Arteor and Oman Vision 2040 are real; slots 03 and 04 are "coming soon" placeholders. Preview images live in `assets/work/`.
  Featured work details: a list on the left, one project open at a time, and a large preview on the right. It auto-advances until a visitor picks a project.
  - Each project's text (tags, title, description, 3 metrics, button) is in its `<li class="fw-item">` in `index.html`; its colour is the `--c` value.
  - The preview for each project is the matching `<button class="fw-shot">`. The drawn UI mockups are placeholders: replace the `.ui` block with an `<img>` of your real screens.
  - The full story for the pop-up is in `assets/js/cases.js`, under the key in `data-open-case`. Add `nda: true` to show the NDA note.
- **Experience**: the `[Company]` / `[Studio]` placeholders
- **about.md pages**: the `pages` list in `assets/js/desk.js`
- **Side B hobbies**: each `.trk` button in the `#offclock` section (name in `.trk-t`, label colour in `--lc`) and its matching `<template data-track>` with the description, fun stat and doodle
- **Process book**: the pages inside `<template id="bookPages">` in `index.html`, in reading order
- **Resume**: point the header's Resume link and the "Resume (PDF)" link at your file
- **AI experiments** (Images / Videos / Games tabs):
  - Images: add files to `assets/ai/images/` and a `.pin` button in `index.html`
  - Videos: add files to `assets/ai/videos/` and set `data-src` on a `.vid` figure, e.g. `data-src="assets/ai/videos/loop.mp4"`; it plays on hover and goes full screen on click
  - Games: single HTML files in `assets/ai/games/` with a screenshot in `assets/ai/games/thumbs/`; they open in a player inside the site

## Deploy

Works on any static host. For GitHub Pages: Settings → Pages → deploy from this branch, folder `/`.
