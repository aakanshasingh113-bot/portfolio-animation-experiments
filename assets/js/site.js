/* Site — case studies, copy email, header state, scroll reveals. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;

  /* case studies */
  var cases = window.CASES || {}, dlg = $('case');
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function openCase(key, color){
    var c = cases[key]; if(!c) return;
    dlg.style.setProperty('--cc', color || '');
    var old = dlg.querySelector('.cs-nda'); if(old) old.remove();
    if(c.nda){ var n = el('p', 'cs-nda', '🔒 This work is under NDA, so names and screens are left out. Happy to walk you through it on a call.'); $('csMeta').after(n); }
    $('csEyebrow').textContent = c.eyebrow; $('csTitle').textContent = c.title; $('csSub').textContent = c.sub;
    var meta = $('csMeta'); meta.innerHTML = '';
    c.meta.forEach(function(m){ var d = el('div'); d.appendChild(el('span','mono',m[0])); d.appendChild(el('span',null,m[1])); meta.appendChild(d); });
    var body = $('csBody'); body.innerHTML = '';
    c.secs.forEach(function(s){
      var sec = el('div','cs-sec'); sec.appendChild(el('span','mono',s[0])); var right = el('div');
      if(Array.isArray(s[1])){ var ul = el('ul'); s[1].forEach(function(li){ ul.appendChild(el('li',null,li)); }); right.appendChild(ul); }
      else right.appendChild(el('p',null,s[1]));
      sec.appendChild(right); body.appendChild(sec);
    });
    snd.whoosh();
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
    dlg.scrollTop = 0;
  }
  document.querySelectorAll('[data-open-case]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var host = btn.closest('[style*="--c"]');
      openCase(btn.dataset.openCase, host ? host.style.getPropertyValue('--c') : '');
    });
  });

  /* featured work: one project open at a time; auto-advances until someone picks one */
  var fw = $('fw');
  if(fw){
    var items = fw.querySelectorAll('.fw-item'), shots = fw.querySelectorAll('.fw-shot'), heads = fw.querySelectorAll('.fw-head');
    var cur = 0, DUR = 7000, t0 = performance.now(), paused = false, auto = !S.reduce, raf = null, inView = false;
    function show(i, user){
      if(user) auto = false;
      if(i === cur && !user) return;
      cur = i; t0 = performance.now();
      items.forEach(function(it, k){ it.classList.toggle('on', k === i); it.style.setProperty('--p', auto ? '0%' : '100%'); });
      heads.forEach(function(h, k){ h.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      shots.forEach(function(sh, k){ sh.classList.toggle('on', k === i); });
      if(user) snd.click();
    }
    heads.forEach(function(h, k){
      h.addEventListener('click', function(){ show(k, true); });
      h.addEventListener('mouseenter', function(){ snd.hover(560 + k*60); });
      h.addEventListener('keydown', function(e){
        if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); var n = (k + (e.key === 'ArrowDown' ? 1 : -1) + heads.length) % heads.length; show(n, true); heads[n].focus(); }
      });
    });
    fw.addEventListener('mouseenter', function(){ paused = true; });
    fw.addEventListener('mouseleave', function(){ paused = false; t0 = performance.now() - (parseFloat(items[cur].style.getPropertyValue('--p')) || 0) / 100 * DUR; });
    (function tick(now){
      if(auto && inView && !paused && !document.hidden){
        var k = Math.min(1, (now - t0) / DUR);
        items[cur].style.setProperty('--p', (k * 100).toFixed(2) + '%');
        if(k >= 1) show((cur + 1) % items.length);
      } else if(paused || !inView){ t0 = now - (parseFloat(items[cur].style.getPropertyValue('--p')) || 0) / 100 * DUR; }
      if(auto) raf = requestAnimationFrame(tick); else items.forEach(function(it){ it.style.setProperty('--p', '100%'); });
    })(performance.now());
    if('IntersectionObserver' in window) new IntersectionObserver(function(en){ inView = en[0].isIntersecting; }, {threshold:.35}).observe(fw); else inView = true;
    if(!auto) items[cur].style.setProperty('--p', '100%');
  }
  $('csClose').addEventListener('click', function(){ dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
  dlg.addEventListener('click', function(e){ if(e.target === dlg && dlg.close) dlg.close(); });

  /* copy email */
  var copyBtn = $('copyBtn'), email = $('email');
  copyBtn.addEventListener('click', function(){
    function done(){ copyBtn.textContent = 'Copied'; snd.chime(); setTimeout(function(){ copyBtn.textContent = 'Copy email'; }, 1800); }
    function fallback(){ var r = document.createRange(); r.selectNodeContents(email); var s = getSelection(); s.removeAllRanges(); s.addRange(r); copyBtn.textContent = 'Selected, press Ctrl+C'; }
    try{ navigator.clipboard.writeText(email.textContent).then(done, fallback); }catch(e){ fallback(); }
  });

  /* header gets a backdrop once you leave the desk */
  var topbar = $('topbar');
  function onScroll(){ topbar.classList.toggle('scrolled', scrollY > 40); }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* highlight the header link for the section in view */
  var links = document.querySelectorAll('.nav a[data-sec]');
  if('IntersectionObserver' in window){
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting) links.forEach(function(a){ a.classList.toggle('active', a.dataset.sec === en.target.id); }); });
    }, {rootMargin:'-45% 0px -50% 0px'});
    ['top','work','process','about','experiments','contact'].forEach(function(id){ var el = $(id); if(el) spy.observe(el); });
  }

  /* reveal sections as they scroll in */
  if('IntersectionObserver' in window){
    var rev = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); rev.unobserve(en.target); } });
    }, {rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.reveal').forEach(function(r){ rev.observe(r); });
  } else document.querySelectorAll('.reveal').forEach(function(r){ r.classList.add('in'); });

  $('year').textContent = new Date().getFullYear();
})();
