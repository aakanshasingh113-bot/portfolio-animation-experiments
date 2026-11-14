/* Side B — hobbies as tracks on a record. Pick a track: the arm drops,
   the record spins, the label changes colour and a little tune plays. */
(function(){
  var S = window.Site, $ = S.$, snd = S.snd, reduce = S.reduce;
  var root = $('sideb'); if(!root) return;
  var trks = Array.prototype.slice.call(root.querySelectorAll('.trk'));
  var vinyl = $('vinyl'), label = $('vLabel'), labelT = $('vLabelT'), playBtn = $('nowPlay');
  var cur = 0, playing = false, loop = null;

  /* each track gets its own short pentatonic phrase */
  var BASE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
  var PHRASES = [[0,2,4,5,4,2], [3,4,5,7,5,4], [4,2,3,1,2,0], [0,3,5,3,6,5], [5,4,2,4,1,2]];
  function phrase(i){
    PHRASES[i].forEach(function(n, k){ snd.tone(BASE[n], .5, 'triangle', .05, k * .32); });
    snd.tone(BASE[PHRASES[i][0]] / 2, 1.8, 'sine', .04);
  }

  function show(i){
    cur = i;
    trks.forEach(function(t, k){ t.classList.toggle('on', k === i); t.setAttribute('aria-pressed', k === i && playing ? 'true' : 'false'); });
    var tpl = root.querySelector('template[data-track="' + i + '"]'), body = $('nowBody');
    body.innerHTML = ''; body.appendChild(tpl.content.cloneNode(true));
    body.classList.remove('in'); void body.offsetWidth; body.classList.add('in');
    $('nowK').textContent = 'Side B · track ' + (i + 1);
    var c = trks[i].style.getPropertyValue('--lc');
    root.style.setProperty('--lc', c);
    labelT.textContent = trks[i].querySelector('.trk-t').textContent;
  }
  function setPlaying(on){
    playing = on;
    root.classList.toggle('playing', on);
    playBtn.innerHTML = on ? '❚❚ <span>Pause</span>' : '▶ <span>Play</span>';
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    trks.forEach(function(t, k){ t.setAttribute('aria-pressed', on && k === cur ? 'true' : 'false'); });
    clearInterval(loop);
    if(on){
      snd.noise(.25, 'highpass', 3000, .03);          // needle drop crackle
      setTimeout(function(){ if(playing) phrase(cur); }, 350);
      loop = setInterval(function(){ if(playing && !document.hidden) phrase(cur); }, 2600);
    }
  }
  trks.forEach(function(t, i){
    t.addEventListener('click', function(){
      if(i === cur && playing){ setPlaying(false); return; }
      var wasPlaying = playing;
      show(i);
      if(wasPlaying){ clearInterval(loop); setPlaying(true); } else setPlaying(true);
    });
    t.addEventListener('mouseenter', function(){ snd.hover(BASE[i] * 2); });
  });
  playBtn.addEventListener('click', function(){ setPlaying(!playing); });

  /* stop the music once the section scrolls away */
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ if(!es[0].isIntersecting && playing) setPlaying(false); }, {threshold:.1}).observe(root);
  show(0);
})();
