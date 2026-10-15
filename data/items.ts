// Everything in the bag lives here. Add, swap or retune an item by editing
// this file only. Copy comes from docs/content.md. Keep [brackets] visible
// until the real answer is known.

export type Status = "Live" | "In development" | "Prototype" | "Concept";

export type Placement = { x: number; y: number; rot: number }; // % of stage, degrees

export type Item = {
  id: string;
  label: string; // accessible name, e.g. "Smartwatch"
  // Cut-out photo with a transparent background (WebP or PNG in /public/items).
  // Leave it out and the drawn placeholder is used instead.
  image?: string;
  kind: "project" | "page" | "toggle" | "easter-egg";
  href?: string;
  tagPersonal: string; // handwritten line
  tagProject?: string; // "Trends · One Health Assist — Tells patients…"
  status?: Status;
  statusNote?: string; // extra detail on the pill, e.g. "COMEX 2025"
  protected?: boolean; // NDA: routed through /protected
  size: { w: number; h: number }; // px at the 1200px-wide desktop stage
  target: { desktop: Placement; mobile: Placement };
  easterEgg?: { text: string; image?: string; caption?: string };
  // Project details for the plain list under the stage.
  project?: { name: string; client: string; line: string };
  // Words that finish the accessible name, e.g. "About page".
  a11y?: string;
  // Doesn't spill out (the yoga mat): it sits at `idle` beside the upright bag
  // and moves to `target` when the bag tips.
  staysPut?: boolean;
  idle?: { desktop: Placement; mobile: Placement };
};

/** The tote bag itself. Upright size; it lies on its side once tipped. */
export const bag = {
  label: "Tote bag",
  image: "/items/bag.webp" as string | undefined,
  size: { w: 300, h: 271 },
  // Where the opening is: fraction of the bag's height above its centre.
  mouth: 0.18,
  idle: {
    desktop: { x: 50, y: 52, rot: 0 },
    mobile: { x: 50, y: 42, rot: 0 },
  },
  // desktop: lying on its side, opening facing right (CSS rotation is clockwise).
  // mobile: upside down at the top, opening facing down the screen.
  target: {
    desktop: { x: 14, y: 55, rot: 90 },
    mobile: { x: 50, y: 14, rot: 180 },
  },
};

const project = (name: string, client: string, line: string) => ({
  project: { name, client, line },
  tagProject: `${name} · ${client} — ${line}`,
});

