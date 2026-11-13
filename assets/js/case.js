/* Case study detail page: renders window.CASES[<body data-case>] into #case. */
(function(){
  var key = document.body.getAttribute('data-case'), c = (window.CASES || {})[key];
  var root = document.getElementById('case');
  if(!c || !root){ if(root) root.innerHTML = '<div class="wrap case-hero"><a class="back" href="index.html#work">← All work</a><h1>Case study not found</h1></div>'; return; }
  document.documentElement.style.setProperty('--c', c.color || '#D9482F');
  document.title = c.title + ' · Aakansha Singh';

  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className = cls; if(txt != null) e.textContent = txt; return e; }
  function add(parent){ for(var i = 1; i < arguments.length; i++) if(arguments[i]) parent.appendChild(arguments[i]); return parent; }

  /* hero */
  var hero = el('header', 'wrap case-hero reveal');
  var back = el('a', 'back', '← All work'); back.href = 'index.html#work';
  var eb = el('p', 'eyebrow-no'); eb.innerHTML = '<i></i><b>Case study</b>'; eb.appendChild(document.createTextNode(c.eyebrow));
  var tags = el('p', 'case-tags'); (c.tags || []).forEach(function(t){ tags.appendChild(el('span', null, t)); });
  add(hero, back, eb, el('h1', null, c.title), el('p', 'lead', c.sub), tags);

  var cover = el('figure', 'case-cover reveal'); cover.style.background = c.hero.bg || '';
  var ci = el('img'); ci.src = c.hero.img; ci.alt = ''; if(c.hero.framed) ci.className = 'framed';
  cover.appendChild(ci);
  var coverWrap = add(el('div', 'wrap wide'), cover);

  var meta = el('dl', 'case-meta wrap reveal');
  c.meta.forEach(function(m){ var d = el('div'); add(d, el('dt', null, m[0]), el('dd', null, m[1])); meta.appendChild(d); });

  /* body: numbered sections, with a sticky contents list on wide screens */
  var body = el('div', 'wrap case-body'), toc = el('nav', 'case-toc'), list = el('div', 'case-secs');
  toc.setAttribute('aria-label', 'Sections');
  var n = 0;
  c.secs.forEach(function(s){
    var label = s[0], content = s[1], fig = s[2];
    if(label === 'Insight' || label === 'Brief'){
      var q = el('section', 'cs-quote reveal');
      add(q, el('span', 'q-label', label), el('blockquote', null, content));
      list.appendChild(q); return;
    }
    n++;
    var id = 's' + n, sec = el('section', 'cs-block reveal'); sec.id = id;
    var no = String(n).padStart(2, '0');
    var lab = el('h2', 'cs-label'); add(lab, el('span', null, no), document.createTextNode(label));
    var right = el('div', 'cs-content');
    if(Array.isArray(content)){ var ul = el('ul'); content.forEach(function(li){ ul.appendChild(el('li', null, li)); }); right.appendChild(ul); }
    else right.appendChild(el('p', null, content));
    if(fig){
      var f = el('figure', 'cs-fig'), im = el('img'); im.src = fig.img; im.alt = fig.cap || ''; im.loading = 'lazy';
      add(f, im, fig.cap ? el('figcaption', null, fig.cap) : null);
      f.addEventListener('click', function(){ zoom(fig.img, fig.cap); });
      right.appendChild(f);
    }
    add(sec, lab, right); list.appendChild(sec);
    var a = el('a', null, no + '  ' + label); a.href = '#' + id; a.dataset.for = id; toc.appendChild(a);
  });
  add(body, toc, list);

  /* next project */
  var nx = (window.CASES || {})[c.next], next = null;
  if(nx){
    next = el('a', 'next-case wrap reveal'); next.href = nx.page; next.style.setProperty('--n', nx.color);
    var txt = el('div'); add(txt, el('span', 'nc-k', 'Next case study'), el('b', null, nx.title), el('span', 'nc-go', 'Read it →'));
    var th = el('span', 'nc-img'); th.style.background = nx.hero.bg || ''; var ti = el('img'); ti.src = nx.hero.img; ti.alt = ''; if(nx.hero.framed) ti.className = 'framed'; th.appendChild(ti);
    add(next, txt, th);
  }
  add(root, hero, coverWrap, meta, body, next);

  /* reading progress + current section in the contents list */
  var bar = document.getElementById('progress');
  function onScroll(){
    var h = document.documentElement.scrollHeight - innerHeight;
    if(bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
    document.getElementById('topbar').classList.toggle('scrolled', scrollY > 40);
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  if('IntersectionObserver' in window){
    var links = toc.querySelectorAll('a');
    var spy = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) links.forEach(function(a){ a.classList.toggle('on', a.dataset.for === e.target.id); }); }); }, {rootMargin:'-40% 0px -55% 0px'});
    list.querySelectorAll('.cs-block').forEach(function(s){ spy.observe(s); });
    var rev = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); rev.unobserve(e.target); } }); }, {rootMargin:'0px 0px -6% 0px'});
    root.querySelectorAll('.reveal').forEach(function(r){ rev.observe(r); });
  } else root.querySelectorAll('.reveal').forEach(function(r){ r.classList.add('in'); });

  /* tap an image to see it larger */
  var zm = null;
  function zoom(src, cap){
    if(!zm){
      zm = el('div', 'zoom'); zm.setAttribute('role', 'dialog'); zm.setAttribute('aria-label', 'Image');
      zm.innerHTML = '<button type="button" aria-label="Close">×</button><img alt=""><p></p>';
      zm.addEventListener('click', function(){ zm.classList.remove('on'); });
      addEventListener('keydown', function(e){ if(e.key === 'Escape') zm.classList.remove('on'); });
      document.body.appendChild(zm);
    }
    zm.querySelector('img').src = src; zm.querySelector('p').textContent = cap || '';
    zm.classList.add('on');
  }

  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
})();
