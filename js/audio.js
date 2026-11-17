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

    /** Silence everything that is sounding or scheduled. */
    function stopAll(hard) {
      if (!ctx) return;
      var now = ctx.currentTime;
      for (var i = 0; i < voices.length; i++) silence(voices[i], now, hard);
      voices.length = 0;
    }

    // ------------------------------------------------------------ sounds --

    // Bright, toy-like palette: wooden mallets, little bells, ticks and bloops.
    // Nothing sustains, and nothing sits low enough to rumble.
    var C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98;
    var LIFT_NOTES = [C5, D5, E5, G5, A5, C6, D6, E6];

    /** A marimba-ish mallet: a sine with a quick, brighter overtone. */
    function mallet(v, t, f, at, peak, dur) {
      dur = dur || 0.22;
      tone(v, t, { f: f, at: at, dur: dur, peak: peak, attack: 0.003 });
      tone(v, t, { f: f * 4, at: at, dur: dur * 0.28, peak: peak * 0.22, attack: 0.002 });
    }
    /** A small bell: inharmonic partial gives it shimmer. */
    function bell(v, t, f, at, peak, dur) {
      dur = dur || 0.5;
      tone(v, t, { f: f, at: at, dur: dur, peak: peak, attack: 0.004 });
      tone(v, t, { f: f * 2.76, at: at, dur: dur * 0.45, peak: peak * 0.28, attack: 0.003 });
    }

    var api = {
      available: !!Ctor,
      unlock: unlock,
      stopAll: function () { stopAll(false); },

      /** 'unavailable' | 'muted' | 'on' */
      status: function () { return (!Ctor || broken) ? 'unavailable' : muted ? 'muted' : 'on'; },
      isMuted: function () { return muted; },
      /** Call from a user gesture. Muting silences everything sounding and all future sounds. */
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

      // any game button: a crisp little tick
      click: function () {
        play('click', 0.04, function (v, t) {
          hiss(v, t, { f: 3400, q: 2, dur: 0.014, peak: 0.09 });
          mallet(v, t, 1400, 0, 0.045, 0.05);
        });
      },
      // carriage gliding along the rail: soft gear ticks, one per few pixels travelled
      tick: function () {
        play('tick', 0.035, function (v, t) {
          hiss(v, t, { f: 2800, q: 4, dur: 0.009, peak: 0.035 });
          tone(v, t, { f: 1900, dur: 0.014, peak: 0.012 });
        });
      },
      // claw going down: a quick descending mallet run with a gentle glide underneath
      lower: function () {
        play('lower', 0.3, function (v, t) {
          [G5, E5, D5, C5].forEach(function (f, i) { mallet(v, t, f, i * 0.13, 0.055, 0.18); });
          tone(v, t, { f: [[880, 0], [520, 0.7]], dur: 0.72, peak: 0.018, attack: 0.05 });
        });
      },
      // grip tightening: ticks that climb in pitch with the pressure
      ratchet: function (step) {
        play('ratchet', 0.03, function (v, t) {
          hiss(v, t, { f: 2200 + step * 110, q: 5, dur: 0.01, peak: 0.055 });
          tone(v, t, { type: 'triangle', f: 620 + step * 55, dur: 0.025, peak: 0.035 });
        });
      },
      // closing on nothing: two wood blocks and a little "aww"
      clack: function () {
        play('clack', 0.2, function (v, t) {
          mallet(v, t, 880, 0, 0.07, 0.08);
          mallet(v, t, 740, 0.09, 0.07, 0.08);
          tone(v, t, { f: [[620, 0], [440, 0.28]], at: 0.2, dur: 0.32, peak: 0.045, attack: 0.03, vib: [6, 8] });
        });
      },
      // safe grip established: a bright two-bell "got it"
      safe: function () {
        play('safe', 0.2, function (v, t) {
          bell(v, t, C6, 0, 0.07, 0.3);
          bell(v, t, G6, 0.075, 0.06, 0.45);
        });
      },
      // lifting: one note of a rising scale per step of the climb
      liftNote: function (i) {
        play('liftNote', 0.05, function (v, t) {
          mallet(v, t, LIFT_NOTES[Math.max(0, Math.min(LIFT_NOTES.length - 1, i))], 0, 0.045, 0.2);
        });
      },
      // dangerous pressure: a light tick-tock; the game spaces them closer near failure
      warn: function (zone) {
        play('warn', 0.08, function (v, t) {
          var f = zone === 'high' ? 1046.5 : 698.46;
          tone(v, t, { type: 'triangle', f: f, dur: 0.06, peak: 0.055, attack: 0.003 });
          tone(v, t, { type: 'triangle', f: f * 0.75, at: 0.065, dur: 0.06, peak: 0.04, attack: 0.003 });
        });
      },
      // prize slipping: a slide whistle going down
      whistle: function () {
        play('whistle', 0.2, function (v, t) {
          tone(v, t, { f: [[1400, 0], [520, 0.36]], dur: 0.38, peak: 0.06, attack: 0.02, vib: [7, 14] });
        });
      },
      // cake crushed: a soft, bright splat
      squish: function () {
        play('squish', 0.2, function (v, t) {
          hiss(v, t, { f: [2600, 900], q: 1.4, dur: 0.15, peak: 0.12, attack: 0.008 });
          tone(v, t, { f: [[980, 0], [520, 0.11]], dur: 0.12, peak: 0.05, attack: 0.005 });
        });
      },
      // soap escaping: bubbly pops
      pops: function () {
        play('pops', 0.2, function (v, t) {
          var f = [720, 940, 660, 1060, 860], at = [0, 0.06, 0.11, 0.19, 0.25];
          for (var i = 0; i < f.length; i++) tone(v, t, { f: [[f[i], 0], [f[i] * 1.7, 0.04]], dur: 0.05, peak: 0.07, at: at[i], attack: 0.003 });
        });
      },
      // egg breaking: a delicate crack
      crack: function () {
        play('crack', 0.2, function (v, t) {
          var at = [0, 0.032, 0.05, 0.115];
          for (var i = 0; i < at.length; i++) hiss(v, t, { f: 3000 - i * 240, q: 2.6, dur: 0.012, peak: i ? 0.07 : 0.1, at: at[i], attack: 0.002 });
          tone(v, t, { type: 'triangle', f: [[1180, 0], [760, 0.03]], dur: 0.035, peak: 0.03 });
        });
      },
      // cactus toy squashed: a squeaky-toy "eep"
      squeak: function () {
        play('squeak', 0.2, function (v, t) {
          tone(v, t, { f: [[980, 0], [1560, 0.07], [1180, 0.2]], dur: 0.22, peak: 0.07, attack: 0.01, vib: [16, 22] });
          tone(v, t, { f: [[1960, 0], [3120, 0.07], [2360, 0.2]], dur: 0.16, peak: 0.012, attack: 0.01 });
        });
      },
      // a loose prize landing on the chamber floor: a light wooden "tok"
      thud: function () {
        play('thud', 0.1, function (v, t) {
          mallet(v, t, 560, 0, 0.07, 0.07);
          hiss(v, t, { f: 1600, q: 1.5, dur: 0.02, peak: 0.04 });
        });
      },
      // prize lands in the tray: a water-drop bloop, then a cheerful chime
      landed: function () {
        play('landed', 0.3, function (v, t) {
          tone(v, t, { f: [[520, 0], [1240, 0.07]], dur: 0.09, peak: 0.09, attack: 0.004 });
          bell(v, t, G5, 0.14, 0.07, 0.35);
          bell(v, t, C6, 0.23, 0.07, 0.5);
        });
      },
      /** Points: a rising run whose length grows with the bonuses earned. */
      points: function (o) {
        play('points', 0.3, function (v, t) {
          var run = [C5, E5, G5];
          if (o && o.aim) run.push(A5);
          if (o && o.grade === 'perfect') run.push(C6);
          if (o && o.streak > 1) run.push(E6);
          if (o && o.streak > 2) run.push(G6);
          for (var i = 0; i < run.length; i++) mallet(v, t, run[i], 0.62 + i * 0.07, 0.055, 0.16);
        });
      },
      // perfect grip: a quick twinkle on top of the landing
      sparkle: function () {
        play('sparkle', 0.3, function (v, t) {
          [G6, 2093, 2637.02, 2093].forEach(function (f, i) { tone(v, t, { f: f, at: 1.0 + i * 0.05, dur: 0.18, peak: 0.022, attack: 0.003 }); });
        });
      },
      // perfect round or new personal best: a short flourish, started with the confetti
      flourish: function () {
        play('flourish', 0.5, function (v, t) {
          var run = [C5, E5, G5, C6, E6];
          for (var i = 0; i < run.length; i++) mallet(v, t, run[i], i * 0.075, 0.06, 0.18);
          [C5, E5, G5, C6].forEach(function (f) { bell(v, t, f, 0.42, 0.04, 0.9); });
        });
      },
      // ordinary round ending: a short, gentle close
      closing: function () {
        play('closing', 0.5, function (v, t) {
          mallet(v, t, G5, 0, 0.06, 0.3);
          mallet(v, t, E5, 0.16, 0.06, 0.3);
          bell(v, t, C5, 0.32, 0.06, 0.7);
        });
      },

      // read-only view for the automated checks
      debug: {
        log: log,
        loops: function () { return []; },   // no continuous sounds any more
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
