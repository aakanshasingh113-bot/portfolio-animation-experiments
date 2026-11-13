/* Sound — every sound is synthesized with Web Audio, nothing is downloaded.
   Exposes window.Site = { $, store, reduce, snd, music } for the other scripts. */
(function(){
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } }
  function $(id){ return document.getElementById(id); }

  var snd = (function(){
    var ctx = null, master = null, noiseBuf = null, on = store('snd') !== '0', armed = false;
    function init(){
      if(ctx) return ctx;
      try{
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0); for(var i=0;i<d.length;i++) d[i] = Math.random()*2-1;
      }catch(e){ ctx = null; }
      return ctx;
    }
    function ok(){ if(!on || !armed) return false; if(!init()) return false; if(ctx.state === 'suspended') ctx.resume(); return true; }
    function tone(f, dur, type, gain, when, to){
      if(!ok()) return; var t = ctx.currentTime + (when||0);
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type||'sine'; o.frequency.setValueAtTime(f, t);
      if(to) o.frequency.exponentialRampToValueAtTime(to, t+dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain||.08, t+.01); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+.02);
    }
    function noise(dur, ftype, freq, gain, when, to, q){
      if(!ok()) return; var t = ctx.currentTime + (when||0);
      var s = ctx.createBufferSource(); s.buffer = noiseBuf;
      var f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); if(q) f.Q.value = q;
      if(to) f.frequency.exponentialRampToValueAtTime(to, t+dur);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t+.01); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()*.5); s.stop(t+dur+.02);
    }
    return {
      arm: function(){ armed = true; init(); if(ctx && ctx.state==='suspended') ctx.resume(); },
      set: function(v){ on = v; store('snd', v?'1':'0'); if(!v) music.stop(); },
      get on(){ return on; }, get ctx(){ return init(); }, get master(){ init(); return master; },
      tone: tone, noise: noise,
      hover: function(f){ tone(f, .07, 'sine', .03); },
      pop: function(){ tone(520, .09, 'sine', .07, 0, 880); },
      thud: function(){ tone(140, .14, 'sine', .12, 0, 70); noise(.06, 'lowpass', 900, .08); },
      sip: function(){ noise(.45, 'lowpass', 1400, .16, 0, 260); },
      peel: function(){ noise(.3, 'highpass', 1200, .14, 0, 6000); },
      print: function(){ for(var i=0;i<5;i++) noise(.03, 'bandpass', 3000, .08, i*.05, null, 4); },
      pluck: function(n){ var scale=[0,2,4,7,9,12,14]; tone(392*Math.pow(2, scale[n%scale.length]/12), .35, 'triangle', .12); },
      whoosh: function(){ noise(.35, 'bandpass', 500, .18, 0, 3000, .8); },
      click: function(){ tone(1400, .03, 'square', .025); tone(700, .05, 'square', .02, .03); },
      tick: function(p){ tone(420 + p*700, .035, 'sine', .04); },
      chime: function(){ [523.25,659.25,783.99,1046.5].forEach(function(f,i){ tone(f, .5, 'triangle', .08, i*.09); }); },
      fanfare: function(){ [392,523.25,659.25,783.99,1046.5,1318.5].forEach(function(f,i){ tone(f, .6, 'triangle', .09, i*.08); }); }
    };
  })();
  ['pointerdown','keydown'].forEach(function(ev){ window.addEventListener(ev, function(){ snd.arm(); }, {once:true}); });

  /* lo-fi chords for the cassette */
  var music = (function(){
    var timer = null, step = 0, bus = null;
    var chords = [[220,261.63,329.63,392],[174.61,220,261.63,329.63],[196,246.94,293.66,349.23],[164.81,207.65,246.94,329.63]];
    function chord(){
      var ctx = snd.ctx; if(!ctx) return; var t = ctx.currentTime, ch = chords[step++ % chords.length];
      ch.forEach(function(f,i){ var o = ctx.createOscillator(), g = ctx.createGain(); o.type = i===0?'sine':'triangle'; o.frequency.value = f; o.detune.value = (Math.random()-.5)*10;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(i===0?.5:.2, t+.35); g.gain.exponentialRampToValueAtTime(.001, t+2.6); o.connect(g); g.connect(bus); o.start(t); o.stop(t+2.7); });
    }
    return {
      start: function(){ var ctx = snd.ctx; if(!ctx || !snd.on) return false; ctx.resume();
        if(!bus){ var lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 1000; bus = ctx.createGain(); bus.gain.value = .11; bus.connect(lp); lp.connect(snd.master); }
        chord(); timer = setInterval(chord, 2400); return true; },
      stop: function(){ clearInterval(timer); timer = null; var t = $('pTape'); if(t){ t.classList.remove('playing'); t.setAttribute('aria-pressed','false'); $('tapeTag').textContent = 'press play'; } },
      get playing(){ return !!timer; }
    };
  })();

  var soundBtn = $('soundBtn');
  function paint(){ soundBtn.setAttribute('aria-pressed', snd.on?'true':'false'); soundBtn.setAttribute('aria-label', snd.on?'Sound on':'Sound off'); soundBtn.querySelector('.w').style.opacity = snd.on ? 1 : 0; }
  soundBtn.addEventListener('click', function(){ snd.set(!snd.on); paint(); if(snd.on) snd.click(); });
  paint();

  window.Site = { $: $, store: store, reduce: reduce, snd: snd, music: music, root: root };
})();
