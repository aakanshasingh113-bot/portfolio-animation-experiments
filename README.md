# What's in my bag: Aakansha Singh's portfolio

The homepage is a tote bag. Tip it over and everything spills into a flat-lay;
each thing opens a project or a page. All copy comes from
[`docs/content.md`](docs/content.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build + type check
```

## Where things live

| What | Where |
|---|---|
| Every item in the bag: copy, links, status, size, resting place | `data/items.ts` |
| Email / LinkedIn / Behance / availability | `data/site.ts` |
| Placeholder item drawings | `components/art/ItemArt.tsx` |
| The bag stage (tip, drag, tags, pack it back, calm mode) | `components/BagStage.tsx` |
| Spill physics (matter-js, loaded only when the bag tips) | `lib/spill.ts` |
| Colour tokens (light + dark) | `app/globals.css` |

**Swapping in real photos:** drop transparent PNGs into `public/items/` using the
`image` paths in `data/items.ts`, then set `USE_PHOTOS = true` in the same file.

**Retuning the layout:** each item's `target` is its resting place as a
percentage of the stage (`x`, `y`) plus a rotation in degrees, with separate
desktop (16:10) and mobile (9:16) values.

## Status

- **Phase 1 (done):** homepage: idle → tip → settle → tags → click → pack it back,
  drag, calm mode, the plain work list, light/dark, desktop and mobile.
- **Phase 2:** case study template + 5 MDX pages, About, 404.
  `/work/*`, `/about` and `/protected` are stubs for now.
- **Phase 3:** password gate + middleware, sound, polish, performance pass.
