import '@fontsource-variable/geist';
import '@fontsource/geist-mono/400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { pillars, films, slots, toolGroups } from './data/project.js';

document.documentElement.classList.add('js');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const filmOrder = pillars.flatMap((p) => p.parameters.map((x) => x.film));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ */
/* Small render helpers                                                */
/* ------------------------------------------------------------------ */

const img = (src, alt, w, h, extra = '') =>
  `<img src="${src}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async" ${extra}/>`;

const SCREEN = [587, 1031];
const POSTER = [588, 927];

/** Shows a rectangular region (fractions of the image) of a larger image. */
const crop = (src, alt, [x, y, w, h], ratio) =>
  `<div class="crop" style="--cx:${x};--cy:${y};--cw:${w};--ch:${h};${ratio ? `aspect-ratio:${ratio}` : ''}">${img(src, alt, ...SCREEN)}</div>`;

const filmButton = (id) => {
  const f = films[id];
  return `<button class="film-trigger" type="button" data-film="${id}">
    ${img(f.poster, `Film still from “${f.title}”`, ...POSTER)}
    <span class="play" aria-hidden="true"></span>
    <span class="visually-hidden">Play film: ${esc(f.title)} (${esc(f.pillar)})</span>
  </button>`;
};

const placeholder = (need, label = 'Asset to be added') =>
  `<div class="placeholder" role="img" aria-label="Placeholder: ${esc(need)}">
     <span class="placeholder__label">${label}</span>
     <span class="placeholder__need">${esc(need)}</span>
   </div>`;

/* ------------------------------------------------------------------ */
/* Hero stage                                                          */
/* ------------------------------------------------------------------ */

function renderHero() {
  const stage = $('[data-hero-stage]');
  // Order: centre the Drive Transparency screen (middle pillar)
  stage.innerHTML = pillars
    .map((p, i) => `<figure class="stage__item" data-pos="${i - 2}">
        <img src="${p.screen}" alt="${esc(p.name)} pillar screen" width="${SCREEN[0]}" height="${SCREEN[1]}" ${i === 2 ? 'fetchpriority="high"' : 'decoding="async"'} />
        <figcaption class="stage__label">${p.number} ${esc(p.name)}</figcaption>
      </figure>`)
    .join('');
  const hero = $('.hero');
  const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
  const first = $('img', stage.children[2]);
  if (first.complete) ready(); else { first.addEventListener('load', ready, { once: true }); setTimeout(ready, 1200); }
}

/* ------------------------------------------------------------------ */
/* Optional asset slots                                                 */
/* ------------------------------------------------------------------ */

function renderSlots() {
  $$('[data-slot]').forEach((el) => {
    const asset = slots[el.dataset.slot];
    if (asset && asset.src) {
      el.innerHTML = `<figure class="slot-figure">${img(asset.src, asset.alt || '', 1200, 900)}${asset.caption ? `<figcaption>${esc(asset.caption)}</figcaption>` : ''}</figure>`;
    } else {
      el.innerHTML = placeholder(el.dataset.slotNeed || 'Project asset');
    }
  });
}

/* ------------------------------------------------------------------ */
/* Challenge: dense list of every pillar + parameter                   */
/* ------------------------------------------------------------------ */

function renderDenseList() {
  const el = $('[data-dense-list]');
  el.innerHTML = pillars
    .map((p) => `<b>${p.name}</b>${p.parameters.map((x) => `${x.name} — ${x.story}<br>`).join('')}`)
    .join('');
}

function renderRoleDoc() {
  const el = $('[data-role-doc]');
  el.innerHTML = pillars
    .slice(0, 3)
    .map((p) => `<b>${p.number} ${p.name}</b>${p.parameters.map((x, i) => `<i>${i === 0 ? `<mark>${x.name}</mark>` : x.name}</i>`).join('')}`)
    .join('') + '<b>04 Green Growth</b><i>…</i>';
}

