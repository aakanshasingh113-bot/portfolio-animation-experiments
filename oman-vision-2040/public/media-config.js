/* ==================================================================
   MEDIA CONFIG — Oman Vision 2040 case study
   ------------------------------------------------------------------
   The one file to edit when adding your own images, videos and audio.

   1. Put your file in the folder named on its line, using that file name
      (e.g. media/replace/comex.jpg). Any of jpg, png or webp works:
      just match the extension here.
   2. Replace `null` with the path in quotes, e.g.
        comex: 'media/replace/comex.jpg',
   3. Save and reload index.html.

   Lines left as `null` keep showing a labelled placeholder (or, for
   the Vision 2040 / MTCIT panels, the current film still).
   ================================================================== */

window.CASE_STUDY_MEDIA = {

  /* ---------- 01 — Event context (portrait, about 4:5) ---------- */
  comex:      null,   // → 'media/replace/comex.jpg'       COMEX Oman 2025 event photo or identity
  vision2040: null,   // → 'media/replace/vision-2040.jpg' Oman Vision 2040 identity / landscape (optional)
  mtcit:      null,   // → 'media/replace/mtcit.jpg'       MTCIT identity or project material (optional)

  /* ---------- 05 — Iteration 02 podcast ---------- */
  podcastAudio: null, // → 'media/replace/podcast.mp3'

  /* ---------- 07 — 7–8 second filmstrip: 8 frames, one per second ---------- */
  filmstripFrames: [
    // 'media/replace/filmstrip-0.jpg',
    // 'media/replace/filmstrip-1.jpg',
    // 'media/replace/filmstrip-2.jpg',
    // 'media/replace/filmstrip-3.jpg',
    // 'media/replace/filmstrip-4.jpg',
    // 'media/replace/filmstrip-5.jpg',
    // 'media/replace/filmstrip-6.jpg',
    // 'media/replace/filmstrip-7.jpg',
  ],
  filmstripFilm: '01-2', // which film the frames come from (see the film list below)

  /* ---------- 08 — Production ---------- */
  imageVariations: [
    // 'media/replace/variation-1.jpg',   portrait, about 2:3
    // 'media/replace/variation-2.jpg',
  ],
  editingTimeline: null, // → 'media/replace/editing-timeline.jpg'  wide screenshot of the edit

  /* ---------- 09 — Outcome (landscape, about 16:10) ---------- */
  installation: null,    // → 'media/replace/installation.jpg'  installation at COMEX 2025

  /* ---------- Films — put MP4s in media/films/video/ ---------- */
  films: {
    '01-1': null, // → 'media/films/video/01-1.mp4'  Invest in People · Women & Leadership
    '01-2': null, // → 'media/films/video/01-2.mp4'  Invest in People · Advanced Skills Training
    '01-3': null, // → 'media/films/video/01-3.mp4'  Invest in People · Career Growth Program
    '02-1': null, // → 'media/films/video/02-1.mp4'  Diversify Economy · Supply Chain
    '02-2': null, // → 'media/films/video/02-2.mp4'  Diversify Economy · FutureSmart Expo
    '02-3': null, // → 'media/films/video/02-3.mp4'  Diversify Economy · Strategic Data Hub
    '03-1': null, // → 'media/films/video/03-1.mp4'  Drive Transparency · Govt. Crisis Network
    '03-2': null, // → 'media/films/video/03-2.mp4'  Drive Transparency · Empower Citizen Voice
    '03-3': null, // → 'media/films/video/03-3.mp4'  Drive Transparency · Strategic Data Monitoring
    '04-1': null, // → 'media/films/video/04-1.mp4'  Green Growth · Smart Recycling Hub
    '04-2': null, // → 'media/films/video/04-2.mp4'  Green Growth · Digital Eco Home
    '04-3': null, // → 'media/films/video/04-3.mp4'  Green Growth · Smart Eco Path
    '05-1': null, // → 'media/films/video/05-1.mp4'  Global Engagement · Innovation Exchange
    '05-2': null, // → 'media/films/video/05-2.mp4'  Global Engagement · Welcoming Global Leaders
    '05-3': null, // → 'media/films/video/05-3.mp4'  Global Engagement · Global Supply
  },
};
