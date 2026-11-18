/* "Ask me anything" chat. Answers come from ABOUT_ME (about-me.js) and the
   case studies (cases.js). On the claude.ai page it asks Claude; anywhere
   else it falls back to the quick answers in ABOUT_ME.faq. */
(function(){
  var ME = window.ABOUT_ME; if(!ME) return;
  var snd = (window.Site && window.Site.snd) || { pop:function(){}, click:function(){}, hover:function(){} };
  var history = [], ai = null, busy = false;

  /* ---------- knowledge sent to Claude ---------- */
  function caseText(){
    var C = window.CASES || {}, out = [];
    Object.keys(C).forEach(function(k){
      var c = C[k], lines = ['CASE STUDY: ' + c.title + ' (' + c.eyebrow + ')', c.sub];
      c.meta.forEach(function(m){ lines.push(m[0] + ': ' + m[1]); });
      c.secs.forEach(function(s){ lines.push(s[0] + ': ' + (Array.isArray(s[1]) ? s[1].join('; ') : s[1])); });
      out.push(lines.join('\n'));
    });
    return out.join('\n\n');
  }
  function system(){
    return 'You are the friendly assistant on ' + ME.name + '\'s design portfolio website. Visitors (often recruiters and hiring managers) ask about her work.\n' +
      'Rules:\n- Answer ONLY from the information below. If the answer is not there, say you don\'t know that yet and suggest emailing her at ' + ME.email + '.\n' +
      '- Never invent companies, numbers, clients, dates or opinions.\n- Refer to her as "Aakansha" or "she". Be warm, confident and concise: 2–4 short sentences, or a few short bullets when listing.\n' +
      '- Plain text only, no markdown headings. You may mention which section of the site to look at (Featured work, Design process, AI experiments, Contact).\n' +
      '- If text contains placeholders like [Company], don\'t repeat the brackets; say the company name will be added soon.\n\n' +
      'ABOUT HER:\n' + ME.facts + '\n\n' + caseText();
  }

  /* ---------- offline fallback: best keyword match ---------- */
  function localAnswer(q){
    q = q.toLowerCase(); var best = null, score = 0;
    ME.faq.forEach(function(f){ var s = 0; f.k.forEach(function(k){ if(q.indexOf(k) >= 0) s += k.length; }); if(s > score){ score = s; best = f; } });
    var a = best ? best.a : 'I don\'t have that one yet. Ask about her projects, process, AI tools, experience or availability, or email her at {email}.';
    return a.replace(/\{email\}/g, ME.email);
  }

  /* ---------- UI ---------- */
  var wrap = document.createElement('div'); wrap.className = 'chat'; wrap.innerHTML =
    '<button class="chat-fab" type="button" aria-expanded="false" aria-controls="chatPanel"><span class="chat-dot" aria-hidden="true"></span><span class="chat-fab-t">Ask me anything</span></button>' +
    '<section class="chat-panel" id="chatPanel" role="dialog" aria-label="Ask about Aakansha" hidden>' +
      '<header class="chat-head"><span class="chat-av" aria-hidden="true">AS</span><div><b>Ask about Aakansha</b><span id="chatMode">answers from her portfolio</span></div><button class="chat-x" type="button" aria-label="Close chat">×</button></header>' +
      '<div class="chat-log" id="chatLog" aria-live="polite"></div>' +
      '<div class="chat-sugs" id="chatSugs"></div>' +
      '<form class="chat-form" id="chatForm"><input id="chatIn" type="text" autocomplete="off" maxlength="400" placeholder="Ask about her work, process, availability…" aria-label="Your question"><button type="submit" aria-label="Send">↑</button></form>' +
    '</section>';
  document.body.appendChild(wrap);
  var fab = wrap.querySelector('.chat-fab'), panel = wrap.querySelector('.chat-panel'), log = wrap.querySelector('#chatLog'),
      form = wrap.querySelector('#chatForm'), input = wrap.querySelector('#chatIn'), sugs = wrap.querySelector('#chatSugs');

  function bubble(who, text){
    var b = document.createElement('div'); b.className = 'msg ' + who; b.textContent = text;
    log.appendChild(b); log.scrollTop = log.scrollHeight; return b;
  }
  function setOpen(on){
    panel.hidden = !on; fab.setAttribute('aria-expanded', on ? 'true' : 'false'); wrap.classList.toggle('open', on);
    if(on){ snd.pop(); setTimeout(function(){ input.focus(); }, 60); }
  }
  fab.addEventListener('click', function(){ setOpen(panel.hidden); });
  wrap.querySelector('.chat-x').addEventListener('click', function(){ setOpen(false); fab.focus(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !panel.hidden) setOpen(false); });

  bubble('bot', 'Hi! I\'m Aakansha\'s portfolio assistant. Ask me about her projects, design process, how she uses AI, or whether she\'s open to new roles.');
  ME.suggestions.forEach(function(s){
    var b = document.createElement('button'); b.type = 'button'; b.textContent = s;
    b.addEventListener('click', function(){ ask(s); }); sugs.appendChild(b);
  });

  async function ask(q){
    q = (q || '').trim(); if(!q || busy) return;
    busy = true; sugs.hidden = true; input.value = ''; snd.click();
    bubble('me', q);
    var out = bubble('bot typing', '…');
    history.push({ role: 'user', content: q });
    var answer;
    if(ai){
      try{
        var msgs = history.slice(-10);
        while(msgs.length && msgs[0].role !== 'user') msgs.shift();
        msgs = msgs.map(function(m){ return { role: m.role, content: m.content }; });
        msgs[0].content = system() + '\n\n---\nVisitor question: ' + msgs[0].content;
        var r = await ai(msgs, { modelTier: 'quick', cache: false, onText: function(t){ if(t.text && t.text !== 'Thinking...'){ out.classList.remove('typing'); out.textContent = t.text; log.scrollTop = log.scrollHeight; } } });
        answer = (r && r.text) || localAnswer(q);
      }catch(e){
        if(e && e.code === 'not_granted'){ ai = null; setMode(); }
        answer = localAnswer(q);
      }
    } else {
      await new Promise(function(r){ setTimeout(r, 450); });
      answer = localAnswer(q);
    }
    out.classList.remove('typing'); out.textContent = answer; log.scrollTop = log.scrollHeight;
    history.push({ role: 'assistant', content: answer });
    busy = false;
  }
  form.addEventListener('submit', function(e){ e.preventDefault(); ask(input.value); });

  function setMode(){ wrap.querySelector('#chatMode').textContent = ai ? 'powered by Claude · answers from her portfolio' : 'answers from her portfolio'; }

  /* light up Claude when this page is allowed to ask it */
  var tries = 0;
  (function connect(){
    if(window.claude && window.claude.use){
      window.claude.use('sample').then(function(s){ if(s){ ai = s; setMode(); } }).catch(function(){});
    } else if(++tries < 20) setTimeout(connect, 250);
  })();
})();