export const items: Item[] = [
  // ── Projects (also the keyboard order) ───────────────────────────────
  {
    id: "smartwatch",
    label: "Smartwatch",
    kind: "project",
    href: "/work/trends",
    protected: true,
    tagPersonal: "Tracks every workout.",
    ...project("Trends", "One Health Assist", "Tells patients in 5 seconds whether they're getting better."),
    status: "In development",
    size: { w: 110, h: 150 },
    target: {
      desktop: { x: 40, y: 36, rot: -8 },
      mobile: { x: 30, y: 30, rot: -8 },
    },
  },
  {
    id: "paperback",
    label: "Paperback",
    image: "/items/book.webp",
    kind: "project",
    href: "/work/oman-vision-2040",
    tagPersonal: "Always one book in the bag.",
    ...project("Oman Vision 2040", "MTCIT", "200 pages of policy → a one-minute holographic experience."),
    status: "Live",
    statusNote: "COMEX 2025",
    size: { w: 136, h: 224 },
    target: {
      desktop: { x: 56, y: 56, rot: 6 },
      mobile: { x: 70, y: 32, rot: 6 },
    },
  },
  {
    id: "keyring",
    label: "Keyring with clip-on charms",
    kind: "project",
    href: "/work/legrand",
    tagPersonal: "Too many charms. They all clip on.",
    ...project("Legrand Arteor configurator", "Legrand", "A configurator where every piece fits, or it won't let you add it."),
    status: "Concept",
    size: { w: 130, h: 150 },
    target: {
      desktop: { x: 70, y: 30, rot: -14 },
      mobile: { x: 32, y: 48, rot: -14 },
    },
  },
  {
    id: "recipe-card",
    label: "Handwritten recipe card",
    kind: "project",
    href: "/work/prescriptions",
    protected: true,
    tagPersonal: "Learning to bake. Following recipes, for now.",
    ...project("Prescription templates", "One Health Assist", "One template, adapted for every specialist."),
    status: "Prototype",
    size: { w: 190, h: 130 },
    target: {
      desktop: { x: 42, y: 72, rot: -4 },
      mobile: { x: 68, y: 52, rot: -4 },
    },
  },
  {
    id: "resistance-band",
    label: "Resistance band",
    kind: "project",
    href: "/work/rep-counter",
    protected: true,
    tagPersonal: "Workouts on the go.",
    ...project("Rep counter", "One Health Assist", "[e.g. \"Counts your reps so you can focus on form.\"]"),
    status: "Prototype",
    size: { w: 170, h: 120 },
    target: {
      desktop: { x: 80, y: 62, rot: 10 },
      mobile: { x: 34, y: 66, rot: 10 },
    },
  },

  // ── Pages ────────────────────────────────────────────────────────────
  {
    id: "train-pass",
    label: "Train pass",
    kind: "page",
    href: "/about",
    a11y: "About page",
    tagPersonal: "Aakansha Singh · UX/UI Designer · Mumbai",
    size: { w: 160, h: 105 },
    target: {
      desktop: { x: 28, y: 82, rot: 8 },
      mobile: { x: 70, y: 70, rot: 8 },
    },
  },
  {
    id: "folded-paper",
    label: "Folded sheet of paper",
    kind: "page",
    href: "/resume.pdf",
    a11y: "Résumé (PDF)",
    tagPersonal: "The one-page version.",
    size: { w: 130, h: 160 },
    target: {
      desktop: { x: 88, y: 36, rot: -6 },
      mobile: { x: 30, y: 82, rot: -6 },
    },
  },
  {
    id: "phone",
    label: "Phone",
    kind: "page",
    a11y: "open contact details",
    tagPersonal: "Say hi.",
    size: { w: 95, h: 180 },
    target: {
      desktop: { x: 62, y: 82, rot: 4 },
      mobile: { x: 70, y: 86, rot: 4 },
    },
  },

  // ── Toggle ───────────────────────────────────────────────────────────
  {
    id: "yoga-mat",
    label: "Yoga mat",
    image: "/items/yoga-mat.webp",
    kind: "toggle",
    a11y: "calm mode, turns off all motion",
    tagPersonal: "Breathe. Everything stays still.",
    staysPut: true,
    size: { w: 150, h: 130 },
    // Leaning on the upright bag…
    idle: {
      desktop: { x: 68, y: 64, rot: 0 },
      mobile: { x: 78, y: 52, rot: 0 },
    },
    // …and lying just beside it once it tips.
    target: {
      desktop: { x: 9, y: 20, rot: -8 },
      mobile: { x: 50, y: 93, rot: 0 },
    },
  },

  // ── Easter eggs ──────────────────────────────────────────────────────
  {
    id: "earphones",
    label: "Earphones",
    kind: "easter-egg",
    tagPersonal: "Now playing: [song you dance to]",
    easterEgg: { text: "Now playing: [song you dance to]" },
    size: { w: 120, h: 120 },
    target: {
      desktop: { x: 24, y: 22, rot: 20 },
      mobile: { x: 14, y: 94, rot: 20 },
    },
  },
  {
    id: "cookie",
    label: "Cookie wrapped in foil",
    kind: "easter-egg",
    tagPersonal: "Baking attempt #1: 6/10. Will iterate.",
    easterEgg: { text: "Baking attempt #1: 6/10. Will iterate." },
    size: { w: 90, h: 90 },
    target: {
      desktop: { x: 92, y: 80, rot: 0 },
      mobile: { x: 88, y: 94, rot: 0 },
    },
  },
  {
    id: "sunglasses",
    label: "Sunglasses",
    kind: "easter-egg",
    tagPersonal: "[trek name, altitude]",
    easterEgg: {
      text: "[trek name, altitude]",
      image: "/items/trek.jpg",
      caption: "[trek name, altitude]",
    },
    size: { w: 170, h: 75 },
    target: {
      desktop: { x: 54, y: 14, rot: -10 },
      mobile: { x: 84, y: 18, rot: -10 },
    },
  },
  {
    id: "swim-goggles",
    label: "Swim goggles",
    image: "/items/goggles.webp",
    kind: "easter-egg",
    tagPersonal: "Early lap, then work.",
    easterEgg: { text: "Early lap, then work." },
    size: { w: 150, h: 81 },
    target: {
      desktop: { x: 91, y: 14, rot: 12 },
      mobile: { x: 14, y: 20, rot: 12 },
    },
  },
];

/** Items that spill out of the bag (everything except the yoga mat). */
export const spillItems = items.filter((i) => !i.staysPut);
export const projectItems = items.filter((i) => i.kind === "project");

/** Where a click on the item should go (protected work goes through the gate). */
export function destination(item: Item): string | undefined {
  if (!item.href) return undefined;
  return item.protected ? `/protected?next=${encodeURIComponent(item.href)}` : item.href;
}

export function statusText(item: Item): string | undefined {
  if (!item.status) return undefined;
  return item.statusNote ? `${item.status} · ${item.statusNote}` : item.status;
}

/** e.g. "Smartwatch: Trends case study, in development" */
export function accessibleName(item: Item): string {
  if (item.kind === "project" && item.project) {
    const status = statusText(item)?.toLowerCase();
    return `${item.label}: ${item.project.name} case study${status ? `, ${status}` : ""}`;
  }
  if (item.kind === "easter-egg") return `${item.label}: ${item.easterEgg?.text ?? item.tagPersonal}`;
  return item.a11y ? `${item.label}: ${item.a11y}` : item.label;
}
