'use client';

import { useSyncExternalStore } from 'react';

// Small shared store for visitor preferences: calm mode, theme and sound.
// Everything that touches storage is wrapped in try/catch.

type Theme = 'light' | 'dark';
type State = { calmChoice: boolean | null; reducedMotion: boolean; theme: Theme; sound: boolean };

const listeners = new Set<() => void>();
let state: State = { calmChoice: null, reducedMotion: false, theme: 'light', sound: false };
let started = false;

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const calm = read('calm');
  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  state = {
    calmChoice: calm === '1' ? true : calm === '0' ? false : null,
    reducedMotion: mq.matches,
    theme,
    sound: read('sound') === '1',
  };
  mq.addEventListener('change', (e) => set({ reducedMotion: e.matches }));
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverState: State = { calmChoice: null, reducedMotion: false, theme: 'light', sound: false };

export function usePrefs() {
  const s = useSyncExternalStore(
    subscribe,
    () => (start(), state),
    () => serverState,
  );
  return {
    calm: s.calmChoice ?? s.reducedMotion,
    theme: s.theme,
    sound: s.sound,
  };
}

export function setCalm(on: boolean) {
  write('calm', on ? '1' : '0');
  document.documentElement.toggleAttribute('data-calm', on);
  set({ calmChoice: on });
}

export function setTheme(theme: Theme) {
  write('theme', theme);
  document.documentElement.dataset.theme = theme;
  set({ theme });
}

export function setSound(on: boolean) {
  write('sound', on ? '1' : '0');
  set({ sound: on });
}

export function soundOn() {
  return state.sound;
}
