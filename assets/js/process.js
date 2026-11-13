/* Process book — the pages in <template id="bookPages"> become a two-page book
   you flip through (desktop) or a swipeable stack of pages (phones). */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd, reduce = S.reduce;
  var tpl = $('bookPages'); if(!tpl) return;
  var src = Array.prototype.slice.call(tpl.content.children);
  var mobile = window.matchMedia('(max-width:760px)');

  function page(i){ return src[i].cloneNode(true); }
  function flipSound(){ snd.noise(.32, 'highpass', 1600, .09, 0, 5000); snd.noise(.18, 'bandpass', 500, .05, .12, null, .8); }

  /* ---------- desktop: a book of leaves ---------- */
  var leavesEl = $('leaves'), n = (src.length - 2) / 2, leaves = [], cur = 0, faces = [];
  function sheet(side, node, curl){
    var w = document.createElement('div'); w.className = side;
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
    (function(k){
      f.addEventListener('click', function(e){ if(e.target.closest('a,button')) return; if(k === cur) go(cur + 1); });
      b.addEventListener('click', function(e){ if(e.target.closest('a,button')) return; if(k === cur - 1) go(cur - 1); });
    })(i);
  }
  baseL.addEventListener('click', function(){ if(cur > 0) go(cur - 1); });

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

  /* ---------- phones: a swipeable stack ---------- */
  var deck = $('deck'), cards = [];
  src.forEach(function(_, i){
    var c = document.createElement('div'); c.className = 'card';
    var p = page(i); c.appendChild(p); deck.appendChild(c); cards.push(c);
  });
  var deckIdx = 0;
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(en){
        if(en.isIntersecting){ en.target.firstChild.classList.add('show'); deckIdx = cards.indexOf(en.target); if(mobile.matches) paint(); }
      });
    }, {root:deck, threshold:.6});
    cards.forEach(function(c){ io.observe(c); });
  } else cards.forEach(function(c){ c.firstChild.classList.add('show'); });
  function deckTo(i){ i = Math.max(0, Math.min(cards.length - 1, i)); deck.scrollTo({left: cards[i].offsetLeft - (deck.clientWidth - cards[i].offsetWidth)/2, behavior: reduce ? 'auto' : 'smooth'}); }

  /* ---------- shared controls ---------- */
  var prev = $('bookPrev'), next = $('bookNext'), count = $('bookCount');
  function paint(){
    if(mobile.matches){ count.textContent = (deckIdx + 1) + ' / ' + cards.length; prev.disabled = deckIdx === 0; next.disabled = deckIdx === cards.length - 1; }
    else { count.textContent = (cur + 1) + ' / ' + (n + 1); prev.disabled = cur === 0; next.disabled = cur === n; }
  }
  prev.addEventListener('click', function(){ if(mobile.matches) deckTo(deckIdx - 1); else go(cur - 1); });
  next.addEventListener('click', function(){ if(mobile.matches) deckTo(deckIdx + 1); else go(cur + 1); });
  document.addEventListener('click', function(e){
    if(!e.target.closest('[data-book-restart]')) return;
    if(mobile.matches) deckTo(0); else go(0);
  });
  var inView = false, sec = $('process');
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ inView = es[0].isIntersecting; }, {threshold:.45}).observe(sec);
  window.addEventListener('keydown', function(e){
    if(!inView || e.target.closest('input,textarea,dialog')) return;
    if(e.key === 'ArrowRight'){ e.preventDefault(); next.click(); }
    if(e.key === 'ArrowLeft'){ e.preventDefault(); prev.click(); }
  });
  if(mobile.addEventListener) mobile.addEventListener('change', paint);

  stack(); paint();
  /* the opening spread shows its pages once the book scrolls into view */
  if('IntersectionObserver' in window){
    var first = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ visible().forEach(function(p){ p.classList.add('show'); }); first.disconnect(); } }, {threshold:.3});
    first.observe($('book'));
  } else visible().forEach(function(p){ p.classList.add('show'); });
})();
