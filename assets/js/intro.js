/* Intro — "Too much going on." The screen fills with the clutter of a badly
   designed product: popups, banners, badges, buttons that all shout at once.
   Swipe (or move the cursor) through it to clear it away; every piece you
   clear pops. Do nothing and a cursor starts tidying on its own. Whatever is
   left after about 4 seconds is swept away in one go, the word "Better." lands,
   and the calm desk behind it all drops in. The whole thing takes 6 seconds
   at most. Escape, scroll or "Skip" skips it. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;
  var intro = $('intro'), layer = $('ibits'), hint = $('ihint'), count = $('icount'), bot = $('ibot'), done_ = $('idone');
  var desk = $('top'), body = document.body;
  var timers = [], raf = null, done = false, running = false;
  var bits = [], left = 0, total = 0, t0 = 0, lastUser = -9, lastPop = 0, popN = 0, swept = false;
  var CAP = 4.2;   // seconds before the leftovers are swept away

  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
  function rnd(a, b){ return a + Math.random() * (b - a); }
  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }

  /* ---------- the clutter ---------- */
  var KINDS = [
    function(){ return ['btn', pick(['Buy now!', 'Sign up free', 'Click here', 'Learn more', 'Get started', 'Upgrade', 'Accept all', 'Submit', 'Continue', 'Try premium'])]; },
    function(){ return ['badge', pick(['NEW', '99+', 'SALE', 'BETA', 'HOT', '3', '12', 'PRO'])]; },
    function(){ return ['pop', '<b>' + pick(['Allow notifications?', 'We use cookies', 'Wait! Don’t go', 'Are you sure?', 'Rate us', 'Session expired', 'New update!']) + '</b><span><i>Yes</i><i>Later</i></span>']; },
    function(){ return ['input', pick(['Search…', 'Email address', 'Promo code', 'Password (8+ chars, 1 symbol)'])]; },
    function(){ return ['check', '<i></i>' + pick(['I agree to the terms', 'Send me offers', 'Remember me', 'I’m not a robot'])]; },
    function(){ return ['toggle', '<i></i>']; },
    function(){ return ['stars', '★★★☆☆']; },
    function(){ return ['drop', pick(['Select option', 'Choose plan', 'More', 'Language']) + ' ▾']; },
    function(){ return ['banner', pick(['Limited offer, 2h left', 'Free shipping over $50', 'Only 3 left in stock', 'Flash sale ends soon'])]; },
    function(){ return ['toast', pick(['Saved! (probably)', 'Something went wrong', 'Loading…', 'Step 3 of 11'])]; },
    function(){ return ['tabs', '<i>Tab 1</i><i>Tab 2</i><i>Tab 3</i><i>More ▾</i>']; },
    function(){ return ['dot', pick(['?', '!', '✕', 'i'])]; },
    function(){ return ['slider', '<i></i>']; }
  ];

  function build(){
    layer.innerHTML = ''; bits = [];
    var W = innerWidth, H = innerHeight, small = W < 640;
    total = Math.round(Math.max(30, Math.min(78, W * H / (small ? 9000 : 15500))));
    /* spread them on a jittered grid so the whole screen is covered */
    var cols = Math.max(4, Math.round(Math.sqrt(total * W / H))), rows = Math.ceil(total / cols);
    var cw = W / cols, ch = H / rows, n = 0, order = [];
    while(order.length < total){ var deck = KINDS.slice(); for(var q = deck.length - 1; q > 0; q--){ var j = Math.floor(Math.random() * (q + 1)), tmp = deck[q]; deck[q] = deck[j]; deck[j] = tmp; } order = order.concat(deck); }
    for(var r = 0; r < rows; r++) for(var c = 0; c < cols && n < total; c++, n++){
      var k = order[n](), el = document.createElement('div');
      el.className = 'ib ib-' + k[0]; el.innerHTML = k[1];
      var x = (c + .5 + rnd(-.42, .42)) * cw, y = (r + .5 + rnd(-.42, .42)) * ch;
      var rot = rnd(-13, 13), sc = rnd(.85, 1.12) * (small ? .82 : 1);
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--r', rot.toFixed(1) + 'deg'); el.style.setProperty('--s', sc.toFixed(2));
      el.style.setProperty('--d', (n % 9) * 45 + Math.round(rnd(0, 120)) + 'ms');
      el.style.setProperty('--w', rnd(1.6, 2.6).toFixed(2) + 's');
      el.style.zIndex = Math.round(rnd(1, 40));
      layer.appendChild(el);
      bits.push({ el: el, x: x, y: y, gone: false });
    }
    /* measure once they are laid out (half sizes for hit tests) */
    bits.forEach(function(b){
      b.hw = b.el.offsetWidth * .5 + 6; b.hh = b.el.offsetHeight * .5 + 6;
      /* keep most of each piece on screen */
      b.x = Math.min(Math.max(b.x, b.hw * .6), W - b.hw * .6); b.el.style.left = b.x + 'px';
    });
    left = total; paintCount();
  }

  function paintCount(){ count.textContent = left; intro.style.setProperty('--left', (left / total).toFixed(3)); }

  function pop(b, dirx, diry, quiet){
    if(b.gone) return; b.gone = true; left--;
    var a = Math.atan2(diry, dirx), d = rnd(60, 140);
    b.el.style.setProperty('--fx', (Math.cos(a) * d).toFixed(0) + 'px');
    b.el.style.setProperty('--fy', (Math.sin(a) * d - 30).toFixed(0) + 'px');
    b.el.style.setProperty('--fr', rnd(-90, 90).toFixed(0) + 'deg');
    b.el.classList.add('gone');
    var now = performance.now();
    if(!quiet && now - lastPop > 34){ popN++; snd.tone(330 + (popN % 14) * 46, .07, 'sine', .05, 0, 520 + (popN % 14) * 60); lastPop = now; }
    paintCount();
    if(left <= Math.max(2, Math.round(total * .1)) && !swept) sweep();
  }

  /* clear everything near a point */
  function brush(x, y, rad, px, py){
    for(var i = 0; i < bits.length; i++){
      var b = bits[i]; if(b.gone) continue;
      var dx = Math.max(Math.abs(x - b.x) - b.hw, 0), dy = Math.max(Math.abs(y - b.y) - b.hh, 0);
      if(dx * dx + dy * dy < rad * rad) pop(b, b.x - px, b.y - py);
    }
  }

  /* ---------- the self-tidying cursor (when nobody swipes) ---------- */
  var path = [], pathLen = 0;
  function makePath(){
    var W = innerWidth, H = innerHeight, rows = Math.max(3, Math.round(H / 190)), m = 40;
    path = [];
    for(var r = 0; r < rows; r++){
      var y = m + (H - 2 * m) * (r + .5) / rows;
      if(r % 2 === 0){ path.push([m, y], [W - m, y]); } else { path.push([W - m, y], [m, y]); }
    }
    pathLen = 0; for(var i = 1; i < path.length; i++) pathLen += Math.hypot(path[i][0] - path[i-1][0], path[i][1] - path[i-1][1]);
  }
  function along(k){
    var want = k * pathLen;
    for(var i = 1; i < path.length; i++){
      var a = path[i-1], b = path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if(want <= l){ var t = want / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
      want -= l;
    }
    return path[path.length - 1];
  }
  var botK = 0, botOn = false, botPrev = null;

  var lastF = 0;
  function frame(now){
    var time = (now - t0) / 1000, dt = Math.min(.05, (now - (lastF || now)) / 1000); lastF = now;
    /* nobody swiping for a moment: the cursor takes over (and hands back when you move) */
    var idle = time - lastUser > .7;
    if(time > 1.6 && idle && !swept){
      if(!botOn){ botOn = true; bot.classList.add('on'); }
      botK = Math.min(1, botK + dt / 2.8);
      var p = along(botK);
      bot.style.transform = 'translate(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px)';
      brush(p[0], p[1], innerWidth < 640 ? 64 : 84, botPrev ? botPrev[0] : p[0] - 1, botPrev ? botPrev[1] : p[1]);
      botPrev = p;
    } else if(botOn && !idle){ botOn = false; bot.classList.remove('on'); }
    if(time > CAP && !swept) sweep();
    if(running) raf = requestAnimationFrame(frame);
  }

  /* whatever is left flies off in one quick cascade, then "Better." */
  function sweep(){
    if(swept) return; swept = true; botOn = false; bot.classList.remove('on');
    intro.classList.add('swept');
    var rest = bits.filter(function(b){ return !b.gone; }), cx = innerWidth / 2, cy = innerHeight / 2;
    rest.forEach(function(b, i){ later(function(){ pop(b, b.x - cx, b.y - cy, true); }, i * 7); });
    snd.noise(.4, 'bandpass', 700, .14, 0, 3200, .8);
    later(function(){ intro.classList.add('better'); snd.chime(); }, rest.length * 7 + 120);
    later(finish, rest.length * 7 + 800);
  }

  function reveal(){
    desk.classList.remove('ready'); void desk.offsetWidth; desk.classList.add('ready');
    window.dispatchEvent(new Event('deskready'));
  }
  function stop(){ timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); running = false; }
  function finish(){
    if(done) return; done = true; stop();
    intro.classList.add('open'); body.classList.remove('intro-on');
    reveal();
    setTimeout(function(){ if(done){ intro.hidden = true; layer.innerHTML = ''; } }, 650);
  }

  function play(){
    stop(); done = false; swept = false; botK = 0; botOn = false; botPrev = null; lastUser = -9; popN = 0;
    window.scrollTo(0, 0);
    body.classList.add('intro-on'); desk.classList.remove('ready');
    intro.hidden = false; intro.classList.remove('open', 'swept', 'better', 'live');
    bot.classList.remove('on');
    build(); makePath();
    void intro.offsetWidth; intro.classList.add('live');
    t0 = performance.now(); lastF = 0; running = true;
    raf = requestAnimationFrame(frame);
  }

  /* ---------- input: swipe / move through the clutter ---------- */
  var prev = null, down = false;
  function userAt(e, force){
    if(done || swept) return;
    var x = e.clientX, y = e.clientY;
    /* mouse: just moving clears; touch / pen: while the finger is down */
    if(e.pointerType === 'mouse' || down || force){
      var px = prev ? prev[0] : x - 1, py = prev ? prev[1] : y;
      /* fill in fast swipes so nothing in between is skipped */
      var steps = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / 24)), rad = e.pointerType === 'mouse' ? 46 : 40;
      for(var s = 1; s <= steps; s++) brush(px + (x - px) * s / steps, py + (y - py) * s / steps, rad, px, py);
      lastUser = (performance.now() - t0) / 1000;
      if(botOn){ botOn = false; bot.classList.remove('on'); }
    }
    prev = [x, y];
  }
  intro.addEventListener('pointerdown', function(e){
    if(e.target.closest('.skip')) return;
    down = true; prev = [e.clientX, e.clientY];
    /* a tap clears a wider circle */
    if(!done && !swept){ brush(e.clientX, e.clientY, 90, e.clientX, e.clientY + 1); lastUser = (performance.now() - t0) / 1000; }
  });
  intro.addEventListener('pointermove', function(e){ userAt(e); });
  window.addEventListener('pointerup', function(){ down = false; prev = null; });
  window.addEventListener('pointercancel', function(){ down = false; prev = null; });
  intro.addEventListener('pointerleave', function(){ prev = null; });

  $('skipBtn').addEventListener('click', function(e){ e.stopPropagation(); finish(); });
  window.addEventListener('keydown', function(e){
    if(done) return;
    if(e.key === 'Escape'){ finish(); return; }
    if((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button')){ e.preventDefault(); sweep(); }
  });
  window.addEventListener('wheel', function(){ if(!done && running) finish(); }, {passive:true});

  /* ---------- start ---------- */
  function seen(v){ try{ if(v) sessionStorage.setItem('introSeen', '1'); return sessionStorage.getItem('introSeen') === '1'; }catch(e){ return false; } }
  function start(){
    if(done) return;
    /* skip it when motion is reduced, when it has already played this visit, or when arriving on a section link */
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if(S.reduce || seen() || target){
      done = true; intro.hidden = true; body.classList.remove('intro-on'); reveal();
      if(target) requestAnimationFrame(function(){ target.scrollIntoView({behavior:'auto'}); });
      seen(true); return;
    }
    seen(true); play();
  }
  var started = false;
  function go(){ if(!started){ started = true; start(); } }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  setTimeout(go, 1200);

  window.Intro = { play: play, skip: finish };
})();
