/* Lights out. A pull cord hangs over the desk. Pull it and the room goes dark,
   your cursor becomes a torch, and the torch picks up what was written on the desk
   in invisible ink: the thinking behind each object, and a sketched flow of how
   the work actually happens. The name turns into a neon sign. Pull again for lights. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd, reduce = S.reduce;
  var stage = $('stage'), desk = $('top'); if(!stage) return;

  var INK = {
    badge:   'job one: solve the right problem',
    coffee:  'most edge cases are found after 11pm',
    notes:   'their words > my opinions',
    receipt: 'itemise the trade-offs',
    tape:    'headphones on = do not disturb',
    folder:  'tools change. the thinking doesn\'t.',
    plant:   'ship v1, keep watering',
    window:  'write it down before drawing it',
    post:    'remote-friendly since 2022',
    pencil:  'sketch ugly, decide fast'
  };
  var FLOW = ['notes', 'window', 'pencil', 'folder', 'plant'];   // listen → define → sketch → build → ship
  var STEPS = ['listen', 'define', 'sketch', 'build', 'ship'];

  /* ---------- the cord ---------- */
  var cord = document.createElement('button');
  cord.type = 'button'; cord.className = 'cord'; cord.setAttribute('aria-pressed', 'false'); cord.setAttribute('aria-label', 'Pull the light cord');
  cord.innerHTML = '<span class="cord-line"></span><span class="cord-knob"></span><span class="cord-tag">pull me</span>';
  stage.appendChild(cord);

  /* ---------- the dark and the invisible ink ---------- */
  var dark = document.createElement('div'); dark.className = 'dark'; dark.setAttribute('aria-hidden', 'true');
  var uv = document.createElement('div'); uv.className = 'uv'; uv.setAttribute('aria-hidden', 'true');
  var svgNS = 'http://www.w3.org/2000/svg', flow = document.createElementNS(svgNS, 'svg'); flow.setAttribute('class', 'uv-flow');
  uv.appendChild(flow);
  stage.appendChild(dark); stage.appendChild(uv);

  var notes = [];
  document.querySelectorAll('.prop').forEach(function(p){
    var k = p.dataset.k; if(!INK[k]) return;
    var n = document.createElement('span'); n.className = 'uv-note'; n.textContent = INK[k];
    uv.appendChild(n); notes.push({p:p, n:n, k:k});
  });
  var nm = $('deskName'), nameNote = document.createElement('span');
  nameNote.className = 'uv-note big'; nameNote.textContent = 'kerning checked at 2am. twice.'; uv.appendChild(nameNote);
  var stepEls = STEPS.map(function(s, i){ var e = document.createElement('span'); e.className = 'uv-step'; e.textContent = (i + 1) + '. ' + s; uv.appendChild(e); return e; });
  var corner = document.createElement('span'); corner.className = 'uv-corner'; corner.textContent = 'the process, under the polish →'; uv.appendChild(corner);

  function rel(el){ var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return {x:r.left - s.left, y:r.top - s.top, w:r.width, h:r.height}; }

  function layout(){
    var W = stage.clientWidth, H = stage.clientHeight, small = W < 760;
    notes.forEach(function(o, i){
      var r = rel(o.p.querySelector('.art') || o.p);
      /* put the note under the object, or above it near the bottom edge */
      var below = r.y + r.h + 54 < H;
      o.n.style.left = Math.max(8, Math.min(W - 170, r.x + r.w / 2 - 80)) + 'px';
      o.n.style.top = (below ? r.y + r.h + 8 : r.y - 52) + 'px';
      o.n.style.transform = 'rotate(' + ((i % 3) - 1) * 3 + 'deg)';
      o.r = r;
    });
    var roleEl = document.querySelector('.desk .role') || nm; if(roleEl){ var r = rel(roleEl); nameNote.style.left = (r.x + r.w / 2 - 120) + 'px'; nameNote.style.top = (r.y + r.h + 14) + 'px'; }
    /* the flow: dashed arrows between objects, numbered steps on each */
    var pts = FLOW.map(function(k){ var o = notes.filter(function(n){ return n.k === k; })[0]; return o ? [o.r.x + o.r.w / 2, o.r.y + o.r.h / 2] : null; }).filter(Boolean);
    var d = '';
    for(var i = 1; i < pts.length; i++){
      var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 60;
      d += 'M' + a[0] + ' ' + a[1] + ' Q' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1] + ' ';
    }
    flow.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    flow.innerHTML = '<defs><marker id="uvArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>'
      + pts.slice(1).map(function(b, i){ var a = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 60; return '<path d="M' + a[0] + ' ' + a[1] + ' Q' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1] + '" marker-end="url(#uvArrow)"/>'; }).join('');
    stepEls.forEach(function(e, i){ var p = pts[i]; if(!p){ e.style.display = 'none'; return; } e.style.display = ''; e.style.left = (p[0] - 20) + 'px'; e.style.top = (p[1] - 18) + 'px'; });
    corner.style.left = (small ? 16 : 28) + 'px'; corner.style.top = (small ? 84 : 96) + 'px';
  }

  /* ---------- the torch ---------- */
  var on = false, tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, hasPointer = false;
  stage.addEventListener('pointermove', function(e){ var s = stage.getBoundingClientRect(); tx = e.clientX - s.left; ty = e.clientY - s.top; hasPointer = true; });
  stage.addEventListener('pointerdown', function(e){ var s = stage.getBoundingClientRect(); tx = e.clientX - s.left; ty = e.clientY - s.top; hasPointer = true; });
  function frame(){
    if(!on) return;
    if(!hasPointer){ /* no cursor yet (phones): the torch drifts by itself until you touch */
      var t = performance.now() / 1000; tx = stage.clientWidth * (.5 + .3 * Math.sin(t * .6)); ty = stage.clientHeight * (.5 + .22 * Math.sin(t * .9));
    }
    cx += (tx - cx) * .22; cy += (ty - cy) * .22;
    stage.style.setProperty('--tx', cx.toFixed(1) + 'px'); stage.style.setProperty('--ty', cy.toFixed(1) + 'px');
    layout();
    raf = requestAnimationFrame(frame);
  }

  function setLights(off){
    on = off; cord.setAttribute('aria-pressed', off ? 'true' : 'false');
    cord.querySelector('.cord-tag').textContent = off ? 'lights on' : 'pull me';
    desk.classList.toggle('lights-off', off);
    /* the click of a pull switch, then a low hum while it's dark */
    if(snd.tone){ snd.tone(off ? 900 : 1300, .04, 'square', .05); snd.noise(.08, 'highpass', 2500, .06, .02); }
    if(off){
      if(S.root.classList.contains('doodle')){ var d = $('dropBtn'); if(d) d.click(); }
      cx = tx = hasPointer ? tx : stage.clientWidth / 2; cy = ty = hasPointer ? ty : stage.clientHeight / 2;
      layout(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    } else cancelAnimationFrame(raf);
  }

  /* pull: drag the knob down (it springs back) or just click it */
  var pulling = false, y0 = 0, pulled = 0;
  cord.addEventListener('pointerdown', function(e){ pulling = true; y0 = e.clientY; pulled = 0; cord.setPointerCapture(e.pointerId); e.stopPropagation(); });
  cord.addEventListener('pointermove', function(e){
    if(!pulling) return; pulled = Math.max(0, Math.min(70, e.clientY - y0));
    cord.style.setProperty('--pull', pulled + 'px');
  });
  function release(){
    if(!pulling) return; pulling = false;
    cord.style.setProperty('--pull', '0px'); cord.classList.remove('spring'); void cord.offsetWidth; cord.classList.add('spring');
    setLights(!on);
  }
  cord.addEventListener('pointerup', release); cord.addEventListener('pointercancel', function(){ pulling = false; cord.style.setProperty('--pull', '0px'); });
  cord.addEventListener('click', function(e){ e.stopPropagation(); if(e.detail === 0) setLights(!on); });   // keyboard
  window.addEventListener('resize', function(){ if(on) layout(); });
  window.addEventListener('keydown', function(e){ if(e.key === 'Escape' && on) setLights(false); });
  /* turning the desk tidy brings the lights back */
  document.querySelectorAll('#modes button').forEach(function(b){ b.addEventListener('click', function(){ if(on) setLights(false); }); });
})();
