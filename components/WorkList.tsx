import Link from "next/link";
import { destination, projectItems, statusText } from "@/data/items";

/** The plain list of projects, always under the bag. */
export function WorkList() {
  return (
    <section id="work" aria-labelledby="work-title" className="mx-auto w-full max-w-[1200px] scroll-mt-6 px-4 pb-16 pt-12 sm:px-6">
      <h2 id="work-title" className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
        The work
      </h2>
      <ul className="mt-4 border-t border-line">
        {projectItems.map((item) => (
          <li key={item.id} className="border-b border-line">
            <Link
              href={destination(item)!}
              className="group grid gap-x-6 gap-y-1 py-5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-baseline"
            >
              <span className="text-lg font-medium tracking-tight group-hover:text-accent-ink">
                {item.project!.name}
                <span className="block text-sm font-normal text-muted">{item.project!.client}</span>
              </span>
              <span className="text-[0.95rem] leading-snug">{item.project!.line}</span>
              <span className="mt-1 flex items-center gap-2 sm:mt-0">
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.66rem] uppercase tracking-[0.08em]">
                  {statusText(item)}
                </span>
                {item.protected && (
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-muted">NDA · password</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
