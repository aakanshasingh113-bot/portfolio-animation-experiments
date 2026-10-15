import { items } from '@/data/items';

export function WorkList() {
  const projects = items.filter((i) => i.kind === 'project' && i.project);
  return (
    <section id="work" aria-labelledby="work-heading" className="mx-auto max-w-[1100px] scroll-mt-6 px-4 py-16 sm:px-8">
      <h2 id="work-heading" className="text-[28px] font-semibold tracking-[-0.02em]">
        The work
      </h2>
      <ul className="mt-6 border-t border-line">
        {projects.map((p) => {
          const href = p.protected ? `/protected?next=${encodeURIComponent(p.href!)}` : p.href;
          return (
            <li key={p.id} className="border-b border-line">
              <a href={href} className="group grid gap-x-6 gap-y-1 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
                <span>
                  <span className="text-[18px] font-semibold group-hover:underline group-hover:decoration-[var(--accent)] group-hover:decoration-2 group-hover:underline-offset-4">
                    {p.project!.name}
                  </span>
                  <span className="text-muted"> · {p.project!.client}</span>
                  <span className="mt-1 block text-[15px] leading-snug">{p.project!.line}</span>
                </span>
                <span className="mt-2 flex items-center gap-2 sm:mt-0">
                  {p.protected && (
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Password</span>
                  )}
                  <span className="inline-block rounded-full border border-[var(--muted)] px-2 py-[3px] font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                    {p.statusLabel ?? p.status}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-10 max-w-[680px] text-[16px] leading-relaxed text-muted">
        I&rsquo;m a UX/UI designer at One Health Assist, designing how patients and doctors make sense of clinical data.
        Before that, I turned a configurator full of compatibility rules into a guided tool for Legrand in Saudi Arabia,
        and a 200-page national plan into a one-minute holographic experience for Oman&rsquo;s ministry. Outside work,
        I&rsquo;m usually at yoga, in a dance class, on a trail, or (lately) burning cookies.
      </p>
    </section>
  );
}
