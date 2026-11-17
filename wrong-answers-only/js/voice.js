/*
 * Referee voice via SpeechSynthesis. Captions are always shown by the caller;
 * speech is an optional extra. Never queues, rate-limited, always cancellable,
 * and isSpeaking() has a hard upper bound so nothing can wait on it forever.
 */
(function (root) {
  'use strict';

  function createVoice(initialEnabled) {
    const synth = root.speechSynthesis;
    const supported = !!(synth && typeof root.SpeechSynthesisUtterance === 'function');
    let enabled = !!initialEnabled && supported;
    let voice = null;
    let current = null;
    let busyUntil = 0;
    let lastAt = -Infinity;
    const MIN_GAP = 1400;

    function loadVoices() {
      if (!supported) return;
      try {
        const list = synth.getVoices() || [];
        const en = list.filter((v) => /^en([-_]|$)/i.test(v.lang || ''));
        voice = en.find((v) => v.localService && v.default) || en.find((v) => v.localService) || en[0] || null;
      } catch (e) { voice = null; }
    }
    if (supported) {
      loadVoices();
      try {
        if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
        else synth.onvoiceschanged = loadVoices;
      } catch (e) { /* ignore */ }
    }

    function cancel() {
      current = null;
      busyUntil = 0;
      if (!supported) return;
      try { synth.cancel(); } catch (e) { /* ignore */ }
    }

    /** Speak one short line, replacing anything in progress. Returns true if speech started. */
    function say(text, opts) {
      opts = opts || {};
      if (!enabled || !supported) return false;
      const t = root.performance.now();
      if (!opts.force && t - lastAt < MIN_GAP) return false;
      try {
        synth.cancel();
        const u = new root.SpeechSynthesisUtterance(text);
        if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
        u.rate = 1.05; u.pitch = 1; u.volume = 0.9;
        const done = () => { if (current === u) { current = null; busyUntil = 0; } };
        u.onend = done; u.onerror = done;
        current = u;
        lastAt = t;
        busyUntil = t + Math.min(2600, 500 + text.length * 65); // upper bound, not a wait
        synth.speak(u);
        return true;
      } catch (e) { cancel(); return false; }
    }

    function isSpeaking() {
      return !!current && root.performance.now() < busyUntil;
    }

    return {
      say, cancel, isSpeaking,
      setEnabled(v) { enabled = !!v && supported; if (!enabled) cancel(); },
      get enabled() { return enabled; },
      get supported() { return supported; }
    };
  }

  root.WAOVoice = { createVoice };
})(typeof self !== 'undefined' ? self : this);
