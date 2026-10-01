// Lumen — a bring-your-own-key Gemini chat client.
// No build step, no backend: talks directly to the Gemini REST API from the browser.

const API = 'https://generativelanguage.googleapis.com/v1beta';
const KEYS = { settings: 'lumen.settings', chats: 'lumen.chats', models: 'lumen.models' };
const MODEL_CACHE_MS = 12 * 60 * 60 * 1000;
const FALLBACK_MODELS = [
  { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', inputTokenLimit: 1048576 },
  { name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', inputTokenLimit: 1048576 },
  { name: 'models/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash-Lite', inputTokenLimit: 1048576 },
];
// Models that can't hold a text conversation.
const EXCLUDE = /embedding|aqa|imagen|veo|tts|native-audio|live|robotics|computer-use/i;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const isTouch = matchMedia('(pointer: coarse)').matches;

/* ------------------------------------------------------------------ storage */

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

const defaults = {
  apiKey: '',
  theme: 'system',
  systemPrompt: '',
  temperature: 1,
  enterToSend: !isTouch,
  favorites: [],
  model: 'models/gemini-2.5-flash',
};

const state = {
  settings: { ...defaults, ...store.get(KEYS.settings, {}) },
  chats: store.get(KEYS.chats, []),
  models: store.get(KEYS.models, null), // { at, list }
  currentId: null,
  attachments: [],
  controller: null,
  modelFilter: 'all',
  loadingModels: false,
};

const saveSettings = () => store.set(KEYS.settings, state.settings);
function saveChats() {
  if (store.set(KEYS.chats, state.chats)) return;
  // Storage full — drop images from the oldest chats until it fits.
  for (const chat of [...state.chats].reverse()) {
    for (const m of chat.messages) m.images = [];
    if (store.set(KEYS.chats, state.chats)) {
      toast('Storage full — removed images from older chats', 'error');
      return;
    }
  }
  toast('Could not save chats: storage is full', 'error');
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const currentChat = () => state.chats.find((c) => c.id === state.currentId) || null;

/* ------------------------------------------------------------------ models */

function modelList() {
  return state.models?.list?.length ? state.models.list : FALLBACK_MODELS;
}

function modelInfo(name) {
  return modelList().find((m) => m.name === name) || { name, displayName: prettyId(name) };
}

function prettyId(name) {
  return name
    .replace(/^models\//, '')
    .split('-')
    .map((p) => (/^\d/.test(p) ? p : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
}

function shortName(name) {
  return (modelInfo(name).displayName || prettyId(name)).replace(/^Gemini\s+/i, 'Gemini ');
}

function ctxLabel(n) {
  if (!n) return '';
  if (n >= 1e6) return `${+(n / 1048576).toFixed(1)}M`;
  return `${Math.round(n / 1024)}K`;
}

function modelTag(m) {
  const id = m.name;
  if (/preview/i.test(id)) return 'Preview';
  if (/exp/i.test(id)) return 'Exp';
  if (/latest/i.test(id)) return 'Latest';
  return '';
}

async function fetchModels(key = state.settings.apiKey) {
  const list = [];
  let pageToken = '';
  do {
    const url = `${API}/models?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: { 'x-goog-api-key': key } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`);
    list.push(...(data.models || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return list
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && !EXCLUDE.test(m.name))
    .map(({ name, displayName, description, inputTokenLimit, outputTokenLimit }) => ({
      name,
      displayName,
      description,
      inputTokenLimit,
      outputTokenLimit,
    }))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// Newest Gemini first, then Pro → Flash → Flash-Lite, stable/latest before previews; Gemma etc. last.
function rank(m) {
  const id = m.name.replace(/^models\//, '');
  const version = parseFloat((id.match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1]);
  const family = Number.isNaN(version) ? 1e4 : (100 - version) * 100;
  const tier = /flash-lite/.test(id) ? 3 : /flash/.test(id) ? 2 : /pro/.test(id) ? 1 : 4;
  const flavor = /preview|exp/.test(id) ? 2 : /latest/.test(id) ? 1 : 0;
  return family + tier * 10 + flavor;
}

async function refreshModels({ silent = false } = {}) {
  if (state.loadingModels) return;
  state.loadingModels = true;
  renderModelList();
  try {
    const list = await fetchModels();
    state.models = { at: Date.now(), list };
    store.set(KEYS.models, state.models);
    if (!list.some((m) => m.name === state.settings.model) && list.length) {
      const pick = list.find((m) => /flash$/.test(m.name)) || list.find((m) => /flash/.test(m.name)) || list[0];
      state.settings.model = pick.name;
      saveSettings();
    }
    if (!silent) toast(`${list.length} models available`);
  } catch (err) {
    if (!silent) toast(err.message, 'error');
  } finally {
    state.loadingModels = false;
    renderModelList();
    renderModelPill();
    renderFavRow();
  }
}

function toggleFavorite(name) {
  const favs = state.settings.favorites;
  const i = favs.indexOf(name);
  if (i >= 0) favs.splice(i, 1);
  else favs.push(name);
  saveSettings();
  renderFavRow();
  return i < 0;
}

function selectModel(name) {
  state.settings.model = name;
  saveSettings();
  const chat = currentChat();
  if (chat) {
    chat.model = name;
    saveChats();
  }
  renderModelPill();
  renderFavRow();
  renderModelList();
}

/* ------------------------------------------------------------------ theme */

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#09090c' : '#f5f3ee'));
  $$('#theme-seg button').forEach((b) => b.classList.toggle('active', b.dataset.themeOpt === t));
}

/* ------------------------------------------------------------------ markdown */

function renderMarkdown(text) {
  if (window.marked && window.DOMPurify) {
    const html = marked.parse(text, { gfm: true, breaks: false });
    return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
  }
  return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function enhanceCode(root, highlight) {
  $$('pre > code', root).forEach((code) => {
    const pre = code.parentElement;
    if (pre.parentElement.classList.contains('codeblock')) return;
    const lang = (code.className.match(/language-([\w+#-]+)/) || [])[1] || 'text';
    const wrap = document.createElement('div');
    wrap.className = 'codeblock';
    wrap.innerHTML = `<div class="codeblock-head"><span>${escapeHtml(lang)}</span><button type="button" data-copy-code><svg><use href="#i-copy"/></svg><span>Copy</span></button></div>`;
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
    if (highlight && window.hljs) {
      try {
        hljs.highlightElement(code);
      } catch {}
    }
  });
  $$('a', root).forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

/* ------------------------------------------------------------------ rendering */

const el = {};

function cacheEls() {
  Object.assign(el, {
    onboarding: $('#onboarding'),
    app: $('#app'),
    drawer: $('#drawer'),
    scrim: $('#drawer-scrim'),
    chatList: $('#chat-list'),
    chatSearch: $('#chat-search'),
    scroller: $('#scroller'),
    empty: $('#empty'),
    thread: $('#thread'),
    input: $('#input'),
    send: $('#send'),
    tray: $('#tray'),
    file: $('#file'),
    jump: $('#jump'),
    modelName: $('#model-name'),
    modelPill: $('#open-models'),
    favRow: $('#fav-row'),
    favRowWrap: $('#fav-row-wrap'),
    modelList: $('#model-list'),
    modelSearch: $('#model-search'),
    composerWrap: $('.composer-wrap'),
  });
}

function setGreeting() {
  const h = new Date().getHours();
  $('#greeting').textContent = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function renderModelPill() {
  const chat = currentChat();
  const name = chat?.model || state.settings.model;
  el.modelName.textContent = shortName(name);
  el.input.placeholder = `Message ${shortName(name)}`;
}

function renderFavRow() {
  const favs = state.settings.favorites;
  const active = currentChat()?.model || state.settings.model;
  el.favRow.innerHTML = '';
  if (!favs.length) {
    const b = document.createElement('button');
    b.className = 'chip ghost';
    b.innerHTML = `<svg><use href="#i-star"/></svg> Star models to pin them here`;
    b.onclick = () => openSheet('models-sheet');
    el.favRow.append(b);
    return;
  }
  for (const name of favs) {
    const b = document.createElement('button');
    b.className = 'chip' + (name === active ? ' active' : '');
    b.innerHTML = `<svg><use href="#i-star-fill"/></svg><span></span>`;
    b.lastChild.textContent = shortName(name);
    b.onclick = () => {
      selectModel(name);
      haptic();
    };
    el.favRow.append(b);
  }
}

function renderModelList() {
  if (!el.modelList) return;
  const q = el.modelSearch.value.trim().toLowerCase();
  const active = currentChat()?.model || state.settings.model;
  const favs = state.settings.favorites;
  const match = (m) => !q || m.name.toLowerCase().includes(q) || (m.displayName || '').toLowerCase().includes(q);

  const all = modelList();
  // Favorites might reference a model not in the list (e.g. offline) — still show them.
  const favModels = favs.map((n) => all.find((m) => m.name === n) || modelInfo(n)).filter(match);
  const others = all.filter((m) => !favs.includes(m.name)).filter(match);

  el.modelList.innerHTML = '';
  const frag = document.createDocumentFragment();

  if (state.loadingModels && !state.models) {
    for (let i = 0; i < 6; i++) frag.append(Object.assign(document.createElement('div'), { className: 'skeleton' }));
    el.modelList.append(frag);
    return;
  }

  let i = 0;
  const section = (label, models, star) => {
    if (!models.length) return;
    const h = document.createElement('div');
    h.className = 'model-section-label';
    h.innerHTML = (star ? '<svg><use href="#i-star-fill"/></svg>' : '') + `<span>${label}</span>`;
    frag.append(h);
    for (const m of models) frag.append(modelRow(m, m.name === active, favs.includes(m.name), i++));
  };

  if (state.modelFilter === 'fav') {
    section('Favorites', favModels, true);
    if (!favModels.length) {
      frag.append(note(q ? 'No matches' : 'No favorites yet', q ? 'Try another search.' : 'Tap the star next to any model to pin it.'));
    }
  } else {
    section('Favorites', favModels, true);
    section(favModels.length ? 'All models' : 'Models', others, false);
    if (!favModels.length && !others.length) frag.append(note('No matches', 'Try another search.'));
  }
  el.modelList.append(frag);
}

function note(big, small) {
  const d = document.createElement('div');
  d.className = 'list-note';
  d.innerHTML = `<span class="big"></span><span></span>`;
  d.firstChild.textContent = big;
  d.lastChild.textContent = small;
  return d;
}

function modelRow(m, selected, fav, i) {
  const row = document.createElement('div');
  row.className = 'model-row' + (selected ? ' selected' : '');
  row.style.animationDelay = `${Math.min(i * 18, 300)}ms`;
  const id = m.name.replace(/^models\//, '');
  const display = m.displayName || prettyId(m.name);
  const glyph = (display.match(/(\d+(\.\d+)?)/) || [])[1] || display[0];
  const tag = modelTag(m);
  row.innerHTML = `
    <button class="model-pick" type="button">
      <span class="model-glyph"></span>
      <span class="model-text">
        <span class="model-title"><span></span>${selected ? '<svg class="model-check"><use href="#i-check"/></svg>' : ''}</span>
        <span class="model-id"><code></code>${m.inputTokenLimit ? `<span class="badge">${ctxLabel(m.inputTokenLimit)}</span>` : ''}${tag ? `<span class="badge tag">${tag}</span>` : ''}</span>
      </span>
    </button>
    <button class="star-btn${fav ? ' on' : ''}" type="button" aria-pressed="${fav}" aria-label="${fav ? 'Remove from' : 'Add to'} favorites">
      <svg><use href="#i-star${fav ? '-fill' : ''}"/></svg>
    </button>`;
  $('.model-glyph', row).textContent = glyph;
  $('.model-title span', row).textContent = display;
  $('.model-id code', row).textContent = id;
  $('.model-pick', row).onclick = () => {
    selectModel(m.name);
    haptic();
    setTimeout(() => closeSheet('models-sheet'), 140);
  };
  const star = $('.star-btn', row);
  star.onclick = (e) => {
    e.stopPropagation();
    const on = toggleFavorite(m.name);
    haptic();
    star.classList.add('burst');
    setTimeout(renderModelList, on ? 260 : 120);
  };
  return row;
}

function renderChatList() {
  const q = el.chatSearch.value.trim().toLowerCase();
  const chats = [...state.chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.text?.toLowerCase().includes(q)));

  el.chatList.innerHTML = '';
  if (!chats.length) {
    const d = note(q ? 'Nothing found' : 'No chats yet', q ? 'Try a different search.' : 'Your conversations will appear here.');
    d.className = 'chat-empty';
    el.chatList.append(d);
    return;
  }

  const today = new Date().setHours(0, 0, 0, 0);
  const groups = [
    ['Today', (t) => t >= today],
    ['Yesterday', (t) => t >= today - 864e5],
    ['Previous 7 days', (t) => t >= today - 7 * 864e5],
    ['Previous 30 days', (t) => t >= today - 30 * 864e5],
    ['Older', () => true],
  ];
  const frag = document.createDocumentFragment();
  const placed = new Set();
  for (const [label, test] of groups) {
    const items = chats.filter((c) => !placed.has(c.id) && test(c.updatedAt));
    if (!items.length) continue;
    const h = document.createElement('div');
    h.className = 'chat-group-label';
    h.textContent = label;
    frag.append(h);
    for (const c of items) {
      placed.add(c.id);
      const item = document.createElement('div');
      item.className = 'chat-item' + (c.id === state.currentId ? ' active' : '');
      item.innerHTML = `
        <button class="chat-open" type="button"><span class="chat-title"></span><span class="chat-meta"></span></button>
        <button class="chat-del" type="button" aria-label="Delete chat"><svg><use href="#i-trash"/></svg></button>`;
      $('.chat-title', item).textContent = c.title;
      $('.chat-meta', item).textContent = `${shortName(c.model)} · ${c.messages.length} message${c.messages.length === 1 ? '' : 's'}`;
      $('.chat-open', item).onclick = () => {
        openChat(c.id);
        closeDrawer();
      };
      $('.chat-del', item).onclick = () => deleteChat(c.id);
      frag.append(item);
    }
  }
  el.chatList.append(frag);
}

function renderThread() {
  const chat = currentChat();
  const has = !!chat?.messages.length;
  el.empty.hidden = has;
  document.body.classList.toggle('in-thread', has);
  el.thread.innerHTML = '';
  if (!has) {
    setGreeting();
    renderFavRow();
    return;
  }
  const frag = document.createDocumentFragment();
  chat.messages.forEach((m, i) => frag.append(messageEl(m, i === chat.messages.length - 1)));
  el.thread.append(frag);
  $$('.msg', el.thread).forEach((n) => (n.style.animation = 'none'));
}

function messageEl(m, isLast) {
  const node = document.createElement('article');
  node.className = `msg ${m.role}`;
  node.dataset.id = m.id;

  if (m.role === 'user') {
    if (m.images?.length) {
      const imgs = document.createElement('div');
      imgs.className = 'msg-images';
      for (const im of m.images) {
        const img = new Image();
        img.src = `data:${im.mime};base64,${im.data}`;
        img.alt = 'Attached image';
        img.onclick = () => lightbox(img.src);
        imgs.append(img);
      }
      node.append(imgs);
    }
    if (m.text) {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.textContent = m.text;
      node.append(b);
    }
    return node;
  }

  node.innerHTML = `
    <div class="msg-head"><span class="spark"><svg><use href="#i-spark" fill="url(#g-spark)"/></svg></span><span class="msg-model"></span></div>
    <div class="md"></div>
    <div class="msg-actions"></div>`;
  $('.msg-model', node).textContent = shortName(m.model || state.settings.model);
  const body = $('.md', node);

  if (m.error) {
    body.remove();
    const err = document.createElement('div');
    err.className = 'msg-error';
    err.innerHTML = `<div><strong>Something went wrong.</strong> <span></span></div><button class="btn-ghost" type="button"><svg><use href="#i-refresh"/></svg> Try again</button>`;
    $('span', err).textContent = m.error;
    $('button', err).onclick = () => regenerate(m.id);
    node.insertBefore(err, $('.msg-actions', node));
    if (m.text) {
      const md = document.createElement('div');
      md.className = 'md';
      md.innerHTML = renderMarkdown(m.text);
      enhanceCode(md, true);
      node.insertBefore(md, err);
    }
  } else {
    body.innerHTML = renderMarkdown(m.text || '');
    enhanceCode(body, true);
  }

  const actions = $('.msg-actions', node);
  if (m.text) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.innerHTML = `<svg><use href="#i-copy"/></svg><span>Copy</span>`;
    copy.onclick = () => copyText(m.text, copy);
    actions.append(copy);
  }
  if (isLast && !m.error) {
    const regen = document.createElement('button');
    regen.type = 'button';
    regen.innerHTML = `<svg><use href="#i-refresh"/></svg><span>Regenerate</span>`;
    regen.onclick = () => regenerate(m.id);
    actions.append(regen);
  }
  return node;
}

/* ------------------------------------------------------------------ chats */

function newChat() {
  stopStreaming();
  state.currentId = null;
  state.attachments = [];
  renderTray();
  renderThread();
  renderChatList();
  renderModelPill();
  el.input.value = '';
  autosize();
  updateSend();
  if (!isTouch) el.input.focus();
}

function openChat(id) {
  stopStreaming();
  state.currentId = id;
  renderThread();
  renderChatList();
  renderModelPill();
  requestAnimationFrame(() => scrollToBottom(false));
}

function deleteChat(id) {
  const chat = state.chats.find((c) => c.id === id);
  if (!chat) return;
  const index = state.chats.indexOf(chat);
  state.chats.splice(index, 1);
  saveChats();
  if (state.currentId === id) newChat();
  else renderChatList();
  toast('Chat deleted', 'info', {
    label: 'Undo',
    run: () => {
      state.chats.splice(index, 0, chat);
      saveChats();
      renderChatList();
    },
  });
}

function titleFrom(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 48 ? t.slice(0, 46).trimEnd() + '…' : t || 'Image';
}

/* ------------------------------------------------------------------ sending */

async function send(textArg) {
  const text = (textArg ?? el.input.value).trim();
  const images = state.attachments.slice();
  if ((!text && !images.length) || state.controller) return;

  let chat = currentChat();
  if (!chat) {
    chat = {
      id: uid(),
      title: titleFrom(text),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: state.settings.model,
      messages: [],
    };
    state.chats.push(chat);
    state.currentId = chat.id;
  }

  chat.messages.push({ id: uid(), role: 'user', text, images, createdAt: Date.now() });
  chat.updatedAt = Date.now();
  el.input.value = '';
  state.attachments = [];
  renderTray();
  autosize();
  haptic();
  if (isTouch) el.input.blur();

  await respond(chat);
}

async function regenerate(modelMsgId) {
  const chat = currentChat();
  if (!chat || state.controller) return;
  const i = chat.messages.findIndex((m) => m.id === modelMsgId);
  if (i < 0) return;
  chat.messages.splice(i);
  await respond(chat);
}

function buildContents(messages) {
  const contents = [];
  for (const m of messages) {
    if (m.role === 'model' && (m.error || !m.text)) continue;
    const parts = [];
    for (const im of m.images || []) parts.push({ inline_data: { mime_type: im.mime, data: im.data } });
    if (m.text) parts.push({ text: m.text });
    if (!parts.length) continue;
    const prev = contents[contents.length - 1];
    if (prev && prev.role === m.role) prev.parts.push(...parts);
    else contents.push({ role: m.role, parts });
  }
  return contents;
}

async function respond(chat) {
  const model = chat.model || state.settings.model;
  const msg = { id: uid(), role: 'model', text: '', model, createdAt: Date.now() };
  const contents = buildContents(chat.messages);
  chat.messages.push(msg);
  saveChats();

  renderThread();
  renderChatList();
  const node = $(`.msg[data-id="${msg.id}"]`, el.thread);
  node.classList.add('streaming');
  node.style.animation = '';
  const body = $('.md', node);
  body.classList.add('typing');
  body.innerHTML = '<div class="thinking"><i></i><i></i><i></i></div>';
  // Animate in the latest pair only.
  const userNode = node.previousElementSibling;
  if (userNode) userNode.style.animation = '';
  stick = true;
  scrollToBottom(true);

  const controller = new AbortController();
  state.controller = controller;
  updateSend();

  let raf = 0;
  const paint = () => {
    raf = 0;
    body.innerHTML = renderMarkdown(msg.text);
    enhanceCode(body, false);
    if (stick) scrollToBottom(false);
  };

  const body_ = { contents, generationConfig: { temperature: state.settings.temperature } };
  if (state.settings.systemPrompt.trim()) {
    body_.systemInstruction = { parts: [{ text: state.settings.systemPrompt.trim() }] };
  }

  try {
    const res = await fetch(`${API}/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': state.settings.apiKey },
      body: JSON.stringify(body_),
      signal: controller.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || `Request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finish = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop();
      for (const evt of events) {
        const data = evt
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (!data) continue;
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        if (json.error) throw new Error(json.error.message);
        if (json.promptFeedback?.blockReason) throw new Error(`Prompt blocked (${json.promptFeedback.blockReason.toLowerCase()}).`);
        const cand = json.candidates?.[0];
        for (const part of cand?.content?.parts || []) {
          if (part.text && !part.thought) msg.text += part.text;
        }
        if (cand?.finishReason) finish = cand.finishReason;
        if (!raf) raf = requestAnimationFrame(paint);
      }
    }
    if (!msg.text) {
      throw new Error(
        finish && finish !== 'STOP' ? `The model stopped without answering (${finish.toLowerCase().replace(/_/g, ' ')}).` : 'The model returned an empty response.',
      );
    }
  } catch (err) {
    if (err.name !== 'AbortError') msg.error = friendlyError(err.message);
  } finally {
    cancelAnimationFrame(raf);
    state.controller = null;
    chat.updatedAt = Date.now();
    if (!msg.text && !msg.error) chat.messages.pop(); // stopped before anything arrived
    saveChats();
    const wasStuck = stick;
    renderThread();
    renderChatList();
    updateSend();
    if (wasStuck) scrollToBottom(false);
  }
}

function friendlyError(message) {
  if (/API key not valid|API_KEY_INVALID/i.test(message)) return 'That API key was rejected by Google. Double-check it and try again.';
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(message)) return 'Rate limit or quota reached for this model. Try again shortly or pick another model.';
  if (/Failed to fetch|NetworkError/i.test(message)) return 'Network error — check your connection.';
  return message;
}

function stopStreaming() {
  state.controller?.abort();
}

/* ------------------------------------------------------------------ composer */

function autosize() {
  el.input.style.height = 'auto';
  el.input.style.height = Math.min(el.input.scrollHeight, 200) + 'px';
  syncComposerHeight();
}

function syncComposerHeight() {
  el.app.style.setProperty('--composer-h', el.composerWrap.offsetHeight + 'px');
}

function updateSend() {
  const streaming = !!state.controller;
  el.send.classList.toggle('stopping', streaming);
  el.send.setAttribute('aria-label', streaming ? 'Stop generating' : 'Send');
  el.send.disabled = !streaming && !el.input.value.trim() && !state.attachments.length;
}

function renderTray() {
  el.tray.innerHTML = '';
  state.attachments.forEach((a, i) => {
    const t = document.createElement('div');
    t.className = 'thumb';
    t.innerHTML = `<img alt="Attachment"><button type="button" aria-label="Remove image"><svg><use href="#i-x"/></svg></button>`;
    $('img', t).src = `data:${a.mime};base64,${a.data}`;
    $('button', t).onclick = () => {
      state.attachments.splice(i, 1);
      renderTray();
      updateSend();
    };
    el.tray.append(t);
  });
  syncComposerHeight();
}

async function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    if (state.attachments.length >= 6) {
      toast('Up to 6 images per message', 'error');
      break;
    }
    try {
      state.attachments.push(await downscale(f));
    } catch {
      toast(`Couldn't read ${f.name}`, 'error');
    }
  }
  renderTray();
  updateSend();
}

function downscale(file, max = 1536) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL('image/jpeg', 0.86);
      resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1] });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}

/* ------------------------------------------------------------------ scrolling */

let stick = true;

function scrollToBottom(smooth) {
  el.scroller.scrollTo({ top: el.scroller.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function onScroll() {
  const gap = el.scroller.scrollHeight - el.scroller.scrollTop - el.scroller.clientHeight;
  stick = gap < 80;
  el.jump.classList.toggle('show', gap > 240 && !el.thread.hidden && el.thread.children.length > 0);
}

/* ------------------------------------------------------------------ drawer */

function openDrawer() {
  renderChatList();
  el.drawer.classList.add('open');
  el.scrim.classList.add('show');
}
function closeDrawer() {
  el.drawer.classList.remove('open');
  el.scrim.classList.remove('show');
  el.drawer.style.transform = '';
}

function enableDrawerSwipe() {
  let x0 = null, y0 = 0, dx = 0, horizontal = null;
  el.drawer.addEventListener('touchstart', (e) => {
    if (!el.drawer.classList.contains('open')) return;
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    dx = 0;
    horizontal = null;
  }, { passive: true });
  el.drawer.addEventListener('touchmove', (e) => {
    if (x0 === null) return;
    const mx = e.touches[0].clientX - x0;
    const my = e.touches[0].clientY - y0;
    if (horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horizontal = Math.abs(mx) > Math.abs(my);
    if (!horizontal) return;
    dx = Math.min(0, mx);
    el.drawer.classList.add('dragging');
    el.drawer.style.transform = `translateX(${dx}px)`;
  }, { passive: true });
  el.drawer.addEventListener('touchend', () => {
    if (x0 === null) return;
    el.drawer.classList.remove('dragging');
    el.drawer.style.transform = '';
    if (dx < -70) closeDrawer();
    x0 = null;
  });
}

/* ------------------------------------------------------------------ sheets */

function openSheet(id) {
  const layer = document.getElementById(id);
  layer.hidden = false;
  layer.style.setProperty('--drag', '0px');
  if (id === 'models-sheet') {
    el.modelPill.setAttribute('aria-expanded', 'true');
    renderModelList();
    const stale = !state.models || Date.now() - state.models.at > MODEL_CACHE_MS;
    if (stale) refreshModels({ silent: true });
    requestAnimationFrame(() => {
      const sel = $('.model-row.selected', el.modelList);
      sel?.scrollIntoView({ block: 'nearest' });
    });
  }
  if (id === 'settings-sheet') fillSettings();
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('open')));
}

function closeSheet(id) {
  const layer = document.getElementById(id);
  if (layer.hidden) return;
  layer.classList.remove('open', 'dragging');
  layer.style.setProperty('--drag', '0px');
  if (id === 'models-sheet') el.modelPill.setAttribute('aria-expanded', 'false');
  if (id === 'settings-sheet') commitSettings();
  setTimeout(() => {
    if (!layer.classList.contains('open')) layer.hidden = true;
  }, 450);
}

function enableSheetDrag(layer) {
  let y0 = null, dy = 0, t0 = 0;
  const start = (e) => {
    if (e.target.closest('button')) return;
    y0 = e.clientY;
    t0 = performance.now();
    dy = 0;
    layer.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    layer.style.setProperty('--drag', `${dy}px`);
  };
  const end = () => {
    if (y0 === null) return;
    const v = dy / (performance.now() - t0);
    layer.classList.remove('dragging');
    y0 = null;
    if (dy > 120 || v > 0.6) closeSheet(layer.id);
    else layer.style.setProperty('--drag', '0px');
  };
  $$('[data-drag]', layer).forEach((h) => {
    h.addEventListener('pointerdown', start);
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  });
}

/* ------------------------------------------------------------------ settings */

function fillSettings() {
  $('#set-key').value = state.settings.apiKey;
  $('#set-system').value = state.settings.systemPrompt;
  $('#set-temp').value = state.settings.temperature;
  $('#set-enter').checked = state.settings.enterToSend;
  updateTempUI();
  applyTheme();
}

function commitSettings() {
  state.settings.systemPrompt = $('#set-system').value;
  saveSettings();
}

function updateTempUI() {
  const r = $('#set-temp');
  const v = parseFloat(r.value);
  $('#temp-out').textContent = v.toFixed(1);
  r.style.setProperty('--p', `${(v / 2) * 100}%`);
}

function updateKeyHint() {
  const k = state.settings.apiKey;
  $('#key-hint').textContent = k ? `API key · ••••${k.slice(-4)}` : 'No API key';
}

/* ------------------------------------------------------------------ misc ui */

function toast(text, kind = 'info', action) {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = `<span class="dot"></span><span></span>`;
  t.lastChild.textContent = text;
  if (action) {
    const b = document.createElement('button');
    b.textContent = action.label;
    b.style.cssText = 'margin-left:6px;font-weight:600;color:var(--a2);pointer-events:auto';
    b.onclick = () => {
      action.run();
      dismiss();
    };
    t.append(b);
  }
  $('#toasts').append(t);
  const dismiss = () => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 350);
  };
  setTimeout(dismiss, action ? 4500 : 2600);
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  haptic();
  if (btn) {
    const label = $('span', btn);
    const prev = label?.textContent;
    btn.classList.add('done');
    $('use', btn)?.setAttribute('href', '#i-check');
    if (label) label.textContent = 'Copied';
    setTimeout(() => {
      btn.classList.remove('done');
      $('use', btn)?.setAttribute('href', '#i-copy');
      if (label) label.textContent = prev;
    }, 1500);
  }
}

function lightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<img alt="">';
  lb.firstChild.src = src;
  lb.onclick = () => lb.remove();
  document.body.append(lb);
}

function haptic() {
  try {
    navigator.vibrate?.(8);
  } catch {}
}

function setLoading(btn, on) {
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}

/* ------------------------------------------------------------------ boot */

function showApp() {
  el.onboarding.hidden = true;
  el.app.hidden = false;
  updateKeyHint();
  renderModelPill();
  renderThread();
  renderChatList();
  autosize();
  updateSend();
  const stale = !state.models || Date.now() - state.models.at > MODEL_CACHE_MS;
  if (stale) refreshModels({ silent: true });
}

function showOnboarding() {
  el.app.hidden = true;
  el.onboarding.hidden = false;
  setTimeout(() => !isTouch && $('#ob-key').focus(), 300);
}

function bind() {
  // Onboarding
  $('#ob-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = $('#ob-key').value.trim();
    const btn = $('#ob-submit');
    $('#ob-error').textContent = '';
    if (!key) return;
    setLoading(btn, true);
    try {
      const list = await fetchModels(key);
      state.settings.apiKey = key;
      state.models = { at: Date.now(), list };
      store.set(KEYS.models, state.models);
      if (list.length && !list.some((m) => m.name === state.settings.model)) state.settings.model = list[0].name;
      saveSettings();
      showApp();
      toast('Connected to Gemini');
    } catch (err) {
      $('#ob-error').textContent = friendlyError(err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  $$('[data-toggle-visibility]').forEach((b) =>
    b.addEventListener('click', () => {
      const input = document.getElementById(b.dataset.toggleVisibility);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.classList.toggle('on', show);
    }),
  );

  // Top bar & drawer
  $('#open-drawer').onclick = openDrawer;
  $('#drawer-close').onclick = closeDrawer;
  el.scrim.onclick = closeDrawer;
  $('#new-chat').onclick = newChat;
  $('#drawer-new').onclick = () => {
    newChat();
    closeDrawer();
  };
  el.chatSearch.addEventListener('input', renderChatList);
  $('#open-settings').onclick = () => {
    closeDrawer();
    openSheet('settings-sheet');
  };
  el.modelPill.onclick = () => openSheet('models-sheet');
  enableDrawerSwipe();

  // Sheets
  $$('.sheet-layer').forEach((layer) => {
    $$('[data-close]', layer).forEach((c) => c.addEventListener('click', () => closeSheet(layer.id)));
    enableSheetDrag(layer);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = $$('.sheet-layer.open');
    if (open.length) open.forEach((l) => closeSheet(l.id));
    else if (el.drawer.classList.contains('open')) closeDrawer();
    else if (state.controller) stopStreaming();
  });

  el.modelSearch.addEventListener('input', renderModelList);
  $('#refresh-models').onclick = () => refreshModels();
  $$('#model-filter button').forEach((b) =>
    b.addEventListener('click', () => {
      state.modelFilter = b.dataset.filter;
      $$('#model-filter button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      renderModelList();
    }),
  );

  // Settings
  $$('#theme-seg button').forEach((b) =>
    b.addEventListener('click', () => {
      state.settings.theme = b.dataset.themeOpt;
      saveSettings();
      applyTheme();
    }),
  );
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  $('#set-temp').addEventListener('input', () => {
    state.settings.temperature = parseFloat($('#set-temp').value);
    updateTempUI();
    saveSettings();
  });
  $('#set-enter').addEventListener('change', (e) => {
    state.settings.enterToSend = e.target.checked;
    saveSettings();
  });
  $('#set-system').addEventListener('change', commitSettings);
  $('#save-key').onclick = async () => {
    const key = $('#set-key').value.trim();
    if (!key) return toast('Enter a key first', 'error');
    const btn = $('#save-key');
    btn.disabled = true;
    btn.textContent = 'Verifying…';
    try {
      const list = await fetchModels(key);
      state.settings.apiKey = key;
      state.models = { at: Date.now(), list };
      store.set(KEYS.models, state.models);
      saveSettings();
      updateKeyHint();
      renderModelPill();
      toast('Key saved and verified');
    } catch (err) {
      toast(friendlyError(err.message), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & verify';
    }
  };
  $('#clear-chats').onclick = () => {
    if (!state.chats.length) return toast('No chats to delete');
    if (!confirm('Delete all chats? This cannot be undone.')) return;
    state.chats = [];
    saveChats();
    newChat();
    toast('All chats deleted');
  };
  $('#sign-out').onclick = () => {
    if (!confirm('Remove your API key from this device? Your chats will be kept.')) return;
    state.settings.apiKey = '';
    saveSettings();
    closeSheet('settings-sheet');
    $('#ob-key').value = '';
    showOnboarding();
  };

  // Composer
  el.input.addEventListener('input', () => {
    autosize();
    updateSend();
  });
  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && state.settings.enterToSend) {
      e.preventDefault();
      send();
    }
  });
  el.input.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  });
  $('#composer').addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.controller) stopStreaming();
    else send();
  });
  $('#attach').onclick = () => el.file.click();
  el.file.addEventListener('change', () => {
    addFiles([...el.file.files]);
    el.file.value = '';
  });
  ['dragover', 'drop'].forEach((t) =>
    el.app.addEventListener(t, (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      if (t === 'drop') addFiles([...e.dataTransfer.files]);
    }),
  );

  $$('.suggestion').forEach((b) => b.addEventListener('click', () => send(b.dataset.prompt)));

  // Thread
  el.scroller.addEventListener('scroll', onScroll, { passive: true });
  el.jump.onclick = () => scrollToBottom(true);
  el.thread.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-code]');
    if (btn) copyText($('code', btn.closest('.codeblock')).innerText, btn);
  });

  new ResizeObserver(syncComposerHeight).observe(el.composerWrap);
}

function init() {
  cacheEls();
  applyTheme();
  setGreeting();
  bind();
  if (state.settings.apiKey) showApp();
  else showOnboarding();
}

init();
