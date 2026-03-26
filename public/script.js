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
  if (/generate|create|draw|paint|imagine|design/.test(m)) return 'fa-wand-magic-sparkles';
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

  list.querySelectorAll('.recent-item').forEach(el => el.remove());

  if (sessions.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

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
      <p>Your intelligent assistant. Ask me anything — chat, search, weather, news, images, AI image generation, jokes, and definitions.</p>
      <div class="suggestion-grid">
        <div class="suggestion" onclick="insertPrompt('What\\'s the weather in Mumbai today?')">
          <div class="suggestion-icon"><i class="fa-solid fa-cloud-sun"></i></div>
          <div class="suggestion-text">Weather in Mumbai today</div>
        </div>
        <div class="suggestion" onclick="insertPrompt('Generate an image of a futuristic city at night')">
          <div class="suggestion-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
          <div class="suggestion-text">Generate an AI image</div>
        </div>
        <div class="suggestion" onclick="insertPrompt('Latest AI news')">
          <div class="suggestion-icon"><i class="fa-solid fa-newspaper"></i></div>
          <div class="suggestion-text">Latest AI news</div>
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
  const threshold = 120;
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

// ── WEATHER ICON ──
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

  else if (data.type === 'generated_image') {
    if (data.error || !data.imageUrl) {
      inner = `<p style="color:var(--rose);font-size:.82rem"><i class="fa-solid fa-triangle-exclamation" style="margin-right:.4rem"></i>${data.error || 'Image generation failed. Try again.'}</p>`;
    } else {
      const sourceLabel = data.source === 'sd' ? 'ASR AI' : data.source === 'hf' ? 'ASR AI' : 'ASR AI';
      const safePrompt = (data.prompt || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const safeUrl = (data.imageUrl || '').replace(/'/g, "\\'");
      inner = `<div class="gen-img-card">
        <div class="gen-img-prompt"><i class="fa-solid fa-wand-magic-sparkles"></i> &ldquo;${data.prompt}&rdquo;</div>
        <div class="gen-img-wrap">
          <img
            src="${data.imageUrl}"
            alt="${data.prompt}"
            loading="lazy"
            onload="this.classList.add('loaded')"
            onclick="openImgFull('${safeUrl}', '${safePrompt}')"
          >
          <div class="gen-img-loading">
            <div class="gen-img-spinner"></div>
            <div class="gen-img-loading-txt">Rendering image…</div>
          </div>
        </div>
        <div class="gen-img-footer">
          <span class="gen-img-source">${sourceLabel}</span>
          <div style="display:flex;gap:.4rem">
            <button class="gen-img-dl" onclick="openImgFull('${safeUrl}', '${safePrompt}')">
              <i class="fa-solid fa-expand"></i> View
            </button>
            <button class="gen-img-dl" onclick="downloadGenImg('${safeUrl}', '${safePrompt}')">
              <i class="fa-solid fa-download"></i> Save
            </button>
          </div>
        </div>
      </div>`;
    }
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

// ── IMAGE GENERATION HELPERS ──
function openImgFull(url, prompt) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.92);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;cursor:zoom-out;animation:fadeIn .2s ease';
  overlay.onclick = () => overlay.remove();

  overlay.innerHTML = `
    <div style="max-width:90vw;max-height:85vh;position:relative" onclick="event.stopPropagation()">
      <img src="${url}" alt="${prompt}"
        style="max-width:100%;max-height:80vh;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.7);display:block">
      <button onclick="this.closest('div[style*=fixed]').remove()"
        style="position:absolute;top:-14px;right:-14px;width:30px;height:30px;border-radius:50%;
        background:#fff;border:none;cursor:pointer;font-size:.8rem;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 10px rgba(0,0,0,.4);color:#111;font-weight:700">✕</button>
      <button onclick="downloadGenImg('${url}', '${prompt}')"
        style="position:absolute;bottom:-14px;right:-14px;height:30px;padding:0 .8rem;border-radius:15px;
        background:var(--blue);border:none;cursor:pointer;font-size:.65rem;font-family:var(--fm);
        display:flex;align-items:center;gap:.3rem;color:#fff;font-weight:600;
        box-shadow:0 2px 10px rgba(59,130,246,.4)">
        <i class="fa-solid fa-download"></i> Save
      </button>
    </div>
    <p style="font-family:var(--fm);font-size:.68rem;color:rgba(255,255,255,.45);margin-top:1rem;max-width:500px;text-align:center">&ldquo;${prompt}&rdquo;</p>
    <p style="font-family:var(--fm);font-size:.56rem;color:rgba(255,255,255,.2);margin-top:.3rem">Click outside to close · ESC to close</p>`;

  // ESC key closes
  const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

function downloadGenImg(url, prompt) {
  const a = document.createElement('a');
  const filename = (prompt || 'asr-ai-image').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').slice(0, 40).toLowerCase() + '.png';
  if (url.startsWith('data:')) {
    a.href = url;
    a.download = filename;
    a.click();
    toast('Image saved!');
  } else {
    // External URL — fetch and convert to blob for proper download
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        toast('Image saved!');
      })
      .catch(() => {
        // Fallback: open in new tab
        window.open(url, '_blank');
        toast('Opened in new tab');
      });
  }
}

// ── ADD MESSAGE TO DOM ──
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
    const tokens = text.match(/(\S+|\s+)/g) || [];
    let idx = 0;
    let displayed = '';
    const textNode = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'stream-cursor';
    bubble.innerHTML = '';
    bubble.appendChild(textNode);
    bubble.appendChild(cursor);

    const CHARS_PER_FRAME = 4;

    function tick() {
      if (idx >= tokens.length) {
        bubble.innerHTML = md(text);
        scrollToBottom();
        resolve();
        return;
      }
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

  addMsgDOM('user', message);
  history.push({ role: 'user', content: message });

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

  const sess = sessions.find(s => s.id === currentSessionId);
  if (sess) {
    sess.messages = sess.messages || [];
    sess.messages.push({ role: 'user', content: message });
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
      const div = document.createElement('div');
      div.className = 'msg assistant';
      div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot" style="font-size:.75rem"></i></div><div class="msg-bubble"></div>`;
      document.getElementById('messages').appendChild(div);
    } else {
      const isRich = data.type !== 'chat';
      const html = renderResponse(data);

      if (isRich) {
        addMsgDOM('assistant', html, true);
        if (sess) sess.messages.push({ role: 'assistant', html });
      } else {
        const welcome = document.getElementById('welcome');
        if (welcome) welcome.remove();

        const msgs = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = 'msg assistant';
        div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot" style="font-size:.75rem"></i></div><div class="msg-bubble"></div>`;
        msgs.appendChild(div);
        const bubble = div.querySelector('.msg-bubble');
        if (sess) sess.messages.push({ role: 'assistant', html: md(data.text || '') });
      }

      const histText = data.text || `[${data.type} response]`;
      history.push({ role: 'assistant', content: histText });

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
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
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

const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('asr_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
if (savedTheme === 'light') {
  document.documentElement.classList.add('light-theme');
  themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

themeToggle.addEventListener('click', () => {
  const isNowLight = !document.documentElement.classList.contains('light-theme');
  document.documentElement.classList.toggle('light-theme', isNowLight);
  document.documentElement.setAttribute('data-theme', isNowLight ? 'light' : 'dark');
  localStorage.setItem('asr_theme', isNowLight ? 'light' : 'dark');
  themeToggle.innerHTML = isNowLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
});