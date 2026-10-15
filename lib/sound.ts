'use client';

import { soundOn } from './prefs';

// Placeholder sounds, synthesised with Web Audio so there is nothing to download.
// Swap for real recordings later by playing an <audio> file here instead.

let ctx: AudioContext | null = null;

function audio() {
  if (!soundOn()) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Soft canvas rustle, for the bag tipping over. */
export function playRustle() {
  const c = audio();
  if (!c) return;
  const len = 0.45;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(t * 40));
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;
  const gain = c.createGain();
  gain.gain.value = 0.12;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}

/** Light tap, for an item landing. */
export function playTap(delay = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320 + Math.random() * 120, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}
