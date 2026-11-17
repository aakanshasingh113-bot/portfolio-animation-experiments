/* Café-manager voice using SpeechSynthesis. Captions always appear, voice or not. */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});

  class VoiceEngine {
    constructor(opts) {
      this.onCaption = opts.onCaption || function () {};
      this.onStatus = opts.onStatus || function () {};
      this.synth = global.speechSynthesis || null;
      this.supported = !!(this.synth && global.SpeechSynthesisUtterance);
      this.enabled = true;
      this.voice = null;
      this.lastSpokeAt = -1e9;
      this.current = null;
      this.status = this.supported ? 'untested' : 'unsupported';
      if (this.supported) {
        this._load = this._load.bind(this);
        this._load();
        try {
          if (this.synth.addEventListener) this.synth.addEventListener('voiceschanged', this._load);
          else this.synth.onvoiceschanged = this._load;
        } catch (e) { /* ignore */ }
      }
    }

    _load() {
      let voices = [];
      try { voices = this.synth.getVoices() || []; } catch (e) { voices = []; }
      const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang || ''));
      // Prefer a local English voice; prefer GB/US/AU/IE/NZ; never depend on a name.
      const score = (v) => (v.localService ? 2 : 0) + (/en[-_](GB|US|AU|IE|NZ)/i.test(v.lang) ? 1 : 0) + (v.default ? 0.5 : 0);
      en.sort((a, b) => score(b) - score(a));
      this.voice = en[0] || null;
    }

    _setStatus(s) { if (this.status !== s) { this.status = s; this.onStatus(s); } }

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) this.cancel();
    }

    cancel() {
      this.current = null;
      if (!this.supported) return;
      try { this.synth.cancel(); } catch (e) { /* ignore */ }
    }

    /**
     * Say a short line. priority 2 = important (state changes), 1 = flavour.
     * There is never a queue: a line is either spoken now or skipped.
     */
    say(text, opts) {
      opts = opts || {};
      const priority = opts.priority || 1;
      this.onCaption(text);
      if (!this.enabled || !this.supported) return false;
      const now = (global.performance && performance.now()) || Date.now();
      const busy = this.current && (now - this.current.at) < this.current.expected;
      if (busy && priority <= this.current.priority && !opts.force) return false;
      if (!opts.force && priority < 2 && now - this.lastSpokeAt < 3500) return false;
      try {
        this.synth.cancel();
        const u = new global.SpeechSynthesisUtterance(text);
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-GB';
        u.rate = 1.0; u.pitch = 1.05; u.volume = 0.85;
        const token = { at: now, priority, expected: 600 + text.length * 70 };
        this.current = token;
        u.onstart = () => { this._setStatus('working'); };
        u.onend = () => { if (this.current === token) this.current = null; };
        u.onerror = (e) => {
          if (this.current === token) this.current = null;
          const code = e && e.error;
          if (code === 'interrupted' || code === 'canceled') return;
          this._setStatus(code === 'not-allowed' ? 'blocked' : 'failed');
        };
        this.synth.speak(u);
        if (this.synth.paused) this.synth.resume();
        this.lastSpokeAt = now;
        return true;
      } catch (e) {
        this._setStatus('failed');
        return false;
      }
    }
  }

  NS.VoiceEngine = VoiceEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
