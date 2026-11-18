/* Process book — the pages in <template id="bookPages"> become a two-page book
   you flip through. On phones the same book is shown one page at a time: the
   view pans across the spread, and pages flip over like a real book. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd, reduce = S.reduce;
  var tpl = $('bookPages'); if(!tpl) return;
  var src = Array.prototype.slice.call(tpl.content.children);
  var mobile = window.matchMedia('(max-width:760px)');
  var bookEl = $('book');

  function page(i){ return src[i].cloneNode(true); }
  function flipSound(){ snd.noise(.32, 'highpass', 1600, .09, 0, 5000); snd.noise(.18, 'bandpass', 500, .05, .12, null, .8); }

  /* ---------- a book of leaves ---------- */
  var leavesEl = $('leaves'), n = (src.length - 2) / 2, leaves = [], cur = 0, faces = [];
  var side = 0; /* phones: 0 = looking at the left page, 1 = the right page */
  function sheet(sd, node, curl){
    var w = document.createElement('div'); w.className = sd;
    w.appendChild(node);
    if(curl){ var c = document.createElement('span'); c.className = 'curl'; c.setAttribute('aria-hidden', 'true'); w.appendChild(c); }
    return w;
  }
  var baseL = document.createElement('div'); baseL.className = 'bk-base l'; var pL = page(0); baseL.appendChild(sheet('sheet-l', pL));
  var baseR = document.createElement('div'); baseR.className = 'bk-base r'; var pR = page(src.length - 1); baseR.appendChild(sheet('sheet-r', pR));
  leavesEl.appendChild(baseL); leavesEl.appendChild(baseR);
  for(var i = 0; i < n; i++){
    var leaf = document.createElement('div'); leaf.className = 'bk-leaf';
    var f = document.createElement('div'); f.className = 'bk-side front'; var pf = page(1 + 2*i); f.appendChild(sheet('sheet-r', pf, true));
    var b = document.createElement('div'); b.className = 'bk-side back'; var pb = page(2 + 2*i); b.appendChild(sheet('sheet-l', pb));
    leaf.appendChild(f); leaf.appendChild(b); leavesEl.appendChild(leaf);
    leaves.push(leaf); faces.push([pf, pb]);
    (function(k, leafEl){
      leafEl.addEventListener('pointerdown', function(e){ if(mobile.matches) return; if(k === cur) startDrag(e, k, 1); else if(k === cur - 1) startDrag(e, k, -1); });
    })(i, leaf);
  }
  baseL.addEventListener('click', function(e){ if(mobile.matches) return; if(!e.target.closest('a,button') && cur > 0) go(cur - 1); });

  /* ---------- drag a page to turn it (desktop) ---------- */
  var drag = null;
  function setFold(leaf, p){
    leaf.style.transform = 'rotateY(' + (-180 * p).toFixed(2) + 'deg)';
    var fold = Math.sin(p * Math.PI);
    leaf.style.setProperty('--fold', fold.toFixed(3));
    baseR.style.setProperty('--under', (p < .5 ? fold : 0).toFixed(3));
  }
  function startDrag(e, k, dir){
    if(e.button !== undefined && e.button !== 0) return;
    if(e.target.closest('a,button')) return;
    var leaf = leaves[k], w = bookEl.getBoundingClientRect().width / 2;
    drag = { k: k, dir: dir, leaf: leaf, x0: e.clientX, w: w, p: dir > 0 ? 0 : 1, moved: false, id: e.pointerId };
    try{ leaf.setPointerCapture(e.pointerId); }catch(err){}
  }
  document.addEventListener('pointermove', function(e){
    if(!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0;
    if(!drag.moved){
      if(Math.abs(dx) < 6) return;
      drag.moved = true; drag.leaf.classList.add('dragging'); drag.leaf.style.zIndex = 200; flipSound();
    }
    drag.p = Math.max(0, Math.min(1, (drag.dir > 0 ? 0 : 1) - dx / (drag.w * 1.6)));
    setFold(drag.leaf, drag.p);
  });
  function endDrag(e){
    if(!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    if(!d.moved){ go(d.dir > 0 ? cur + 1 : cur - 1); return; }
    var commit = d.dir > 0 ? d.p > .32 : d.p < .68, end = (d.dir > 0) === commit ? 1 : 0;
    d.leaf.classList.remove('dragging');
    requestAnimationFrame(function(){
      d.leaf.style.transform = 'rotateY(' + (-180 * end) + 'deg)';
      d.leaf.style.setProperty('--fold', '0'); baseR.style.setProperty('--under', '0');
      setTimeout(function(){
        d.leaf.style.transform = ''; d.leaf.classList.toggle('flipped', end === 1);
        if(commit){ cur += d.dir; stack(); paint(); visible().forEach(function(p){ p.classList.add('show'); }); }
        else stack();
      }, reduce ? 0 : 820);
      if(commit){
        flipSound();
        document.querySelectorAll('#book .pg.show').forEach(function(p){ p.classList.remove('show'); });
      }
    });
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  function stack(){
    leaves.forEach(function(l, i){ l.style.zIndex = i < cur ? 10 + i : 10 + (n - i); });
  }
  function visible(){
    return [cur === 0 ? pL : faces[cur-1][1], cur === n ? pR : faces[cur][0]];
  }
  function go(to){
    to = Math.max(0, Math.min(n, to)); if(to === cur) return;
    var from = cur, step = to > from ? 1 : -1, k = 0;
    document.querySelectorAll('#book .pg.show').forEach(function(p){ p.classList.remove('show'); });
    for(var i = from; i !== to; i += step){
      (function(idx, delay){
        var leaf = leaves[step > 0 ? idx : idx - 1];
        setTimeout(function(){
          leaf.style.zIndex = 100 + delay;
          leaf.classList.toggle('flipped', step > 0);
          flipSound();
        }, delay * 160);
      })(i, k++);
    }
    cur = to;
    setTimeout(function(){ stack(); }, reduce ? 0 : 1100 + k * 160);
    setTimeout(function(){ visible().forEach(function(p){ p.classList.add('show'); }); }, reduce ? 0 : 450 + (k-1) * 160);
    paint();
  }

  /* ---------- phones: one page at a time ---------- */
  var total = 2 * n + 2;
  function pos(){ return cur * 2 + side; }
  function pan(){ bookEl.style.setProperty('--pan', mobile.matches ? side : 0); }
  function mGo(v){
    v = Math.max(0, Math.min(total - 1, v)); if(v === pos()) return;
    var spread = Math.floor(v / 2);
    side = v % 2;
    if(spread !== cur) go(spread);
    else visible().forEach(function(p){ p.classList.add('show'); });
    pan(); paint();
  }
  /* the page follows your finger: drag to pan across the spread, or to turn a leaf */
  var g = null;
  function setPan(v){ bookEl.style.setProperty('--pan', v.toFixed(3)); }
  bookEl.addEventListener('pointerdown', function(e){
    if(!mobile.matches || e.target.closest('a,button')) return;
    g = { x0: e.clientX, y0: e.clientY, id: e.pointerId, mode: null, w: bookEl.parentNode.clientWidth || 320, lx: e.clientX, lt: e.timeStamp, v: 0 };
  });
  document.addEventListener('pointermove', function(e){
    if(!g || e.pointerId !== g.id) return;
    var dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if(!g.mode){
      if(Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if(Math.abs(dy) > Math.abs(dx)){ g = null; return; } /* vertical: let the page scroll */
      if(side === 1 && dx < 0 && cur < n) g.mode = 'fwd';
      else if(side === 0 && dx > 0 && cur > 0) g.mode = 'back';
      else if(side === 0 && dx < 0) g.mode = 'panR';
      else if(side === 1 && dx > 0) g.mode = 'panL';
      else { g.mode = 'none'; }
      bookEl.classList.add('dragging');
      try{ bookEl.setPointerCapture(e.pointerId); }catch(err){}
      if(g.mode === 'fwd' || g.mode === 'back'){
        g.leaf = leaves[g.mode === 'fwd' ? cur : cur - 1];
        g.leaf.classList.add('dragging'); g.leaf.style.zIndex = 200; flipSound();
      }
    }
    var dt = Math.max(1, e.timeStamp - g.lt); g.v = (e.clientX - g.lx) / dt; g.lx = e.clientX; g.lt = e.timeStamp;
    var t;
    if(g.mode === 'fwd'){ t = Math.max(0, Math.min(1, -dx / (g.w * 1.1))); g.p = t; setFold(g.leaf, t); setPan(1 - t); }
    else if(g.mode === 'back'){ t = Math.max(0, Math.min(1, dx / (g.w * 1.1))); g.p = 1 - t; setFold(g.leaf, 1 - t); setPan(t); }
    else if(g.mode === 'panR'){ t = Math.max(0, Math.min(1, -dx / g.w)); g.p = t; setPan(t); }
    else if(g.mode === 'panL'){ t = Math.max(0, Math.min(1, dx / g.w)); g.p = t; setPan(1 - t); }
    else { setPan(side + Math.max(-.06, Math.min(.06, -dx / g.w * .15))); } /* rubber-band at the ends */
  });
  function gEnd(e){
    if(!g || (e && e.pointerId !== g.id)) return;
    var d = g; g = null;
    bookEl.classList.remove('dragging');
    if(!d.mode){ mGo(pos() + 1); return; } /* a tap turns the page */
    var fl = Math.abs(d.v) > .35;
    if(d.mode === 'none'){ pan(); return; }
    if(d.mode === 'panR' || d.mode === 'panL'){
      var done = d.p > .35 || (fl && (d.mode === 'panR' ? d.v < 0 : d.v > 0));
      if(done) side = d.mode === 'panR' ? 1 : 0;
      pan(); paint(); if(done) visible().forEach(function(p){ p.classList.add('show'); });
      return;
    }
    var fwd = d.mode === 'fwd';
    var turned = fwd ? (d.p > .3 || (fl && d.v < 0)) : (d.p < .7 || (fl && d.v > 0));
    var end = fwd === turned ? 1 : 0;
    d.leaf.classList.remove('dragging');
    requestAnimationFrame(function(){
      d.leaf.style.transform = 'rotateY(' + (-180 * end) + 'deg)';
      d.leaf.style.setProperty('--fold', '0'); baseR.style.setProperty('--under', '0');
      if(turned){
        flipSound();
        document.querySelectorAll('#book .pg.show').forEach(function(p){ p.classList.remove('show'); });
        cur += fwd ? 1 : -1; side = fwd ? 0 : 1;
      }
      pan(); paint();
      setTimeout(function(){
        d.leaf.style.transform = ''; d.leaf.classList.toggle('flipped', end === 1);
        stack(); if(turned) visible().forEach(function(p){ p.classList.add('show'); });
      }, reduce ? 0 : 700);
    });
  }
  document.addEventListener('pointerup', gEnd);
  document.addEventListener('pointercancel', gEnd);

  /* ---------- shared controls ---------- */
  var prev = $('bookPrev'), next = $('bookNext'), count = $('bookCount');
  function paint(){
    if(mobile.matches){ var v = pos(); count.textContent = (v + 1) + ' / ' + total; prev.disabled = v === 0; next.disabled = v === total - 1; }
    else { count.textContent = (cur + 1) + ' / ' + (n + 1); prev.disabled = cur === 0; next.disabled = cur === n; }
  }
  prev.addEventListener('click', function(){ if(mobile.matches) mGo(pos() - 1); else go(cur - 1); });
  next.addEventListener('click', function(){ if(mobile.matches) mGo(pos() + 1); else go(cur + 1); });
  document.addEventListener('click', function(e){
    if(!e.target.closest('[data-book-restart]')) return;
    if(mobile.matches) mGo(0); else go(0);
  });
  var inView = false, sec = $('process');
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ inView = es[0].isIntersecting; }, {threshold:.45}).observe(sec);
  window.addEventListener('keydown', function(e){
    if(!inView || e.target.closest('input,textarea,dialog')) return;
    if(e.key === 'ArrowRight'){ e.preventDefault(); next.click(); }
    if(e.key === 'ArrowLeft'){ e.preventDefault(); prev.click(); }
  });
  function onChange(){ pan(); paint(); }
  if(mobile.addEventListener) mobile.addEventListener('change', onChange);
  else if(mobile.addListener) mobile.addListener(onChange);

  var hint = document.querySelector('.book-hint');
  if(hint && mobile.matches) hint.textContent = 'swipe or tap to turn the page';

  stack(); pan(); paint();
  if('IntersectionObserver' in window){
    var first = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ visible().forEach(function(p){ p.classList.add('show'); }); first.disconnect(); } }, {threshold:.3});
    first.observe(bookEl);
  } else visible().forEach(function(p){ p.classList.add('show'); });
})();
