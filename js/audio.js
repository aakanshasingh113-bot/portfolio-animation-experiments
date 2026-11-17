/* Procedural Web Audio sound design. Never throws into gameplay. */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.master = null;
      this.noise = null;
      this.amb = null;
      this.active = 0;
      this.maxVoices = 14;
      this.last = Object.create(null);
      this.supported = !!(global.AudioContext || global.webkitAudioContext);
    }

    /** Must be called directly inside a user gesture (Start, toggles). */
    unlock() {
      if (!this.supported || !this.enabled) return false;
      try {
        if (!this.ctx) {
          const AC = global.AudioContext || global.webkitAudioContext;
          this.ctx = new AC({ latencyHint: 'interactive' });
          const comp = this.ctx.createDynamicsCompressor();
          comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3;
          comp.attack.value = 0.004; comp.release.value = 0.2;
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.75;
          this.master.connect(comp); comp.connect(this.ctx.destination);
          const len = Math.floor(this.ctx.sampleRate * 2);
          this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = this.noise.getChannelData(0);
          let b = 0;
          for (let i = 0; i < len; i++) { // gently pinked noise
            const w = Math.random() * 2 - 1;
            b = 0.97 * b + 0.03 * w;
            d[i] = w * 0.5 + b * 3;
          }
        }
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return true;
      } catch (e) { this.supported = false; return false; }
    }

    get ready() { return !!(this.ctx && this.enabled && this.ctx.state === 'running'); }

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) { this.stopAmbience(true); }
      else this.unlock();
    }

    suspend() { this.stopAmbience(true); try { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); } catch (e) {} }
    wake() { try { if (this.ctx && this.enabled && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); } catch (e) {} }

    _gate(name, minGap) {
      if (!this.ready) return false;
      const now = this.ctx.currentTime;
      if (this.last[name] != null && now - this.last[name] < minGap) return false;
      if (this.active >= this.maxVoices) return false;
      this.last[name] = now;
      return true;
    }

    _track(node, endTime) {
      this.active++;
      let done = false;
      const fin = () => { if (!done) { done = true; this.active = Math.max(0, this.active - 1); } };
      node.onended = fin;
      setTimeout(fin, Math.max(0, (endTime - this.ctx.currentTime) * 1000) + 200);
    }

    _tone(f, t0, dur, o) {
      o = o || {};
      const c = this.ctx;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(f, t0);
      if (o.fEnd) osc.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + dur);
      const peak = o.gain == null ? 0.1 : o.gain;
      const atk = o.attack == null ? 0.004 : o.attack;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      if (o.filter) { const fl = c.createBiquadFilter(); fl.type = o.filter.type; fl.frequency.value = o.filter.f; fl.Q.value = o.filter.q || 0.7; g.connect(fl); fl.connect(o.dest || this.master); }
      else g.connect(o.dest || this.master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
      this._track(osc, t0 + dur);
    }

    _noise(t0, dur, o) {
      o = o || {};
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.playbackRate.value = o.rate || 1;
      const fl = c.createBiquadFilter();
      fl.type = o.type || 'bandpass';
      fl.frequency.setValueAtTime(o.f || 1200, t0);
      if (o.fEnd) fl.frequency.exponentialRampToValueAtTime(o.fEnd, t0 + dur);
      fl.Q.value = o.q || 1;
      const g = c.createGain();
      const peak = o.gain == null ? 0.08 : o.gain;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(fl); fl.connect(g); g.connect(o.dest || this.master);
      const off = Math.random() * 1.5;
      src.start(t0, off); src.stop(t0 + dur + 0.02);
      this._track(src, t0 + dur);
    }

    // ---------- ambience ----------
    startAmbience() {
      if (!this.ready || this.amb) return;
      try {
        const c = this.ctx, t = c.currentTime;
        const src = c.createBufferSource();
        src.buffer = this.noise; src.loop = true;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 340; bp.Q.value = 0.8;
        const murmur = c.createGain(); murmur.gain.value = 0.5;
        const lfo = c.createOscillator(); lfo.frequency.value = 0.31;
        const lfoGain = c.createGain(); lfoGain.gain.value = 0.25;
        lfo.connect(lfoGain); lfoGain.connect(murmur.gain);
        const out = c.createGain();
        out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime(0.045, t + 1.4);
        src.connect(lp); lp.connect(out);
        src.connect(bp); bp.connect(murmur); murmur.connect(out);
        out.connect(this.master);
        src.start(); lfo.start();
        this.amb = { src, lfo, out };
        this._scheduleClinks();
      } catch (e) { this.amb = null; }
    }

    _scheduleClinks() {
      // Rare, distant crockery: keeps the room alive without a melody.
      clearTimeout(this._clinkTimer);
      this._clinkTimer = setTimeout(() => {
        if (!this.amb || !this.ready) return;
        const t = this.ctx.currentTime;
        const f = 2600 + Math.random() * 900;
        this._tone(f, t, 0.18, { gain: 0.006 });
        this._tone(f * 1.5, t + 0.05, 0.12, { gain: 0.004 });
        this._scheduleClinks();
      }, 2500 + Math.random() * 4000);
    }

    stopAmbience(immediate) {
      clearTimeout(this._clinkTimer);
      const a = this.amb;
      this.amb = null;
      if (!a || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        a.out.gain.cancelScheduledValues(t);
        a.out.gain.setValueAtTime(Math.max(0.0001, a.out.gain.value), t);
        const end = t + (immediate ? 0.03 : 0.6);
        a.out.gain.exponentialRampToValueAtTime(0.0001, end);
        a.src.stop(end + 0.02); a.lfo.stop(end + 0.02);
      } catch (e) { /* already stopped */ }
    }

    // ---------- effects ----------
    play(name, p) {
      try { this['_' + name] && this['_' + name](p || {}); } catch (e) { /* audio never blocks gameplay */ }
    }

    _tap(p) {
      if (!this._gate('tap', 0.06)) return;
      const t = this.ctx.currentTime;
      const k = Math.min(1, (p.intensity || 0.5));
      const base = 2100 + Math.random() * 500;
      this._tone(base, t, 0.14, { gain: 0.05 + 0.08 * k });
      this._tone(base * 2.76, t, 0.07, { gain: 0.025 + 0.04 * k });
      this._tone(base * 5.1, t, 0.035, { gain: 0.012 + 0.02 * k });
    }

    _creak(p) {
      if (!this._gate('creak', 0.45)) return;
      const t = this.ctx.currentTime;
      const f = 150 + Math.random() * 40;
      this._tone(f, t, 0.22, { type: 'sawtooth', gain: 0.018, attack: 0.04, fEnd: f * 0.82, filter: { type: 'bandpass', f: 420, q: 6 } });
      this._noise(t, 0.18, { type: 'bandpass', f: 700, q: 8, gain: 0.012, attack: 0.05 });
    }

    _bumpWarn() {
      if (!this._gate('bumpWarn', 0.8)) return;
      const t = this.ctx.currentTime;
      // two soft footstep thuds
      for (let i = 0; i < 2; i++) {
        this._tone(110, t + i * 0.22, 0.09, { gain: 0.06, fEnd: 70 });
        this._noise(t + i * 0.22, 0.06, { type: 'lowpass', f: 500, gain: 0.04 });
      }
    }

    _bump() {
      if (!this._gate('bump', 0.3)) return;
      const t = this.ctx.currentTime;
      this._tone(130, t, 0.2, { gain: 0.16, fEnd: 55 });
      this._noise(t, 0.12, { type: 'lowpass', f: 900, fEnd: 200, gain: 0.09 });
      this._tone(1900, t + 0.02, 0.1, { gain: 0.03 }); // cups jostle
      this._tone(2400, t + 0.06, 0.08, { gain: 0.025 });
    }

    _splash() {
      if (!this._gate('splash', 0.25)) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.14, { type: 'bandpass', f: 1800, fEnd: 3200, q: 2, gain: 0.05 });
      this._tone(700, t + 0.01, 0.08, { gain: 0.035, fEnd: 1300 });
    }

    _rattle() {
      if (!this._gate('rattle', 0.3)) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) this._tone(1500 + Math.random() * 300, t + i * 0.045, 0.04, { gain: 0.022 });
    }

    _danger() {
      if (!this._gate('danger', 0.9)) return;
      const t = this.ctx.currentTime;
      // a low wooden "tok-tok": noticeable, not alarming
      this._tone(520, t, 0.07, { type: 'triangle', gain: 0.06 });
      this._tone(440, t + 0.11, 0.08, { type: 'triangle', gain: 0.05 });
    }

    _tumble() {
      if (!this._gate('tumble', 0.5)) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.35, { type: 'bandpass', f: 600, fEnd: 2400, q: 1.2, gain: 0.035, attack: 0.15 });
      const hit = t + 0.42;
      this._noise(hit, 0.3, { type: 'highpass', f: 1800, gain: 0.12 });
      this._tone(180, hit, 0.18, { gain: 0.1, fEnd: 90 });
      const notes = [2600, 3300, 2100, 2900, 1800, 2500];
      notes.forEach((f, i) => this._tone(f, hit + 0.03 + i * 0.07 + Math.random() * 0.02, 0.09, { gain: 0.05 - i * 0.006 }));
      // comic little wobble afterwards
      this._tone(620, hit + 0.55, 0.12, { type: 'triangle', gain: 0.04, fEnd: 520 });
      this._tone(520, hit + 0.7, 0.18, { type: 'triangle', gain: 0.035, fEnd: 390 });
    }

    _chime(p) {
      if (!this._gate('chime', 0.5)) return;
      const t = this.ctx.currentTime;
      const notes = p.perfect ? [784, 988, 1175, 1568] : [784, 988, 1175];
      notes.forEach((f, i) => {
        this._tone(f, t + i * 0.09, 1.1, { gain: 0.06, attack: 0.008 });
        this._tone(f * 2.01, t + i * 0.09, 0.5, { gain: 0.012 });
      });
    }

    _receipt() {
      if (!this._gate('receipt', 0.5)) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 18; i++) this._noise(t + i * 0.034, 0.022, { type: 'bandpass', f: 3200, q: 3, gain: 0.03 });
      this._tone(95, t, 0.65, { type: 'square', gain: 0.008, filter: { type: 'lowpass', f: 300 } });
      this._noise(t + 0.7, 0.12, { type: 'highpass', f: 2500, fEnd: 5000, gain: 0.05 }); // tear
    }

    _best() {
      if (!this._gate('best', 1)) return;
      const t = this.ctx.currentTime + 0.85;
      [523, 659, 784, 1047, 880, 1047].forEach((f, i) => {
        const d = i === 5 ? 0.55 : 0.14;
        this._tone(f, t + i * 0.12, d + 0.1, { type: 'triangle', gain: 0.07 });
      });
    }

    _click() {
      if (!this._gate('click', 0.05)) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.03, { type: 'bandpass', f: 2600, q: 2, gain: 0.03 });
    }

    _pause() {
      if (!this._gate('pause', 0.2)) return;
      const t = this.ctx.currentTime;
      this._tone(660, t, 0.12, { type: 'triangle', gain: 0.04 });
      this._tone(495, t + 0.08, 0.16, { type: 'triangle', gain: 0.035 });
    }
  }

  NS.AudioEngine = AudioEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
