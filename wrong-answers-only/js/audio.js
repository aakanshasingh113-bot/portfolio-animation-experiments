/*
 * Synthesised sound effects (Web Audio API). No files.
 * Every call is wrapped so audio failure never touches gameplay.
 */
(function (root) {
  'use strict';

  function createAudio(initialEnabled) {
    let ctx = null, master = null;
    let enabled = !!initialEnabled;
    const live = new Set(); // active oscillators, so pause/mute can stop them

    /** Must be called inside a user gesture (Start button). */
    function unlock() {
      try {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return false;
        if (!ctx) {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = enabled ? 0.32 : 0;
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -18; comp.ratio.value = 4;
          master.connect(comp); comp.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return true;
      } catch (e) { return false; }
    }

    function stopAll() {
      live.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } });
      live.clear();
    }

    function setEnabled(v) {
      enabled = !!v;
      try {
        if (master) master.gain.setTargetAtTime(enabled ? 0.32 : 0, ctx.currentTime, 0.02);
        if (!enabled) stopAll();
      } catch (e) { /* ignore */ }
    }

    function suspend() { try { stopAll(); if (ctx && ctx.state === 'running') ctx.suspend(); } catch (e) { /* ignore */ } }
    function wake() { try { if (ctx && ctx.state === 'suspended' && enabled) ctx.resume().catch(() => {}); } catch (e) { /* ignore */ } }

    /** One enveloped note. t = offset in seconds from now. */
    function note(freq, t, dur, opts) {
      opts = opts || {};
      const start = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = opts.type || 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
      const peak = opts.gain || 0.25;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + (opts.attack || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g); g.connect(master);
      osc.start(start); osc.stop(start + dur + 0.02);
      live.add(osc);
      osc.onended = () => live.delete(osc);
    }

    const SOUNDS = {
      click() { note(620, 0, 0.05, { type: 'sine', gain: 0.12 }); },
      // Bright, playful two-note "ta-da" for a successful wrong answer.
      wrongWin() { note(587, 0, 0.09, { type: 'square', gain: 0.07 }); note(880, 0.08, 0.16, { type: 'square', gain: 0.07 }); },
      // Related interval, but a softer bell-like chime for NORMAL ROUND successes.
      normalWin() { note(659, 0, 0.32, { type: 'sine', gain: 0.2 }); note(988, 0.05, 0.36, { type: 'sine', gain: 0.14 }); },
      mistake() { note(392, 0, 0.12, { type: 'triangle', gain: 0.22 }); note(311, 0.12, 0.26, { type: 'triangle', gain: 0.22, to: 220 }); },
      timeout() {
        [0, 0.09, 0.18].forEach((t) => note(1100, t, 0.025, { type: 'sine', gain: 0.1 }));
        note(180, 0.3, 0.22, { type: 'sine', gain: 0.25, to: 120 });
      },
      ruleSwitch() { note(330, 0, 0.12, { type: 'triangle', gain: 0.18, to: 784 }); note(784, 0.13, 0.08, { type: 'sine', gain: 0.15 }); },
      streak() { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.07, 0.14, { type: 'triangle', gain: 0.16 })); },
      gameOver() { [523, 440, 370, 294].forEach((f, i) => note(f, i * 0.14, 0.22, { type: 'triangle', gain: 0.2 })); },
      newBest() {
        [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.06, 0.12, { type: 'square', gain: 0.05 }));
        [523, 659, 784].forEach((f) => note(f, 0.3, 0.5, { type: 'sine', gain: 0.12 }));
      },
      ready() { note(880, 0, 0.06, { type: 'sine', gain: 0.1 }); }
    };

    function play(name) {
      if (!enabled || !ctx || !master || ctx.state !== 'running' || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* never interrupt gameplay */ }
    }

    return {
      unlock, play, setEnabled, suspend, wake,
      get enabled() { return enabled; },
      get state() { return ctx ? ctx.state : 'none'; },
      get supported() { return !!(root.AudioContext || root.webkitAudioContext); }
    };
  }

  root.WAOAudio = { createAudio };
})(typeof self !== 'undefined' ? self : this);
