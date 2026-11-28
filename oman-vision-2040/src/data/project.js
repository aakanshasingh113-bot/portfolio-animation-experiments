/**
 * Central content + asset configuration for the Oman Vision 2040 case study.
 *
 * Everything that may need replacing later lives here:
 *  - pillar / parameter / story names (verified against the supplied interface screens)
 *  - film poster + video paths
 *  - optional media slots (installation photos, podcast audio, sequential frames…)
 *
 * Paths are relative to /public. Set a value to `null` to show a labelled placeholder.
 */

const media = (p) => `${import.meta.env.BASE_URL}media/${p}`;

/* ------------------------------------------------------------------ */
/* Information architecture                                            */
/* Vision 2040 → Five pillars → Parameters → Individual stories (films) */
/* ------------------------------------------------------------------ */

export const pillars = [
  {
    id: 'invest-in-people',
    number: '01',
    name: 'Invest in People',
    theme: 'People & Society',
    screen: media('screens/invest-in-people.webp'),
    screenParameter: 0, // parameter shown in the supplied screen
    parameters: [
      { name: 'Inclusive Culture', story: 'Women & Leadership', film: '01-1', screenLine: 'Leading with vision' },
      { name: 'Innovation Training', story: 'Advanced Skills Training', film: '01-2' },
      { name: 'Talent Growth', story: 'Career Growth Program', film: '01-3' },
    ],
  },
  {
    id: 'diversify-economy',
    number: '02',
    name: 'Diversify Economy',
    theme: 'Economy & Development',
    screen: media('screens/diversify-economy.webp'),
    screenParameter: 0,
    parameters: [
      { name: 'Freight Solutions', story: 'Supply Chain', film: '02-1', screenLine: 'Optimized Delivery Process' },
      { name: 'Innovation Hub', story: 'FutureSmart Expo', film: '02-2' },
      { name: 'Finance Monitor', story: 'Strategic Data Hub', film: '02-3' },
    ],
  },
  {
    id: 'drive-transparency',
    number: '03',
    name: 'Drive Transparency',
    theme: 'Governance & Institutional Performance',
    screen: media('screens/drive-transparency.webp'),
    screenParameter: 1,
    parameters: [
      { name: 'Safety Operations', story: 'Govt. Crisis Network', film: '03-1' },
      { name: 'Civic Participation', story: 'Empower Citizen Voice', film: '03-2', screenLine: 'Transparent Feedback System' },
      { name: 'Data Governance', story: 'Strategic Data Monitoring', film: '03-3' },
    ],
  },
  {
    id: 'green-growth',
    number: '04',
    name: 'Green Growth',
    theme: 'Environment & Sustainability',
    screen: media('screens/green-growth.webp'),
    screenParameter: 0,
    parameters: [
      { name: 'Waste Innovation', story: 'Smart Recycling Hub', film: '04-1', screenLine: 'Reuse materials effectively' },
      { name: 'Future Living', story: 'Digital Eco Home', film: '04-2' },
      { name: 'Sustainable Mobility', story: 'Smart Eco Path', film: '04-3' },
    ],
  },
  {
    id: 'global-engagement',
    number: '05',
    name: 'Global Engagement',
    theme: 'Global & Regional Positioning',
    screen: media('screens/global-engagement.webp'),
    screenParameter: 0,
    parameters: [
      { name: 'Global Summit', story: 'Innovation Exchange', film: '05-1', screenLine: 'Promoting Global Collaboration' },
      { name: 'Omani Hospitality', story: 'Welcoming Global Leaders', film: '05-2' },
      { name: 'Trade Ecosystem', story: 'Global Supply', film: '05-3' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Films                                                               */
/* Posters are stills from the original films (supplied as frames).    */
/* Drop the MP4s into public/media/films/video/ and set `video` below.  */
/* ------------------------------------------------------------------ */

export const films = Object.fromEntries(
  pillars.flatMap((p) =>
    p.parameters.map((param) => [
      param.film,
      {
        id: param.film,
        title: param.story,
        parameter: param.name,
        pillar: p.name,
        poster: media(`films/posters/${param.film}.webp`),
        video: null, // e.g. media('films/video/01-1.mp4')
      },
    ]),
  ),
);

/* ------------------------------------------------------------------ */
/* Optional media slots — null renders a clearly labelled placeholder  */
/* ------------------------------------------------------------------ */

export const slots = {
  // 01 — Event context
  comex: null, // { src, alt, caption } — COMEX Oman 2025 event photograph or identity
  vision2040: { src: media('films/posters/05-3.webp'), alt: 'Film still: workers reviewing cargo at an Omani port at dusk', caption: 'Still from the “Global Supply” film · Global Engagement' },
  mtcit: { src: media('films/posters/03-3.webp'), alt: 'Film still: a woman monitoring data dashboards in a control room', caption: 'Still from the “Strategic Data Monitoring” film · Drive Transparency' },

  // 05 — Iteration 02 podcast (NotebookLM)
  podcastAudio: null, // { src: media('audio/cybersecurity-success-stories.mp3'), title: 'Cybersecurity & Data Protection Success Stories' }

  // 07 — Sequential frames for the 7–8 second filmstrip (run `npm run frames`)
  filmstrip: {
    film: '01-2',
    frames: [], // e.g. [media('films/strip/01-2_0.webp'), …] — 8 frames, one per second
  },

  // 08 — Production material
  imageVariations: [], // generated image explorations [{ src, alt }]
  editingTimeline: null, // { src, alt } — screenshot of the Adobe Express edit

  // 09 — Outcome
  installation: null, // { src, alt, caption } — photograph of the installation at COMEX 2025
};

/* ------------------------------------------------------------------ */
/* Tools (Adobe Express is provisional — edit here)                    */
/* ------------------------------------------------------------------ */

export const toolGroups = [
  { group: 'Design & research', tools: [
    { name: 'Figma', use: 'UX/UI design and prototyping' },
    { name: 'ChatGPT', use: 'Research, conceptualisation and prompt development' },
  ] },
  { group: 'Visual & motion generation', tools: [
    { name: 'Sora', use: 'AI-generated visual content' },
    { name: 'OpenArt', use: 'Image generation and refinement' },
    { name: 'PixVerse', use: 'Video generation and animation' },
  ] },
  { group: 'Audio & creative resources', tools: [
    { name: 'NotebookLM', use: 'AI-generated podcasts' },
    { name: 'Envato', use: 'Creative assets and media resources' },
  ] },
  { group: 'Post-production', tools: [
    { name: 'Adobe Express', use: 'Video editing, clip sequencing and sound integration' },
  ] },
];
