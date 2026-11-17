/*
 * WRONG ANSWERS ONLY — question system.
 *
 * Every question instance is plain data:
 *   { id, category, prompt, options: [{id,label},{id,label}], correctId,
 *     visual, explanation, meta }
 *
 * Factual truth lives ONLY in `correctId`. The active game rule (wrong/normal)
 * is applied elsewhere (see winningOptionId). Correctness is never inferred
 * from button position or display text.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WAOQuestions = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CATEGORIES = ['arithmetic', 'compare', 'shapes', 'dots', 'facts'];

  function randInt(random, min, max) {
    return min + Math.floor(random() * (max - min + 1));
  }
  function pick(random, list) {
    return list[Math.floor(random() * list.length)];
  }
  function shuffle(list, random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** A nearby, plausible but definitely different integer. */
  function nearMiss(correct, random, min, max, spread) {
    const cands = [];
    for (let d = -spread; d <= spread; d++) {
      const v = correct + d;
      if (d !== 0 && v >= min && v <= max) cands.push(v);
    }
    return pick(random, cands);
  }

  /** Build the two options. Which id is true is randomised so order means nothing. */
  function makeOptions(id, trueLabel, falseLabel, random) {
    const trueFirst = random() < 0.5;
    const ids = [id + ':a', id + ':b'];
    const options = [
      { id: ids[0], label: String(trueFirst ? trueLabel : falseLabel) },
      { id: ids[1], label: String(trueFirst ? falseLabel : trueLabel) }
    ];
    return { options, correctId: trueFirst ? ids[0] : ids[1] };
  }

  function build(base, trueLabel, falseLabel, random) {
    const o = makeOptions(base.id, trueLabel, falseLabel, random);
    return Object.assign({ visual: null }, base, o);
  }

  // ---------------------------------------------------------------- templates
  const templates = [];
  function add(t) { templates.push(t); }

  // Arithmetic: answers computed, never typed in.
  const OPS = {
    add: { sym: '+', fn: (a, b) => a + b },
    sub: { sym: '−', fn: (a, b) => a - b },
    mul: { sym: '×', fn: (a, b) => a * b }
  };
  const ARITH = [
    ['add', 2, 3], ['add', 3, 4], ['add', 4, 5], ['add', 5, 2], ['add', 6, 3], ['add', 2, 7],
    ['add', 5, 5], ['add', 4, 4], ['add', 3, 6], ['add', 8, 1], ['add', 6, 6], ['add', 7, 2],
    ['sub', 9, 4], ['sub', 7, 3], ['sub', 10, 6], ['sub', 8, 5], ['sub', 6, 2], ['sub', 12, 5], ['sub', 11, 3],
    ['mul', 2, 3], ['mul', 3, 3], ['mul', 2, 5], ['mul', 4, 2], ['mul', 3, 4]
  ];
  ARITH.forEach(([op, a, b]) => {
    const id = 'arith-' + op + '-' + a + '-' + b;
    add({
      id, category: 'arithmetic',
      make(random) {
        const value = OPS[op].fn(a, b);
        const wrong = nearMiss(value, random, 0, 30, 3);
        return build({
          id, category: 'arithmetic',
          prompt: 'What is ' + a + ' ' + OPS[op].sym + ' ' + b + '?',
          explanation: a + ' ' + OPS[op].sym + ' ' + b + ' = ' + value + '.',
          meta: { kind: 'arith', op, a, b }
        }, value, wrong, random);
      }
    });
  });

  // Comparisons: always clearly distinct numbers (gap >= 3).
  const LARGER = [[8, 3], [12, 5], [4, 9], [15, 7], [2, 11], [20, 13], [6, 1], [17, 10]];
  const SMALLER = [[9, 2], [5, 14], [3, 8], [16, 9], [7, 18], [11, 4]];
  LARGER.forEach(([a, b]) => {
    const id = 'cmp-larger-' + a + '-' + b;
    add({
      id, category: 'compare',
      make(random) {
        const hi = Math.max(a, b), lo = Math.min(a, b);
        return build({
          id, category: 'compare', prompt: 'Which number is larger?',
          explanation: hi + ' is larger than ' + lo + '.',
          meta: { kind: 'larger', a, b }
        }, hi, lo, random);
      }
    });
  });
  SMALLER.forEach(([a, b]) => {
    const id = 'cmp-smaller-' + a + '-' + b;
    add({
      id, category: 'compare',
      make(random) {
        const hi = Math.max(a, b), lo = Math.min(a, b);
        return build({
          id, category: 'compare', prompt: 'Which number is smaller?',
          explanation: lo + ' is smaller than ' + hi + '.',
          meta: { kind: 'smaller', a, b }
        }, lo, hi, random);
      }
    });
  });

  // Shapes: the drawing is rendered from `visual`, the same data used to score.
  const POLYS = [[3, 'triangle'], [4, 'square'], [5, 'pentagon'], [6, 'hexagon']];
  POLYS.forEach(([sides, name]) => {
    const id = 'shape-sides-' + name;
    add({
      id, category: 'shapes',
      make(random) {
        const wrong = sides === 3 ? 4 : nearMiss(sides, random, 3, 8, 1);
        return build({
          id, category: 'shapes', prompt: 'How many sides?',
          visual: { type: 'shape', shape: name, sides },
          explanation: 'A ' + name + ' has ' + sides + ' sides.',
          meta: { kind: 'sides' }
        }, sides, wrong, random);
      }
    });
  });
  [['triangle', 3], ['square', 4]].forEach(([name, sides]) => {
    const id = 'shape-text-' + name;
    add({
      id, category: 'shapes',
      make(random) {
        const wrong = sides === 3 ? 4 : pick(random, [3, 5]);
        return build({
          id, category: 'shapes', prompt: 'How many sides does a ' + name + ' have?',
          explanation: 'A ' + name + ' has ' + sides + ' sides.',
          meta: { kind: 'sidesText', sides }
        }, sides, wrong, random);
      }
    });
  });
  const NAMES = { circle: 'Circle', square: 'Square', triangle: 'Triangle' };
  Object.keys(NAMES).forEach((shape) => {
    const id = 'shape-name-' + shape;
    add({
      id, category: 'shapes',
      make(random) {
        const other = pick(random, Object.keys(NAMES).filter((s) => s !== shape));
        return build({
          id, category: 'shapes', prompt: 'What shape is this?',
          visual: { type: 'shape', shape, sides: shape === 'circle' ? 0 : (shape === 'square' ? 4 : 3) },
          explanation: 'That is a ' + shape + '.',
          meta: { kind: 'shapeName', trueName: NAMES[shape] }
        }, NAMES[shape], NAMES[other], random);
      }
    });
  });

  // Dots: positions are generated and the count is the length of that array.
  for (let n = 2; n <= 9; n++) {
    const id = 'dots-' + n;
    add({
      id, category: 'dots',
      make(random) {
        const slots = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], random).slice(0, n);
        const dots = slots.map((s) => ({
          x: 20 + (s % 3) * 30 + (random() * 6 - 3),
          y: 20 + Math.floor(s / 3) * 30 + (random() * 6 - 3)
        }));
        const wrong = nearMiss(dots.length, random, 1, 10, 1);
        return build({
          id, category: 'dots', prompt: 'How many dots?',
          visual: { type: 'dots', dots },
          explanation: 'There are ' + dots.length + ' dots.',
          meta: { kind: 'dots' }
        }, dots.length, wrong, random);
      }
    });
  }

  // Familiar, universal, single-answer facts.
  const FACTS = [
    ['week', 'How many days are in a week?', '7', '8', 'A week has 7 days.'],
    ['hour', 'How many minutes are in an hour?', '60', '100', 'An hour has 60 minutes.'],
    ['day', 'How many hours are in a day?', '24', '30', 'A day has 24 hours.'],
    ['year', 'How many months are in a year?', '12', '10', 'A year has 12 months.'],
    ['spider', 'How many legs does a spider have?', '8', '6', 'Spiders have 8 legs.'],
    ['insect', 'How many legs does an insect have?', '6', '8', 'Insects have 6 legs.'],
    ['octopus', 'How many arms does an octopus have?', '8', '5', 'An octopus has 8 arms.'],
    ['bicycle', 'How many wheels does a bicycle have?', '2', '3', 'A bicycle has 2 wheels.'],
    ['ice', 'What is ice made of?', 'Water', 'Sand', 'Ice is frozen water.'],
    ['star', 'Which one is a star?', 'The Sun', 'The Moon', 'The Sun is a star.'],
    ['planet', 'Which planet do we live on?', 'Earth', 'Mars', 'We live on Earth.'],
    ['bees', 'What do bees make?', 'Honey', 'Milk', 'Bees make honey.'],
    ['dozen', 'How many is a dozen?', '12', '10', 'A dozen is 12.'],
    ['alphabet', 'Which letter comes first in the alphabet?', 'A', 'D', 'A comes first.'],
    ['heavier', 'Which is heavier?', '1 kilogram', '1 gram', 'A kilogram is 1000 grams.'],
    ['longer', 'Which is longer?', '1 kilometre', '1 centimetre', 'A kilometre is far longer.'],
    ['even', 'Which number is even?', '4', '7', '4 is even. 7 is odd.'],
    ['fire', 'Is fire hot or cold?', 'Hot', 'Cold', 'Fire is hot.']
  ];
  FACTS.forEach(([key, prompt, truth, lie, explanation]) => {
    const id = 'fact-' + key;
    add({
      id, category: 'facts',
      make(random) {
        return build({ id, category: 'facts', prompt, explanation, meta: { kind: 'fact', truth } }, truth, lie, random);
      }
    });
  });

  // ------------------------------------------------------------- verification
  /** Independently recompute the true label for a question from its data. */
  function computeTruth(q) {
    const m = q.meta || {};
    switch (m.kind) {
      case 'arith': return String(OPS[m.op].fn(m.a, m.b));
      case 'larger': return String(Math.max(m.a, m.b));
      case 'smaller': return String(Math.min(m.a, m.b));
      case 'sides': return String(q.visual.sides);
      case 'sidesText': return String(m.sides);
      case 'shapeName': return m.trueName;
      case 'dots': return String(q.visual.dots.length);
      case 'fact': return m.truth;
      default: return null;
    }
  }

  /** Returns a list of problems; empty means the question is valid. */
  function validate(q) {
    const errs = [];
    if (!q || typeof q.id !== 'string' || !q.id) errs.push('missing id');
    if (!q.prompt) errs.push('missing prompt');
    if (!q.explanation) errs.push('missing explanation');
    if (!Array.isArray(q.options) || q.options.length !== 2) { errs.push('needs exactly two options'); return errs; }
    const [a, b] = q.options;
    if (a.id === b.id) errs.push('duplicate option ids');
    if (a.label === b.label) errs.push('duplicate option labels');
    const matches = q.options.filter((o) => o.id === q.correctId);
    if (matches.length !== 1) errs.push('correctId must match exactly one option');
    const truth = computeTruth(q);
    if (truth === null) errs.push('cannot verify truth');
    else {
      const trueOpts = q.options.filter((o) => o.label === truth);
      if (trueOpts.length !== 1) errs.push('exactly one option must be factually true');
      else if (trueOpts[0].id !== q.correctId) errs.push('correctId disagrees with computed truth');
    }
    if (m(q, 'larger') || m(q, 'smaller')) {
      if (Math.abs(q.meta.a - q.meta.b) < 3) errs.push('comparison too close');
    }
    if (q.visual && q.visual.type === 'dots' && q.visual.dots.length > 9) errs.push('too many dots');
    return errs;
  }
  function m(q, kind) { return q.meta && q.meta.kind === kind; }

  /** The option the player must pick under a rule. Truth and rule are separate inputs. */
  function winningOptionId(q, rule) {
    if (rule === 'normal') return q.correctId;
    if (rule === 'wrong') return q.options.find((o) => o.id !== q.correctId).id;
    throw new Error('unknown rule: ' + rule);
  }
  function isFactuallyCorrect(q, optionId) { return optionId === q.correctId; }
  function optionById(q, id) { return q.options.find((o) => o.id === id); }

  // ------------------------------------------------------------------ picker
  /**
   * Shuffle-bag picker. Guarantees: no question id within the last `recentSize`
   * picks, and no category more than `maxRun` times in a row.
   */
  function createPicker(random, options) {
    const opts = Object.assign({ recentSize: 10, maxRun: 2, pool: templates }, options);
    const byCat = {};
    opts.pool.forEach((t) => { (byCat[t.category] = byCat[t.category] || []).push(t); });
    const cats = Object.keys(byCat);
    const bags = {};
    const recent = [];
    const catHistory = [];

    function drawFrom(cat) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (!bags[cat] || !bags[cat].length) bags[cat] = shuffle(byCat[cat], random);
        const idx = bags[cat].findIndex((t) => recent.indexOf(t.id) === -1);
        if (idx !== -1) return bags[cat].splice(idx, 1)[0];
        bags[cat] = []; // everything left was recent; refill once
      }
      return null;
    }

    function next() {
      let allowed = cats;
      const tail = catHistory.slice(-opts.maxRun);
      if (tail.length === opts.maxRun && tail.every((c) => c === tail[0])) {
        allowed = cats.filter((c) => c !== tail[0]);
      }
      let tpl = null;
      for (const cat of shuffle(allowed, random)) { tpl = drawFrom(cat); if (tpl) break; }
      if (!tpl) tpl = pick(random, opts.pool.filter((t) => t.id !== recent[recent.length - 1]));
      recent.push(tpl.id);
      if (recent.length > opts.recentSize) recent.shift();
      catHistory.push(tpl.category);
      if (catHistory.length > 10) catHistory.shift();
      return tpl.make(random);
    }
    return { next };
  }

  // ---------------------------------------------------------------- practice
  function practiceQuestions(random) {
    return [
      {
        rule: 'wrong',
        question: build({
          id: 'practice-1', category: 'arithmetic', prompt: 'What is 2 + 2?',
          explanation: '2 + 2 = 4.', meta: { kind: 'arith', op: 'add', a: 2, b: 2 }
        }, 4, 7, random),
        success: '7 is false. Picking the false answer is the whole job.',
        failure: '4 is true. Here you pick the FALSE answer — try the other one next time.'
      },
      {
        rule: 'normal',
        question: build({
          id: 'practice-2', category: 'shapes', prompt: 'How many sides does a triangle have?',
          explanation: 'A triangle has 3 sides.', meta: { kind: 'sidesText', sides: 3 }
        }, 3, 4, random),
        success: 'Correct! A NORMAL ROUND wants the true answer.',
        failure: '4 is false. A NORMAL ROUND wants the TRUE answer.'
      }
    ];
  }

  return {
    CATEGORIES, templates, createPicker, validate, computeTruth,
    winningOptionId, isFactuallyCorrect, optionById, practiceQuestions, shuffle
  };
});
