'use client';

import Link from 'next/link';
import { setSound, setTheme, usePrefs } from '@/lib/prefs';

const nav = [
  { label: 'Work', href: '/#work' },
  { label: 'About', href: '/about' },
  { label: 'Résumé', href: '/resume.pdf' },
  { label: 'Contact', href: '/#contact' },
];

export function Header() {
  const { theme, sound } = usePrefs();
  const dark = theme === 'dark';

  return (
    <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 px-4 py-3 sm:flex-nowrap sm:px-8 sm:py-4">
      <Link href="/" className="text-[15px] font-semibold tracking-tight">
        Aakansha Singh
      </Link>
      <div className="contents sm:flex sm:items-center sm:gap-3">
        <nav aria-label="Main" className="order-last w-full sm:order-none sm:w-auto">
          <ul className="flex items-center gap-5 text-[14px]">
            {nav.map((n) => (
              <li key={n.label}>
                <a href={n.href} className="inline-block py-2 underline-offset-4 hover:underline">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="grid size-10 place-items-center rounded-full hover:bg-line"
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            onClick={() => setSound(!sound)}
            className="grid size-10 place-items-center rounded-full hover:bg-line"
            aria-label="Sound"
            aria-pressed={sound}
          >
            <SoundIcon on={sound} />
          </button>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
    </svg>
  );
}