/* ------------------------------------------------------------------ */
/* IA diagram (desktop tree + mobile accordion)                         */
/* ------------------------------------------------------------------ */

function renderIA() {
  const el = $('[data-ia-diagram]');
  const param = (x) => `<li class="ia-param">
      <div><b>${x.name}</b><span>${x.story}</span></div>
      ${img(films[x.film].poster, '', ...POSTER, 'aria-hidden="true"')}
    </li>`;
  el.innerHTML = `
    <div class="ia-root"><span>Oman Vision 2040</span></div>
    <ol class="ia-cols" aria-label="Five pillars">
      ${pillars.map((p) => `<li class="ia-col">
        <div class="ia-pillar"><small>Pillar ${p.number}</small><strong>${p.name}</strong><em>${p.theme}</em></div>
        <ul class="ia-params" aria-label="${p.name} parameters">${p.parameters.map(param).join('')}</ul>
      </li>`).join('')}
    </ol>
    <div class="ia-mobile">
      ${pillars.map((p, i) => `<details ${i === 0 ? 'open' : ''}>
        <summary><span><small>Pillar ${p.number}</small><strong>${p.name}</strong></span></summary>
        <ul class="ia-params">${p.parameters.map(param).join('')}</ul>
      </details>`).join('')}
    </div>`;
  // Hide whichever version isn't displayed from assistive tech (both are CSS-switched)
  const mq = window.matchMedia('(max-width: 900px)');
  const sync = () => {
    $('.ia-cols', el).toggleAttribute('aria-hidden', mq.matches);
    $('.ia-mobile', el).toggleAttribute('aria-hidden', !mq.matches);
  };
  sync(); mq.addEventListener('change', sync);
}

/* ------------------------------------------------------------------ */
/* Iteration 02 podcast preview                                        */
/* ------------------------------------------------------------------ */

function renderAudio() {
  const el = $('[data-audio-player]');
  const a = slots.podcastAudio;
  const title = a?.title || 'Cybersecurity & Data Protection Success Stories';
  const bars = Array.from({ length: 48 }, (_, i) => {
    const h = 25 + Math.round(60 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));
    return `<i style="--h:${h}%"></i>`;
  }).join('');
  const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';

  el.innerHTML = `
    <button class="audio__btn" type="button" ${a ? '' : 'disabled'} aria-label="Play podcast: ${esc(title)}">${playIcon}</button>
    <p class="audio__title">${esc(title)}</p>
    <p class="audio__meta">AI-generated podcast · NotebookLM</p>
    <div class="audio__wave" aria-hidden="true">${bars}</div>
    ${a ? `<input class="audio__seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Seek podcast" />`
        : `<p class="audio__note">Audio file not yet added — the title above is taken from the original podcast screen.</p>`}`;
  if (!a) return;

  const audio = new Audio(a.src);
  audio.preload = 'metadata';
  const btn = $('.audio__btn', el);
  const seek = $('.audio__seek', el);
  const barsEl = $$('.audio__wave i', el);
  const paint = () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    seek.value = pct;
    const n = Math.round((pct / 100) * barsEl.length);
    barsEl.forEach((b, i) => b.classList.toggle('is-played', i < n));
  };
  btn.addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  audio.addEventListener('play', () => { btn.innerHTML = pauseIcon; btn.setAttribute('aria-label', `Pause podcast: ${title}`); });
  audio.addEventListener('pause', () => { btn.innerHTML = playIcon; btn.setAttribute('aria-label', `Play podcast: ${title}`); });
  audio.addEventListener('timeupdate', paint);
  seek.addEventListener('input', () => { if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration; });
}

/* ------------------------------------------------------------------ */
/* Iteration 03 films                                                  */
/* ------------------------------------------------------------------ */

