# Aakansha Singh · Portfolio

A static portfolio site (no build step).

**The intro:** a red dot draws a tangled thread with the letters of the name caught in it. The thread pulls straight and the letters snap into "Aakansha Singh". The dot then runs along the line like a pen, rewriting the name in script, and the dark screen splits open along the thread. Click, scroll or press Escape to skip. It is skipped automatically for people who prefer reduced motion.

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
assets/js/site.js     case study dialog, copy email, scroll reveals
```

## Make it yours

Some content is still sample text. Replace:

- **Email and links** in the contact section of `index.html`
- **Postcard back** (`[your city]`) and the badge text
- **Photos**: the three polaroids in `#photoStack` use drawn placeholders; swap in `<img>` tags
- **Projects**: the `.wcard` cards in `index.html` and their entries in `assets/js/cases.js`
- **Experience**: the `[Company]` / `[Studio]` placeholders
- **about.md pages**: the `pages` list in `assets/js/desk.js`
- **Resume**: point the "Resume (PDF)" link at your file

## Deploy

Works on any static host. For GitHub Pages: Settings → Pages → deploy from this branch, folder `/`.
