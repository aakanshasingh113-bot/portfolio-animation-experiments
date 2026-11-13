/* Site — case studies, copy email, header state, scroll reveals. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;

  /* case studies */
  var cases = window.CASES || {}, dlg = $('case'), cards = document.querySelectorAll('.cs');
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
  cards.forEach(function(c){
    c.addEventListener('click', function(){ openCase(c.dataset.case, c.style.getPropertyValue('--c')); });
    c.addEventListener('mouseenter', function(){ snd.hover(620); });
    /* tilt toward the cursor, with a soft sheen where the light hits */
    if(!S.reduce){
      c.addEventListener('pointermove', function(e){
        if(e.pointerType !== 'mouse') return;
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - .5) * 10).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 8).toFixed(2) + 'deg');
        c.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function(){ c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    }
  });
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

  /* reveal sections as they scroll in */
  if('IntersectionObserver' in window){
    var rev = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); rev.unobserve(en.target); } });
    }, {rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.reveal').forEach(function(r){ rev.observe(r); });
  } else document.querySelectorAll('.reveal').forEach(function(r){ r.classList.add('in'); });

  $('year').textContent = new Date().getFullYear();
})();
