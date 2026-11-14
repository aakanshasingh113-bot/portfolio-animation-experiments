/* Site — case studies, copy email, header state, scroll reveals. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;

  /* case studies open as their own pages, with a short fade on the way out */
  function goTo(url){
    if(!url) return;
    if(S.reduce){ location.href = url; return; }
    snd.whoosh(); document.body.classList.add('leaving');
    setTimeout(function(){ location.href = url; }, 230);
  }
  document.querySelectorAll('[data-open-case]').forEach(function(el){
    el.addEventListener('click', function(e){
      var c = (window.CASES || {})[el.dataset.openCase]; if(!c) return;
      e.preventDefault(); goTo(c.page);
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
