"use client";

import Link from "next/link";
import { site } from "@/data/site";
import { openContact, setTheme, useTheme } from "@/lib/prefs";

export function Header() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Link href="/" className="font-medium tracking-tight">
        {site.name}
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-2">
        <ul className="flex items-center gap-0.5 sm:gap-2">
          <li>
            <a href="#work" className="rounded-md px-2 py-1.5 hover:text-accent-ink">
              Work
            </a>
          </li>
          <li className="hidden sm:block">
            <Link href="/about" className="rounded-md px-2 py-1.5 hover:text-accent-ink">
              About
            </Link>
          </li>
          <li className="hidden sm:block">
            <a href={site.resume} className="rounded-md px-2 py-1.5 hover:text-accent-ink">
              Résumé
            </a>
          </li>
          <li>
            <button type="button" onClick={openContact} className="rounded-md px-2 py-1.5 hover:text-accent-ink">
              Contact
            </button>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setTheme(next)}
          aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-text/5"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </nav>
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}
