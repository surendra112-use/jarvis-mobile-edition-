let API_KEY = localStorage.getItem('jarvis_key');
function requestApiKey(force = false) {
  if (!API_KEY || force) {
    const key = prompt('Enter your Google Gemini API Key:');
    if (key && key.trim()) {
      API_KEY = key.trim();
      localStorage.setItem('jarvis_key', API_KEY);
    }
  }
}
requestApiKey();

const MODELS = ["gemini-3.8-flash"];

let MEMORY = [];
try {
  const saved = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(saved)) MEMORY = saved;
} catch (e) { localStorage.removeItem('jarvis_memory'); }
function saveMemory() { localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY.slice(-30))); }

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');
const clearBtn = document.getElementById('clear-btn');
const wakeBtn = document.getElementById('wake-btn');
const keyBtn = document.getElementById('key-btn');
const orbCenter = document.getElementById('orb-center');
const coreStatus = document.getElementById('core-status');

function setJarvisState(state) {
  orbCenter.classList.remove('listening', 'thinking');
  if (state === 'LISTENING') {
    orbCenter.classList.add('listening');
    coreStatus.innerText = 'LISTENING...';
  } else if (state === 'THINKING') {
    orbCenter.classList.add('thinking');
    coreStatus.innerText = 'PROCESSING...';
  } else {
    coreStatus.innerText = 'SYSTEM ONLINE';
  }
}

function addMessage(text, who) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}

if (MEMORY.length === 0) {
  addMessage('J.A.R.V.I.S: Systems online. How may I assist you, Boss?', 'ai');
} else {
  MEMORY.forEach(m => addMessage((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));
}

async function handleTools(text) {
  const t = text.toLowerCase().trim();
  if (/\b(time|samayam)\b/.test(t)) return 'The current time is ' + new Date().toLocaleTimeString() + ', Boss.';
  if (/\b(date|today)\b/.test(t) && !t.includes('update')) return 'Today is ' + new Date().toDateString() + ', Boss.';
  if (t.includes('weather') || t.includes('temperature')) {
    return await new Promise(res => {
      if (!navigator.geolocation) return res('Geolocation not supported.');
      navigator.geolocation.getCurrentPosition(async p => {
        try {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&current_weather=true`);
          const d = await r.json();
          res(`Current temperature is ${d.current_weather.temperature}°C, Boss.`);
        } catch (e) { res('Weather service error.'); }
      }, () => res('Location permission needed for weather.'));
    });
  }
  const timerMatch = t.match(/(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i);
  if (t.includes('timer') && timerMatch) {
    const amount = parseInt(timerMatch[1]);
    const unit = timerMatch[2].toLowerCase();
    const factor = /^h/.test(unit) ? 3600000 : /^s/.test(unit) ? 1000 : 60000;
    setTimeout(() => { speak(`Timer complete! Your ${amount} ${unit} timer is done, Boss.`); }, amount * factor);
    return `Timer set for ${amount} ${unit}, Boss.`;
  }
  if (t.includes('flip a coin') || t.includes('toss')) return 'It landed on ' + (Math.random() < 0.5 ? 'Heads' : 'Tails') + ', Boss.';
  if (t.includes('roll a dice') || t.includes('dice')) return 'You rolled a ' + (Math.floor(Math.random() * 6) + 1) + ', Boss.';
  if (t.includes('password')) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'Generated password: ' + pass;
  }
  if (t.includes('bitcoin') || t.includes('crypto')) {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr');
      const d = await r.json();
      return `Bitcoin is at $${d.bitcoin.usd.toLocaleString()} (₹${d.bitcoin.inr.toLocaleString()}), Boss.`;
    } catch (e) { return 'Could not fetch Bitcoin price.'; }
  }
  if (t.includes('joke')) {
    try {
      const r = await fetch('https://official-joke-api.appspot.com/random_joke');
      const d = await r.json();
      return `${d.setup} ... ${d.punchline}`;
    } catch (e) { return 'Why do programmers prefer dark mode? Because light attracts bugs!'; }
  }
  if (t.startsWith('translate ')) {
    const q = text.replace(/^translate\s+(to\s+telugu\s+)?/i, '').trim();
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|te`);
      const d = await r.json();
      return 'In Telugu: ' + d.responseData.translatedText;
    } catch (e) { return 'Translation failed.'; }
  }
  if (/^(open\s+)?youtube$/i.test(t)) { window.open('https://www.youtube.com', '_blank'); return 'Opening YouTube, Boss.'; }
  if (/^(open\s+)?google$/i.test(t)) { window.open('https://www.google.com', '_blank'); return 'Opening Google, Boss.'; }
  if (t.startsWith('play ')) {
    const q = text.slice(5).trim();
    window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), '_blank');
    return 'Searching YouTube for ' + q + ', Boss.';
  }
  if (t.startsWith('wikipedia ') || t.startsWith('define ')) {
    const q = text.replace(/^(wikipedia|define)\s+/i, '').trim();
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
      const d = await r.json();
      return d.extract ? d.extract : 'No summary found.';
    } catch (e) { return 'Search failed.'; }
  }
  if (t.includes('quote') || t.includes('motivate')) return '"We don\'t watch the future. We build it."';
  return null;
}

async function callGeminiAPI(contentsPayload) {
  if (!API_KEY) { requestApiKey(true); if (!API_KEY) throw new Error('API Key required.'); }
  let lastErr;
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contentsPayload })
      });
      const data = await res.json();
      if (data.error) { lastErr = new Error(data.error.message); continue; }
      return data.candidates[0].content.parts[0].text;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function runAgent(goal, aiBubble) {
  aiBubble.innerText = 'J.A.R.V.I.S: [AGENT MODE] Planning & gathering live data...';
  const tasks = [handleTools('time'), handleTools('weather')];
  const toolResults = await Promise.all(tasks);
  const agentPrompt = `You are J.A.R.V.I.S. The user asked: "${goal}". Context: ${toolResults.join(' | ')}. Synthesize a smart response.`;
  return await callGeminiAPI([{ role: 'user', parts: [{ text: agentPrompt }] }]);
}

