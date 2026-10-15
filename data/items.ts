// Everything in the bag lives here. Adding or swapping an item, image, link or
// tag only needs an edit to this file.
//
// Positions are percentages of the stage (x, y = item centre; rot in degrees).
// Desktop stage is 16:10, mobile stage is 9:16. Sizes are px at a 1200px-wide
// desktop stage and scale with it.

export type Placement = { x: number; y: number; rot: number };

export type Item = {
  id: string;
  label: string; // accessible name, e.g. "Smartwatch"
  image: string; // transparent PNG; an illustrated SVG is shown until the file exists in /public
  kind: 'project' | 'page' | 'toggle' | 'easter-egg';
  href?: string;
  tagPersonal: string; // handwritten line on the tag
  tagProject?: string; // second line on the tag
  status?: 'Live' | 'In development' | 'Prototype' | 'Concept';
  statusLabel?: string; // longer wording for the status pill, e.g. "Live at COMEX 2025"
  protected?: boolean; // NDA: route through /protected
  size: { w: number; h: number };
  target: { desktop: Placement; mobile: Placement };
  easterEgg?: { text: string; image?: string };
  // Used by "The work" list below the stage (projects only).
  project?: { name: string; client: string; line: string };
};

export const items: Item[] = [
  // Projects (this order is also the keyboard order)
  {
    id: 'watch',
    label: 'Smartwatch',
    image: '/items/watch.png',
    kind: 'project',
    href: '/work/trends',
    tagPersonal: 'Tracks every workout.',
    tagProject: "Trends · One Health Assist — Tells patients in 5 seconds whether they're getting better.",
    status: 'In development',
    protected: true,
    size: { w: 110, h: 150 },
    target: { desktop: { x: 40, y: 36, rot: -8 }, mobile: { x: 28, y: 33, rot: -8 } },
    project: {
      name: 'Trends',
      client: 'One Health Assist',
      line: "Tells patients in 5 seconds whether they're getting better.",
    },
  },
  {
    id: 'paperback',
    label: 'Paperback',
    image: '/items/paperback.png',
    kind: 'project',
    href: '/work/oman-vision-2040',
    tagPersonal: 'Always one book in the bag.',
    tagProject: 'Oman Vision 2040 · MTCIT — 200 pages of policy → a one-minute holographic experience.',
    status: 'Live',
    statusLabel: 'Live at COMEX 2025',
    size: { w: 150, h: 210 },
    target: { desktop: { x: 57, y: 55, rot: 6 }, mobile: { x: 70, y: 36, rot: 6 } },
    project: {
      name: 'Oman Vision 2040',
      client: 'MTCIT',
      line: '200 pages of policy → a one-minute holographic experience.',
    },
  },
  {
    id: 'keyring',
    label: 'Keyring',
    image: '/items/keyring.png',
    kind: 'project',
    href: '/work/legrand',
    tagPersonal: 'Too many charms. They all clip on.',
    tagProject: 'Legrand Arteor configurator — A configurator where every piece fits, or it won’t let you add it.',
    status: 'Concept',
    size: { w: 130, h: 150 },
    target: { desktop: { x: 71, y: 30, rot: -14 }, mobile: { x: 28, y: 52, rot: -14 } },
    project: {
      name: 'Arteor configurator',
      client: 'Legrand',
      line: 'A configurator where every piece fits, or it won’t let you add it.',
    },
  },
  {
    id: 'recipe',
    label: 'Recipe card',
    image: '/items/recipe.png',
    kind: 'project',
    href: '/work/prescriptions',
    tagPersonal: 'Learning to bake. Following recipes, for now.',
    tagProject: 'Prescription templates · One Health Assist — One template, adapted for every specialist.',
    status: 'Prototype',
    protected: true,
    size: { w: 190, h: 130 },
    target: { desktop: { x: 41, y: 73, rot: -4 }, mobile: { x: 68, y: 57, rot: -4 } },
    project: {
      name: 'Prescription templates',
      client: 'One Health Assist',
      line: 'One template, adapted for every specialist.',
    },
  },
  {
    id: 'band',
    label: 'Resistance band',
    image: '/items/band.png',
    kind: 'project',
    href: '/work/rep-counter',
    tagPersonal: 'Workouts on the go.',
    tagProject: 'Rep counter · One Health Assist — [e.g. "Counts your reps so you can focus on form."]',
    status: 'Prototype',
    protected: true,
    size: { w: 170, h: 120 },
    target: { desktop: { x: 80, y: 62, rot: 10 }, mobile: { x: 30, y: 69, rot: 10 } },
    project: {
      name: 'Rep counter',
      client: 'One Health Assist',
      line: '[e.g. "Counts your reps so you can focus on form."]',
    },
  },

  // Pages
  {
    id: 'pass',
    label: 'Train pass',
    image: '/items/pass.png',
    kind: 'page',
    href: '/about',
    tagPersonal: 'Aakansha Singh · UX/UI Designer · Mumbai',
    size: { w: 170, h: 110 },
    target: { desktop: { x: 26, y: 83, rot: 8 }, mobile: { x: 74, y: 72, rot: 8 } },
  },
  {
    id: 'paper',
    label: 'Folded paper',
    image: '/items/paper.png',
    kind: 'page',
    href: '/resume.pdf',
    tagPersonal: 'The one-page version.',
    size: { w: 140, h: 170 },
    target: { desktop: { x: 88, y: 34, rot: -6 }, mobile: { x: 38, y: 85, rot: -6 } },
  },
  {
    id: 'phone',
    label: 'Phone',
    image: '/items/phone.png',
    kind: 'page',
    tagPersonal: 'Say hi.',
    size: { w: 100, h: 190 },
    target: { desktop: { x: 62, y: 84, rot: 4 }, mobile: { x: 63, y: 89, rot: 4 } },
  },

  // Toggle: stays strapped to the bag, so it has no spill target of its own.
  {
    id: 'mat',
    label: 'Yoga mat',
    image: '/items/mat.png',
    kind: 'toggle',
    tagPersonal: 'Breathe. Everything stays still.',
    size: { w: 58, h: 250 },
    target: { desktop: { x: 0, y: 0, rot: 0 }, mobile: { x: 0, y: 0, rot: 0 } },
  },

  // Easter eggs
  {
    id: 'earphones',
    label: 'Earphones',
    image: '/items/earphones.png',
    kind: 'easter-egg',
    tagPersonal: 'Now playing: [song you dance to]',
    easterEgg: { text: 'Now playing: [song you dance to]' },
    size: { w: 120, h: 110 },
    target: { desktop: { x: 26, y: 18, rot: 20 }, mobile: { x: 11, y: 95, rot: 20 } },
  },
  {
    id: 'cookie',
    label: 'Foil-wrapped cookie',
    image: '/items/cookie.png',
    kind: 'easter-egg',
    tagPersonal: 'Baking attempt #1: 6/10. Will iterate.',
    easterEgg: { text: 'Baking attempt #1: 6/10. Will iterate.' },
    size: { w: 100, h: 100 },
    target: { desktop: { x: 91, y: 80, rot: 0 }, mobile: { x: 89, y: 95, rot: 0 } },
  },
  {
    id: 'sunglasses',
    label: 'Sunglasses',
    image: '/items/sunglasses.png',
    kind: 'easter-egg',
    tagPersonal: '[trek name, altitude]',
    easterEgg: { text: '[trek name, altitude]', image: '/items/trek.jpg' },
    size: { w: 170, h: 70 },
    target: { desktop: { x: 54, y: 13, rot: -10 }, mobile: { x: 85, y: 9, rot: -10 } },
  },
  {
    id: 'goggles',
    label: 'Swim goggles',
    image: '/items/goggles.png',
    kind: 'easter-egg',
    tagPersonal: 'Early lap, then work.',
    easterEgg: { text: 'Early lap, then work.' },
    size: { w: 160, h: 70 },
    target: { desktop: { x: 90, y: 12, rot: 12 }, mobile: { x: 17, y: 7, rot: 12 } },
  },
];

// The tote bag itself. Rotation 0 = upright, opening at the top.
// rot 90 lies on its side with the opening facing right; 180 faces down.
export const bag = {
  label: 'Tote bag',
  image: '/items/bag.png',
  size: { w: 260, h: 300 },
  mobileScale: 0.62, // the bag is drawn smaller on phones so the spill has room
  idle: {
    desktop: { x: 50, y: 52, rot: 0 },
    mobile: { x: 50, y: 44, rot: 0 },
  },
  target: {
    desktop: { x: 14, y: 55, rot: 90 },
    mobile: { x: 47, y: 14, rot: 180 },
  },
  // Where the yoga mat sits, relative to the bag centre (upright, desktop px).
  matOffset: { x: -146, y: 24 },
};

// Contact details used by the phone panel, the header and the footer.
export const contact = {
  email: '[email]',
  linkedin: '[LinkedIn URL]',
  behance: '[Behance URL]',
  location: 'Mumbai · [open to remote / relocation]',
};
