'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Q, seeded } = require('./helpers');

test('bank has at least 40 distinct templates with unique ids', () => {
  const ids = Q.templates.map((t) => t.id);
  assert.ok(ids.length >= 40, 'got ' + ids.length);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of Q.CATEGORIES) assert.ok(Q.templates.some((t) => t.category === c), 'category ' + c);
});

test('every instance of every template has exactly one factually true option', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const r = seeded(seed);
    for (const t of Q.templates) {
      const q = t.make(r);
      assert.deepEqual(Q.validate(q), [], t.id + ' seed ' + seed);
      assert.equal(q.id, t.id);
      assert.equal(q.options.length, 2);
      assert.notEqual(q.options[0].label, q.options[1].label);
      assert.equal(q.options.filter((o) => o.id === q.correctId).length, 1);
    }
  }
});

test('arithmetic truth is computed, not typed', () => {
  const r = seeded(7);
  const ops = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b };
  for (const t of Q.templates.filter((x) => x.category === 'arithmetic')) {
    const q = t.make(r);
    const m = /^What is (\d+) (.) (\d+)\?$/.exec(q.prompt);
    assert.ok(m, q.prompt);
    const expected = ops[m[2]](Number(m[1]), Number(m[3]));
    assert.equal(Q.optionById(q, q.correctId).label, String(expected), q.id);
    assert.ok(expected >= 0);
  }
});

test('dot count is the rendered data and is the scored truth', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const r = seeded(seed);
    for (const t of Q.templates.filter((x) => x.category === 'dots')) {
      const q = t.make(r);
      const n = Number(t.id.split('-')[1]);
      assert.equal(q.visual.dots.length, n);
      assert.equal(Q.optionById(q, q.correctId).label, String(n));
      // dots never overlap (distinct grid slots, small jitter)
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = q.visual.dots[i], b = q.visual.dots[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 18, 'overlap in ' + q.id);
      }
    }
  }
});

test('comparisons are clearly distinct', () => {
  for (const t of Q.templates.filter((x) => x.category === 'compare')) {
    const q = t.make(seeded(3));
    assert.ok(Math.abs(Number(q.options[0].label) - Number(q.options[1].label)) >= 3, q.id);
  }
});

test('validate catches broken questions', () => {
  const good = Q.templates[0].make(seeded(1));
  assert.deepEqual(Q.validate(good), []);
  const flipped = Object.assign({}, good, { correctId: good.options.find((o) => o.id !== good.correctId).id });
  assert.ok(Q.validate(flipped).length > 0);
  const dupe = Object.assign({}, good, { options: [good.options[0], Object.assign({}, good.options[0], { id: 'x' })] });
  assert.ok(Q.validate(dupe).length > 0);
});

test('winning option depends on rule and truth only', () => {
  const q = Q.templates.find((t) => t.id === 'arith-add-3-4').make(seeded(2));
  const truth = q.correctId;
  const lie = q.options.find((o) => o.id !== truth).id;
  assert.equal(Q.winningOptionId(q, 'wrong'), lie);
  assert.equal(Q.winningOptionId(q, 'normal'), truth);
  assert.equal(Q.optionById(q, lie).label === '7', false);
  assert.equal(Q.optionById(q, truth).label, '7');
  assert.throws(() => Q.winningOptionId(q, 'other'));
});

test('picker: no repeat within 10 and no category more than twice in a row', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const p = Q.createPicker(seeded(seed));
    const seen = [];
    for (let i = 0; i < 300; i++) {
      const q = p.next();
      assert.equal(seen.slice(-10).map((x) => x.id).indexOf(q.id), -1, 'repeat ' + q.id + ' at ' + i);
      const last2 = seen.slice(-2);
      if (last2.length === 2) assert.ok(!(last2[0].category === q.category && last2[1].category === q.category), 'category run at ' + i);
      seen.push(q);
    }
  }
});

test('practice questions: one wrong round then one normal round', () => {
  const p = Q.practiceQuestions(seeded(1));
  assert.equal(p.length, 2);
  assert.equal(p[0].rule, 'wrong');
  assert.equal(p[1].rule, 'normal');
  p.forEach((item) => assert.deepEqual(Q.validate(item.question), []));
  assert.equal(Q.optionById(p[0].question, Q.winningOptionId(p[0].question, 'wrong')).label, '7');
  assert.equal(Q.optionById(p[1].question, Q.winningOptionId(p[1].question, 'normal')).label, '3');
});
