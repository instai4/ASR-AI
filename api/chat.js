export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const msg = message.toLowerCase().trim();

  try {
    // ── JOKE ──
    if (/\b(joke|funny|laugh|humor|humour|make me laugh|tell.*joke)\b/.test(msg)) {
      const r = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist,explicit');
      const d = await r.json();
      const text = d.type === 'twopart' ? `${d.setup}\n\n${d.delivery}` : d.joke;
      return res.json({ type: 'joke', text, category: d.category });
    }

    // ── DICTIONARY ──
    const dictMatch = msg.match(/\b(?:define|definition|meaning|what(?:'s| is)(?: the meaning of)?|dictionary)\s+(?:of\s+)?["']?([a-zA-Z]+)["']?/);
    if (dictMatch) {
      const word = dictMatch[1];
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (r.ok) {
        const d = await r.json();
        return res.json({ type: 'definition', word, data: d[0] });
      }
    }

    // ── WEATHER ──
    const weatherMatch = msg.match(/\b(?:weather|temperature|temp|forecast|humidity|wind|rain|snow|climate|hot|cold)\b.*?(?:in|at|for)?\s+([a-zA-Z\s]{2,30}?)(?:\?|$|,)/) ||
      msg.match(/(?:in|at|for)\s+([a-zA-Z\s]{2,25}?)\s+(?:weather|temperature|temp|forecast)/);
    const cityFallback = msg.match(/(?:weather|temperature|forecast|temp)\s+(?:in\s+)?([a-zA-Z\s]{2,25})/);
    const city = (weatherMatch && weatherMatch[1]?.trim()) || (cityFallback && cityFallback[1]?.trim());
    if (city && /\b(weather|temperature|temp|forecast|humidity|wind|rain|climate|hot|cold)\b/.test(msg)) {
      const WKEY = process.env.WEATHER_API_KEY;
      const r = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WKEY}&q=${encodeURIComponent(city)}&aqi=yes`);
      if (r.ok) {
        const d = await r.json();
        return res.json({ type: 'weather', data: d });
      }
    }

    // ── NEWS ──
    const newsMatch = msg.match(/\b(?:news|latest|headlines|trending|breaking|top stories?)\b/);
    if (newsMatch) {
      const NKEY = process.env.NEWS_API_KEY;
      const topic = msg.replace(/\b(news|latest|headlines|trending|breaking|top stories?|about|on|for|give me|show me|get)\b/g, '').trim() || 'technology';
      const r = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(topic || 'technology')}&pageSize=6&sortBy=publishedAt&apiKey=${NKEY}`);
      if (r.ok) {
        const d = await r.json();
        return res.json({ type: 'news', topic, articles: d.articles?.slice(0, 6) || [] });
      }
    }

    // ── IMAGES ──
    const imgMatch = msg.match(/\b(?:show|find|get|display|search)\s+(?:me\s+)?(?:(?:some|a|photos?|pictures?|images?|pics?)\s+)?(?:of\s+)?(.+?)(?:\s+(?:photos?|pictures?|images?|pics?))?\s*$/i) ||
      msg.match(/\b(?:photos?|pictures?|images?|pics?)\s+(?:of\s+)?(.+)/i);
    if (imgMatch || /\b(photo|picture|image|pic|wallpaper|illustration)\b/.test(msg)) {
      const UKEY = process.env.UNSPLASH_ACCESS_KEY;
      const query = (imgMatch && imgMatch[1]?.trim()) || msg.replace(/\b(show|find|get|photo|picture|image|pic|wallpaper|me|some|a|of)\b/g, '').trim() || 'nature';
      const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&client_id=${UKEY}`);
      if (r.ok) {
        const d = await r.json();
        return res.json({ type: 'images', query, photos: d.results || [] });
      }
    }

    // ── WEB SEARCH ──
    const searchTrigger = /\b(search|google|find|look up|lookup|who is|what is|when did|where is|how to|latest on)\b/.test(msg);
    if (searchTrigger) {
      const SKEY = process.env.SERPER_API_KEY;
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SKEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: message, num: 6 })
      });
      if (r.ok) {
        const d = await r.json();
        const results = d.organic?.slice(0, 5) || [];
        const snippet = d.answerBox?.answer || d.answerBox?.snippet || '';
        return res.json({ type: 'search', query: message, results, snippet, knowledgeGraph: d.knowledgeGraph });
      }
    }

    // ── GEMINI (default) ──
    const GKEY = process.env.GEMINI_API_KEY;
    const models = ['gemini-2.0-flash-lite', 'gemini-1.5-flash-8b', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    const systemPrompt = `You are ASR AI, a powerful, friendly, and knowledgeable AI assistant created by Anurag Rajput. 
You have access to multiple APIs including web search, weather, news, images, jokes, and dictionary.
Be concise, helpful, accurate, and conversational. Format responses with markdown when helpful.
If asked about yourself, say you are ASR AI built by Anurag Rajput.`;

    const contents = [
      ...history.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    for (const model of models) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GKEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 2048, temperature: 0.8 }
        })
      });
      const d = await r.json();
      if (!r.ok) {
        console.log(`Model ${model} failed: ${r.status}`, d?.error?.message);
        continue;
      }
      const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.json({ type: 'chat', text, model });
    }

    return res.status(500).json({ error: 'All models failed. Please try again.' });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}