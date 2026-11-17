'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../js/input.js');

test('arrow keys and A/D map to sides', () => {
  assert.equal(I.keyToSide({ key: 'ArrowLeft' }), 'left');
  assert.equal(I.keyToSide({ key: 'a' }), 'left');
  assert.equal(I.keyToSide({ key: 'A' }), 'left');
  assert.equal(I.keyToSide({ key: 'ArrowRight' }), 'right');
  assert.equal(I.keyToSide({ key: 'd' }), 'right');
  assert.equal(I.keyToSide({ key: 'D' }), 'right');
  assert.equal(I.keyToSide({ key: 'x' }), null);
  assert.equal(I.keyToSide({ key: 'Enter' }), null);
});

test('repeat events and modified keys are ignored', () => {
  assert.equal(I.keyToSide({ key: 'ArrowLeft', repeat: true }), null);
  assert.equal(I.keyToSide({ key: 'd', repeat: true }), null);
  assert.equal(I.keyToSide({ key: 'a', ctrlKey: true }), null);
  assert.equal(I.keyToSide({ key: 'ArrowRight', metaKey: true }), null);
  assert.equal(I.keyToSide({ key: 'ArrowRight', altKey: true }), null);
});

test('held Enter / Space on buttons is detected as a repeat activation', () => {
  assert.equal(I.isRepeatActivation({ key: 'Enter', repeat: true }), true);
  assert.equal(I.isRepeatActivation({ key: ' ', repeat: true }), true);
  assert.equal(I.isRepeatActivation({ key: 'Enter', repeat: false }), false);
  assert.equal(I.isRepeatActivation({ key: 'a', repeat: true }), false);
});
