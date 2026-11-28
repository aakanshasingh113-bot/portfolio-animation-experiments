# Oman Vision 2040 — Case study website

A portfolio case study for the touch-interactive holographic experience designed for MTCIT at COMEX Oman 2025.

It's a plain HTML/CSS/JS site built with Vite. There's no framework. The runtime dependencies are the Geist and Geist Mono fonts.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
npm run preview    # serve the build
```

The build uses a relative base (`./`), so you can copy `dist/` into any sub-path of the main portfolio, for example `/work/oman-vision-2040/`.

## Structure

```
index.html                 All copy, as semantic HTML: one <section> per chapter, 01–10
src/data/project.js        Pillars, parameters, stories, films, optional media slots, tools
src/main.js                Renders data-driven parts and runs the interactions
src/styles/tokens.css      Colours, type scale, spacing, motion
src/styles/base.css        Typography, textures, shared components, reduced motion
src/styles/sections.css    Section-specific layouts
public/media/              Optimised project media (WebP)
scripts/prepare-media.sh   Rebuilds public/media from the original export
scripts/extract-frames.sh  Pulls 8 sequential frames from a film for the 7–8 s filmstrip
```

The copy comes from the approved case study text. Data-driven parts are rendered from `src/data/project.js`: the IA diagram, pillar gallery, demo, storyboards, film gallery, production stages, tools and outcome matrix.

## Asset inventory

| Folder | Contents | Used in |
|---|---|---|
| `media/screens/` | 5 final pillar screens (587×1031), plus the annotated anatomy screen (not used; the site draws its own hotspots over a clean screen) | Hero, Iteration 03, Final experience, Demo, Storyboards, Production |
| `media/films/posters/` | 15 film stills, one per story. The bottom ~10% is trimmed to remove the play icon baked into the exported stills | Everywhere a film appears |
| `media/iteration-01/` | Home screen, topic-screen strip, one topic crop | Iteration 01, Comparison |
| `media/iteration-02/` | Topic-screen strip, data and podcast screens, and crops of single screens | Iteration 02, Transparency illustration, Iteration 03, Comparison |

The Behance PDFs supplied as references were studied for presentation quality only. None of their visuals are used.

## Replacing or adding media

Every replaceable image, video and audio file is set in **`public/media-config.js`** (`media-config.js` in the built folder). It's a plain script, so you can edit it without rebuilding:

1. Put the file in `media/replace/` (images, podcast) or `media/films/video/` (MP4s).
2. In `media-config.js`, change that slot's `null` to the path, e.g. `comex: 'media/replace/comex.jpg',`.
3. Reload.

The slots are: COMEX, Vision 2040 and MTCIT visuals · podcast audio · 8 filmstrip frames · image variations · editing timeline · installation photo · the 15 film MP4s. Anything left as `null` keeps its labelled placeholder.

The built `dist/index.html` opens directly from disk (`file://`), because the bundle is a classic deferred script.

To pull filmstrip frames from a film (needs ffmpeg), run `npm run frames -- public/media/films/video/01-2.mp4`.

Tools (Adobe Express is provisional) and pillar, parameter and story names are in `src/data/project.js`.

To regenerate the optimised media from the original export:

```bash
npm run media -- /path/to/Oman_Vision_2040_Media/media
```

## Missing media and unverified information

These weren't in the supplied material, so the site shows placeholders or leaves them out:

- **Film video files.** Only stills were supplied. The gallery, player and demo work with stills and tell the visitor the video isn't attached yet.
- **Podcast audio** from NotebookLM. The player is built but disabled.
- **Sequential frames** for the 7–8 second filmstrip.
- **Photographs** of the installation or of COMEX 2025.
- **COMEX and MTCIT official identity.**
- **Research material:** notes or initiative documentation.
- **Production material:** prompts, generated image variations, the editing timeline.
- **Exact film durations.** The site only states "7–8 seconds", as in the approved copy.
- **Pillar theme labels** (e.g. "People & Society") and the parameter → story pairs. These were taken from the supplied case-study pages and screens; please confirm them.
- **The "XFACTORZ" logo** that appears in the final screens. The screens are shown unedited, and the logo isn't mentioned in the copy.

The site contains no metrics, visitor feedback, testing claims or research findings beyond the approved text.

## Accessibility and motion

- Semantic landmarks and a skip link.
- Keyboard support throughout: the demo tabs take arrow, Home and End keys; dialogs close with Esc and return focus.
- Touch targets are at least 44 px.
- `prefers-reduced-motion` turns off reveals, parallax and transitions.
- All content is in the HTML and stays visible without animation.
