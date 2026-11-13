/* Footer game — paper toss. Drag the paper ball back, let go, land it in the bin.
   Wind changes after every basket; score is your streak, best is remembered. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;
  var cv = $('tossCanvas'); if(!cv) return;
  var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, floor = 0;
  var G = 1500, PULL = 7.4, MAX_PULL = 140;
  var ball = {x:0, y:0, vx:0, vy:0, r:13, rot:0}, home = {x:0, y:0}, pull = {x:0, y:0};
  var bin = {x:0, top:0, tw:70, bw:52, h:80}, wind = 0;
  var state = 'ready', aim = null, inBin = false, rest = 0, score = 0, best = +(S.store('tossBest') || 0), scored = false;
  var HIT = ['Swish!', 'Nothing but bin.', 'Clean.', 'Ship it.', 'Pixel-perfect.', 'Nailed the handoff.'];
  var MISS = ['Off the rim.', 'So close.', 'Iterate and retry.', 'v2 will land it.', 'The wind did it.', 'Needs more user testing.'];
  var pick = function(a){ return a[Math.floor(Math.random() * a.length)]; };

  function size(){
    var r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = Math.round(Math.max(260, Math.min(360, W * .6)));
    cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    floor = H - 26; home.x = Math.max(70, W * .17); home.y = floor - 74;
    placeBin(true); if(state === 'ready') resetBall();
  }
  function placeBin(keep){
    var lo = Math.max(home.x + 150, W * .5), hi = W - bin.tw / 2 - 18;
    if(!keep || !bin.x) bin.x = lo + Math.random() * Math.max(0, hi - lo);
    bin.x = Math.min(hi, Math.max(lo, bin.x));
    bin.top = floor - bin.h;
  }
  function newWind(){ wind = Math.round((Math.random() * 2 - 1) * 3 * Math.min(1, score / 2 + .34)); }
  function resetBall(){ ball.x = home.x; ball.y = home.y; ball.vx = ball.vy = 0; state = 'ready'; inBin = false; scored = false; rest = 0; }
  function msg(t){ $('tossMsg').textContent = t; }
  function paintScore(){ $('tossScore').textContent = score; $('tossBest').textContent = best; }

  /* bin walls as segments: left, right */
  function walls(){
    return [[bin.x - bin.tw/2, bin.top, bin.x - bin.bw/2, floor], [bin.x + bin.tw/2, bin.top, bin.x + bin.bw/2, floor]];
  }
  function collideSeg(s){
    var ax = s[0], ay = s[1], bx = s[2], by = s[3], dx = bx - ax, dy = by - ay;
    var t = Math.max(0, Math.min(1, ((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx*dx + dy*dy)));
    var px = ax + dx * t, py = ay + dy * t, nx = ball.x - px, ny = ball.y - py, d = Math.hypot(nx, ny);
    if(d >= ball.r || d === 0) return false;
    nx /= d; ny /= d; ball.x = px + nx * ball.r; ball.y = py + ny * ball.r;
    var vn = ball.vx * nx + ball.vy * ny;
    if(vn < 0){ ball.vx -= 1.5 * vn * nx; ball.vy -= 1.5 * vn * ny; ball.vx *= .8; ball.vy *= .8; if(Math.abs(vn) > 120) snd.tone(260 + Math.random() * 80, .08, 'triangle', Math.min(.12, Math.abs(vn) / 4000)); }
    return true;
  }
  function insideBinX(x, y){
    var k = Math.max(0, Math.min(1, (y - bin.top) / bin.h)), half = (bin.tw + (bin.bw - bin.tw) * k) / 2;
    return Math.abs(x - bin.x) < half;
  }

  function step(dt){
    if(state !== 'flying') return;
    ball.vy += G * dt; ball.vx += wind * 70 * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.rot += ball.vx * dt * .05;
    walls().forEach(collideSeg);
    if(!inBin && ball.y > bin.top + ball.r * .6 && insideBinX(ball.x, ball.y) && ball.vy > 0) inBin = true;
    if(ball.y > floor - ball.r){
      ball.y = floor - ball.r;
      if(ball.vy > 60) snd.thud();
      ball.vy *= -.32; ball.vx *= .7;
    }
    if(inBin && !scored && ball.y >= floor - ball.r - 2){ scored = true; hit(); }
    var slow = Math.hypot(ball.vx, ball.vy) < 25 && ball.y >= floor - ball.r - 1;
    rest = slow ? rest + dt : 0;
    if(!scored && (ball.x < -40 || ball.x > W + 40 || rest > .35)) miss();
  }
  function hit(){
    score++; if(score > best){ best = score; S.store('tossBest', best); }
    paintScore(); msg(pick(HIT) + (score > 2 ? ' ' + score + ' in a row!' : '')); snd.chime();
    state = 'done';
    setTimeout(function(){ placeBin(false); newWind(); resetBall(); msg(windText()); }, 900);
  }
  function miss(){
    state = 'done'; msg(pick(MISS)); score = 0; paintScore(); snd.tone(220, .14, 'sine', .06, 0, 150);
    setTimeout(function(){ resetBall(); msg(windText()); }, 650);
  }
  function windText(){ return wind === 0 ? 'no wind. easy one.' : 'wind ' + (wind < 0 ? '← ' : '→ ') + Math.abs(wind); }

  /* ---------- input: slingshot ---------- */
  function pos(e){ var r = cv.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; }
  cv.addEventListener('pointerdown', function(e){
    if(state !== 'ready') return;
    var p = pos(e); if(Math.hypot(p.x - ball.x, p.y - ball.y) > 48) return;
    aim = p; pull.x = pull.y = 0; state = 'aim'; cv.setPointerCapture(e.pointerId); snd.pop(); e.preventDefault();
  });
  cv.addEventListener('pointermove', function(e){
    if(state !== 'aim') return; var p = pos(e), dx = p.x - home.x, dy = p.y - home.y, d = Math.hypot(dx, dy);
    if(d > MAX_PULL){ dx *= MAX_PULL / d; dy *= MAX_PULL / d; }
    pull.x = dx; pull.y = dy;   // the throw uses the full pull, even past the edge
    ball.x = Math.max(ball.r + 2, Math.min(W - ball.r - 2, home.x + dx)); ball.y = Math.max(ball.r + 2, Math.min(floor - ball.r, home.y + dy));
  });
  function release(){
    if(state !== 'aim') return;
    var dx = -pull.x, dy = -pull.y;
    if(Math.hypot(dx, dy) < 12){ resetBall(); return; }
    ball.vx = dx * PULL; ball.vy = dy * PULL; state = 'flying'; snd.whoosh();
  }
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);

  /* ---------- drawing ---------- */
  function draw(){
    var c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    // floor
    c.strokeStyle = '#D9CFBC'; c.lineWidth = 2; c.setLineDash([6, 7]); c.beginPath(); c.moveTo(12, floor + .5); c.lineTo(W - 12, floor + .5); c.stroke(); c.setLineDash([]);
    // wind flag
    var fx = W - 34, fy = 22;
    c.strokeStyle = '#8A8172'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy + 44); c.stroke();
    var len = 8 + Math.abs(wind) * 9, dir = wind < 0 ? -1 : 1;
    c.fillStyle = wind ? '#D9482F' : '#C9BFAE'; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + dir * len, fy + 7 + Math.sin(performance.now() / 200) * 2); c.lineTo(fx, fy + 14); c.closePath(); c.fill();
    // aim guide
    if(state === 'aim'){
      var vx = -pull.x * PULL, vy = -pull.y * PULL, x = ball.x, y = ball.y;
      c.fillStyle = 'rgba(217,72,47,.55)';
      for(var i = 0; i < 9; i++){ for(var k = 0; k < 4; k++){ vy += G * .012; vx += wind * 70 * .012; x += vx * .012; y += vy * .012; } c.beginPath(); c.arc(x, y, Math.max(1.2, 3.4 - i * .25), 0, 6.3); c.fill(); }
      c.strokeStyle = 'rgba(60,50,40,.35)'; c.lineWidth = 2; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(home.x, home.y); c.lineTo(ball.x, ball.y); c.stroke(); c.setLineDash([]);
    }
    if(state === 'ready'){ c.strokeStyle = 'rgba(217,72,47,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(home.x, home.y, ball.r + 8 + Math.sin(performance.now() / 260) * 3, 0, 6.3); c.stroke(); }
    // bin back rim
    c.fillStyle = '#B9AE99'; c.beginPath(); c.ellipse(bin.x, bin.top, bin.tw / 2, 7, 0, 0, 6.3); c.fill();
    drawBall(c);
    // bin front
    var w = walls();
    c.fillStyle = 'rgba(205,196,178,.92)'; c.beginPath(); c.moveTo(w[0][0], w[0][1]); c.lineTo(w[1][0], w[1][1]); c.lineTo(w[1][2], w[1][3]); c.lineTo(w[0][2], w[0][3]); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,108,88,.35)'; c.lineWidth = 1;
    for(var m = 1; m < 6; m++){ var t = m / 6, xa = w[0][0] + (w[1][0] - w[0][0]) * t, xb = w[0][2] + (w[1][2] - w[0][2]) * t; c.beginPath(); c.moveTo(xa, bin.top); c.lineTo(xb, floor); c.stroke(); }
    for(var n = 1; n < 4; n++){ var yy = bin.top + bin.h * n / 4, hw = (bin.tw + (bin.bw - bin.tw) * n / 4) / 2; c.beginPath(); c.moveTo(bin.x - hw, yy); c.lineTo(bin.x + hw, yy); c.stroke(); }
    c.strokeStyle = '#8F8470'; c.lineWidth = 3; c.beginPath(); c.ellipse(bin.x, bin.top, bin.tw / 2, 7, 0, 0, Math.PI); c.stroke();
  }
  function drawBall(c){
    c.save(); c.translate(ball.x, ball.y); c.rotate(ball.rot);
    c.shadowColor = 'rgba(60,40,20,.2)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
    c.fillStyle = '#FFFDF6'; c.beginPath();
    for(var i = 0; i < 10; i++){ var a = i / 10 * 6.283, rr = ball.r * (i % 2 ? .86 : 1.04); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = '#CFC4AE'; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.moveTo(-6, -4); c.lineTo(2, 1); c.lineTo(-1, 7); c.moveTo(2, 1); c.lineTo(8, -3); c.moveTo(-3, -9); c.lineTo(0, -3); c.stroke();
    c.restore();
  }

  /* ---------- loop, only while the footer is on screen ---------- */
  var running = false, last = 0, visible = false;
  function loop(now){
    var dt = Math.min(.033, (now - last) / 1000); last = now;
    for(var i = 0; i < 3; i++) step(dt / 3);
    draw();
    if(visible) requestAnimationFrame(loop); else running = false;
  }
  function start(){ if(!running){ running = true; last = performance.now(); requestAnimationFrame(loop); } }
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; if(visible) start(); }).observe(cv);
  else { visible = true; start(); }
  window.addEventListener('resize', size);
  size(); newWind(); wind = 0; paintScore(); draw();
})();
