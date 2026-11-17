/* DO NOT SPILL — every gameplay tuning value lives here. */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});

  NS.CONFIG = Object.freeze({
    tray: Object.freeze({
      width: 360,          // logical units, edge-to-edge; a cup falls when its centre passes ±width/2
      depth: 140,
      cupRadius: 21,
      dangerMargin: 14,    // distance from the fall threshold that counts as "danger"
      dangerHysteresis: 3, // must retreat this far past the margin to count as recovered
      rowZ: Object.freeze({ back: -30, front: 30, single: 0 }),
    }),
    tilt: Object.freeze({
      maxDeg: 9,
      responseTime: 0.12,  // seconds; exponential approach to the target angle
      creakDeltaDeg: 9,    // target change that counts as a significant tilt change
    }),
    physics: Object.freeze({
      fixedDt: 1 / 120,
      maxFrameDt: 0.1,     // a single frame never contributes more than this
      maxCatchUp: 0.1,     // accumulator cap
      gravity: 600,        // horizontalAcceleration = gravity * sin(angle) + ambient
      damping: 1.8,        // velocity *= exp(-damping * dt)
      gripVariation: Object.freeze([1.0, 0.76, 1.22, 0.86, 1.1]), // per-cup damping factor: cups drift at slightly different rates
      restitution: 0.18,
      solverPasses: 4,
      maxSpeed: 240,
    }),
    ambient: Object.freeze({
      baseAmp: 8,          // units / s^2 on delivery 1
      ampPerDelivery: 3,
      maxAmp: 20,
      freqs: Object.freeze([0.11, 0.23]),
      weights: Object.freeze([0.65, 0.35]),
    }),
    liquid: Object.freeze({
      stiffness: 110,      // spring constant of the surface tilt (rad / s^2 per rad)
      damping: 3.4,
      accelCoupling: 0.1,  // how strongly cup acceleration kicks the surface
      accelSmoothing: 0.1, // seconds, low-pass for the quasi-static acceleration lean
      maxSurface: 0.5,     // radians
      maxSurfaceVel: 8,
    }),
    splash: Object.freeze({
      threshold: 0.2,      // radians of dynamic slosh beyond equilibrium
      persist: 0.07,       // seconds the threshold must be exceeded
      cooldown: 1.4,       // seconds per cup between counted splashes
    }),
    delivery: Object.freeze({
      duration: 12,
      cupsByDelivery: Object.freeze([2, 3, 4, 5]),
      maxCups: 5,
      baseReward: 100,
      perfectBonus: 50,
      travelSpeed: 1,      // scenery travel per simulated second (presentation)
    }),
    bumps: Object.freeze({
      countByDelivery: Object.freeze([0, 1, 2, 2]), // delivery 3 is "up to two"
      deliveryThreeSecondChance: 0.65,
      warnLead: 1.6,       // >= 1.2 s of telegraph before impact
      minGap: 4,
      edgeGuard: 2,        // no impact in the first or final two seconds
      earliestImpact: 3.6,
      latestImpactFromEnd: 2.4,
      minImpulse: 14,
      maxImpulse: 22,
      farSideFactor: 0.82, // the cup farthest from the customer receives this share of the impulse
    }),
    slowmo: Object.freeze({ scale: 0.65, duration: 0.3, cooldown: 4 }),
    timing: Object.freeze({ tableIntro: 1.3, spill: 1.05, handoff: 1.15 }),
    tutorial: Object.freeze({ tiltDeg: 4.5, levelDeg: 1.5, travelScale: 0.35 }),
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = NS.CONFIG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
