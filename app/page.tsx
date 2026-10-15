import { BagStage } from "@/components/BagStage";
import { ContactPanel } from "@/components/ContactPanel";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WorkList } from "@/components/WorkList";
import { site } from "@/data/site";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section aria-labelledby="hero-title" className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="grid gap-x-10 pt-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted">
                {site.name} · {site.role} · {site.city}
              </p>
              <h1 id="hero-title" className="mt-3 text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-5xl">
                I make complicated things feel simple.
              </h1>
            </div>
            <div className="lg:pb-1.5">
              <p className="mt-4 text-lg text-muted lg:mt-0">Here&rsquo;s what I carry. Tip the bag to see my work.</p>
              <a
                href="#work"
                className="mt-2 inline-block font-medium underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-ink"
              >
                Just show me the work ↓
              </a>
            </div>
          </div>
          {/* On wide screens, size the stage so the whole floor fits in the window. */}
          <div className="mx-auto mt-4 w-full sm:max-w-[max(640px,calc((100svh-230px)*1.6))]">
            <BagStage />
          </div>
        </section>
        <WorkList />
      </main>
      <Footer />
      <ContactPanel />
    </>
  );
}