function renderIt3Films() {
  const el = $('[data-it3-films]');
  el.innerHTML = pillars[4].parameters
    .map((x) => `<figure class="reveal">${filmButton(x.film)}<figcaption><b>${x.story}</b>${x.name}</figcaption></figure>`)
    .join('');
}

/* ------------------------------------------------------------------ */
/* 06 — pillars gallery, journey, demo                                  */
/* ------------------------------------------------------------------ */

function renderPillarsGallery() {
  $('[data-pillars-gallery]').innerHTML = pillars
    .map((p) => `<li class="pillar-card">
      <button class="zoomable" type="button" data-zoom="${p.screen}" data-zoom-alt="${esc(p.name)} pillar screen">
        ${img(p.screen, `${p.name} pillar screen, showing the ${p.parameters[p.screenParameter].name} parameter`, ...SCREEN)}
        <span class="zoom-hint" aria-hidden="true">Expand</span>
      </button>
      <p class="pillar-card__meta"><span>${p.number}</span><strong>${p.name}</strong><em>${p.theme}</em></p>
    </li>`)
    .join('');
}

function renderJourney() {
  const p0 = pillars[0];
  const ring = (x, y, w, h) => `<span class="focus-ring" style="--x:${x}%;--y:${y}%;--w:${w}%;--h:${h}%" aria-hidden="true"></span>`;
  const steps = [
    { title: 'Select a pillar', visual: img(p0.screen, 'Invest in People screen with the pillar navigation tabs highlighted', ...SCREEN) + ring(14, 8, 72, 5) },
    { title: 'Explore a parameter', visual: img(p0.screen, 'Invest in People screen with the parameter carousel highlighted', ...SCREEN) + ring(17, 60, 66, 14) },
    { title: 'Watch a film', visual: filmButton(p0.parameters[0].film) },
    { title: 'Continue exploring', visual: img(pillars[3].screen, 'Green Growth pillar screen', ...SCREEN) + ring(14, 8, 72, 5) },
  ];
  $('[data-journey]').innerHTML = steps
    .map((s, i) => `<li class="journey__step reveal">
        <div class="journey__visual">${s.visual}</div>
        <h4><span>0${i + 1}</span>${s.title}</h4>
      </li>`)
    .join('');
  $('[data-journey]').insertAdjacentHTML('afterend', `<p class="journey__loop reveal" aria-hidden="true">
    <svg viewBox="0 0 520 22" preserveAspectRatio="none"><path d="M516 2v10H6V2M2 8l4-6 4 6" /></svg>Back to any pillar</p>`);
}

