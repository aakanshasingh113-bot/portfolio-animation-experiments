/* Small deterministic random helpers for reproducible deliveries. */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed() {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < arguments.length; i++) {
      const v = (arguments[i] >>> 0);
      for (let b = 0; b < 4; b++) {
        h ^= (v >>> (b * 8)) & 0xff;
        h = Math.imul(h, 16777619) >>> 0;
      }
    }
    return h >>> 0;
  }

  NS.RNG = { mulberry32, hashSeed };
  if (typeof module !== 'undefined' && module.exports) module.exports = NS.RNG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
