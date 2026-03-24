// ── TERMS ──
let termsChecked = false;

function toggleTermsCheck() {
  termsChecked = !termsChecked;
  const row = document.getElementById('terms-check-row');
  const btn = document.getElementById('terms-agree-btn');
  row.classList.toggle('checked', termsChecked);
  btn.disabled = !termsChecked;
}

function acceptTerms() {
  if (!termsChecked) return;
  localStorage.setItem('asr_terms', '1');
  document.getElementById('terms-modal').style.display = 'none';
}
if (localStorage.getItem('asr_terms')) {
  document.getElementById('terms-modal').style.display = 'none';
}

// ── CHAT SESSION MANAGEMENT ──
let history = [];
let isLoading = false;
let currentSessionId = null;
let sessions = JSON.parse(localStorage.getItem('asr_sessions') || '[]');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function saveSessions() {
  localStorage.setItem('asr_sessions', JSON.stringify(sessions));
}

function getSessionTitle(message) {
  return message.length > 40 ? message.slice(0, 40) + '…' : message;
}

function getSessionIcon(message) {
  const m = message.toLowerCase();
  if (/weather|temperature|forecast|rain|snow|cloud/.test(m)) return 'fa-cloud-sun';
  if (/news|headline|latest|breaking/.test(m)) return 'fa-newspaper';
  if (/photo|image|picture|pic|show/.test(m)) return 'fa-image';
  if (/joke|funny|laugh|humor/.test(m)) return 'fa-face-laugh';
  if (/define|meaning|dictionary/.test(m)) return 'fa-book-open';
  if (/search|google|find|look up/.test(m)) return 'fa-magnifying-glass';
  if (/code|program|function|script/.test(m)) return 'fa-code';
  return 'fa-comment';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function renderChatList() {
  const list = document.getElementById('chat-list');
  const empty = document.getElementById('chat-list-empty');

  // Remove all non-empty items
  list.querySelectorAll('.recent-item').forEach(el => el.remove());

  if (sessions.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  // Render newest first
  [...sessions].reverse().forEach(sess => {
    const item = document.createElement('div');
    item.className = 'recent-item' + (sess.id === currentSessionId ? ' active' : '');
    item.dataset.id = sess.id;
    item.innerHTML = `
      <div class="recent-icon"><i class="fa-solid ${sess.icon || 'fa-comment'}"></i></div>
      <div class="recent-info">
        <div class="recent-title">${escapeHtml(sess.title)}</div>
        <div class="recent-time">${timeAgo(sess.ts)}</div>
      </div>
      <button class="recent-del" title="Delete" onclick="deleteSession('${sess.id}', event)">
        <i class="fa-solid fa-xmark"></i>
      </button>`;
    item.addEventListener('click', () => loadSession(sess.id));
    list.appendChild(item);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function deleteSession(id, e) {
  e.stopPropagation();
  sessions = sessions.filter(s => s.id !== id);
  saveSessions();
  if (currentSessionId === id) {
    currentSessionId = null;
    history = [];
    resetToWelcome();
  }
  renderChatList();
  toast('Chat deleted');
}

function loadSession(id) {
  const sess = sessions.find(s => s.id === id);
  if (!sess) return;
  currentSessionId = id;
  history = sess.history || [];

  // Rebuild messages DOM
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';
  (sess.messages || []).forEach(m => {
    addMsgDOM(m.role, m.html || m.content, m.html ? true : false);
  });
  renderChatList();
  scrollToBottom();
}

function newChat() {
  currentSessionId = null;
  history = [];
  resetToWelcome();
  renderChatList();
  document.getElementById('input').focus();
}

function resetToWelcome() {
  document.getElementById('messages').innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-logo">
        <svg class="logo-svg-lg" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wlg2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3B82F6"/>
              <stop offset="100%" stop-color="#A855F7"/>
            </linearGradient>
          </defs>
          <polygon points="48,2 90,26 90,70 48,94 6,70 6,26" fill="url(#wlg2)"/>
          <circle cx="48" cy="22" r="5.5" fill="white" opacity="0.95"/>
          <circle cx="22" cy="48" r="5.5" fill="white" opacity="0.95"/>
          <circle cx="74" cy="48" r="5.5" fill="white" opacity="0.95"/>
          <circle cx="34" cy="70" r="4.5" fill="white" opacity="0.85"/>
          <circle cx="62" cy="70" r="4.5" fill="white" opacity="0.85"/>
          <line x1="48" y1="22" x2="22" y2="48" stroke="white" stroke-width="1.5" opacity="0.55"/>
          <line x1="48" y1="22" x2="74" y2="48" stroke="white" stroke-width="1.5" opacity="0.55"/>
          <line x1="22" y1="48" x2="34" y2="70" stroke="white" stroke-width="1.5" opacity="0.55"/>
          <line x1="74" y1="48" x2="62" y2="70" stroke="white" stroke-width="1.5" opacity="0.55"/>
          <line x1="22" y1="48" x2="74" y2="48" stroke="white" stroke-width="1" opacity="0.3"/>
          <line x1="34" y1="70" x2="62" y2="70" stroke="white" stroke-width="1" opacity="0.3"/>
          <line x1="48" y1="22" x2="34" y2="70" stroke="white" stroke-width="1" opacity="0.2"/>
          <line x1="48" y1="22" x2="62" y2="70" stroke="white" stroke-width="1" opacity="0.2"/>
        </svg>
      </div>
      <h1>ASR AI</h1>
      <p>Your intelligent  assistant. Ask me anything — I can chat, search the web, get weather, fetch news, find images, tell jokes, and define words.</p>
      <div class="suggestion-grid">
        <div class="suggestion" onclick="insertPrompt('What\\'s the weather in Mumbai today?')">
          <div class="suggestion-icon"><i class="fa-solid fa-cloud-sun"></i></div>
          <div class="suggestion-text">Weather in Mumbai today</div>
        </div>
        <div class="suggestion" onclick="insertPrompt('Latest AI news')">
          <div class="suggestion-icon"><i class="fa-solid fa-newspaper"></i></div>
          <div class="suggestion-text">Latest AI news</div>
        </div>
        <div class="suggestion" onclick="insertPrompt('Show me photos of sunset')">
          <div class="suggestion-icon"><i class="fa-solid fa-image"></i></div>
          <div class="suggestion-text">Show me photos of sunset</div>
        </div>
        <div class="suggestion" onclick="insertPrompt('Tell me a funny joke')">
          <div class="suggestion-icon"><i class="fa-solid fa-face-laugh"></i></div>
          <div class="suggestion-text">Tell me a funny joke</div>
        </div>
      </div>
    </div>`;
}

function clearChat() {
  newChat();
  toast('Chat cleared');
}

// ── TOAST ──
function toast(msg, ok = true) {
  const t = document.getElementById('toast');
  const i = t.querySelector('i');
  document.getElementById('toast-txt').textContent = ' ' + msg;
  i.className = ok ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation';
  i.style.color = ok ? 'var(--green)' : 'var(--rose)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── HELPERS ──
function insertPrompt(text) {
  const inp = document.getElementById('input');
  inp.value = text;
  inp.focus();
  inp.setSelectionRange(text.length, text.length);
  autoResize(inp);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function scrollToBottom(force = false) {
  const m = document.getElementById('messages');
  const threshold = 120; // px from bottom
  const isNearBottom = m.scrollHeight - m.scrollTop - m.clientHeight < threshold;
  if (force || isNearBottom) m.scrollTop = m.scrollHeight;
}

// ── MARKDOWN PARSER ──
function md(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g,(_,lang,code)=>{
      const escaped = code.trim();
      const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
      return `<div class="code-block">${langLabel}<pre><code>${escaped}</code></pre><button class="copy-btn" onclick="copyCode(this)"><i class="fa-regular fa-copy"></i> Copy</button></div>`;
    })
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^---$/gm,'<hr>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>')
    .replace(/^[-*] (.+)$/gm,'<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`)
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .split('\n\n').map(b=>{
      if(/^<(h[1-6]|ul|ol|pre|hr|blockquote|div)/.test(b.trim()))return b;
      if(!b.trim())return'';
      return`<p>${b.replace(/\n/g,'<br>')}</p>`;
    }).join('\n');
}

// ── WEATHER ICON using Font Awesome ──
function getWeatherIcon(code, isDay) {
  if (code === 1000) return isDay ? '<i class="fa-solid fa-sun" style="color:var(--amber)"></i>' : '<i class="fa-solid fa-moon" style="color:var(--txt2)"></i>';
  if (code <= 1009) return isDay ? '<i class="fa-solid fa-cloud-sun" style="color:var(--amber)"></i>' : '<i class="fa-solid fa-cloud-moon" style="color:var(--txt2)"></i>';
  if (code <= 1030) return '<i class="fa-solid fa-smog" style="color:var(--txt3)"></i>';
  if (code <= 1069) return '<i class="fa-solid fa-cloud-rain" style="color:var(--cyan)"></i>';
  if (code <= 1117) return '<i class="fa-solid fa-snowflake" style="color:#bfdbfe"></i>';
  if (code <= 1135) return '<i class="fa-solid fa-smog" style="color:var(--txt3)"></i>';
  if (code <= 1225) return '<i class="fa-solid fa-cloud-snow" style="color:#bfdbfe"></i>';
  if (code <= 1264) return '<i class="fa-solid fa-cloud-showers-heavy" style="color:var(--cyan)"></i>';
  if (code <= 1282) return '<i class="fa-solid fa-cloud-bolt" style="color:var(--amber)"></i>';
  return '<i class="fa-solid fa-thermometer-half" style="color:var(--rose)"></i>';
}

// ── RENDER RESPONSE ──
function renderResponse(data) {
  let inner = '';

  if (data.type === 'chat') {
    inner = md(data.text || '');
  }
  else if (data.type === 'weather') {
    const w = data.data;
    const c = w.current, l = w.location;
    const condIcon = getWeatherIcon(c.condition.code, c.is_day);
    inner = `<div class="weather-card">
      <div class="weather-top">
        <div>
          <div class="weather-city">${l.name}</div>
          <div class="weather-country">${l.region}, ${l.country}</div>
          <div class="weather-temp">${Math.round(c.temp_c)}°C</div>
          <div class="weather-desc">${c.condition.text}</div>
        </div>
        <div class="weather-icon" style="font-size:2.5rem">${condIcon}</div>
      </div>
      <div class="weather-grid">
        <div class="weather-stat"><div class="weather-stat-val">${Math.round(c.feelslike_c)}°C</div><div class="weather-stat-lbl">Feels Like</div></div>
        <div class="weather-stat"><div class="weather-stat-val">${c.humidity}%</div><div class="weather-stat-lbl">Humidity</div></div>
        <div class="weather-stat"><div class="weather-stat-val">${Math.round(c.wind_kph)} km/h</div><div class="weather-stat-lbl">Wind</div></div>
        <div class="weather-stat"><div class="weather-stat-val">${c.uv}</div><div class="weather-stat-lbl">UV Index</div></div>
        <div class="weather-stat"><div class="weather-stat-val">${c.vis_km} km</div><div class="weather-stat-lbl">Visibility</div></div>
        <div class="weather-stat"><div class="weather-stat-val">${Math.round(c.pressure_mb)}</div><div class="weather-stat-lbl">Pressure hPa</div></div>
      </div>
    </div>`;
  }
  else if (data.type === 'ai_image') {
  inner = `
    <div style="margin-top:.4rem">
      <p style="font-size:.78rem;color:var(--txt2);margin-bottom:.6rem">
        <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--purple);margin-right:.4rem"></i>
        Generated: <strong>${data.prompt}</strong>
      </p>
      <div style="border-radius:12px;overflow:hidden;max-width:512px;border:1px solid var(--border2);position:relative">
        <div id="img-loading-${Date.now()}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg2);border-radius:12px;font-size:.75rem;color:var(--txt3);gap:.5rem">
          <i class="fa-solid fa-spinner fa-spin"></i> Generating image...
        </div>
       <img
  src="${data.url}"
  alt="${data.prompt}"
  style="width:100%;display:block;border-radius:12px"
  onload="this.previousElementSibling.style.display='none'"
 onerror="
  console.log('IMAGE FAILED:', this.src);
  this.previousElementSibling.innerHTML='Failed to load image';
"
>
      </div>
      <p style="font-family:var(--fm);font-size:.54rem;color:var(--txt3);margin-top:.4rem">
        <i class="fa-solid fa-circle-info"></i> Powered by Pollinations AI · Free & unlimited
      </p>
    </div>`;
}
  else if (data.type === 'news') {
    const arts = (data.articles || []).filter(a => a.title && a.title !== '[Removed]').slice(0,5);
    inner = `<p style="font-size:.78rem;color:var(--txt2);margin-bottom:.4rem">Top stories ${data.topic ? 'about <strong>' + data.topic + '</strong>' : ''}</p>
    <div class="news-grid">${arts.map(a=>`
      <a class="news-card" href="${a.url}" target="_blank">
        <div class="news-source">${a.source?.name || 'News'}</div>
        <div class="news-title">${a.title}</div>
        ${a.description ? `<div class="news-desc">${a.description.slice(0,100)}...</div>` : ''}
      </a>`).join('')}</div>`;
  }
  else if (data.type === 'images') {
    const photos = data.photos || [];
    inner = `<p style="font-size:.78rem;color:var(--txt2);margin-bottom:.4rem">Photos of <strong>${data.query}</strong></p>
    <div class="img-grid">${photos.map(p=>`
      <div class="img-item" onclick="window.open('${p.links?.html}','_blank')">
        <img src="${p.urls?.small}" alt="${p.alt_description || data.query}" loading="lazy">
      </div>`).join('')}</div>
    <p style="font-family:var(--fm);font-size:.54rem;color:var(--txt3);margin-top:.4rem">Click any photo to view full size</p>`;
  }
  else if (data.type === 'search') {
    inner = `${data.snippet ? `<div class="search-answer"><p>${data.snippet}</p></div>` : ''}
    <div class="search-results">${(data.results || []).map(r=>`
      <a class="search-item" href="${r.link}" target="_blank">
        <div class="search-item-title">${r.title}</div>
        <div class="search-item-url">${r.link?.slice(0,50)}...</div>
        <div class="search-item-snippet">${r.snippet || ''}</div>
      </a>`).join('')}</div>`;
  }
  else if (data.type === 'joke') {
    const parts = data.text.split('\n\n');
    inner = `<div class="joke-card">
      <div class="joke-category"><i class="fa-solid fa-masks-theater" style="margin-right:.3rem"></i>${data.category || 'Misc'}</div>
      ${parts.length > 1
        ? `<div class="joke-setup">${parts[0]}</div><div class="joke-punchline">${parts[1]}</div>`
        : `<div class="joke-setup">${data.text}</div>`}
    </div>`;
  }
  else if (data.type === 'definition') {
    const d = data.data;
    const phonetic = d.phonetics?.find(p=>p.text)?.text || '';
    inner = `<div class="dict-card">
      <div class="dict-word">${d.word}</div>
      ${phonetic ? `<div class="dict-phonetic">${phonetic}</div>` : ''}
      ${(d.meanings || []).slice(0,2).map(m=>`
        <div class="dict-pos">${m.partOfSpeech}</div>
        ${(m.definitions || []).slice(0,3).map((def,i)=>`
          <div class="dict-def">
            <span class="dict-def-num">${i+1}.</span>
            <div>
              <div>${def.definition}</div>
              ${def.example ? `<div class="dict-example">"${def.example}"</div>` : ''}
            </div>
          </div>`).join('')}
      `).join('')}
    </div>`;
  }

  return inner;
}

// ── ADD MESSAGE TO DOM (shared between live and replay) ──
function addMsgDOM(role, content, isHTML = false) {
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  const avatarContent = role === 'user'
    ? '<i class="fa-solid fa-user" style="font-size:.65rem"></i>'
    : '<i class="fa-solid fa-robot" style="font-size:.75rem"></i>';

  div.innerHTML = `
    <div class="msg-avatar">${avatarContent}</div>
    <div class="msg-bubble">${isHTML ? content : md(content)}</div>`;

  msgs.appendChild(div);
  scrollToBottom(true);
  return div;
}

// ── STREAMING TEXT EFFECT ──
function streamText(bubble, text) {
  return new Promise(resolve => {
    // Split into chunks: words + whitespace tokens for natural pacing
    const tokens = text.match(/(\S+|\s+)/g) || [];
    let idx = 0;
    let displayed = '';
    let lastRender = 0;
    // Use a plain text node approach: stream raw text, do ONE final md parse
    const textNode = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    bubble.innerHTML = '';
    bubble.appendChild(textNode);
    bubble.appendChild(cursor);

    // Chars per frame — higher = faster
    const CHARS_PER_FRAME = 4;

    function tick(ts) {
      if (idx >= tokens.length) {
        // Done — do single markdown render
        bubble.innerHTML = md(text);
        scrollToBottom();
        resolve();
        return;
      }

      // Throttle to ~60fps naturally via rAF, but batch multiple tokens per frame
      let charsAdded = 0;
      while (idx < tokens.length && charsAdded < CHARS_PER_FRAME) {
        displayed += tokens[idx];
        charsAdded += tokens[idx].length;
        idx++;
      }

      textNode.nodeValue = displayed;
      scrollToBottom();
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── TYPING INDICATOR ──
function addTyping() {
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-avatar"><i class="fa-solid fa-robot" style="font-size:.75rem"></i></div>
    <div class="msg-bubble">
      <div class="typing">
        <span class="typing-label">Thinking</span>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom(true);
}

function removeTyping() {
  const t = document.getElementById('typing-indicator');
  if (t) t.remove();
}

// ── SEND MESSAGE ──
async function sendMessage() {
  if (isLoading) return;
  const inp = document.getElementById('input');
  const message = inp.value.trim();
  if (!message) return;

  inp.value = '';
  inp.style.height = 'auto';
  isLoading = true;
  document.getElementById('send-btn').disabled = true;

  // Add user message
  addMsgDOM('user', message);
  history.push({ role: 'user', content: message });

  // Create / update session
  const isFirstMsg = !currentSessionId;
  if (isFirstMsg) {
    currentSessionId = generateId();
    sessions.push({
      id: currentSessionId,
      title: getSessionTitle(message),
      icon: getSessionIcon(message),
      ts: Date.now(),
      history: [],
      messages: []
    });
  }
  // Save user message to session
  const sess = sessions.find(s => s.id === currentSessionId);
  if (sess) {
    sess.messages = sess.messages || [];
    sess.messages.push({ role: 'user', content: message, html: false });
  }

  renderChatList();
  addTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history.slice(-10) })
    });

    const data = await res.json();
    removeTyping();

    if (!res.ok || data.error) {
      const errMsg = `**Error:** ${data.error || 'Something went wrong. Please try again.'}`;
      // Show error with stream effect
      const div = document.createElement('div');
      div.className = 'msg assistant';
      div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot" style="font-size:.75rem"></i></div><div class="msg-bubble"></div>`;
      document.getElementById('messages').appendChild(div);
      await streamText(div.querySelector('.msg-bubble'), errMsg);
    } else {
      const isRich = data.type !== 'chat';
      const html = renderResponse(data);

      if (isRich) {
        // Rich cards: show immediately (no streaming for cards/images)
        addMsgDOM('assistant', html, true);
        if (sess) sess.messages.push({ role: 'assistant', html: html });
      } else {
        // Chat text: stream word by word
        const welcome = document.getElementById('welcome');
        if (welcome) welcome.remove();

        const msgs = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = 'msg assistant';
        div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot" style="font-size:.75rem"></i></div><div class="msg-bubble"></div>`;
        msgs.appendChild(div);
        const bubble = div.querySelector('.msg-bubble');
        await streamText(bubble, data.text || '');
        if (sess) sess.messages.push({ role: 'assistant', html: md(data.text || '') });
      }

      const histText = data.text || `[${data.type} response]`;
      history.push({ role: 'assistant', content: histText });

      // Update session history
      if (sess) {
        sess.history = history.slice();
        sess.ts = Date.now();
      }
    }

    saveSessions();
    renderChatList();

  } catch (e) {
    removeTyping();
    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot" style="font-size:.75rem"></i></div><div class="msg-bubble"></div>`;
    document.getElementById('messages').appendChild(div);
    await streamText(div.querySelector('.msg-bubble'), '**Connection error.** Make sure you\'re connected to the internet and try again.');
    console.error(e);
  }

  isLoading = false;
  document.getElementById('send-btn').disabled = false;
  document.getElementById('input').focus();
}

// ── COPY CODE ──
function copyCode(btn) {
  const code = btn.closest('.code-block').querySelector('code');
  const text = code.innerText || code.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';ta.style.opacity = '0';
    document.body.appendChild(ta);ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
    }, 2000);
  });
}

// ── SIDEBAR TOGGLE ──
let sidebarOpen = true;
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  const sidebar = document.querySelector('.sidebar');
  const icon = document.getElementById('sidebar-toggle-icon');
  sidebar.classList.toggle('collapsed', !sidebarOpen);
  icon.className = sidebarOpen ? 'fa-solid fa-chevron-left' : 'fa-solid fa-chevron-right';
}

// ── INIT ──
renderChatList();
// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

if (currentTheme === 'light') {
  document.documentElement.classList.add('light-theme');
  themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light-theme');
  const newTheme = isLight ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
});
