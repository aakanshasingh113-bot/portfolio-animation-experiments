/*
 * Don't Crush It — sound.
 *
 * Small synthesised effects through the Web Audio API. Off by default; the
 * context is only created after the player turns sound on. Every call is safe
 * when audio is disabled, unavailable or suspended.
 */
(function (root) {
  'use strict';
  var DCI = root.DCI = root.DCI || {};

  function createAudio() {
    var Ctor = root.AudioContext || root.webkitAudioContext;
    var ctx = null, master = null, enabled = false;

    function ensure() {
      if (ctx || !Ctor) return !!ctx;
      try {
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch (e) { ctx = null; }
      return !!ctx;
    }

    function ready() {
      if (!enabled || !ctx) return false;
      if (ctx.state === 'suspended') { try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      return ctx.state !== 'closed';
    }

    function tone(type, f0, f1, dur, vol, delay) {
      if (!ready()) return;
      try {
        var t = ctx.currentTime + (delay || 0);
        var osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + dur + 0.03);
      } catch (e) { /* audio is a nicety; never let it break the game */ }
    }

    function noise(dur, vol, freq) {
      if (!ready()) return;
      try {
        var n = Math.floor(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0);
        var seed = 1234567;
        for (var i = 0; i < n; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647) * 2 - 1; }
        var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
        src.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t);
      } catch (e) {}
    }

    return {
      available: !!Ctor,
      isOn: function () { return enabled; },
      /** Returns the resulting state; stays off if audio cannot start. */
      setEnabled: function (on) {
        enabled = !!on && ensure();
        if (enabled) ready();
        return enabled;
      },
      click: function () { tone('square', 900, 520, 0.045, 0.07); },
      lower: function () { tone('triangle', 330, 150, 0.7, 0.07); },
      squeeze: function () { noise(0.16, 0.09, 700); },
      chime: function () {
        tone('sine', 659.3, 659.3, 0.3, 0.14);
        tone('sine', 830.6, 830.6, 0.3, 0.13, 0.09);
        tone('sine', 987.8, 987.8, 0.5, 0.13, 0.18);
      },
      fail: function () {
        tone('triangle', 330, 300, 0.2, 0.11);
        tone('triangle', 247, 208, 0.34, 0.11, 0.16);
      },
      thud: function () { tone('sine', 140, 70, 0.12, 0.14); }
    };
  }

  DCI.audio = { createAudio: createAudio };
})(typeof self !== 'undefined' ? self : this);
