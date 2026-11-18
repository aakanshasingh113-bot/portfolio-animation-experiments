/* Side B: a hand-written mixtape insert. Pick a track and it gets circled in pen;
   its liner note shows on the right, and it can play a short tune. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd;
  var root = $('sideb'); if(!root) return;
  var trks = Array.prototype.slice.call(root.querySelectorAll('.jc-list .trk'));
  var playBtn = $('nowPlay'), body = $('nowBody');
  var cur = 0, playing = false, loop = null;

  var BASE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
  var PHRASES = [[0,2,4,5,4,2], [3,4,5,7,5,4], [4,2,3,1,2,0], [0,3,5,3,6,5], [5,4,2,4,1,2]];
  function phrase(i){
    PHRASES[i].forEach(function(n, k){ snd.tone(BASE[n], .5, 'triangle', .05, k * .32); });
    snd.tone(BASE[PHRASES[i][0]] / 2, 1.8, 'sine', .04);
  }
  function show(i){
    cur = i;
    trks.forEach(function(t, k){ t.classList.toggle('on', k === i); });
    var tpl = root.querySelector('template[data-track="' + i + '"]');
    body.innerHTML = ''; body.appendChild(tpl.content.cloneNode(true));
    body.classList.remove('in'); void body.offsetWidth; body.classList.add('in');
    $('nowK').textContent = 'track ' + (i + 1) + ' of ' + trks.length;
  }
  function setPlaying(on){
    playing = on;
    root.classList.toggle('playing', on);
    playBtn.textContent = on ? 'okay, stop the tune' : 'play its little tune';
    trks.forEach(function(t, k){ t.setAttribute('aria-pressed', on && k === cur ? 'true' : 'false'); });
    clearInterval(loop);
    if(on){
      phrase(cur);
      loop = setInterval(function(){ if(playing && !document.hidden) phrase(cur); }, 2600);
    }
  }
  trks.forEach(function(t, i){
    t.addEventListener('click', function(){
      if(i === cur) return;
      show(i);
      snd.noise(.12, 'bandpass', 2400, .03);  /* pen on paper */
      if(playing) setPlaying(true);
    });
  });
  playBtn.addEventListener('click', function(){ setPlaying(!playing); });
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ if(!es[0].isIntersecting && playing) setPlaying(false); }, {threshold:.1}).observe(root);
  show(0);
})();
