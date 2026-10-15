"use client";

import { useSyncExternalStore } from "react";

// Small stores for visitor preferences. Values live on <html data-*> (set
// before paint by the boot script in layout.tsx) and in localStorage.

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: Listener) {
  listeners.add(listener);
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  const onMotion = () => {
    if (readStored("calm") === null) {
      document.documentElement.dataset.calm = String(mq.matches);
      notify();
    }
  };
  mq.addEventListener("change", onMotion);
  scheme.addEventListener("change", notify);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener("change", onMotion);
    scheme.removeEventListener("change", notify);
  };
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode etc.: the choice just won't persist */
  }
}

// ── Calm mode ───────────────────────────────────────────────────────────
const getCalm = () => document.documentElement.dataset.calm === "true";

export function useCalm(): boolean {
  return useSyncExternalStore(subscribe, getCalm, () => false);
}

export function setCalm(on: boolean) {
  document.documentElement.dataset.calm = String(on);
  store("calm", on ? "on" : "off");
  notify();
}

// ── Theme ───────────────────────────────────────────────────────────────
export type Theme = "light" | "dark";

const getTheme = (): Theme => {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function useTheme(): Theme | null {
  return useSyncExternalStore<Theme | null>(subscribe, getTheme, () => null);
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  store("theme", theme);
  notify();
}

// ── Contact panel (opened from the header or the phone in the bag) ──────
export const OPEN_CONTACT = "bag:open-contact";
export function openContact() {
  window.dispatchEvent(new CustomEvent(OPEN_CONTACT));
}
