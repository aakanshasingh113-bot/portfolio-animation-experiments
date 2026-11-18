/* Desk, polished: makes the props feel like real objects and nudges first-time visitors.
   - depth: objects drift slightly against the cursor, each at its own depth
   - weight: a dragged object leans into the direction you pull it, and can be tossed
   - onboarding: if nobody touches anything, one unexplored object wiggles and shows its hint
   - reward: explore the whole desk and a small note unlocks with a way into the work */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd, reduce = S.reduce;
  var stage = $('stage'), desk = $('top'); if(!stage) return;
  var props = Array.prototype.slice.call(document.querySelectorAll('.prop'));
  var fine = window.matchMedia('(pointer:fine)').matches;
  var busy = function(){ return S.root.classList.contains('doodle') || desk.classList.contains('tidy'); };

  /* ---------- depth: a gentle parallax, different per object ---------- */
  var depth = props.map(function(p, i){ return .5 + ((i * 37) % 10) / 10; });   // .5 – 1.4
  var mx = 0, my = 0, cx = 0, cy = 0, inside = false;
  if(fine && !reduce){
    stage.addEventListener('pointermove', function(e){
      var r = stage.getBoundingClientRect(); inside = true;
      mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5;
    });
    stage.addEventListener('pointerleave', function(){ inside = false; mx = my = 0; });
    (function loop(){
      cx += (mx - cx) * .07; cy += (my - cy) * .07;
      if(Math.abs(cx) > .0005 || Math.abs(cy) > .0005 || inside){
        props.forEach(function(p, i){
          if(p.classList.contains('dragging')) return;
          var land = p.firstElementChild && p.querySelector('.land'); if(!land) return;
          land.style.translate = (-cx * 18 * depth[i]).toFixed(2) + 'px ' + (-cy * 14 * depth[i]).toFixed(2) + 'px';
        });
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- weight: lean while dragging, toss on release ---------- */
  props.forEach(function(p){
    var land = p.querySelector('.land'), last = null, vx = 0, vy = 0, lean = 0, down = false, raf = 0;
    p.addEventListener('pointerdown', function(e){
      if(busy()) return; down = true; last = [e.clientX, e.clientY, e.timeStamp]; vx = vy = 0; cancelAnimationFrame(raf);
    });
    p.addEventListener('pointermove', function(e){
      if(!down || !last) return;
      var dt = Math.max(8, e.timeStamp - last[2]);
      vx = vx * .6 + ((e.clientX - last[0]) / dt) * .4; vy = vy * .6 + ((e.clientY - last[1]) / dt) * .4;
      last = [e.clientX, e.clientY, e.timeStamp];
      if(p.classList.contains('dragging') && land){
        lean += (Math.max(-14, Math.min(14, vx * 9)) - lean) * .35;
        land.style.rotate = lean.toFixed(2) + 'deg';
      }
    });
    function up(){
      if(!down) return; down = false;
      var wasDrag = p.classList.contains('dragging') || Math.hypot(vx, vy) > .05;
      /* settle the lean back with a little overshoot */
      if(land){ land.style.transition = 'rotate .5s cubic-bezier(.3,1.8,.5,1)'; land.style.rotate = '0deg'; setTimeout(function(){ land.style.transition = ''; }, 520); lean = 0; }
      var speed = Math.hypot(vx, vy);
      if(!wasDrag || speed < .45 || reduce) return;
      /* a toss: keep sliding with friction, bounce softly off the desk edges */
      var dx = parseFloat(p.style.getPropertyValue('--dx')) || 0, dy = parseFloat(p.style.getPropertyValue('--dy')) || 0;
      var ux = vx * 16, uy = vy * 16;
      (function slide(){
        var r = p.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        if(r.left + ux < sr.left - r.width * .3 || r.right + ux > sr.right + r.width * .3){ ux *= -.45; snd.thud(); }
        if(r.top + uy < sr.top || r.bottom + uy > sr.bottom - 10){ uy *= -.45; snd.thud(); }
        dx += ux; dy += uy; ux *= .9; uy *= .9;
        p.style.setProperty('--dx', dx.toFixed(1) + 'px'); p.style.setProperty('--dy', dy.toFixed(1) + 'px');
        if(Math.hypot(ux, uy) > .4) raf = requestAnimationFrame(slide);
      })();
    }
    p.addEventListener('pointerup', up); p.addEventListener('pointercancel', up);
  });

  /* ---------- onboarding: show, don't tell ---------- */
  var lastTouch = performance.now(), nudges = 0, ready = false;
  function touched(){ lastTouch = performance.now(); }
  stage.addEventListener('pointerdown', touched);
  window.addEventListener('deskready', function(){ ready = true; lastTouch = performance.now(); });
  setInterval(function(){
    if(!ready || busy() || document.hidden || nudges >= 4) return;
    var r = desk.getBoundingClientRect(); if(r.bottom < innerHeight * .5) return;   // only when the desk is on screen
    if(performance.now() - lastTouch < (nudges ? 9000 : 3800)) return;
    var open = props.filter(function(p){ return !p.classList.contains('found'); });
    if(!open.length) return;
    var p = open[(nudges * 3) % open.length];
    p.classList.remove('nudge'); void p.offsetWidth; p.classList.add('nudge');
    snd.hover(660);
    setTimeout(function(){ p.classList.remove('nudge'); }, 2200);
    nudges++; lastTouch = performance.now();
  }, 700);

  /* ---------- reward: the whole desk explored ---------- */
  var note = document.createElement('div'); note.className = 'unlock'; note.hidden = true;
  note.innerHTML = '<b>You checked every corner.</b><span>That curiosity is exactly how I start a project. The real work is just below.</span><a href="#work">See the work ↓</a><button type="button" aria-label="Close">×</button>';
  stage.appendChild(note);
  note.querySelector('button').addEventListener('click', function(){ note.hidden = true; });
  note.querySelector('a').addEventListener('click', function(){ note.hidden = true; });
  var countTxt = $('countTxt'), shown = false;
  if(countTxt && 'MutationObserver' in window){
    new MutationObserver(function(){
      if(!shown && /all\s+\d+/.test(countTxt.textContent)){ shown = true; setTimeout(function(){ note.hidden = false; }, 1400); }
    }).observe(countTxt, {childList:true, characterData:true, subtree:true});
  }
})();
