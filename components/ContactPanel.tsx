"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { site } from "@/data/site";
import { OPEN_CONTACT, useCalm } from "@/lib/prefs";

/** "Say hi." Opened by the phone in the bag or Contact in the header. */
export function ContactPanel() {
  const [open, setOpen] = useState(false);
  const calm = useCalm();
  const returnTo = useRef<HTMLElement | null>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onOpen = () => {
      returnTo.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    window.addEventListener(OPEN_CONTACT, onOpen);
    return () => window.removeEventListener(OPEN_CONTACT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    returnTo.current?.focus({ preventScroll: true });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="contact-title"
          className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm rounded-xl bg-tag p-5 text-text shadow-[0_18px_48px_rgb(var(--shadow))] sm:inset-x-auto sm:right-6 sm:bottom-6"
          initial={calm ? { opacity: 0 } : { opacity: 0, y: 24, rotate: -2 }}
          animate={calm ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={calm ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 24 }}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="contact-title" className="font-hand text-3xl leading-none">
              Say hi.
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close contact details"
              className="-mr-2 -mt-2 grid h-9 w-9 place-items-center rounded-full hover:bg-text/5"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <ul className="mt-4 space-y-1 text-[0.95rem]">
            <li>
              <a ref={firstLink} href={site.emailHref} className="flex justify-between rounded-md py-1.5 hover:text-accent-ink">
                <span>Email</span>
                <span className="font-mono text-sm text-muted">{site.email}</span>
              </a>
            </li>
            <li>
              <a href={site.linkedin} target="_blank" rel="noreferrer" className="flex justify-between rounded-md py-1.5 hover:text-accent-ink">
                <span>LinkedIn</span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
            <li>
              <a href={site.behance} target="_blank" rel="noreferrer" className="flex justify-between rounded-md py-1.5 hover:text-accent-ink">
                <span>Behance</span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
