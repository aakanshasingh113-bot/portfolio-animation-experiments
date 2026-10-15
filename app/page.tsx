import fs from 'node:fs';
import path from 'node:path';
import { Stage } from '@/components/Stage';
import { WorkList } from '@/components/WorkList';
import { Footer } from '@/components/Footer';
import { bag, items } from '@/data/items';

// Real photos win over the placeholder illustrations as soon as the file exists in /public.
function findPhotos() {
  const has = (src: string) => fs.existsSync(path.join(process.cwd(), 'public', src));
  const photos: Record<string, boolean> = { bag: has(bag.image) };
  for (const it of items) {
    photos[it.id] = has(it.image);
    if (it.easterEgg?.image) photos[`${it.id}:egg`] = has(it.easterEgg.image);
  }
  return photos;
}

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-10 pt-4 sm:px-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-center lg:gap-10 lg:pt-6">
        <div className="max-w-[560px]">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
            Aakansha Singh · UX/UI Designer · Mumbai
          </p>
          <h1 className="mt-4 text-[clamp(2.1rem,4.4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
            I make complicated things feel simple.
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed">Here&rsquo;s what I carry. Tip the bag to see my work.</p>
          <a href="#work" className="mt-5 inline-block py-1 text-[15px] font-medium underline decoration-[var(--accent)] decoration-2 underline-offset-[6px]">
            Just show me the work ↓
          </a>
        </div>
        <div className="mx-auto w-full lg:max-w-[min(100%,calc((100dvh-150px)*1.6))]">
          <Stage photos={findPhotos()} />
        </div>
      </section>
      <WorkList />
      <Footer />
    </>
  );
}