function renderDemo() {
  const root = $('[data-demo]');
  let pi = 0;
  let fi = pillars[0].screenParameter;

  root.innerHTML = `
    <div class="demo__tabs" role="tablist" aria-label="Pillars">
      ${pillars.map((p, i) => `<button class="demo__tab" type="button" role="tab" id="demo-tab-${i}" aria-controls="demo-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span>${p.number}</span>${p.name}</button>`).join('')}
    </div>
    <figure class="demo__screen" aria-live="polite">
      <img src="${pillars[0].screen}" width="${SCREEN[0]}" height="${SCREEN[1]}" alt="" loading="lazy" decoding="async" />
      <figcaption>Original screen</figcaption>
    </figure>
    <div class="demo__panel" id="demo-panel" role="tabpanel"></div>`;

  const tabs = $$('.demo__tab', root);
  const screen = $('.demo__screen', root);
  const screenImg = $('img', screen);
  const panel = $('.demo__panel', root);

  const drawPanel = () => {
    const p = pillars[pi];
    panel.setAttribute('aria-labelledby', `demo-tab-${pi}`);
    panel.innerHTML = `
      <h4>${p.name}</h4>
      <p>${p.theme} · three parameters</p>
      <div class="demo__params" role="group" aria-label="${p.name} parameters">
        ${p.parameters.map((x, i) => `<button class="demo__param" type="button" aria-pressed="${i === fi}" data-i="${i}">
          ${img(films[x.film].poster, '', ...POSTER, 'aria-hidden="true"')}
          <span><b>${x.name}</b><small>${x.story}</small></span><i>Selected</i>
        </button>`).join('')}
      </div>
      <figure class="demo__film">
        ${filmButton(p.parameters[fi].film)}
        <figcaption>Film · ${p.parameters[fi].story}</figcaption>
      </figure>`;
    $$('.demo__param', panel).forEach((b) => b.addEventListener('click', () => { fi = +b.dataset.i; drawPanel(); $(`.demo__param[data-i="${fi}"]`, panel).focus(); }));
  };

  const select = (i, focus) => {
    pi = i;
    fi = pillars[i].screenParameter;
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
    if (focus) tabs[i].focus();
    screen.classList.add('is-swapping');
    const p = pillars[i];
    const next = new Image();
    next.src = p.screen;
    const swap = () => {
      screenImg.src = p.screen;
      screenImg.alt = `${p.name} pillar screen`;
      $('figcaption', screen).textContent = `Original screen · showing ${p.parameters[p.screenParameter].name}`;
      screen.classList.remove('is-swapping');
    };
    next.decode ? next.decode().then(swap, swap) : swap();
    drawPanel();
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (k) { e.preventDefault(); select((pi + k + tabs.length) % tabs.length, true); }
      if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
    });
  });
  screenImg.alt = `${pillars[0].name} pillar screen`;
  $('figcaption', screen).textContent = `Original screen · showing ${pillars[0].parameters[0].name}`;
  drawPanel();
}

function initHotspots() {
  const spots = $$('[data-hotspot]');
  const items = $$('[data-hotspot-item]');
  const set = (i) => {
    spots.forEach((s) => s.classList.toggle('is-active', s.dataset.hotspot === String(i)));
    items.forEach((it) => it.classList.toggle('is-active', it.dataset.hotspotItem === String(i)));
  };
  spots.forEach((s) => {
    s.addEventListener('mouseenter', () => set(s.dataset.hotspot));
    s.addEventListener('focus', () => set(s.dataset.hotspot));
    s.addEventListener('click', () => { set(s.dataset.hotspot); $(`[data-hotspot-item="${s.dataset.hotspot}"]`).scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' }); });
  });
  items.forEach((it) => it.addEventListener('mouseenter', () => set(it.dataset.hotspotItem)));
  set(0);
}

/* ------------------------------------------------------------------ */
/* 07 — storyboards, roots, duration, gallery                          */
/* ------------------------------------------------------------------ */

function renderStoryboards() {
  const picks = [0, 1, 3]; // pillars whose supplied screen shows the matching parameter
  $('[data-storyboards]').innerHTML = picks
    .map((pi) => {
      const p = pillars[pi];
      const x = p.parameters[p.screenParameter];
      return `<article class="storyboard">
        <ol class="storyboard__chain reveal">
          <li><small>Pillar</small><p>${p.name}</p></li>
          <li><small>Parameter</small><p>${x.name}</p></li>
          <li><small>Story</small><p>${x.story}</p></li>
          <li class="is-quote"><small>On-screen line</small><p>“${x.screenLine}”</p></li>
        </ol>
        <figure class="storyboard__ui reveal">
          ${crop(p.screen, `${p.name} screen: the ${x.name} story with its headline and Watch Video button`, [0.05, 0.14, 0.9, 0.45])}
          <figcaption>In the interface</figcaption>
        </figure>
        <figure class="storyboard__film reveal">
          ${filmButton(x.film)}
          <figcaption>Film · ${x.story}</figcaption>
        </figure>
      </article>`;
    })
    .join('');
  $$('.storyboard__ui .crop').forEach((c) => { c.style.aspectRatio = `${0.9 * SCREEN[0]} / ${0.45 * SCREEN[1]}`; });
}

function renderRoots() {
  const items = [
    { theme: 'Architecture', film: '01-2', alt: 'A carved wooden lattice screen casting patterned light over a classroom' },
    { theme: 'Landscapes', film: '04-3', alt: 'Two men in dishdashas and safety vests kneeling beside a solar-powered sensor under trees at dusk' },
    { theme: 'People', film: '05-2', alt: 'A visiting leader greeted with a tray of dates at the foot of an aircraft stairway' },
    { theme: 'Infrastructure', film: '02-1', alt: 'A container truck at a port with cranes and the sea behind' },
  ];
  $('[data-roots]').innerHTML = items
    .map((it) => `<li class="reveal"><figure>
        ${img(films[it.film].poster, it.alt, ...POSTER)}
        <figcaption><b>${it.theme}</b><span>${films[it.film].title}</span></figcaption>
      </figure></li>`)
    .join('');
}

function renderTimeline() {
  const el = $('[data-timeline]');
  const strip = slots.filmstrip;
  const f = films[strip.film];
  const ruler = `<div class="ruler" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<span>${i}s</span>`).join('')}</div>`;
  if (strip.frames && strip.frames.length) {
    el.innerHTML = `<div class="timeline__frames" role="img" aria-label="Sequential frames from the film ${esc(f.title)}, one per second">
        ${strip.frames.map((src) => `<img src="${src}" alt="" loading="lazy" decoding="async" />`).join('')}
      </div>${ruler}
      <p class="eyebrow" style="margin-top:1rem">Frames from “${esc(f.title)}”</p>`;
  } else {
    el.innerHTML = `<div class="timeline__single">
        ${filmButton(f.id)}
        <div class="timeline__band">
          <div><strong>One film, one idea</strong><p>“${esc(f.title)}” — ${esc(f.parameter)}, ${esc(f.pillar)}</p></div>
          <span class="placeholder__label">Sequential frames to be added from the original film</span>
        </div>
      </div>${ruler}`;
  }

  const visit = [pillars[0].parameters[0], pillars[3].parameters[1], pillars[1].parameters[0], pillars[4].parameters[2]];
  $('[data-visit]').innerHTML = visit
    .map((x, i) => `${i ? '' : ''}<li>${img(films[x.film].poster, '', ...POSTER, 'aria-hidden="true"')}<small>${x.story}</small></li>`)
    .join('<li class="is-gap" aria-hidden="true">→</li>');
}

