/* Intro — a red dot draws a coiled thread and each letter of the name rises
   into place, in its final handwriting, as the dot passes. The thread pulls
   taut, then the dark screen splits open along it and the same name stays
   put on the desk. The name is written once.
   Click, Escape or scroll skips it. Reduced motion skips it entirely. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;
  var intro = $('intro'), path = $('ipath'), pen = $('ipen'), iname = $('iname');
  var desk = $('top'), deskName = $('deskName'), body = document.body;
  var NAME = 'Aakansha Singh';
  var timers = [], raf = null, done = false;

  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
  function clearAll(){ timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); }
  function animate(dur, step, end){
    var t0 = performance.now();
    (function tick(now){
      var k = Math.min(1, (now - t0) / dur); step(k);
      if(k < 1) raf = requestAnimationFrame(tick); else if(end) end();
    })(t0);
  }
  function ease(k){ return k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2; }


  function reveal(){
    desk.classList.remove('ready'); void desk.offsetWidth; desk.classList.add('ready');
    window.dispatchEvent(new Event('deskready'));
  }

  function finish(){
    if(done) return; done = true; started = true; clearAll();
    intro.classList.add('open');
    body.classList.remove('intro-on');
    reveal();
    later(function(){ intro.hidden = true; }, 1300);
  }

  function play(){
    clearAll(); done = false;
    window.scrollTo(0, 0);
    body.classList.add('intro-on');
    desk.classList.remove('ready');
    intro.hidden = false; intro.classList.remove('open');
    pen.style.opacity = 0; path.setAttribute('d', '');
    var W = innerWidth, H = innerHeight;
    var r0 = deskName.getBoundingClientRect();
    /* on phones the desk name sits near the top; play the intro centred and let the split hide the jump */
    var shift = (r0.top + r0.height/2 < H * .3) ? Math.round(H * .46 - (r0.top + r0.height/2)) : 0;
    var nr = {left:r0.left, right:r0.right, width:r0.width, height:r0.height, top:r0.top + shift};
    var cx = nr.left + nr.width/2, cy = nr.top + nr.height/2;

    /* the name is laid out exactly like the desk's name, so it appears once and simply stays */
    var cs = getComputedStyle(deskName);
    iname.innerHTML = ''; iname.style.transition = ''; iname.style.transform = '';
    ['fontFamily','fontWeight','fontSize','letterSpacing','lineHeight','padding'].forEach(function(k){ iname.style[k] = cs[k]; });
    var spans = NAME.split('').map(function(ch){ var s = document.createElement('span'); s.textContent = ch; iname.appendChild(s); return s; });
    var bw = iname.offsetWidth, bh = iname.offsetHeight, left = nr.left + (nr.width - bw) / 2, top = nr.top + (nr.height - bh) / 2;
    iname.style.left = left + 'px'; iname.style.top = top + 'px';
    var lineY = Math.round(top + bh * .8);
    intro.style.setProperty('--cut', lineY + 'px');

    /* the letters wait just below their final spots */
    var letters = [];
    spans.forEach(function(s, i){
      if(NAME[i] === ' ') return;
      s.style.transition = 'none'; s.className = 'wait';
      letters.push({s:s, fx: left + s.offsetLeft + s.offsetWidth/2});
    });
    void iname.offsetWidth;
    spans.forEach(function(s){ s.style.transition = ''; });

    /* the thread: a straight lead-in, an even coil of loops under the name, a straight lead-out */
    var pl = parseFloat(cs.paddingLeft) || 0, x0 = left + pl - 20, x1 = left + bw - pl + 20, loops = Math.max(7, Math.round((x1 - x0) / 62));
    var R = Math.max(9, Math.min(16, bh * .12)), pts = [], base = [];
    function add(x, y, bx){ pts.push([x, y]); base.push(bx); }
    for(var i = 0; i <= 24; i++){ var x = -20 + (x0 + 20) * i / 24; add(x, lineY, x); }
    var C = loops * 26;
    for(var j = 1; j <= C; j++){
      var u = j / C, th = u * Math.PI * 2 * loops, bx = x0 + (x1 - x0) * u;
      add(bx - R * 1.15 * Math.sin(th), lineY + R * (1 - Math.cos(th)), bx);
    }
    for(var k2 = 1; k2 <= 24; k2++){ var xx = x1 + (W + 20 - x1) * k2 / 24; add(xx, lineY, xx); }
    var N = pts.length, cum = [0];
    for(var c = 1; c < N; c++) cum.push(cum[c-1] + Math.hypot(pts[c][0]-pts[c-1][0], pts[c][1]-pts[c-1][1]));
    var L = cum[N-1];
    function line(p){ var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1); for(var i = 1; i < p.length; i++) d += 'L' + p[i][0].toFixed(1) + ' ' + p[i][1].toFixed(1); return d; }
    path.setAttribute('d', line(pts));
    path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
    function at(len){ var lo = 0, hi = N - 1; while(lo < hi){ var m = (lo + hi) >> 1; if(cum[m] < len) lo = m + 1; else hi = m; } return lo; }

    later(function(){
      // 1. the dot draws the coil; each letter rises into place as the dot passes it
      pen.style.opacity = 1;
      var lastLoop = -1;
      animate(1700, function(k){
        var e = ease(k) * .15 + k * .85, len = L * e, idx = at(len), p = pts[idx];
        path.style.strokeDashoffset = L - len;
        pen.setAttribute('cx', p[0]); pen.setAttribute('cy', p[1]);
        letters.forEach(function(l){ if(!l.shown && base[idx] >= l.fx - 14){ l.shown = true; l.s.className = ''; snd.tone(420 + l.fx % 300, .06, 'triangle', .035); } });
        var loopNo = Math.floor((base[idx] - x0) / (x1 - x0) * loops);
        if(loopNo !== lastLoop && base[idx] > x0 && base[idx] < x1){ lastLoop = loopNo; snd.noise(.05, 'bandpass', 2600, .02, 0, null, 3); }
      }, function(){
        letters.forEach(function(l){ l.s.className = ''; });
        later(straighten, 280);
      });
    }, 500);

    // 2. the coil pulls taut, in place
    function straighten(){
      path.style.strokeDasharray = 'none'; path.style.strokeDashoffset = 0;
      snd.whoosh();
      animate(800, function(k){
        var e = ease(k), p = [];
        for(var i = 0; i < N; i++) p.push([pts[i][0] + (base[i] - pts[i][0]) * e, pts[i][1] + (lineY - pts[i][1]) * e]);
        path.setAttribute('d', line(p));
        pen.setAttribute('cx', W + 20); pen.style.opacity = 0;
      }, function(){ snd.chime(); later(split, 520); });
    }

    // 4. the screen splits along the thread and the desk appears
    function split(){
      snd.noise(.9, 'bandpass', 300, .2, 0, 2400, .7);
      if(shift){   // phones: glide the name up to where it sits on the desk, then hand over
        iname.style.transition = 'transform .9s cubic-bezier(.65,0,.25,1), opacity .4s .75s';
        iname.style.transform = 'translateY(' + (-shift) + 'px)';
      }
      done = true;
      intro.classList.add('open');
      body.classList.remove('intro-on');
      later(reveal, 250);
      later(function(){ intro.hidden = true; }, 1400);
    }
  }

  intro.addEventListener('click', finish);
  window.addEventListener('keydown', function(e){ if(!done && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) finish(); });
  window.addEventListener('wheel', function(){ if(!done) finish(); }, {passive:true});

  function start(){ if(S.reduce){ done = true; intro.hidden = true; body.classList.remove('intro-on'); reveal(); } else play(); }
  /* wait for the fonts so the name measures correctly (but never more than 1.5s) */
  var started = false;
  function go(){ if(!started){ started = true; start(); } }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  setTimeout(go, 1500);

  window.Intro = { play: play, skip: finish };
})();
