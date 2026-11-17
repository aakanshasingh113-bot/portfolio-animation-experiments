/*
 * Keyboard mapping, kept pure so it can be tested.
 * Returns 'left' | 'right' | null. Repeats and modified keys are ignored.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WAOInput = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function keyToSide(e) {
    if (!e || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return null;
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': return 'left';
      case 'ArrowRight': case 'd': case 'D': return 'right';
      default: return null;
    }
  }
  /** True when a keydown on a focused button should be swallowed (held Enter/Space). */
  function isRepeatActivation(e) {
    return !!(e && e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar'));
  }
  return { keyToSide, isRepeatActivation };
});