function renderGallery() {
  const rail = $('[data-film-gallery]');
  rail.innerHTML = filmOrder
    .map((id) => {
      const f = films[id];
      const p = pillars.find((x) => x.name === f.pillar);
      return `<li class="film-card" data-pillar="${p.id}"><figure>
        ${filmButton(id)}
        <figcaption><b>${f.title}</b><span>${f.parameter}</span><small>${p.number} · ${f.pillar}</small></figcaption>
      </figure></li>`;
    })
    .join('');

  const filters = $('[data-gallery-filters]');
  filters.innerHTML = [{ id: 'all', name: 'All films' }, ...pillars]
    .map((p, i) => `<button class="filter" type="button" aria-pressed="${i === 0}" data-filter="${p.id}">${p.name}</button>`)
    .join('');
  $$('.filter', filters).forEach((b) =>
    b.addEventListener('click', () => {
      $$('.filter', filters).forEach((x) => x.setAttribute('aria-pressed', x === b));
      $$('.film-card', rail).forEach((c) => { c.hidden = b.dataset.filter !== 'all' && c.dataset.pillar !== b.dataset.filter; });
      rail.scrollTo({ left: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      updateRailControls('films');
    }),
  );
}

/* ------------------------------------------------------------------ */
/* 08 — production stages + tools                                      */
/* ------------------------------------------------------------------ */

function renderStages() {
  const ex = pillars[3]; // worked example: Green Growth → Waste Innovation → Smart Recycling Hub
  const exParam = ex.parameters[ex.screenParameter];
  const variations = slots.imageVariations.length
    ? slots.imageVariations.map((v) => img(v.src, v.alt, ...POSTER)).join('')
    : placeholder('Generated image variations / composition explorations') + placeholder('Prompt or concept notes');

  const editVisual = slots.editingTimeline
    ? `<figure>${img(slots.editingTimeline.src, slots.editingTimeline.alt, 1600, 700)}<figcaption>Editing timeline</figcaption></figure>`
    : `${placeholder('Screenshot of the Adobe Express edit: clips, sound and transitions')}
       <div class="tracks" role="img" aria-label="Schematic of the post-production stage: video clips, transitions and a sound track">
         <div class="track track--v"><span>Clips</span><div class="track__lane"><i style="--f:1.2"></i><i style="--f:.9"></i><i style="--f:1.1"></i></div></div>
         <div class="track track--t"><span>Transitions</span><div class="track__lane"><i style="--f:1.12"></i><i class="x"></i><i style="--f:.8"></i><i class="x"></i><i style="--f:1"></i></div></div>
         <div class="track track--a"><span>Sound</span><div class="track__lane"><i></i></div></div>
         <p class="tracks__note">Schematic of the stage — not a screenshot of the original edit.</p>
       </div>`;

  const stages = [
    {
      title: 'Research and narrative',
      desc: 'Initiative research, central message and visual conceptualisation.',
      steps: ['Researching individual initiatives', 'Identifying the central message', 'Conceptualising visual narratives'],
      visual: `<div class="brief">
          <div><small>Pillar</small><p>${ex.name}</p></div>
          <div><small>Parameter</small><p>${exParam.name}</p></div>
          <div><small>Story</small><p>${exParam.story}</p></div>
          <div class="brief__questions"><span>Q1 What is Oman working towards?</span><span>Q2 What progress has been made?</span><span>Q3 How can we communicate this?</span></div>
        </div>`,
    },
    {
      title: 'Image generation',
      desc: 'Generating imagery, exploring compositions and refining visual concepts.',
      steps: ['Generating and refining imagery'],
      visual: `<div class="gen">
          <figure>${img(films[exParam.film].poster, `Selected visual for “${exParam.story}”`, ...POSTER)}<figcaption>Selected imagery · ${exParam.story}</figcaption></figure>
          <div class="gen__variations">${variations}</div>
        </div>`,
    },
    {
      title: 'Motion generation',
      desc: 'Developing motion sequences from selected visual material.',
      steps: ['Creating motion sequences'],
      visual: `<div class="motion">${ex.parameters.map((x) => `<figure>${filmButton(x.film)}<figcaption>${x.story}</figcaption></figure>`).join('')}</div>`,
    },
    {
      title: 'Post-production',
      desc: 'Editing and merging clips, integrating sound and adding transitions.',
      steps: ['Editing and merging video clips', 'Integrating sound and transitions'],
      visual: `<div class="edit">${editVisual}</div>`,
    },
    {
      title: 'Final implementation',
      desc: 'Curating and integrating the completed films into the interactive experience.',
      steps: ['Final curation and implementation'],
      visual: `<div class="final-impl">
          <figure class="final-impl__screen">${img(ex.screen, `${ex.name} screen with the Watch Video button that opens the film`, ...SCREEN)}</figure>
          <figure>${crop(ex.screen, `Close-up: “${exParam.story}” headline and the coral Watch Video button`, [0.62, 0.26, 0.36, 0.12])}<figcaption>“Watch Video” opens the film</figcaption></figure>
        </div>`,
    },
  ];

  let stepNo = 0;
  $('[data-stages]').innerHTML = stages
    .map((s, i) => `<li class="stage-row">
        <div class="stage-row__head reveal">
          <p class="stage-row__n">Stage 0${i + 1}</p>
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
          <ol class="stage-row__steps" aria-label="Workflow steps">${s.steps.map((t) => `<li><span>0${++stepNo}</span>${t}</li>`).join('')}</ol>
        </div>
        <div class="stage-row__visual reveal">${s.visual}</div>
      </li>`)
    .join('');
  $$('.final-impl .crop').forEach((c) => { c.style.aspectRatio = `${0.36 * SCREEN[0]} / ${0.12 * SCREEN[1]}`; });
}

function renderTools() {
  $('[data-tools]').innerHTML = toolGroups
    .map((g) => `<div class="tools__group reveal"><h4>${g.group}</h4><ul>${g.tools.map((t) => `<li><b>${t.name}</b><span>${t.use}</span></li>`).join('')}</ul></div>`)
    .join('');
}

/* ------------------------------------------------------------------ */
/* 09 — matrix of all 15 stories                                       */
/* ------------------------------------------------------------------ */

function renderMatrix() {
  $('[data-matrix]').innerHTML = pillars
    .map((p) => `<div class="matrix__col"><h3><span>${p.number}</span>${p.name}</h3>
      <ul>${p.parameters.map((x) => `<li>${filmButton(x.film)}</li>`).join('')}</ul></div>`)
    .join('');
}

/* ------------------------------------------------------------------ */
/* Film player dialog                                                  */
/* ------------------------------------------------------------------ */

const player = $('[data-player]');
let currentFilm = null;
let lastTrigger = null;

function openFilm(id) {
  currentFilm = id;
  const f = films[id];
  $('[data-player-meta]', player).textContent = `${f.pillar} · ${f.parameter}`;
  $('[data-player-title]', player).textContent = f.title;
  const stage = $('[data-player-stage]', player);
  if (f.video) {
    stage.innerHTML = `<video controls playsinline preload="metadata" poster="${f.poster}" src="${f.video}"></video>`;
    const v = $('video', stage);
    v.play().catch(() => {});
  } else {
    stage.innerHTML = `<img src="${f.poster}" alt="Still from the film “${esc(f.title)}”" width="${POSTER[0]}" height="${POSTER[1]}" />
      <p class="player__missing"><b>Still frame</b>The original video file hasn't been added to this case study yet.</p>`;
  }
  if (!player.open) player.showModal();
}

function closeFilm() {
  const v = $('video', player);
  if (v) v.pause();
  player.close();
}

function initPlayer() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-film]');
    if (t && !player.contains(t)) { lastTrigger = t; openFilm(t.dataset.film); }
  });
  $('[data-close]', player).addEventListener('click', closeFilm);
  player.addEventListener('click', (e) => { if (e.target === player) closeFilm(); });
  player.addEventListener('close', () => {
    const v = $('video', player);
    if (v) v.pause();
    $('[data-player-stage]', player).innerHTML = '';
    lastTrigger?.focus({ preventScroll: true });
  });
  $$('[data-player-step]', player).forEach((b) =>
    b.addEventListener('click', () => {
      const i = filmOrder.indexOf(currentFilm);
      openFilm(filmOrder[(i + +b.dataset.playerStep + filmOrder.length) % filmOrder.length]);
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */

function initLightbox() {
  const box = $('[data-lightbox]');
  const im = $('[data-lightbox-img]', box);
  let last = null;
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-zoom]');
    if (!t) return;
    last = t;
    const source = $('img', t);
    // the inner <img> src is already base-resolved by Vite; data-zoom is a fallback
    const src = source?.currentSrc || source?.src || t.dataset.zoom;
    im.src = src;
    im.alt = t.dataset.zoomAlt || source?.alt || '';
    // never upscale beyond 1.5× the native resolution
    const nw = source?.naturalWidth || +source?.getAttribute('width') || 1200;
    box.style.setProperty('--nw', `${Math.round(nw * 1.5)}px`);
    im.classList.toggle('is-wide', nw / (source?.naturalHeight || 1) > 2.5);
    box.showModal();
  });
  $('[data-close]', box).addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('close', () => last?.focus({ preventScroll: true }));
}

