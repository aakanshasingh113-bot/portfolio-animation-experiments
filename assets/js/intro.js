/* Intro — a red dot draws a tangled thread with the letters caught in it,
   the thread pulls straight and the letters snap into the name, the dot runs
   along the line like a pen and rewrites the name in script, then the dark
   screen splits open along the thread to reveal the desk.
   Click, Escape or scroll skips it. Reduced motion skips it entirely. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;
  var intro = $('intro'), path = $('ipath'), pen = $('ipen'), iname = $('iname'), iscript = $('iscript');
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
  function rand(a, b){ return a + Math.random() * (b - a); }

  /* Catmull-Rom spline through points, as a smooth SVG path */
  function spline(p){
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for(var i = 0; i < p.length - 1; i++){
      var p0 = p[i-1] || p[i], p1 = p[i], p2 = p[i+1], p3 = p[i+2] || p2;
      d += ' C' + (p1[0] + (p2[0]-p0[0])/6).toFixed(1) + ' ' + (p1[1] + (p2[1]-p0[1])/6).toFixed(1) + ' ' +
                  (p2[0] - (p3[0]-p1[0])/6).toFixed(1) + ' ' + (p2[1] - (p3[1]-p1[1])/6).toFixed(1) + ' ' +
                  p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  function reveal(){
    desk.classList.remove('ready'); void desk.offsetWidth; desk.classList.add('ready');
    window.dispatchEvent(new Event('deskready'));
  }

  function finish(){
    if(done) return; done = true; clearAll();
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
    pen.style.opacity = 0; path.setAttribute('d', ''); iscript.style.clipPath = '';
    var W = innerWidth, H = innerHeight;
    var nr = deskName.getBoundingClientRect(), cx = nr.left + nr.width/2, cy = nr.top + nr.height/2;

    /* the bold name, laid out once to find where each letter ends up */
    iname.innerHTML = ''; iname.style.fontSize = '';
    var spans = NAME.split('').map(function(ch){ var s = document.createElement('span'); s.textContent = ch; iname.appendChild(s); return s; });
    var bw = iname.offsetWidth;
    if(bw > W * .9){ iname.style.fontSize = (parseFloat(getComputedStyle(iname).fontSize) * W * .9 / bw) + 'px'; bw = iname.offsetWidth; }
    var bh = iname.offsetHeight, left = cx - bw/2, top = cy - bh/2;
    iname.style.left = left + 'px'; iname.style.top = top + 'px';
    var lineY = Math.round(cy + bh * .44);

    /* the script name sits exactly where the desk's name is */
    var cs = getComputedStyle(deskName);
    iscript.style.left = nr.left + 'px'; iscript.style.top = nr.top + 'px'; iscript.style.width = nr.width + 'px'; iscript.style.height = nr.height + 'px';
    iscript.style.fontSize = cs.fontSize; iscript.style.padding = cs.padding; iscript.style.lineHeight = cs.lineHeight;
    intro.style.setProperty('--cut', lineY + 'px');

    /* scatter the letters and run a tangled thread through them */
    var pts = [[-30, lineY]], letters = [];
    spans.forEach(function(s, i){
      if(NAME[i] === ' ') return;
      var fx = left + s.offsetLeft + s.offsetWidth/2, fy = top + s.offsetHeight/2;
      var sx = rand(W*.1, W*.9), sy = rand(H*.16, H*.84);
      s.style.transition = 'none'; s.style.opacity = 0;
      s.style.transform = 'translate(' + (sx-fx).toFixed(1) + 'px,' + (sy-fy).toFixed(1) + 'px) rotate(' + rand(-45,45).toFixed(0) + 'deg) scale(' + rand(.55,1.25).toFixed(2) + ')';
      letters.push({s:s, x:sx, y:sy, fx:fx});
    });
    letters.sort(function(a,b){ return a.x - b.x; });
    letters.forEach(function(l, i){
      var prev = pts[pts.length-1], r = rand(28, 70), dir = Math.random() < .5 ? -1 : 1;
      pts.push([(prev[0]+l.x)/2 + rand(-40,40), (prev[1]+l.y)/2 + dir*r]);       // a loop between letters
      pts.push([(prev[0]+l.x)/2 + dir*r*.8, (prev[1]+l.y)/2 - dir*r*.4]);
      pts.push([l.x, l.y]); l.at = pts.length - 1;
    });
    pts.push([W*.5 + rand(-80,80), lineY + rand(-90,90)]);
    pts.push([W + 30, lineY]);
    path.setAttribute('d', spline(pts));
    var L = path.getTotalLength();
    path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
    void iname.offsetWidth;
    spans.forEach(function(s){ s.style.transition = ''; });

    /* where along the thread each letter sits, so it appears as the dot passes */
    var samples = [];
    for(var t = 0; t <= L; t += 16){ var q = path.getPointAtLength(t); samples.push([t, q.x, q.y]); }
    letters.forEach(function(l){
      var best = 0, bd = 1e9;
      samples.forEach(function(q){ var d = (q[1]-l.x)*(q[1]-l.x) + (q[2]-l.y)*(q[2]-l.y); if(d < bd){ bd = d; best = q[0]; } });
      l.t = best / L;
    });

    later(function(){
      // 1. the dot draws the tangle
      pen.style.opacity = 1;
      var lastTick = 0;
      animate(1500, function(k){
        var e = 1 - Math.pow(1-k, 2), p = path.getPointAtLength(L*e);
        path.style.strokeDashoffset = L * (1-e);
        pen.setAttribute('cx', p.x); pen.setAttribute('cy', p.y);
        letters.forEach(function(l){ if(!l.shown && e >= l.t){ l.shown = true; l.s.style.opacity = 1; snd.tone(330 + Math.random()*500, .06, 'triangle', .04); } });
        if(k - lastTick > .08){ lastTick = k; snd.noise(.05, 'bandpass', 2600, .025, 0, null, 3); }
      }, function(){
        letters.forEach(function(l){ l.s.style.opacity = 1; });
        later(straighten, 260);
      });
    }, 450);

    // 2. pull the thread straight; the letters snap into the name
    function straighten(){
      var N = 160, from = [], to = [];
      for(var i = 0; i < N; i++){ var q = path.getPointAtLength(L*i/(N-1)); from.push([q.x, q.y]); to.push([-30 + (W+60)*i/(N-1), lineY]); }
      path.style.strokeDasharray = 'none'; path.style.strokeDashoffset = 0;
      letters.forEach(function(l, i){ setTimeout(function(){ l.s.style.transform = 'none'; }, i * 22); });
      snd.whoosh();
      var penFrom = [parseFloat(pen.getAttribute('cx')), parseFloat(pen.getAttribute('cy'))], penTo = [left - 26, lineY];
      animate(950, function(k){
        var e = ease(k), p = [];
        for(var i = 0; i < N; i++) p.push([from[i][0] + (to[i][0]-from[i][0])*e, from[i][1] + (to[i][1]-from[i][1])*e]);
        path.setAttribute('d', spline(p));
        pen.setAttribute('cx', penFrom[0] + (penTo[0]-penFrom[0])*e); pen.setAttribute('cy', penFrom[1] + (penTo[1]-penFrom[1])*e);
      }, function(){ snd.chime(); later(rewrite, 450); });
    }

    // 3. the dot runs along the line like a pen and rewrites the name in script
    function rewrite(){
      var x0 = Math.min(left, nr.left) - 26, x1 = Math.max(left + bw, nr.right) + 26;
      animate(1150, function(k){
        var e = ease(k), x = x0 + (x1 - x0)*e;
        pen.setAttribute('cx', x);
        var pct = Math.max(0, Math.min(100, (x - nr.left) / nr.width * 100));
        iscript.style.clipPath = 'inset(-20% ' + (100 - pct).toFixed(2) + '% -20% 0)';
        letters.forEach(function(l){ if(!l.gone && x > l.fx){ l.gone = true; l.s.style.opacity = 0; l.s.classList.add('gone'); snd.tick(k); } });
      }, function(){
        iscript.style.clipPath = 'inset(-20% 0 -20% 0)';
        later(split, 350);
      });
    }

    // 4. the screen splits along the thread and the desk appears
    function split(){
      snd.noise(.9, 'bandpass', 300, .2, 0, 2400, .7);
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
