/* Intro — a ball of tangled red thread spins on a dark screen. Press and hold
   (or Space, or just wait) and the thread unwinds: its fibres stream out of the
   ball, left to right, and stitch the name together. Let go early and it tangles
   back up. The cursor scatters the fibres; they spring back. When the name is
   complete the fibres settle into the crisp name, in exactly the spot it sits on
   the desk, and the screen splits open. Escape, scroll or "Skip" skips it. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;
  var intro = $('intro'), cv = $('icv'), ctx = cv.getContext('2d'), iname = $('iname'), hint = $('ihint'), bar = $('ibar');
  var desk = $('top'), deskName = $('deskName'), body = document.body;
  var NAME = 'Aakansha Singh';
  var timers = [], raf = null, done = false, running = false;

  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
  function ease(k){ return k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2; }
  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

  function reveal(){
    desk.classList.remove('ready'); void desk.offsetWidth; desk.classList.add('ready');
    window.dispatchEvent(new Event('deskready'));
  }
  function stop(){ timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); running = false; }
  function finish(){
    if(done) return; done = true; stop();
    intro.classList.add('open'); body.classList.remove('intro-on');
    reveal();
    later(function(){ intro.hidden = true; }, 1300);
  }

  /* ---------- scene state ---------- */
  var W, H, dpr, P = [], N = 0, cx, cy, R, shift = 0;
  var prog = 0, holding = false, auto = false, settled = false, settledAt = 0, t0 = 0, last = 0, lastTick = 0;
  var ptr = { x: -9999, y: -9999, on: false };

  function build(){
    W = innerWidth; H = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);

    /* where the name sits on the desk (centred on phones, where the desk name is near the top) */
    var r0 = deskName.getBoundingClientRect(), cs = getComputedStyle(deskName);
    shift = (r0.top + r0.height/2 < H * .3) ? Math.round(H * .44 - (r0.top + r0.height/2)) : 0;
    ['fontFamily','fontWeight','fontSize','letterSpacing','lineHeight','padding'].forEach(function(k){ iname.style[k] = cs[k]; });
    iname.textContent = NAME; iname.style.transform = '';
    iname.style.left = r0.left + 'px'; iname.style.top = (r0.top + shift) + 'px'; iname.style.width = r0.width + 'px'; iname.style.textAlign = 'center';
    var range = document.createRange(); range.selectNodeContents(iname);
    var tr = range.getBoundingClientRect();

    /* sample the name's pixels to get each fibre's destination */
    var fs = parseFloat(cs.fontSize), off = document.createElement('canvas'), oc = off.getContext('2d');
    off.width = W; off.height = H;
    oc.font = cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
    try{ oc.letterSpacing = cs.letterSpacing; }catch(e){}
    var m = oc.measureText(NAME), asc = m.fontBoundingBoxAscent || fs * .8, des = m.fontBoundingBoxDescent || fs * .25;
    var bx = tr.left + (tr.width - m.width) / 2, by = tr.top + (tr.height - (asc + des)) / 2 + asc;
    oc.fillStyle = '#fff'; oc.textBaseline = 'alphabetic'; oc.fillText(NAME, bx, by);
    var step = Math.round(clamp(fs / 52, 2, 3)), img = oc.getImageData(0, 0, W, H).data, T = [];
    var y0 = Math.max(0, Math.floor(tr.top - fs * .4)), y1 = Math.min(H, Math.ceil(tr.bottom + fs * .4));
    for(var y = y0; y < y1; y += step) for(var x = 0; x < W; x += step) if(img[(y * W + x) * 4 + 3] > 140) T.push([x + (Math.random() - .5) * step * .6, y + (Math.random() - .5) * step * .6]);
    T.sort(function(a, b){ return a[0] - b[0]; });
    N = T.length;
    intro.style.setProperty('--cut', Math.round(tr.top + tr.height * .86) + 'px');

    /* the ball sits where the name will be */
    cx = W / 2; cy = tr.top + tr.height / 2; R = clamp(Math.min(W * .26, H * .2), 70, 150);
    hint.style.top = Math.min(H - 120, cy + R + 46) + 'px';

    P = T.map(function(t, i){
      return { tx: t[0], ty: t[1], u: i / Math.max(1, N - 1), ox: 0, oy: 0, vx: 0, vy: 0, sx: 0, sy: 0, z: 0, local: 0, bend: (Math.random() - .5) * 2 };
    });
  }

  /* a point on the yarn ball: a long thread wound around a sphere whose winding axis precesses */
  var K = 23;
  function ballPoint(u, time){
    var th = u * Math.PI * 2 * K, ph = u * Math.PI * 2 * 3.3 + time * .35, tilt = .9 + .5 * Math.sin(u * 17);
    var x = Math.cos(th), y = Math.sin(th) * Math.cos(tilt), z = Math.sin(th) * Math.sin(tilt);
    var c = Math.cos(ph), s = Math.sin(ph), x2 = x * c + z * s, z2 = -x * s + z * c;
    var wob = 1 + .06 * Math.sin(u * 211 + time * 1.3);
    return [cx + x2 * R * wob, cy + y * R * wob * .92, z2];
  }

  function frame(now){
    var dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    var time = (now - t0) / 1000;

    /* progress: holding pulls, letting go early rewinds, waiting pulls on its own */
    if(!auto && !holding && time > 3.2 && prog === 0) auto = true;
    if(!settled){
      if(holding || auto || prog > .86) prog = Math.min(1, prog + dt / (auto && !holding ? 2.6 : 1.7));
      else if(prog > 0) prog = Math.max(0, prog - dt / 1.2);
      intro.classList.toggle('pulling', prog > 0);
      bar.style.transform = 'scaleX(' + prog.toFixed(3) + ')';
      var tick = Math.floor(prog * 16);
      if(tick > lastTick) snd.tone(380 + tick * 34, .05, 'triangle', .035);
      lastTick = tick;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var spread = .55, threadPts = [], allHome = true;
    var settleK = settled ? Math.min(1, (now - settledAt) / 500) : 0;

    for(var i = 0; i < N; i++){
      var p = P[i];
      var local = clamp(prog * (1 + spread) - p.u * spread, 0, 1), e = ease(local);
      var b = ballPoint(p.u, time), x, y;
      if(local <= 0){ x = b[0]; y = b[1]; }
      else{
        /* fibres travel on a gentle arc, like thread being drawn out */
        var mx = (b[0] + p.tx) / 2, my = (b[1] + p.ty) / 2 - 60 * p.bend - 30, a = 1 - e;
        x = a*a*b[0] + 2*a*e*mx + e*e*p.tx; y = a*a*b[1] + 2*a*e*my + e*e*p.ty;
      }
      /* the cursor scatters fibres; springs pull them home */
      if(ptr.on){
        var dx = x + p.ox - ptr.x, dy = y + p.oy - ptr.y, d2 = dx*dx + dy*dy, rr = 90;
        if(d2 < rr*rr && d2 > .01){ var d = Math.sqrt(d2), f = (rr - d) / rr; p.vx += dx / d * f * 3.2; p.vy += dy / d * f * 3.2; }
      }
      p.vx += -p.ox * .06; p.vy += -p.oy * .06; p.vx *= .86; p.vy *= .86; p.ox += p.vx; p.oy += p.vy;
      p.sx = x + p.ox; p.sy = y + p.oy; p.local = local; p.z = local <= 0 ? b[2] : 1;
      if(local < 1) allHome = false;
      if(local < .04) threadPts.push(i);
    }

    /* the still-wound thread: one continuous line through the ball */
    if(threadPts.length > 1){
      ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(229,83,58,.55)'; ctx.beginPath();
      var prev = -2;
      for(var k = 0; k < threadPts.length; k++){ var q = P[threadPts[k]]; if(threadPts[k] !== prev + 1) ctx.moveTo(q.sx, q.sy); else ctx.lineTo(q.sx, q.sy); prev = threadPts[k]; }
      ctx.stroke();
      /* the loose end hanging out of the ball */
      if(prog === 0){
        var endP = P[threadPts[threadPts.length - 1]], sway = Math.sin(time * 1.6) * 10, ex = cx + R + 60, ey = cy + R * .9 + sway;
        ctx.beginPath(); ctx.moveTo(endP.sx, endP.sy);
        ctx.bezierCurveTo(endP.sx + 40, endP.sy + 30, cx + R + 30, cy + R * .5 + sway, ex, ey);
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(229,83,58,.9)'; ctx.stroke();
        ctx.fillStyle = '#E5533A'; ctx.shadowColor = 'rgba(255,110,80,.9)'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(ex, ey, 6 + Math.sin(time * 4) * 1.2, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      }
    }

    /* fibres: red while travelling, settling to cream once the name is whole */
    for(var j = 0; j < N; j++){
      var f2 = P[j], depth = f2.local <= 0 ? .45 + .55 * (f2.z + 1) / 2 : 1;
      var warm = settled ? settleK : clamp(f2.local * 1.2 - .2, 0, 1) * .35;
      var r = Math.round(229 + 15 * warm), g = Math.round(83 + 159 * warm), bl = Math.round(58 + 178 * warm);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + (depth * (f2.local > 0 ? .95 : .8)).toFixed(2) + ')';
      var sz = f2.local > 0 ? 1.9 : 1.3;
      ctx.fillRect(f2.sx - sz/2, f2.sy - sz/2, sz, sz);
    }

    if(!settled && prog >= 1 && allHome) settle(now);
    if(running) raf = requestAnimationFrame(frame);
  }

  function settle(now){
    settled = true; settledAt = now; holding = false; intro.classList.remove('holding');
    snd.chime();
    later(function(){ intro.classList.add('settled'); }, 380);
    later(split, 1250);
  }

  function split(){
    snd.noise(.9, 'bandpass', 300, .2, 0, 2400, .7);
    done = true; running = false; cancelAnimationFrame(raf);
    if(shift){   // phones: glide the name up to where it sits on the desk
      iname.style.transition = 'transform .9s cubic-bezier(.65,0,.25,1), opacity .4s .75s';
      iname.style.transform = 'translateY(' + (-shift) + 'px)';
    }
    intro.classList.add('open'); body.classList.remove('intro-on');
    later(reveal, 250);
    later(function(){ intro.hidden = true; }, 1400);
  }

  function play(){
    stop(); done = false; settled = false; prog = 0; holding = false; auto = false; lastTick = 0;
    window.scrollTo(0, 0);
    body.classList.add('intro-on'); desk.classList.remove('ready');
    intro.hidden = false; intro.classList.remove('open', 'settled', 'pulling', 'holding');
    iname.style.transition = ''; iname.style.transform = '';
    build();
    t0 = last = performance.now(); running = true;
    raf = requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */
  function up(){ holding = false; intro.classList.remove('holding'); }
  intro.addEventListener('pointerdown', function(e){
    if(done || settled || e.target.closest('.skip')) return;
    holding = true; intro.classList.add('holding');
    if(prog === 0) snd.noise(.5, 'bandpass', 400, .14, 0, 1800, .8);
    ptr.x = e.clientX; ptr.y = e.clientY;
  });
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  intro.addEventListener('pointermove', function(e){ ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; });
  intro.addEventListener('pointerleave', function(){ ptr.on = false; });
  $('skipBtn').addEventListener('click', function(e){ e.stopPropagation(); finish(); });
  window.addEventListener('keydown', function(e){
    if(done) return;
    if(e.key === 'Escape'){ finish(); return; }
    if((e.key === ' ' || e.key === 'Enter') && !e.repeat && !e.target.closest('button')){ e.preventDefault(); holding = true; intro.classList.add('holding'); }
  });
  window.addEventListener('keyup', function(e){ if(e.key === ' ' || e.key === 'Enter') up(); });
  window.addEventListener('wheel', function(){ if(!done) finish(); }, {passive:true});
  window.addEventListener('resize', function(){ if(running && !settled && prog === 0) build(); });

  /* ---------- start ---------- */
  function seen(v){ try{ if(v) sessionStorage.setItem('introSeen', '1'); return sessionStorage.getItem('introSeen') === '1'; }catch(e){ return false; } }
  function start(){
    /* skip it when motion is reduced, when it has already played this visit, or when arriving on a section link */
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if(S.reduce || seen() || target){
      done = true; intro.hidden = true; body.classList.remove('intro-on'); reveal();
      if(target) requestAnimationFrame(function(){ target.scrollIntoView({behavior:'auto'}); });
      seen(true); return;
    }
    seen(true); play();
  }
  /* wait for the fonts so the name measures correctly (but never more than 1.5s) */
  var started = false;
  function go(){ if(!started){ started = true; start(); } }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  setTimeout(go, 1500);

  window.Intro = { play: play, skip: finish };
})();