/* ------------------------------------------------------------------ */
/* Rails (pillars + films)                                             */
/* ------------------------------------------------------------------ */

function updateRailControls(name) {
  const rail = $(`[data-rail="${name}"]`);
  const ctr = $(`[data-rail-controls="${name}"]`);
  if (!rail || !ctr) return;
  const [prev, next] = $$('button', ctr);
  prev.disabled = rail.scrollLeft <= 4;
  next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
}

function initRails() {
  $$('[data-rail-controls]').forEach((ctr) => {
    const name = ctr.dataset.railControls;
    const rail = $(`[data-rail="${name}"]`);
    $$('button', ctr).forEach((b) =>
      b.addEventListener('click', () => {
        const card = [...rail.children].find((c) => !c.hidden);
        const step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 0) : 300;
        const n = Math.max(1, Math.floor(rail.clientWidth / step) - 1);
        rail.scrollBy({ left: +b.dataset.dir * step * n, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }),
    );
    rail.addEventListener('scroll', () => updateRailControls(name), { passive: true });
    window.addEventListener('resize', () => updateRailControls(name));
    updateRailControls(name);
  });
}

/* ------------------------------------------------------------------ */
/* Navigation: progress, active section, top bar theme, TOC sheet      */
/* ------------------------------------------------------------------ */

function initNav() {
  const bar = $('.progress');
  const top = $('.topbar');
  const menu = $('.topbar__menu');
  const toc = $('#toc');
  const current = $('[data-current-section]');
  const links = $$('#toc a');
  const sections = $$('[data-section]');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.setProperty('--p', p.toFixed(4));
      top.classList.toggle('is-solid', h.scrollTop > 40);
      toc.classList.toggle('is-hero', h.scrollTop < window.innerHeight * 0.6);
      // top bar adapts to the tone of the section underneath it
      const under = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= 60 && r.bottom > 60; });
      top.classList.toggle('is-light', !!under && (under.classList.contains('tone-ivory') || under.classList.contains('tone-stone')) && h.scrollTop > 40);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        current.textContent = en.target.dataset.section;
        links.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${id}`));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => io.observe(s));

  const setOpen = (open) => {
    menu.setAttribute('aria-expanded', open);
    toc.classList.toggle('is-open', open);
    if (open) links[0].focus();
  };
  menu.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
  links.forEach((a) => a.addEventListener('click', () => { if (menu.getAttribute('aria-expanded') === 'true') setOpen(false); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setOpen(false); menu.focus(); } });
  document.addEventListener('click', (e) => { if (!toc.contains(e.target) && !menu.contains(e.target) && toc.classList.contains('is-open')) setOpen(false); });
}

/* ------------------------------------------------------------------ */
/* Reveal on scroll + restrained parallax on the hero stage            */
/* ------------------------------------------------------------------ */

function initReveal() {
  const els = $$('.reveal, .mask-reveal');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  els.forEach((e) => io.observe(e));
}

function initParallax() {
  if (reducedMotion.matches) return;
  const stage = $('[data-hero-stage]');
  const hero = $('.hero');
  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const y = window.scrollY;
      if (y > hero.offsetHeight) return;
      stage.style.transform = `translate3d(0, ${(y * -0.06).toFixed(1)}px, 0)`;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ------------------------------------------------------------------ */

renderHero();
renderSlots();
renderDenseList();
renderRoleDoc();
renderIA();
renderAudio();
renderIt3Films();
renderPillarsGallery();
renderJourney();
renderDemo();
initHotspots();
renderStoryboards();
renderRoots();
renderTimeline();
renderGallery();
renderStages();
renderTools();
renderMatrix();
initPlayer();
initLightbox();
initRails();
initNav();
initReveal();
initParallax();
