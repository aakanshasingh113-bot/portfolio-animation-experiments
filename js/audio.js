/*
 * Don't Crush It — sound.
 *
 * Every sound is synthesised with the Web Audio API (oscillators, filtered
 * noise, short envelopes); there are no audio files. Nothing is created until
 * the first intentional interaction, everything goes through one master gain
 * and a limiter, and every call is safe when audio is muted, unavailable,
 * suspended or broken — sound can never hold the game up.
 */
(function (root) {
  'use strict';
  var DCI = root.DCI = root.DCI || {};
  var PREF_KEY = 'dont-crush-it.sound';
  var MASTER = 0.6;

  function createAudio() {
    var Ctor = root.AudioContext || root.webkitAudioContext;
    var ctx = null, master = null, analyser = null, noiseBuf = null;
    var broken = false;      // the context could not be created
    var unlocked = false;    // a user gesture has started audio
    var halted = false;      // tab hidden
    var voices = [];         // active one-shot sounds
    var loops = {};          // name -> running motor loop (at most one each)
    var lastAt = {};         // name -> context time of the last trigger
    var log = [];            // names of triggered sounds, for the automated checks

    function readPref() { try { return root.localStorage.getItem(PREF_KEY); } catch (e) { return null; } }
    function writePref(v) { try { root.localStorage.setItem(PREF_KEY, v); } catch (e) {} }
    var muted = readPref() === 'off';

    function build() {
      if (ctx) return true;
      if (!Ctor || broken) return false;
      try {
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = MASTER;
        var limiter = ctx.createDynamicsCompressor();     // guards against clipping when effects overlap
        limiter.threshold.value = -16; limiter.knee.value = 10; limiter.ratio.value = 10;
        limiter.attack.value = 0.003; limiter.release.value = 0.12;
        analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
        master.connect(limiter); limiter.connect(analyser); analyser.connect(ctx.destination);

        var n = ctx.sampleRate, seed = 1234567;            // one second of noise, shared
        noiseBuf = ctx.createBuffer(1, n, n);
        var data = noiseBuf.getChannelData(0);
        for (var i = 0; i < n; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647) * 2 - 1; }
      } catch (e) { ctx = null; broken = true; }
      return !!ctx;
    }

    function resumeCtx() {
      if (!ctx || ctx.state !== 'suspended') return;
      try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }

    /** Call from inside a click, tap or key press. Starts audio unless the player muted it. */
    function unlock() {
      if (muted || halted || !build()) return false;
      unlocked = true;
      resumeCtx();
      return true;
    }

    function can() { return !muted && !halted && unlocked && !!ctx && ctx.state !== 'closed'; }

    // ------------------------------------------------------------ voices --

    function prune(now) {
      for (var i = voices.length - 1; i >= 0; i--) {
        if (voices[i].end < now) { try { voices[i].out.disconnect(); } catch (e) {} voices.splice(i, 1); }
      }
    }

    /** Start a one-shot sound. `gap` drops duplicate triggers that arrive too close together. */
    function play(name, gap, build_) {
      if (!can()) return false;
      try {
        var now = ctx.currentTime;
        if (lastAt[name] != null && now - lastAt[name] < gap) return false;
        lastAt[name] = now;
        prune(now);
        var v = { name: name, out: ctx.createGain(), nodes: [], end: now };
        v.out.connect(master);
        build_(v, now + 0.005);
        voices.push(v);
        log.push(name); if (log.length > 400) log.shift();
        return true;
      } catch (e) { return false; }
    }

    function envelope(param, t, attack, peak, dur) {
      param.setValueAtTime(0.0001, t);
      param.exponentialRampToValueAtTime(peak, t + attack);          // short fade-in: no click
      param.exponentialRampToValueAtTime(0.0001, t + dur);           // and fade-out
    }

    /** o: type, f (number or [[freq, offset], …]), at, dur, peak, attack, lp, vib:[rate, depth] */
    function tone(v, t0, o) {
      var t = t0 + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain(), i;
      osc.type = o.type || 'sine';
      var f = typeof o.f === 'number' ? [[o.f, 0]] : o.f;
      osc.frequency.setValueAtTime(f[0][0], t);
      for (i = 1; i < f.length; i++) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f[i][0]), t + f[i][1]);
      envelope(g.gain, t, o.attack || 0.008, o.peak, o.dur);
      var head = osc;
      if (o.lp) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; osc.connect(lp); head = lp; }
      head.connect(g); g.connect(v.out);
      if (o.vib) {
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
        lfo.connect(lg); lg.connect(osc.frequency);
        lfo.start(t); lfo.stop(t + o.dur + 0.03); v.nodes.push(lfo);
      }
      osc.start(t); osc.stop(t + o.dur + 0.03);
      v.nodes.push(osc);
      v.end = Math.max(v.end, t + o.dur + 0.06);
    }

    /** o: at, dur, peak, attack, type (filter), f (number or [from, to]), q */
    function hiss(v, t0, o) {
      var t = t0 + (o.at || 0), src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuf; src.loop = true;
      flt.type = o.type || 'bandpass'; flt.Q.value = o.q || 1;
      if (typeof o.f === 'number') flt.frequency.setValueAtTime(o.f, t);
      else { flt.frequency.setValueAtTime(o.f[0], t); flt.frequency.exponentialRampToValueAtTime(o.f[1], t + o.dur); }
      envelope(g.gain, t, o.attack || 0.004, o.peak, o.dur);
      src.connect(flt); flt.connect(g); g.connect(v.out);
      src.start(t, (t * 7.3) % 0.9); src.stop(t + o.dur + 0.03);
      v.nodes.push(src);
      v.end = Math.max(v.end, t + o.dur + 0.06);
    }

    function silence(v, now, hard) {
      try {
        if (hard) { v.out.disconnect(); }
        else {
          v.out.gain.cancelScheduledValues(now);
          v.out.gain.setValueAtTime(v.out.gain.value, now);
          v.out.gain.linearRampToValueAtTime(0, now + 0.03);
        }
        for (var i = 0; i < v.nodes.length; i++) { try { v.nodes[i].stop(now + (hard ? 0 : 0.05)); } catch (e) {} }
      } catch (e) {}
    }

    // ------------------------------------------------------------- loops --

    var LOOPS = {
      // carriage travelling along the rail
      hum: { f: 58, lp: 420, gain: 0.03 },
      // winch hauling a prize up; pitch climbs a little as it goes
      lift: { f: 82, lp: 560, gain: 0.038, rise: 1.4 }
    };

    /** Turn a motor loop on or off. Idempotent: there is never more than one of each. */
    function loop(name, on, progress, remaining) {
      try {
        var cur = loops[name], def = LOOPS[name], now;
        if (!on) {
          if (!cur) return;
          delete loops[name];
          now = ctx.currentTime;
          cur.g.gain.cancelScheduledValues(now);
          cur.g.gain.setValueAtTime(cur.g.gain.value, now);
          cur.g.gain.linearRampToValueAtTime(0, now + 0.03);        // stops at once, without a click
          cur.oscs.forEach(function (o) { try { o.stop(now + 0.05); } catch (e) {} });
          return;
        }
        if (cur || !can() || !def) return;
        now = ctx.currentTime;
        var g = ctx.createGain(), lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = def.lp;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(def.gain, now + 0.05);
        var a = ctx.createOscillator(), b = ctx.createOscillator();
        a.type = 'sawtooth'; b.type = 'triangle';
        var p = Math.max(0, Math.min(1, progress || 0)), start = def.f * (1 + ((def.rise || 1) - 1) * p);
        a.frequency.setValueAtTime(start, now); b.frequency.setValueAtTime(start * 2.01, now);
        if (def.rise && remaining > 0) {
          a.frequency.linearRampToValueAtTime(def.f * def.rise, now + remaining);
          b.frequency.linearRampToValueAtTime(def.f * def.rise * 2.01, now + remaining);
        }
        a.connect(lp); b.connect(lp); lp.connect(g); g.connect(master);
        a.start(now); b.start(now);
        loops[name] = { g: g, oscs: [a, b] };
        log.push('loop:' + name); if (log.length > 400) log.shift();
      } catch (e) {}
    }

    /** Silence everything that is sounding or scheduled. */
    function stopAll(hard) {
      if (!ctx) return;
      var now = ctx.currentTime, k;
      for (var i = 0; i < voices.length; i++) silence(voices[i], now, hard);
      voices.length = 0;
      for (k in loops) {
        var l = loops[k];
        try {
          if (hard) l.g.disconnect();
          else { l.g.gain.cancelScheduledValues(now); l.g.gain.setValueAtTime(l.g.gain.value, now); l.g.gain.linearRampToValueAtTime(0, now + 0.03); }
          l.oscs.forEach(function (o) { try { o.stop(now + (hard ? 0 : 0.05)); } catch (e) {} });
        } catch (e) {}
      }
      loops = {};
    }

    // ------------------------------------------------------------ sounds --

    var C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5;

    var api = {
      available: !!Ctor,
      unlock: unlock,
      loop: loop,
      stopAll: function () { stopAll(false); },

      /** 'unavailable' | 'muted' | 'on' */
      status: function () { return (!Ctor || broken) ? 'unavailable' : muted ? 'muted' : 'on'; },
      isMuted: function () { return muted; },
      /** Call from a user gesture. Muting silences current loops and all future sounds. */
      setMuted: function (m) {
        muted = !!m;
        writePref(muted ? 'off' : 'on');
        if (muted) stopAll(false); else unlock();
        return api.status();
      },
      /** Tab hidden: cut everything and suspend the context. */
      halt: function () {
        halted = true;
        stopAll(true);
        if (ctx && ctx.state === 'running') { try { var p = ctx.suspend(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      },
      /** Back in view: audio may run again (only if a gesture already unlocked it). */
      wake: function () {
        halted = false;
        if (unlocked && !muted) resumeCtx();
      },

      // button press: a short mechanical click
      click: function () {
        play('click', 0.04, function (v, t) {
          hiss(v, t, { f: 1900, q: 1.3, dur: 0.022, peak: 0.13 });
          tone(v, t, { type: 'square', f: [[150, 0], [85, 0.035]], dur: 0.04, peak: 0.07, lp: 900 });
        });
      },
      // claw lowering: a descending mechanical whirr
      lower: function () {
        play('lower', 0.3, function (v, t) {
          tone(v, t, { type: 'sawtooth', f: [[250, 0], [118, 0.78]], dur: 0.8, peak: 0.055, attack: 0.04, lp: 760 });
          tone(v, t, { type: 'triangle', f: [[125, 0], [59, 0.78]], dur: 0.8, peak: 0.05, attack: 0.04 });
        });
      },
      // grip closing: one soft ratchet tooth; `step` nudges the pitch as the grip tightens
      ratchet: function (step) {
        play('ratchet', 0.03, function (v, t) {
          hiss(v, t, { f: 2100 + step * 55, q: 4, dur: 0.014, peak: 0.07 });
          tone(v, t, { type: 'triangle', f: 290 + step * 16, dur: 0.022, peak: 0.045 });
        });
      },
      // claw closing on nothing
      clack: function () {
        play('clack', 0.2, function (v, t) {
          tone(v, t, { type: 'square', f: [[130, 0], [88, 0.04]], dur: 0.05, peak: 0.07, lp: 700 });
          tone(v, t, { type: 'square', f: [[118, 0], [80, 0.04]], dur: 0.05, peak: 0.06, lp: 700, at: 0.1 });
        });
      },
      // safe grip established: a small bright confirmation
      safe: function () {
        play('safe', 0.2, function (v, t) {
          tone(v, t, { f: 880, dur: 0.16, peak: 0.1 });
          tone(v, t, { f: 1318.5, dur: 0.24, peak: 0.09, at: 0.07 });
        });
      },
      // dangerous pressure: one restrained pulse; the game spaces them closer as failure nears
      warn: function (zone) {
        play('warn', 0.09, function (v, t) {
          var f = zone === 'high' ? 233 : 175;
          tone(v, t, { type: 'triangle', f: [[f, 0], [f * 0.9, 0.08]], dur: 0.09, peak: 0.075, attack: 0.006 });
        });
      },
      // prize slipping: a short descending whistle
      whistle: function () {
        play('whistle', 0.2, function (v, t) {
          tone(v, t, { f: [[1040, 0], [360, 0.32]], dur: 0.34, peak: 0.085, attack: 0.02 });
        });
      },
      // cake crushed: a soft squish
      squish: function () {
        play('squish', 0.2, function (v, t) {
          hiss(v, t, { type: 'lowpass', f: [1100, 240], q: 0.8, dur: 0.24, peak: 0.17, attack: 0.03 });
          tone(v, t, { f: [[190, 0], [78, 0.2]], dur: 0.22, peak: 0.1, attack: 0.02 });
        });
      },
      // soap escaping: bubbly pops
      pops: function () {
        play('pops', 0.2, function (v, t) {
          var f = [420, 560, 380, 640, 500], at = [0, 0.06, 0.11, 0.19, 0.25];
          for (var i = 0; i < f.length; i++) tone(v, t, { f: [[f[i], 0], [f[i] * 1.75, 0.045]], dur: 0.055, peak: 0.09, at: at[i], attack: 0.004 });
        });
      },
      // egg breaking: a delicate crack
      crack: function () {
        play('crack', 0.2, function (v, t) {
          var at = [0, 0.032, 0.05, 0.115];
          for (var i = 0; i < at.length; i++) hiss(v, t, { f: 3000 - i * 240, q: 2.6, dur: 0.012, peak: i ? 0.07 : 0.1, at: at[i], attack: 0.002 });
          tone(v, t, { type: 'triangle', f: [[880, 0], [560, 0.03]], dur: 0.035, peak: 0.03 });
        });
      },
      // cactus compressed: a rubbery squeak
      squeak: function () {
        play('squeak', 0.2, function (v, t) {
          tone(v, t, { type: 'triangle', f: [[470, 0], [850, 0.1], [420, 0.28]], dur: 0.3, peak: 0.1, attack: 0.015, vib: [27, 26] });
        });
      },
      // a loose prize hitting the chamber floor
      thud: function () {
        play('thud', 0.1, function (v, t) {
          tone(v, t, { f: [[140, 0], [68, 0.11]], dur: 0.12, peak: 0.11 });
        });
      },
      // prize landing in the tray: a soft plop, then a cheerful chime
      landed: function () {
        play('landed', 0.3, function (v, t) {
          tone(v, t, { f: [[340, 0], [108, 0.12]], dur: 0.14, peak: 0.16, attack: 0.006 });
          tone(v, t, { f: G5, dur: 0.36, peak: 0.1, at: 0.17 });
          tone(v, t, { type: 'triangle', f: G5 / 2, dur: 0.3, peak: 0.04, at: 0.17 });
          tone(v, t, { f: C6, dur: 0.46, peak: 0.09, at: 0.26 });
        });
      },
      // points awarded: brief ascending notes (one more for the gentle-hands bonus)
      points: function (bonus) {
        play('points', 0.3, function (v, t) {
          var notes = bonus ? [C5, E5, G5, B5] : [C5, E5, G5];
          for (var i = 0; i < notes.length; i++) tone(v, t, { type: 'triangle', f: notes[i], dur: 0.12, peak: 0.075, at: 0.66 + i * 0.075 });
        });
      },
      // perfect round or new personal best: a short flourish, started with the confetti
      flourish: function () {
        play('flourish', 0.5, function (v, t) {
          var run = [C5, E5, G5, C6];
          for (var i = 0; i < run.length; i++) {
            tone(v, t, { type: 'triangle', f: run[i], dur: 0.16, peak: 0.085, at: i * 0.085 });
            tone(v, t, { f: run[i], dur: 0.8, peak: 0.05, at: 0.42, attack: 0.02 });
          }
          tone(v, t, { type: 'triangle', f: C5 / 2, dur: 0.8, peak: 0.06, at: 0.42, attack: 0.02 });
        });
      },
      // ordinary round ending: a short, gentle close
      closing: function () {
        play('closing', 0.5, function (v, t) {
          tone(v, t, { f: 392, dur: 0.3, peak: 0.08, attack: 0.02 });
          tone(v, t, { f: 329.63, dur: 0.3, peak: 0.08, at: 0.16, attack: 0.02 });
          tone(v, t, { f: 261.63, dur: 0.6, peak: 0.085, at: 0.32, attack: 0.02 });
        });
      },

      // read-only view for the automated checks
      debug: {
        log: log,
        loops: function () { return Object.keys(loops); },
        voices: function () { return ctx ? voices.filter(function (v) { return v.end >= ctx.currentTime; }).length : 0; },
        state: function () { return ctx ? ctx.state : 'none'; },
        peak: function () {
          if (!analyser) return 0;
          var buf = new Float32Array(analyser.fftSize), m = 0;
          analyser.getFloatTimeDomainData(buf);
          for (var i = 0; i < buf.length; i++) { var a = Math.abs(buf[i]); if (a > m) m = a; }
          return m;
        }
      }
    };
    return api;
  }

  DCI.audio = { createAudio: createAudio };
})(typeof self !== 'undefined' ? self : this);
