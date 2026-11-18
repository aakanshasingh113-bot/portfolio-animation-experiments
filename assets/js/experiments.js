/* AI experiments — Images / Videos / Games tabs, an image viewer, hover-play videos,
   and a player that opens each game inside the site. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd, reduce = S.reduce;

  /* ---------- tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#expTabs [role="tab"]')), thumb = document.querySelector('#expTabs .thumb');
  function paintThumb(){
    var on = tabs.filter(function(t){ return t.getAttribute('aria-selected') === 'true'; })[0];
    if(!on || !on.offsetWidth) return;
    thumb.style.width = on.offsetWidth + 'px'; thumb.style.transform = 'translateX(' + (on.offsetLeft - 4) + 'px)';
  }
  function select(t, focus){
    tabs.forEach(function(x){
      var on = x === t, panel = $(x.getAttribute('aria-controls'));
      x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
      panel.hidden = !on; panel.classList.toggle('on', on);
    });
    if(focus) t.focus();
    paintThumb(); snd.click();
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ select(t); });
    t.addEventListener('keydown', function(e){
      if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){ e.preventDefault(); select(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length], true); }
    });
  });
  window.addEventListener('resize', paintThumb);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(paintThumb);
  paintThumb();

  function close(d){ if(d.close) d.close(); else d.removeAttribute('open'); }
  function open(d){ if(d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  document.querySelectorAll('dialog [data-close]').forEach(function(b){ b.addEventListener('click', function(){ close(b.closest('dialog')); }); });

  /* ---------- image viewer ---------- */
  var pins = Array.prototype.slice.call(document.querySelectorAll('.pin')), lb = $('lightbox'), lbImg = $('lbImg'), lbCap = $('lbCap'), cur = 0;
  function show(i){
    cur = (i + pins.length) % pins.length;
    var img = pins[cur].querySelector('img'), cap = pins[cur].querySelector('.pin-cap');
    lbImg.src = img.src; lbImg.alt = img.alt; lbCap.innerHTML = cap.innerHTML;
  }
  pins.forEach(function(p, i){
    p.addEventListener('click', function(){ show(i); open(lb); snd.whoosh(); });
    p.addEventListener('mouseenter', function(){ snd.hover(600 + i * 70); });
  });
  $('lbPrev').addEventListener('click', function(){ show(cur - 1); snd.click(); });
  $('lbNext').addEventListener('click', function(){ show(cur + 1); snd.click(); });
  lb.addEventListener('click', function(e){ if(e.target === lb) close(lb); });
  lb.addEventListener('keydown', function(e){
    if(e.key === 'ArrowLeft'){ e.preventDefault(); show(cur - 1); }
    if(e.key === 'ArrowRight'){ e.preventDefault(); show(cur + 1); }
  });

  /* ---------- videos: set data-src on a .vid to turn its placeholder into a real video ---------- */
  document.querySelectorAll('.vid').forEach(function(f){
    var src = f.getAttribute('data-src'); if(!src) return;
    var frame = f.querySelector('.vid-frame'), v = document.createElement('video');
    v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata';
    v.setAttribute('aria-label', f.querySelector('figcaption b').textContent);
    frame.innerHTML = ''; frame.appendChild(v); f.classList.add('has-video');
    f.addEventListener('mouseenter', function(){ if(!reduce) v.play().catch(function(){}); });
    f.addEventListener('mouseleave', function(){ v.pause(); });
    v.addEventListener('click', function(){ v.muted = false; v.controls = true; if(v.requestFullscreen) v.requestFullscreen().catch(function(){}); v.play().catch(function(){}); });
  });

  /* ---------- games open in a player inside the site ---------- */
  var gd = $('gameDlg'), frame = $('gameFrame');
  document.querySelectorAll('[data-game]').forEach(function(b){
    b.addEventListener('click', function(){
      var url = 'assets/ai/games/' + b.dataset.game + '.html';
      $('gameTitle').innerHTML = b.dataset.title; $('gameNewTab').href = url;
      frame.src = url; open(gd); snd.pop();
      setTimeout(function(){ try{ frame.focus(); }catch(e){} }, 300);
    });
  });
  gd.addEventListener('click', function(e){ if(e.target === gd) close(gd); });
  gd.addEventListener('close', function(){ frame.src = 'about:blank'; });
})();
