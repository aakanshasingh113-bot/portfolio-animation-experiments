/*
 * Don't Crush It — chamber renderer.
 *
 * Reads the simulation and draws it. Owns purely visual state (particles,
 * score popups, the jolt, finger easing). Nothing here feeds back into the game.
 */
(function (root) {
  'use strict';
  var DCI = root.DCI = root.DCI || {};
  var sim = DCI.sim, C = sim.C, PRIZES = sim.PRIZES, P = DCI.prizes, K = P.K;
  var TAU = Math.PI * 2;
  var FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  var COL = {
    wall: '#DCE9E1', wallDot: '#CADDD3', ceiling: '#BCD2C8',
    floor: '#C3D9CE', floorLine: '#8FB2A5', lip: '#A9C7BB',
    hole: '#2C3D3A', rail: '#4B443F', metal: '#FFF4DC', metalBack: '#E4D6B6'
  };
  var OPEN = 40, TIP_DY = 50, MAX_PARTICLES = 40;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutBack(t) { var c = 1.70158; t = clamp(t, 0, 1) - 1; return 1 + (c + 1) * t * t * t + c * t * t; }

  // ------------------------------------------------------------ backdrop ---

  function drawBackdrop(ctx) {
    ctx.fillStyle = COL.wall; ctx.fillRect(0, 0, C.W, C.H);

    // printed dot pattern
    ctx.fillStyle = COL.wallDot;
    for (var row = 0, y = 58; y < 356; y += 22, row++) {
      for (var x = (row % 2 ? 27 : 16); x < C.W; x += 22) {
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
      }
    }

    // ceiling
    ctx.fillStyle = COL.ceiling; ctx.fillRect(0, 0, C.W, 15);

    // floor
    ctx.fillStyle = COL.floor; ctx.fillRect(0, 362, C.W, C.H - 362);
    ctx.fillStyle = COL.lip; ctx.fillRect(0, 426, C.W, 14);
    ctx.strokeStyle = COL.floorLine; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 362); ctx.lineTo(C.W, 362); ctx.moveTo(0, 426); ctx.lineTo(C.W, 426); ctx.stroke();

    // chute sign on the back wall
    ctx.save();
    ctx.translate(C.CHUTE_X, 268); ctx.rotate(-0.045);
    ctx.fillStyle = K.yellow; ctx.strokeStyle = K.ink; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); P.rr(ctx, -34, -15, 68, 30, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.ink; ctx.font = '800 12px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PRIZES', -8, 1);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(23, -7); ctx.lineTo(23, 7); ctx.moveTo(18, 2.5); ctx.lineTo(23, 7.5); ctx.lineTo(28, 2.5); ctx.stroke();
    ctx.restore();

    // chute opening
    ctx.fillStyle = COL.hole; ctx.strokeStyle = K.ink; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(C.CHUTE_X, 402, 45, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,244,220,.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(C.CHUTE_X, 404, 38, 10, 0, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

    // rail and its brackets
    ctx.fillStyle = COL.rail; ctx.strokeStyle = K.ink; ctx.lineWidth = 2.4;
    ctx.beginPath(); P.rr(ctx, 8, 23, C.W - 16, 9, 4.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.red;
    ctx.beginPath(); P.rr(ctx, 12, 12, 16, 26, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); P.rr(ctx, C.W - 28, 12, 16, 26, 4); ctx.fill(); ctx.stroke();
  }

  function drawForeground(ctx) {
    // clear guard around the chute
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(255,250,240,.2)';
    ctx.beginPath(); P.rr(ctx, 22, 340, 110, 78, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(41,37,34,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); P.rr(ctx, 22, 340, 110, 78, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(31, 392); ctx.lineTo(31, 354); ctx.quadraticCurveTo(31, 348, 38, 348); ctx.stroke();

    // glass: two soft streaks near the edges, nothing across the play area
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(46, 0); ctx.lineTo(0, 150); ctx.lineTo(0, 72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath(); ctx.moveTo(58, 0); ctx.lineTo(68, 0); ctx.lineTo(0, 222); ctx.lineTo(0, 190); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(C.W, 250); ctx.lineTo(C.W, 330); ctx.lineTo(C.W - 34, C.H); ctx.lineTo(C.W - 58, C.H); ctx.closePath(); ctx.fill();

    // a shade under the top frame
    var g = ctx.createLinearGradient(0, 0, 0, 14);
    g.addColorStop(0, 'rgba(41,37,34,.2)'); g.addColorStop(1, 'rgba(41,37,34,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, 14);
  }

  // ---------------------------------------------------------------- claw ---

  function fingerPoints(sx, sy, tx, ty, side) {
    var l1 = 30, l2 = 32;
    var dx = tx - sx, dy = ty - sy, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5);
    var a = Math.atan2(dy, dx);
    var A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    var ea = a - side * A;                         // elbow bulges outward
    var ex = sx + Math.cos(ea) * l1, ey = sy + Math.sin(ea) * l1;
    var ta = Math.atan2(ty - ey, tx - ex);
    return [sx, sy, ex, ey, ex + Math.cos(ta) * l2, ey + Math.sin(ta) * l2];
  }

  function drawFinger(ctx, pts, fill) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.lineTo(pts[2], pts[3]); ctx.lineTo(pts[4], pts[5]);
    ctx.strokeStyle = K.ink; ctx.lineWidth = 10.5; ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = 5.6; ctx.stroke();
    ctx.fillStyle = K.ink; ctx.beginPath(); ctx.arc(pts[2], pts[3], 2.1, 0, TAU); ctx.fill();
    // rubber tip
    ctx.fillStyle = K.red; ctx.strokeStyle = K.ink; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(pts[4], pts[5], 4.4, 0, TAU); ctx.fill(); ctx.stroke();
  }

  function drawCarriage(ctx, x, hubY) {
    // cable — always vertical
    ctx.strokeStyle = K.ink; ctx.lineWidth = 2.6; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, hubY - 16); ctx.stroke();

    ctx.lineJoin = 'round';
    ctx.fillStyle = K.yellow; ctx.strokeStyle = K.ink; ctx.lineWidth = 2.6;
    ctx.beginPath(); P.rr(ctx, x - 28, 15, 56, 25, 6); ctx.fill(); ctx.stroke();
    // wheels on the rail
    ctx.fillStyle = K.ink;
    ctx.beginPath(); ctx.arc(x - 16, 27.5, 5, 0, TAU); ctx.arc(x + 16, 27.5, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = K.yellow;
    ctx.beginPath(); ctx.arc(x - 16, 27.5, 1.6, 0, TAU); ctx.arc(x + 16, 27.5, 1.6, 0, TAU); ctx.fill();
    // spool
    ctx.fillStyle = K.ivory; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, 28, 5.5, 0, TAU); ctx.fill(); ctx.stroke();
  }

  function drawHub(ctx) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = K.ink; ctx.lineWidth = 2.5;
    ctx.fillStyle = K.ivory;
    ctx.beginPath(); P.rr(ctx, -5, -18, 10, 9, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.yellow;
    ctx.beginPath(); ctx.moveTo(-15, 1); ctx.bezierCurveTo(-15, -15, 15, -15, 15, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.ivory;
    ctx.beginPath(); P.rr(ctx, -17.5, 0, 35, 7, 3.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.ink;
    ctx.beginPath(); ctx.arc(-10, 3.5, 1.3, 0, TAU); ctx.arc(10, 3.5, 1.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-7.5, -8.5, -3, -9.5); ctx.stroke();
  }

  // ------------------------------------------------------------ renderer ---

  function createRenderer(canvas) {
    var ctx = canvas.getContext('2d');
    var scale = 1;
    var backdrop = document.createElement('canvas');
    var particles = [], popups = [];
    var jolt = 0, visSpread = OPEN, firstFrame = true;

    function resize(cssW, dpr) {
      var w = Math.max(1, Math.round(cssW * dpr));
      var h = Math.max(1, Math.round(cssW * dpr * C.H / C.W));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      scale = w / C.W;
      backdrop.width = w; backdrop.height = h;
      var b = backdrop.getContext('2d');
      b.setTransform(scale, 0, 0, scale, 0, 0);
      drawBackdrop(b);
    }

    function reset() { particles.length = 0; popups.length = 0; jolt = 0; }

    function addParticle(p) { if (particles.length < MAX_PARTICLES) particles.push(p); }

    function burst(kind, x, y, n) {
      for (var i = 0; i < n; i++) {
        var a = -Math.PI * (0.12 + 0.76 * (i + 0.5) / n), sp = 90 + ((i * 53) % 90);
        var p = { kind: kind, x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 3 + (i * 7 % 4), rot: i, vr: (i % 2 ? 1 : -1) * (3 + i % 4), age: 0, life: 0.8 };
        if (kind === 'bubble') { p.vx *= 0.35; p.vy = -30 - (i * 17 % 40); p.life = 1.1; p.r = 3 + (i * 5 % 5); p.x += (i - n / 2) * 7; }
        if (kind === 'spark') { p.vx *= 0.5; p.vy *= 0.5; p.life = 0.6; p.r = 4 + i % 3; }
        addParticle(p);
      }
    }

    /** React to simulation events with effects. Visual only. */
    function onEvent(ev, game, reduced) {
      var p = ev.prize, d, y;
      if (ev.type === 'restart' || ev.type === 'next') { reset(); return; }
      if (ev.type === 'collected') {
        popups.push({ text: '+' + ev.outcome.total, x: C.CHUTE_X + 4, y: 330, age: 0 });
        return;
      }
      if (reduced) return;
      if (ev.type === 'fail' && p) {
        d = PRIZES[p.type]; y = C.FLOOR_Y - p.h - d.h * 0.5;
        if (ev.cause === 'crush') {
          jolt = 1;
          burst(p.type === 'cake' ? 'cream' : p.type === 'egg' ? 'shell' : p.type === 'soap' ? 'bubble' : 'leaf', p.x, y, 8);
        } else {
          burst(p.type === 'soap' ? 'bubble' : 'puff', p.x, y, p.type === 'soap' ? 6 : 4);
        }
      } else if (ev.type === 'lifted' && p) {
        burst('spark', game.clawX, C.TOP_HUB_Y + 50, 5);
      }
    }

    function stepEffects(dt) {
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.age += dt;
        if (p.age >= p.life) { particles.splice(i, 1); continue; }
        if (p.kind === 'bubble') { p.vx *= 0.98; p.x += Math.sin(p.age * 9 + p.rot) * 12 * dt; }
        else if (p.kind !== 'spark') p.vy += 620 * dt;
        else { p.vx *= 0.94; p.vy *= 0.94; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.kind !== 'bubble' && p.kind !== 'spark' && p.y > C.FLOOR_Y + 6) { p.y = C.FLOOR_Y + 6; p.vy = 0; p.vx *= 0.8; p.vr = 0; }
      }
      for (var j = popups.length - 1; j >= 0; j--) { popups[j].age += dt; if (popups[j].age > 1.3) popups.splice(j, 1); }
      if (jolt > 0) jolt = Math.max(0, jolt - dt / 0.22);
    }

    function drawParticles() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i], fade = clamp((p.life - p.age) / 0.25, 0, 1);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.strokeStyle = K.ink; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
        switch (p.kind) {
          case 'cream':
            ctx.fillStyle = K.cream; ctx.beginPath(); ctx.ellipse(0, 0, p.r + 1, p.r * 0.75, 0, 0, TAU); ctx.fill(); ctx.stroke(); break;
          case 'shell':
            ctx.fillStyle = K.egg; ctx.beginPath(); ctx.moveTo(-p.r, p.r * 0.6); ctx.lineTo(0, -p.r); ctx.lineTo(p.r, p.r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
          case 'leaf':
            ctx.fillStyle = (i % 3 === 0) ? K.pink : K.cactus; ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke(); break;
          case 'bubble':
            ctx.fillStyle = 'rgba(255,251,240,.55)'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.55, -2.4, -1.5); ctx.stroke(); break;
          case 'puff':
            ctx.fillStyle = K.ivory; ctx.globalAlpha = fade * 0.9; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); ctx.stroke(); break;
          default: // spark
            ctx.fillStyle = K.yellow; ctx.beginPath();
            ctx.moveTo(0, -p.r); ctx.quadraticCurveTo(0, 0, p.r, 0); ctx.quadraticCurveTo(0, 0, 0, p.r);
            ctx.quadraticCurveTo(0, 0, -p.r, 0); ctx.quadraticCurveTo(0, 0, 0, -p.r); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawPopups(reduced) {
      for (var i = 0; i < popups.length; i++) {
        var p = popups[i], t = p.age / 1.3;
        var y = p.y - (reduced ? 0 : 34 * (1 - (1 - t) * (1 - t)));
        ctx.save();
        ctx.globalAlpha = clamp((1.3 - p.age) / 0.3, 0, 1);
        ctx.font = '900 26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = K.ink; ctx.strokeText(p.text, p.x, y);
        ctx.fillStyle = K.yellow; ctx.fillText(p.text, p.x, y);
        ctx.restore();
      }
    }

    function shadow(x, rx, alpha) {
      ctx.fillStyle = 'rgba(41,37,34,' + alpha + ')';
      ctx.beginPath(); ctx.ellipse(x, C.FLOOR_Y + 3, rx, rx * 0.2, 0, 0, TAU); ctx.fill();
    }

    function exprFor(game, p, phase, time, reduced) {
      var S = sim.S;
      switch (p.status) {
        case 'carried': case 'dropping': return 'happy';
        case 'crushed': return p.type === 'cactus' ? 'angry' : 'crushed';
        case 'slipped': return 'smug';
        case 'gripped': case 'held':
          var z = game.zone();
          if (z === 'high') return 'strain';
          if (z === 'safe') return 'calm';
          return (phase === S.LIFTING || game.pressure > 4) ? 'slip' : 'nervous';
        default:
          if (game.target === p && phase === S.LOWERING) return 'nervous';
          if (p.type === 'egg') return 'nervous';
          if (!reduced && ((time * 0.9 + p.x * 0.013) % 3.1) < 0.13) return 'blink';
          return 'idle';
      }
    }

    function cactusWiggle(game, phase, reduced) {
      // Personality only: fixed moments in the lift, no effect on the rules.
      if (reduced || phase !== sim.S.LIFTING) return 0;
      var starts = [0.45, 1.25, 1.95], len = 0.36;
      for (var i = 0; i < starts.length; i++) {
        var u = (game.t - starts[i]) / len;
        if (u > 0 && u < 1) return Math.sin(u * TAU * 2) * 0.13 * Math.sin(u * Math.PI);
      }
      return 0;
    }

    function draw(game, view) {
      var S = sim.S, phase = game.phase(), dt = view.dt, reduced = view.reduced;
      var x = view.x, hubY = game.hubY();
      var t = game.target, holding = t && (t.status === 'gripped' || t.status === 'held' || t.status === 'carried');
      var def = t ? PRIZES[t.type] : null;

      if (game.state !== S.PAUSED) stepEffects(dt);

      // how far the fingers are closed
      var targetSpread = OPEN;
      if (holding) {
        var w = def.halfW + 3, pr = game.pressure;
        targetSpread = pr < 6 ? lerp(OPEN, w, pr / 6) : w * (1 - def.soft * (pr - 6) / 94);
      } else if (!t && game.emptyClose > 0) {
        targetSpread = lerp(OPEN, 7, sim.easeInOut(game.emptyClose));
      }
      if (firstFrame) { visSpread = targetSpread; firstFrame = false; }
      visSpread += (targetSpread - visSpread) * (1 - Math.exp(-dt / 0.035));
      if (holding) visSpread = Math.max(visSpread, targetSpread);   // never draw fingers inside the prize

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(backdrop, 0, 0);
      var jx = (!reduced && jolt > 0) ? Math.sin(view.time * 95) * 3.2 * jolt : 0;
      ctx.setTransform(scale, 0, 0, scale, jx * scale, 0);

      // contact shadows
      var i, p, d;
      for (i = 0; i < game.prizes.length; i++) {
        p = game.prizes[i]; d = PRIZES[p.type];
        if (p.status === 'collected' || p.status === 'dropping' || p.status === 'carried') continue;
        var lift = p.status === 'held' ? (1 - game.depth) * (sim.grabHubY(p.type) - C.TOP_HUB_Y) : p.h;
        var k = clamp(1 - lift / 320, 0.35, 1);
        var a = (p.status === 'idle' ? clamp(game.lineupT * 1.6 - i * 0.18, 0, 1) : 1) * 0.16 * k;
        shadow(p.x, d.halfW * (p.status === 'crushed' ? 1.15 : 0.95) * k, a);
      }
      // the claw's own shadow: an aiming aid, not a promise
      if (!game.carrying) shadow(x, 22 + 10 * game.depth, 0.1 + 0.1 * game.depth);

      // back finger (behind whatever is being held)
      var close = clamp((OPEN - visSpread) / (OPEN - 7), 0, 1);
      ctx.save();
      ctx.translate(x, hubY); ctx.rotate(view.sway);
      var backLen = 26 + 20 * close;
      drawFinger(ctx, [0, 2, 0, 2 + backLen * 0.5, 0, 2 + backLen], COL.metalBack);
      ctx.restore();

      // prizes
      for (i = 0; i < game.prizes.length; i++) {
        p = game.prizes[i]; d = PRIZES[p.type];
        if (p.status === 'collected') continue;
        var o = { expr: exprFor(game, p, phase, view.time, reduced), over: 0, crushed: p.status === 'crushed', wig: 0 };
        ctx.save();
        if (p.status === 'idle') {
          var local = clamp(game.lineupT * 1.6 - i * 0.18, 0, 1);
          ctx.globalAlpha = clamp(local * 2, 0, 1);
          ctx.translate(p.x, C.FLOOR_Y + (reduced ? 0 : (1 - easeOutBack(local)) * 26));
        } else if (p.status === 'gripped' || p.status === 'held' || p.status === 'carried') {
          var sx = clamp((visSpread - 3) / d.halfW, 0.55, 1), sy = 1 + (1 - sx) * 0.45;
          var slide = game.slip * 16;
          o.over = Math.max(game.crush, game.maxCrush * 0.6, clamp((game.pressure - d.max) / (100 - d.max), 0, 1) * 0.5);
          if (p.type === 'cactus') o.wig = cactusWiggle(game, phase, reduced);
          ctx.translate(x, hubY);
          ctx.rotate(view.sway * 0.6 + game.slip * 0.14);
          ctx.translate(0, C.HUB_GAP + d.h + slide);
          ctx.scale(sx, sy);
        } else if (p.status === 'dropping') {
          var fall = 0.5 * 2600 * game.t * game.t;
          ctx.beginPath(); ctx.rect(0, 0, C.W, 409); ctx.clip();
          ctx.translate(C.CHUTE_X, C.TOP_HUB_Y + C.HUB_GAP + d.h + fall);
        } else { // crushed or slipped, loose in the chamber
          ctx.translate(p.x, C.FLOOR_Y - p.h);
          if (p.status === 'slipped') ctx.rotate(clamp(p.h / 200, 0, 1) * 0.25);
        }
        P.draw(ctx, p.type, o);
        ctx.restore();
      }

      // carriage, cable, front fingers, hub
      drawCarriage(ctx, x, hubY);
      ctx.save();
      ctx.translate(x, hubY); ctx.rotate(view.sway);
      drawFinger(ctx, fingerPoints(-9, 3, -visSpread, TIP_DY, -1), COL.metal);
      drawFinger(ctx, fingerPoints(9, 3, visSpread, TIP_DY, 1), COL.metal);
      drawHub(ctx);
      ctx.restore();

      drawParticles();
      drawPopups(reduced);

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawForeground(ctx);
    }

    return { resize: resize, draw: draw, onEvent: onEvent, reset: reset };
  }

  // ---------------------------------------------------------------- tray ---

  /** Collected prizes in the cabinet tray. items: [{type, at}] where `at` is the landing time. */
  function drawTray(canvas, items, time, reduced) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var s = h / 76;                     // logical tray height
    ctx.setTransform(s, 0, 0, s, 0, 0);
    var lw = w / s;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], age = time - it.at, y = 0;
      if (!reduced && age < 0.7) {
        var u = age / 0.7;              // drop in, one bounce
        y = u < 0.45 ? -70 * (1 - (u / 0.45) * (u / 0.45)) : -14 * Math.sin((u - 0.45) / 0.55 * Math.PI) * (1 - u);
      }
      var cx = lw * (0.2 + 0.3 * i);
      ctx.fillStyle = 'rgba(41,37,34,.16)';
      ctx.beginPath(); ctx.ellipse(cx, 69, 21, 3.6, 0, 0, TAU); ctx.fill();
      ctx.save();
      ctx.translate(cx, 68 + y); ctx.scale(0.66, 0.66);
      P.draw(ctx, it.type, { expr: age < 1.2 ? 'happy' : 'calm' });
      ctx.restore();
    }
  }

  /** A small standalone portrait, used on the round summary. */
  function drawMini(canvas, type, dpr) {
    var size = 56;
    canvas.width = size * dpr; canvas.height = size * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(size / 2, size - 5); ctx.scale(0.58, 0.58);
    P.draw(ctx, type, { expr: 'happy' });
  }

  DCI.render = { createRenderer: createRenderer, drawTray: drawTray, drawMini: drawMini };
})(typeof self !== 'undefined' ? self : this);