async function processCommand(userText) {
  addMessage('YOU: ' + userText, 'user');
  setJarvisState('THINKING');
  const aiBubble = addMessage('J.A.R.V.I.S: Thinking...', 'ai');

  try {
    let reply = null;
    if (/\b(briefing|agent|research|morning update)\b/i.test(userText)) {
      reply = await runAgent(userText, aiBubble);
    } else {
      reply = await handleTools(userText);
    }

    if (!reply) {
      const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      contents.push({ role: 'user', parts: [{ text: userText }] });
      reply = await callGeminiAPI(contents);
    }

    MEMORY.push({ role: 'user', text: userText });
    MEMORY.push({ role: 'model', text: reply });
    saveMemory();

    aiBubble.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    aiBubble.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  } finally {
    setJarvisState('IDLE');
  }
}

camBtn.onclick = () => imgInput.click();
imgInput.onchange = () => {
  const file = imgInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    const query = input.value.trim() || 'Describe this image clearly.';
    input.value = '';
    addMessage('YOU: [📷 IMAGE] ' + query, 'user');
    setJarvisState('THINKING');
    const aiBubble = addMessage('J.A.R.V.I.S: Analyzing visual data...', 'ai');
    try {
      const reply = await callGeminiAPI([{ role: 'user', parts: [{ text: query }, { inline_data: { mime_type: file.type, data: base64 } }] }]);
      aiBubble.innerText = 'J.A.R.V.I.S: ' + reply;
      speak(reply);
    } catch (e) { aiBubble.innerText = 'J.A.R.V.I.S: Vision Error - ' + e.message; }
    finally { setJarvisState('IDLE'); imgInput.value = ''; }
  };
  reader.readAsDataURL(file);
};

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let wakeMode = false;

if (SR) {
  rec = new SR();
  rec.lang = 'en-IN';
  rec.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (wakeMode) {
      const lower = transcript.toLowerCase();
      if (lower.includes('hey jarvis')) {
        const cleanCmd = lower.replace(/.*?\bjarvis\b[, ]*/i, '').trim();
        if (cleanCmd) processCommand(cleanCmd);
        else { speak('Yes Boss, listening.'); setJarvisState('LISTENING'); }
      }
    } else { processCommand(transcript); }
  };
  rec.onend = () => { if (wakeMode) { try { rec.start(); } catch (e) {} } else { micBtn.innerText = '🎤'; setJarvisState('IDLE'); } };
}

micBtn.onclick = () => {
  if (!rec) return alert('Speech Recognition not supported.');
  wakeMode = false; wakeBtn.classList.remove('active'); wakeBtn.innerText = '🎙️ WAKE: OFF';
  try { rec.start(); micBtn.innerText = '🛑'; setJarvisState('LISTENING'); } catch (e) {}
};

wakeBtn.onclick = () => {
  if (!rec) return alert('Speech Recognition not supported.');
  wakeMode = !wakeMode;
  if (wakeMode) {
    wakeBtn.classList.add('active'); wakeBtn.innerText = '🎙️ WAKE: ON'; rec.continuous = true;
    try { rec.start(); } catch (e) {}
    speak('Wake word mode activated, Boss.');
  } else {
    wakeBtn.classList.remove('active'); wakeBtn.innerText = '🎙️ WAKE: OFF'; rec.continuous = false; rec.stop(); setJarvisState('IDLE');
  }
};

let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices(); }
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const cleanText = text.replace(/[*#_`]/g, '');
  const u = new SpeechSynthesisUtterance(cleanText);
  u.rate = 1.05; u.pitch = 0.9;
  const enVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-US'));
  if (enVoice) u.voice = enVoice;
  speechSynthesis.speak(u);
}

sendBtn.onclick = () => { const t = input.value.trim(); if (!t) return; input.value = ''; processCommand(t); };
input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });
clearBtn.onclick = () => { MEMORY = []; saveMemory(); chat.innerHTML = ''; addMessage('SYSTEM: Memory wiped clean, Boss.', 'ai'); };
keyBtn.onclick = () => requestApiKey(true);