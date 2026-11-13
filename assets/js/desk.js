/* Desk — every prop can be dragged around and does something when clicked. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd, music = S.music, reduce = S.reduce, root = S.root;
  var stage = $('stage'), deskEl = $('top'), props = document.querySelectorAll('.prop');
  var TOTAL = props.length, found = {};

  /* ---------- explored counter ---------- */
  var pips = $('pips');
  for(var i = 0; i < TOTAL; i++) pips.appendChild(document.createElement('i'));
  function discover(key){
    var isNew = !found[key]; found[key] = true;
    var n = Object.keys(found).length;
    $('countTxt').textContent = n === TOTAL ? 'desk explored · all ' + TOTAL + ' ✓' : 'desk explored · ' + n + '/' + TOTAL;
    pips.querySelectorAll('i').forEach(function(p, i){ p.classList.toggle('on', i < n); });
    var p = document.querySelector('.prop[data-k="' + key + '"]'); if(p) p.classList.add('found');
    if(isNew && n === TOTAL) setTimeout(celebrate, 500);
  }
  function celebrate(){
    snd.fanfare(); if(reduce) return;
    var colors = ['#D9482F','#F5C33B','#76AE63','#EDB45C','#FBE07A','#2A2927'];
    for(var i = 0; i < 50; i++){
      var d = document.createElement('i'); d.className = 'confetti';
      d.style.left = (Math.random()*100) + '%'; d.style.background = colors[i % colors.length];
      d.style.setProperty('--fx', ((Math.random()-.5)*200) + 'px'); d.style.setProperty('--fr', (Math.random()*720) + 'deg');
      d.style.animationDelay = (Math.random()*.5) + 's'; d.style.borderRadius = i % 3 ? '2px' : '50%';
      stage.appendChild(d); setTimeout(function(x){ return function(){ x.remove(); }; }(d), 3200);
    }
  }

  /* ---------- drag anything; a click without a drag is a tap ---------- */
  var z = 10, pitch = {badge:523, coffee:659, notes:740, receipt:830, photos:880, tape:587, folder:698, plant:784, window:932, post:988, pencil:1046};
  function draggable(el, onTap){
    var sx, sy, ox, oy, active = false, moved = false;
    el.addEventListener('pointerdown', function(e){
      if(root.classList.contains('doodle') || deskEl.classList.contains('tidy') || (e.button !== undefined && e.button !== 0)) return;
      active = true; moved = false; sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.style.getPropertyValue('--dx')) || 0; oy = parseFloat(el.style.getPropertyValue('--dy')) || 0;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function(e){
      if(!active) return; var dx = e.clientX - sx, dy = e.clientY - sy;
      if(!moved && Math.abs(dx) + Math.abs(dy) > 6){ moved = true; el.classList.add('dragging'); el.style.zIndex = ++z; snd.pop(); }
      if(moved){ el.style.setProperty('--dx', (ox+dx) + 'px'); el.style.setProperty('--dy', (oy+dy) + 'px'); }
    });
    function end(){ if(!active) return; active = false; el.classList.remove('dragging'); if(moved) snd.thud(); else { el.style.zIndex = ++z; onTap(); } }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('click', function(e){ if(e.detail === 0 && !deskEl.classList.contains('tidy')) onTap(); });   // keyboard
  }
  props.forEach(function(p){ p.addEventListener('mouseenter', function(){ snd.hover(pitch[p.dataset.k] || 700); }); });

  /* badge: swing on the lanyard and flip */
  var badgeArt = document.querySelector('#pBadge .badge');
  draggable($('pBadge'), function(){
    badgeArt.classList.remove('swing'); void badgeArt.offsetWidth; badgeArt.classList.add('swing');
    $('badgeCard').classList.toggle('flipped'); snd.whoosh(); discover('badge');
  });

  /* coffee: sip it down, then refill */
  var sips = 0, level = $('coffeeLevel'), latte = $('latte'), radii = [31, 24, 16, 0];
  draggable($('pCoffee'), function(){
    if(sips >= 3){ sips = 0; snd.noise(.5,'lowpass',600,.12,0,2400); $('coffeeTag').textContent = 'take a sip'; }
    else { sips++; snd.sip(); if(sips === 3) $('coffeeTag').textContent = 'refill?'; }
    level.setAttribute('r', radii[sips]);
    latte.style.transform = sips ? 'rotate(' + (sips*70) + 'deg) scale(' + (1 - sips*.3) + ')' : '';
    latte.style.opacity = sips >= 2 ? 0 : 1;
    discover('coffee');
  });

  /* sticky notes: peel off a user quote you can drag around */
  var quotes = [
    ['“Wait, where do I pay?”','user 4 · checkout test'],
    ['“I just want to see my balance.”','user 2 · interview'],
    ['“Is this even a button?”','user 7 · usability test'],
    ['“I gave up and called support.”','user 1 · interview'],
    ['“Why is it asking me this again?”','user 5 · diary study']
  ], qi = 0, notesOut = [];
  draggable($('pNotes'), function(){
    var pad = $('pNotes'), sr = stage.getBoundingClientRect(), pr = pad.getBoundingClientRect();
    var n = document.createElement('div'); n.className = 'sticky'; var q = quotes[qi++ % quotes.length];
    n.appendChild(document.createTextNode(q[0])); var sm = document.createElement('small'); sm.textContent = q[1]; n.appendChild(sm);
    n.style.left = (pr.left - sr.left) + 'px'; n.style.top = (pr.top - sr.top) + 'px';
    stage.appendChild(n);
    var tx = 140 + Math.random()*70, ty = -10 + Math.random()*90, rot = (Math.random()-.5)*16;
    if(sr.width < 980){ tx = (Math.random()-.5)*60; ty = -160; }
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ n.style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + rot + 'deg)'; }); });
    snd.peel();
    var b = [tx, ty, rot], nsx, nsy, act = false;
    n.addEventListener('pointerdown', function(e){ act = true; nsx = e.clientX; nsy = e.clientY; n.setPointerCapture(e.pointerId); n.classList.add('dragging'); });
    n.addEventListener('pointermove', function(e){ if(act) n.style.transform = 'translate(' + (b[0]+e.clientX-nsx) + 'px,' + (b[1]+e.clientY-nsy) + 'px) rotate(' + b[2] + 'deg)'; });
    n.addEventListener('pointerup', function(e){ if(!act) return; act = false; b = [b[0]+e.clientX-nsx, b[1]+e.clientY-nsy, b[2]]; n.classList.remove('dragging'); });
    notesOut.push(n);
    if(notesOut.length > 3){ var old = notesOut.shift(); old.style.opacity = 0; setTimeout(function(){ old.remove(); }, 400); }
    discover('notes');
  });

  /* receipt: print another line item */
  var extra = [['User tests','x60'],['Edge cases','all'],['Figma layers','named'],['Design systems','x1'],['Croissants','x∞']], ri = 0;
  var lines = $('receiptLines'), baseCount = lines.children.length;
  draggable($('pReceipt'), function(){
    if(ri >= extra.length){
      while(lines.children.length > baseCount) lines.lastChild.remove();
      ri = 0; $('receiptTag').textContent = 'print more'; snd.peel();
    } else {
      var li = document.createElement('li'); li.className = 'new';
      var a = document.createElement('span'); a.textContent = extra[ri][0]; var b = document.createElement('span'); b.textContent = extra[ri][1];
      li.appendChild(a); li.appendChild(b); lines.appendChild(li); ri++; snd.print();
      if(ri >= extra.length) $('receiptTag').textContent = 'tear it off';
    }
    discover('receipt');
  });

  /* photos: shuffle the top one to the back */
  var stack = $('photoStack'), shuffling = false;
  draggable($('pPhotos'), function(){
    if(shuffling) return; shuffling = true;
    var topPol = stack.lastElementChild; topPol.classList.add('out'); snd.whoosh();
    setTimeout(function(){ stack.insertBefore(topPol, stack.firstElementChild); requestAnimationFrame(function(){ topPol.classList.remove('out'); shuffling = false; }); }, 380);
    discover('photos');
  });

  /* cassette: lo-fi on and off */
  draggable($('pTape'), function(){
    var t = $('pTape'); snd.click();
    if(music.playing) music.stop();
    else if(music.start()){ t.classList.add('playing'); t.setAttribute('aria-pressed','true'); $('tapeTag').textContent = 'pause'; }
    else $('tapeTag').textContent = 'turn sound on first';
    discover('tape');
  });

  /* folder: open to fan out the work, open again to go to it */
  var folder = $('folder');
  draggable($('pFolder'), function(){
    if(folder.classList.contains('opened')){
      folder.classList.remove('opened'); $('folderTag').textContent = 'open my work';
      $('work').scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
    } else {
      folder.classList.add('opened'); $('folderTag').textContent = 'take me to the work →'; snd.peel();
    }
    discover('folder');
  });

  /* plant: water it, ship a new version */
  var leaves = document.querySelectorAll('#pPlant .leaf'), grown = 2;
  draggable($('pPlant'), function(){
    if(grown >= leaves.length){ leaves.forEach(function(l, i){ l.classList.toggle('on', i < 1); }); grown = 1; snd.whoosh(); }
    else { leaves[grown].classList.add('on'); grown++; snd.pluck(grown); }
    $('ver').textContent = grown >= leaves.length ? 'v5 · shipped ✓' : 'v' + grown;
    discover('plant');
  });

  /* about.md: type out a page, click for the next */
  var pages = [
    ['# aakansha.singh', 'role:    product designer', 'exp:     3 years', 'status:  open to roles', '// click for more'],
    ['# how I think', '1. find where people give up', '2. keep their exact words', '3. prototype by day three', '// mess in, clarity out'],
    ['# currently', 'designing: checkout flows', 'learning:  Rive + motion', 'drinking:  too much coffee', '// drag me anywhere']
  ], page = 0, typer = null, winBody = $('winBody');
  function typePage(lines){
    clearInterval(typer); winBody.textContent = '';
    var text = lines.join('\n'), i = 0;
    function paint(n){
      winBody.textContent = '';
      text.slice(0, n).split('\n').forEach(function(line, li, arr){
        var s = document.createElement('span');
        if(line.indexOf('#') === 0) s.className = 'k'; else if(line.indexOf('//') === 0) s.className = 'c';
        s.textContent = line + (li < arr.length - 1 ? '\n' : ''); winBody.appendChild(s);
      });
      var c = document.createElement('span'); c.className = 'cur'; winBody.appendChild(c);
    }
    if(reduce){ paint(text.length); return; }
    typer = setInterval(function(){ i += 2; paint(i); if(i % 6 === 0) snd.tone(1800 + Math.random()*400, .015, 'square', .012); if(i >= text.length){ clearInterval(typer); paint(text.length); } }, 22);
  }
  draggable($('pWindow'), function(){ page = (page + 1) % pages.length; typePage(pages[page]); discover('window'); });
  window.addEventListener('deskready', function(){ page = 0; setTimeout(function(){ typePage(pages[0]); }, reduce ? 0 : 1200); });

  /* postcard: flip it */
  draggable($('pPost'), function(){ $('post').classList.toggle('flipped'); snd.whoosh(); discover('post'); });

  /* pencil: doodle on the desk */
  var cv = $('draw'), ctx = cv.getContext('2d'), strokes = [], cur = null, lastScratch = 0;
  function resizeCanvas(){ var dpr = window.devicePixelRatio || 1; cv.width = stage.clientWidth*dpr; cv.height = stage.clientHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); redraw(); }
  function redraw(){
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#D9482F';
    strokes.forEach(function(pts){ if(pts.length < 2) return; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for(var i = 1; i < pts.length-1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0]+pts[i+1][0])/2, (pts[i][1]+pts[i+1][1])/2);
      ctx.lineTo(pts[pts.length-1][0], pts[pts.length-1][1]); ctx.stroke(); });
  }
  function pos(e){ var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener('pointerdown', function(e){ cv.setPointerCapture(e.pointerId); cur = [pos(e)]; strokes.push(cur); });
  cv.addEventListener('pointermove', function(e){ if(!cur) return; cur.push(pos(e)); redraw(); var now = performance.now(); if(now - lastScratch > 70){ lastScratch = now; snd.noise(.06,'bandpass',3200,.05,0,null,2); } });
  cv.addEventListener('pointerup', function(){ cur = null; }); cv.addEventListener('pointercancel', function(){ cur = null; });
  function setDoodle(on){
    root.classList.toggle('doodle', on); $('drawbar').hidden = !on; $('pPencil').setAttribute('aria-pressed', on ? 'true' : 'false');
    if(on){ resizeCanvas(); snd.tone(880,.08,'triangle',.06); snd.tone(1320,.1,'triangle',.05,.06); } else snd.click();
  }
  draggable($('pPencil'), function(){ setDoodle(!root.classList.contains('doodle')); discover('pencil'); });
  $('dropBtn').addEventListener('click', function(){ setDoodle(false); });
  $('clearBtn').addEventListener('click', function(){ strokes = []; redraw(); snd.noise(.25,'highpass',2000,.08,0,500); });
  window.addEventListener('keydown', function(e){ if(e.key === 'Escape' && root.classList.contains('doodle')) setDoodle(false); });
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();


  /* ---------- modes: Play keeps the desk, Tidy up sweeps every prop to the nearest edge ---------- */
  var modes = $('modes'), thumb = modes.querySelector('.thumb'), modeBtns = modes.querySelectorAll('button');
  var tidyOff = new Map();
  function paintThumb(){
    var on = modes.querySelector('[aria-pressed="true"]');
    thumb.style.width = on.offsetWidth + 'px'; thumb.style.transform = 'translateX(' + (on.offsetLeft - 4) + 'px)';
  }
  function placeTidy(){
    var sr = stage.getBoundingClientRect(), W = sr.width, H = sr.height, sides = {l:[], r:[]};
    props.forEach(function(p){
      var r = p.getBoundingClientRect(), o = tidyOff.get(p) || [0,0];
      var cx = r.left + r.width/2 - sr.left - o[0], cy = r.top + r.height/2 - sr.top - o[1];
      (cx < W/2 ? sides.l : sides.r).push({p:p, cx:cx, cy:cy, w:r.width, h:p.offsetHeight * .84});
    });
    // keep the two edges balanced
    while(sides.l.length - sides.r.length > 1){ sides.l.sort(function(a,b){ return b.cx - a.cx; }); sides.r.push(sides.l.shift()); }
    while(sides.r.length - sides.l.length > 1){ sides.r.sort(function(a,b){ return a.cx - b.cx; }); sides.l.push(sides.r.shift()); }
    ['l','r'].forEach(function(side){
      /* stack down the edge by real heights, spreading any spare room evenly */
      var list = sides[side].sort(function(a,b){ return a.cy - b.cy; }), n = list.length;
      var top = H * .1, avail = H * .86, sum = list.reduce(function(t, it){ return t + it.h; }, 0), gap = (avail - sum) / n, y = top + gap/2;
      list.forEach(function(it, i){
        var ty = y + it.h/2; y += it.h + gap;
        var tx = side === 'l' ? it.w * .18 : W - it.w * .18;
        var dx = tx - it.cx, dy = ty - it.cy, rot = ((i * 37 + (side === 'l' ? 11 : 23)) % 28) - 14;
        tidyOff.set(it.p, [dx, dy]);
        it.p.style.setProperty('--tx', dx.toFixed(1) + 'px'); it.p.style.setProperty('--ty', dy.toFixed(1) + 'px');
        it.p.style.setProperty('--tr', rot + 'deg'); it.p.style.setProperty('--ts', '.84');
        it.p.style.setProperty('--peek', side === 'l' ? '22px' : '-22px');
        it.p.style.transitionDelay = (i * 45 + (side === 'l' ? 0 : 20)) + 'ms';
      });
    });
  }
  function setMode(mode, quiet){
    var tidy = mode === 'tidy';
    if(tidy && root.classList.contains('doodle')) setDoodle(false);
    modeBtns.forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.mode === mode ? 'true' : 'false'); });
    paintThumb();
    if(tidy){ placeTidy(); deskEl.classList.add('tidy'); if(!quiet && innerWidth <= 980) window.scrollTo({top:0, behavior: reduce ? 'auto' : 'smooth'}); }
    else {
      deskEl.classList.remove('tidy'); tidyOff.clear();
      props.forEach(function(p, i){ p.style.transitionDelay = (i * 35) + 'ms'; ['--tx','--ty','--tr','--ts','--peek'].forEach(function(v){ p.style.removeProperty(v); }); });
    }
    setTimeout(function(){ props.forEach(function(p){ p.style.transitionDelay = ''; }); }, 1000);
    S.store('deskMode', mode);
    if(!quiet){ if(tidy){ snd.noise(.6, 'bandpass', 900, .16, 0, 300, .8); snd.noise(.4, 'highpass', 2500, .06, .15, 900); } else { snd.whoosh(); snd.pop(); } }
  }
  modeBtns.forEach(function(b){ b.addEventListener('click', function(){ if(b.getAttribute('aria-pressed') !== 'true') setMode(b.dataset.mode); }); });
  props.forEach(function(p){ p.addEventListener('click', function(){ if(deskEl.classList.contains('tidy')) setMode('play'); }); });
  window.addEventListener('resize', function(){ paintThumb(); if(deskEl.classList.contains('tidy')) placeTidy(); });
  window.addEventListener('deskready', function(){
    paintThumb();
    if(S.store('deskMode') === 'tidy') setTimeout(function(){ setMode('tidy', true); }, reduce ? 0 : 1100);
  });
  paintThumb();

  $('replayBtn').addEventListener('click', function(){ if(window.Intro) window.Intro.play(); });
})();
