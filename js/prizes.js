/*
 * Don't Crush It — prize artwork.
 *
 * Each prize is drawn with Canvas paths around an origin at its bottom centre
 * (y grows upward as negative). Drawing only: nothing here affects gameplay.
 */
(function (root) {
  'use strict';
  var DCI = root.DCI = root.DCI || {};
  var TAU = Math.PI * 2;

  var K = {
    ivory: '#FFF4DC', red: '#D94732', ink: '#292522', yellow: '#F2CB65', teal: '#467E78', pink: '#E8A6AC',
    cream: '#FFFBF0', sponge: '#F5DC98', spongeDark: '#DDB55C',
    soap: '#7DB6AD', soapSide: '#467E78', soapLight: '#A9D3CB',
    egg: '#FFF9EC', eggShade: '#F0DFBE',
    cactus: '#8AB573', cactusDark: '#5E9160', pot: '#CE6C47', potRim: '#E39270'
  };

  // Fills sit a touch off their outlines, like slightly misregistered print.
  var OFF_X = 1.7, OFF_Y = 1.2;

  function rr(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** Fill (slightly offset) then outline a path built by `build`. */
  function shape(ctx, build, fill, lw, noOffset) {
    if (fill) {
      ctx.save();
      if (!noOffset) ctx.translate(OFF_X, OFF_Y);
      ctx.beginPath(); build(); ctx.fillStyle = fill; ctx.fill();
      ctx.restore();
    }
    if (lw !== 0) {
      ctx.beginPath(); build();
      ctx.lineWidth = lw || 2.6; ctx.strokeStyle = K.ink; ctx.stroke();
    }
  }

  function smoothThrough(ctx, pts) {
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    var last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }

  function wave(ctx, x0, x1, y, amp, n) {
    for (var i = 1; i <= n; i++) {
      var xm = x0 + (x1 - x0) * (i - 0.5) / n, xe = x0 + (x1 - x0) * i / n;
      ctx.quadraticCurveTo(xm, y + (i % 2 ? amp : -amp) * 2, xe, y);
    }
  }

  function blush(ctx, x, y, rx, ry) {
    ctx.fillStyle = K.pink; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(-x, y, rx, ry, 0, 0, TAU); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- faces --

  function face(ctx, x, y, expr, s) {
    s = s || 1;
    var e = 8.5 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = K.ink; ctx.fillStyle = K.ink;
    ctx.lineWidth = Math.max(1.7, 2.1 * s);

    function dot(cx, r) { ctx.beginPath(); ctx.arc(cx, 0, r * s, 0, TAU); ctx.fill(); }
    function line(pts) {
      ctx.beginPath(); ctx.moveTo(pts[0] * s, pts[1] * s);
      for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * s, pts[i + 1] * s);
      ctx.stroke();
    }
    function curve(x0, y0, cx, cy, x1, y1) {
      ctx.beginPath(); ctx.moveTo(x0 * s, y0 * s); ctx.quadraticCurveTo(cx * s, cy * s, x1 * s, y1 * s); ctx.stroke();
    }
    function wavy(y0, w) {
      ctx.beginPath(); ctx.moveTo(-w * s, y0 * s);
      ctx.quadraticCurveTo(-w / 2 * s, (y0 - 2.6) * s, 0, y0 * s);
      ctx.quadraticCurveTo(w / 2 * s, (y0 + 2.6) * s, w * s, y0 * s);
      ctx.stroke();
    }
    var E = e / s;   // eye offset in unscaled units for the helpers above

    switch (expr) {
      case 'blink':
        line([-E - 2.5, 0, -E + 2.5, 0]); line([E - 2.5, 0, E + 2.5, 0]);
        curve(-3, 5, 0, 8, 3, 5);
        break;
      case 'nervous':
        dot(-e, 2.7); dot(e, 2.7);
        ctx.fillStyle = K.cream; dot(-e + 0.9 * s, 0.9); dot(e + 0.9 * s, 0.9); ctx.fillStyle = K.ink;
        line([-E - 3.5, -5, -E + 1.5, -6.6]); line([E + 3.5, -5, E - 1.5, -6.6]);
        wavy(6.5, 4);
        break;
      case 'calm':
        curve(-E - 3, -1, -E, 2.6, -E + 3, -1); curve(E - 3, -1, E, 2.6, E + 3, -1);
        curve(-3, 5, 0, 7.6, 3, 5);
        break;
      case 'strain':
        line([-E - 3, -3, -E + 2, 0, -E - 3, 3]); line([E + 3, -3, E - 2, 0, E + 3, 3]);
        wavy(7, 5);
        break;
      case 'slip':
        ctx.fillStyle = K.cream;
        ctx.beginPath(); ctx.arc(-e, 0, 3.4 * s, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(e, 0, 3.4 * s, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = K.ink; dot(-e, 1.3); dot(e, 1.3);
        ctx.beginPath(); ctx.ellipse(0, 7.5 * s, 2.3 * s, 3 * s, 0, 0, TAU); ctx.fill();
        break;
      case 'happy':
        curve(-E - 3, 1.2, -E, -3.6, -E + 3, 1.2); curve(E - 3, 1.2, E, -3.6, E + 3, 1.2);
        ctx.beginPath(); ctx.moveTo(-5 * s, 4.2 * s); ctx.lineTo(5 * s, 4.2 * s);
        ctx.quadraticCurveTo(5 * s, 11 * s, 0, 11 * s); ctx.quadraticCurveTo(-5 * s, 11 * s, -5 * s, 4.2 * s);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = K.pink; ctx.beginPath(); ctx.ellipse(0, 9 * s, 2.4 * s, 1.5 * s, 0, 0, TAU); ctx.fill();
        break;
      case 'crushed':
        line([-E - 2.6, -2.6, -E + 2.6, 2.6]); line([-E + 2.6, -2.6, -E - 2.6, 2.6]);
        line([E - 2.6, -2.6, E + 2.6, 2.6]); line([E + 2.6, -2.6, E - 2.6, 2.6]);
        wavy(7.5, 4.5);
        break;
      case 'angry':
        dot(-e, 2.1); dot(e, 2.1);
        line([-E - 4, -6.5, -E + 3, -3.4]); line([E + 4, -6.5, E - 3, -3.4]);
        curve(-4, 8.5, 0, 4.5, 4, 8.5);
        break;
      case 'smug':
        curve(-E - 3, -0.5, -E, 2.2, -E + 3, -0.5); curve(E - 3, -0.5, E, 2.2, E + 3, -0.5);
        curve(-3, 5.4, 1.5, 8.6, 4.6, 4.4);
        break;
      default: // idle
        dot(-e, 2.3); dot(e, 2.3);
        curve(-3, 5, 0, 8, 3, 5);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- cake ---

  function cake(ctx, o) {
    var ooze = o.over;
    shape(ctx, function () { rr(ctx, -34, -50, 68, 50, 8); }, K.sponge);

    // crumb marks
    ctx.strokeStyle = K.spongeDark; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-27, -5); ctx.lineTo(-23, -6); ctx.moveTo(24, -17); ctx.lineTo(27, -15);
    ctx.moveTo(22, -5); ctx.lineTo(26, -6); ctx.moveTo(-27, -18); ctx.lineTo(-24, -16);
    ctx.stroke();

    // cream filling
    shape(ctx, function () {
      ctx.moveTo(-34, -32); wave(ctx, -34, 34, -32, 1.1, 6);
      ctx.lineTo(34, -25); wave(ctx, 34, -34, -25, 1.1, 6);
      ctx.closePath();
    }, K.cream, 1.9, true);

    if (ooze > 0.03) {   // cream squeezes out of the sides
      var r = 2 + 6.5 * ooze;
      shape(ctx, function () {
        ctx.arc(-36, -28, r, 0, TAU); ctx.moveTo(36 + r, -28); ctx.arc(36, -28, r, 0, TAU);
        ctx.moveTo(-38 + r * 0.5, -20 + ooze * 6); ctx.arc(-38, -20 + ooze * 6, r * 0.5, 0, TAU);
        ctx.moveTo(39 + r * 0.45, -19 + ooze * 8); ctx.arc(39, -19 + ooze * 8, r * 0.45, 0, TAU);
      }, K.cream, 1.9, true);
    }

    // icing with drips
    shape(ctx, function () {
      ctx.moveTo(-35, -38); ctx.quadraticCurveTo(-36, -54, -24, -54);
      ctx.lineTo(25, -53.5); ctx.quadraticCurveTo(36, -53, 35, -38);
      smoothThrough(ctx, [[35, -38], [32, -30], [25, -38], [17, -31], [9, -39], [1, -27], [-8, -38], [-16, -32], [-24, -39], [-31, -29], [-35, -38]]);
      ctx.closePath();
    }, K.pink);
    ctx.strokeStyle = K.cream; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(-28, -45); ctx.quadraticCurveTo(-27, -49, -21, -49.5); ctx.stroke();
    ctx.globalAlpha = 1;

    // strawberry
    shape(ctx, function () {
      ctx.moveTo(4, -52.5); ctx.bezierCurveTo(-9, -57, -7, -70, 4, -67);
      ctx.bezierCurveTo(14, -70, 16, -57, 4, -52.5); ctx.closePath();
    }, K.red, 2.3);
    ctx.fillStyle = K.cream;
    ctx.beginPath(); ctx.arc(0, -61, 1, 0, TAU); ctx.arc(7, -62, 1, 0, TAU); ctx.arc(4, -57, 1, 0, TAU); ctx.fill();
    shape(ctx, function () {
      ctx.moveTo(4, -66); ctx.quadraticCurveTo(-1, -72, -4, -68); ctx.quadraticCurveTo(0, -65.5, 4, -66);
      ctx.quadraticCurveTo(8, -72.5, 11, -68.5); ctx.quadraticCurveTo(8, -65.5, 4, -66); ctx.closePath();
    }, K.cactus, 1.8, true);

    blush(ctx, 17, -10, 4.2, 2.6);
    face(ctx, 0, -14, o.expr, 1);
  }

  // ---------------------------------------------------------------- soap ---

  function star(ctx, cx, cy, r) {
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.48 : r;
      var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function soap(ctx, o) {
    shape(ctx, function () { rr(ctx, -38, -40, 76, 40, 14); }, K.soapSide);
    shape(ctx, function () { rr(ctx, -38, -44, 76, 37, 14); }, K.soap);

    // sheen
    ctx.strokeStyle = K.soapLight; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-30, -31); ctx.quadraticCurveTo(-29, -38, -21, -38.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-15, -38.8); ctx.lineTo(-12, -38.8); ctx.stroke();

    // embossed star: a light edge under a dark one
    ctx.lineWidth = 1.7;
    ctx.save(); ctx.translate(0.9, 1); ctx.beginPath(); star(ctx, 22, -26, 7.5); ctx.strokeStyle = K.soapLight; ctx.stroke(); ctx.restore();
    ctx.beginPath(); star(ctx, 22, -26, 7.5); ctx.strokeStyle = K.soapSide; ctx.stroke();

    // a couple of suds
    ctx.strokeStyle = K.ink; ctx.lineWidth = 1.7; ctx.fillStyle = K.cream;
    ctx.beginPath(); ctx.arc(-33, -44, 4.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-26, -48, 2.6, 0, TAU); ctx.fill(); ctx.stroke();

    face(ctx, -6, -27, o.expr, 1);
  }

  // ----------------------------------------------------------------- egg ---

  function eggPath(ctx) {
    ctx.moveTo(0, -64);
    ctx.bezierCurveTo(16, -64, 26.5, -39, 26.5, -22);
    ctx.bezierCurveTo(26.5, -6, 15, 0, 0, 0);
    ctx.bezierCurveTo(-15.5, 0, -26, -6.5, -26, -22);
    ctx.bezierCurveTo(-26, -39, -15, -64, 0, -64);
    ctx.closePath();
  }

  var CRACKS = [
    [[-25, -33], [-17, -30], [-19, -24], [-12, -21]],
    [[25, -35], [18, -33], [19.5, -27], [13, -25], [14, -19]],
    [[-5, -63], [-2, -55], [-8, -50], [-2, -45]],
    [[21, -11], [14, -12.5], [12, -7.5]]
  ];

  function egg(ctx, o) {
    if (o.crushed) { brokenEgg(ctx, o); return; }

    ctx.save();
    ctx.translate(OFF_X, OFF_Y);
    ctx.beginPath(); eggPath(ctx); ctx.fillStyle = K.eggShade; ctx.fill();
    ctx.clip();
    ctx.fillStyle = K.egg; ctx.beginPath(); ctx.ellipse(-5, -31, 25, 34, 0, 0, TAU); ctx.fill();
    ctx.restore();
    shape(ctx, function () { eggPath(ctx); }, null);

    // fine cracks appear one after another as it is over-squeezed
    if (o.over > 0.02) {
      ctx.lineWidth = 1.5; ctx.strokeStyle = K.ink;
      var total = o.over * CRACKS.length;
      for (var i = 0; i < CRACKS.length; i++) {
        var amt = Math.max(0, Math.min(1, total - i * 0.75));
        if (amt <= 0) continue;
        var c = CRACKS[i], segs = (c.length - 1) * amt;
        ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]);
        for (var j = 1; j < c.length; j++) {
          var f = Math.min(1, segs - (j - 1));
          if (f <= 0) break;
          ctx.lineTo(c[j - 1][0] + (c[j][0] - c[j - 1][0]) * f, c[j - 1][1] + (c[j][1] - c[j - 1][1]) * f);
        }
        ctx.stroke();
      }
    }

    blush(ctx, 12.5, -19, 3.4, 2.1);
    face(ctx, 0, -25, o.expr, 0.82);

    if (o.expr === 'nervous' || o.expr === 'strain' || o.expr === 'slip') {   // sweat drop
      shape(ctx, function () {
        ctx.moveTo(15, -50); ctx.quadraticCurveTo(19.5, -44, 16, -41.5); ctx.quadraticCurveTo(11.5, -43, 15, -50); ctx.closePath();
      }, K.soapLight, 1.5, true);
    }
  }

  function brokenEgg(ctx, o) {
    // the cap, tipped over beside the shell
    ctx.save();
    ctx.translate(31, -3); ctx.rotate(1.25);
    shape(ctx, function () {
      ctx.moveTo(-17, 0);
      ctx.bezierCurveTo(-15, -15, -8, -24, 0, -24); ctx.bezierCurveTo(9, -24, 15, -15, 17, 0);
      ctx.lineTo(11, -6); ctx.lineTo(5, 1); ctx.lineTo(-1, -6); ctx.lineTo(-7, 1); ctx.lineTo(-12, -5);
      ctx.closePath();
    }, K.egg, 2.4);
    ctx.restore();

    shape(ctx, function () {
      ctx.moveTo(-26, -23);
      ctx.lineTo(-18, -15); ctx.lineTo(-11, -25); ctx.lineTo(-3, -16); ctx.lineTo(6, -26); ctx.lineTo(15, -17); ctx.lineTo(26.5, -24);
      ctx.bezierCurveTo(27, -7, 15, 0, 0, 0);
      ctx.bezierCurveTo(-15.5, 0, -26.5, -7, -26, -23);
      ctx.closePath();
    }, K.egg);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-11, -25); ctx.lineTo(-13, -18); ctx.lineTo(-9, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, -17); ctx.lineTo(13, -11); ctx.stroke();
    face(ctx, 0, -9, 'crushed', 0.78);
  }

  // -------------------------------------------------------------- cactus ---

  function cactus(ctx, o) {
    // pot
    shape(ctx, function () {
      ctx.moveTo(-21, -27); ctx.lineTo(21, -27); ctx.lineTo(16.5, -3);
      ctx.quadraticCurveTo(16, 0, 12.5, 0); ctx.lineTo(-12.5, 0); ctx.quadraticCurveTo(-16, 0, -16.5, -3);
      ctx.closePath();
    }, K.pot);

    ctx.save();
    ctx.translate(0, -30);
    if (o.crushed) ctx.scale(1.18, 0.6);
    ctx.rotate(o.wig || 0);
    ctx.translate(0, 30);

    // arms first so the body overlaps their joints
    function arm(pts, wave) {
      function path() {
        ctx.moveTo(pts[0], pts[1]);
        ctx.lineTo(pts[2], pts[3]);
        ctx.quadraticCurveTo(pts[4], pts[3], pts[4], pts[5]);
        ctx.lineTo(pts[4] + wave, pts[7]);
      }
      ctx.beginPath(); path(); ctx.lineWidth = 14.2; ctx.strokeStyle = K.ink; ctx.stroke();
      ctx.beginPath(); path(); ctx.lineWidth = 9; ctx.strokeStyle = K.cactus; ctx.stroke();
    }
    var w = (o.wig || 0) * 30;
    arm([-12, -46, -20, -46, -27, -52, 0, -59], -w);
    arm([12, -41, 20, -41, 27, -47, 0, -55], -w);

    shape(ctx, function () {
      ctx.moveTo(-15, -29); ctx.lineTo(-15.5, -60);
      ctx.bezierCurveTo(-15.5, -82, 15.5, -82, 15.5, -60);
      ctx.lineTo(15, -29); ctx.closePath();
    }, K.cactus);

    // ribs and spines
    ctx.strokeStyle = K.cactusDark; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-8.5, -33); ctx.lineTo(-8.5, -39); ctx.moveTo(9, -33); ctx.lineTo(9, -40); ctx.stroke();
    ctx.strokeStyle = K.ink; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-15.5, -66); ctx.lineTo(-19, -68); ctx.moveTo(15.5, -64); ctx.lineTo(19, -66.5);
    ctx.moveTo(-9, -74.5); ctx.lineTo(-11.5, -78); ctx.moveTo(-27, -59); ctx.lineTo(-27.5, -63); ctx.moveTo(27, -55); ctx.lineTo(27.5, -59);
    ctx.stroke();

    // flower
    shape(ctx, function () {
      ctx.arc(5, -77.5, 4.3, 0, TAU);
    }, K.pink, 1.9, true);
    ctx.fillStyle = K.yellow; ctx.beginPath(); ctx.arc(5, -77.5, 1.5, 0, TAU); ctx.fill();

    blush(ctx, 10.5, -50, 2.8, 1.8);
    face(ctx, 0, -56, o.expr, 0.86);
    ctx.restore();

    // rim sits in front of the plant
    shape(ctx, function () { rr(ctx, -24.5, -33, 49, 9.5, 3.5); }, K.potRim);
  }

  var ART = { cake: cake, soap: soap, egg: egg, cactus: cactus };

  /**
   * Draw a prize at the current origin (its bottom centre).
   * o.expr   face: idle | blink | nervous | calm | strain | slip | happy | crushed | angry | smug
   * o.over   0..1 how over-squeezed it looks (cream, cracks)
   * o.crushed  the failed, flattened version
   * o.wig    cactus wiggle angle in radians
   */
  function draw(ctx, type, o) {
    o = o || {};
    var opt = { expr: o.expr || 'idle', over: o.over || 0, crushed: !!o.crushed, wig: o.wig || 0 };
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = K.ink; ctx.lineWidth = 2.6;
    if (opt.crushed && (type === 'cake' || type === 'soap')) { ctx.scale(1.2, 0.6); opt.over = 1; }
    ART[type](ctx, opt);
    ctx.restore();
  }

  DCI.prizes = { K: K, draw: draw, face: face, rr: rr };
})(typeof self !== 'undefined' ? self : this);
