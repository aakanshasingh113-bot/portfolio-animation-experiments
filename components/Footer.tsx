import { site } from "@/data/site";

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 border-t border-line px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        <li>
          <a href={site.emailHref} className="hover:text-accent-ink">
            {site.email}
          </a>
        </li>
        <li>
          <a href={site.linkedin} className="hover:text-accent-ink">
            LinkedIn
          </a>
        </li>
        <li>
          <a href={site.behance} className="hover:text-accent-ink">
            Behance
          </a>
        </li>
      </ul>
      <p className="text-muted">
        {site.city} · {site.availability}
      </p>
    </footer>
  );
}
