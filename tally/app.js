// Tally: tap a button when you did something. Taps live in a secret gist (tally.json) in the
// user's GitHub account, read and written with a fine-grained token (Gists: read and write).
// The public site holds no data. Every device keeps a copy in localStorage, so it works offline.
// On this site Karteikarten already stores a token as "kk-token"; Tally reuses it if present.

(() => {
  const HABITS = [
    { id: 'bed', name: 'In bed on time', icon: '🌙', daily: true },
    { id: 'prep', name: 'Test prep a week early', icon: '📚', daily: false },
    { id: 'gsh', name: 'GSh!', icon: '💧', daily: true },
    { id: 'math', name: 'Math set done', icon: '✏️', daily: true },
  ];
  const FILE = 'tally.json', API = 'https://api.github.com';
  const ROLLOVER_HOUR = 5;  // taps before 05:00 count for the day before

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  let token = ls.get('tally-token') || ls.get('kk-token');
  let gistId = ls.get('tally-gist');
  let state = load();
  let remote = null, etag = null, syncing = null, again = false, lastSync = 0, problem = '';

  // ---------- data ----------
  // state.events: { id: { h, day, t, m, del? } }. Taps are never edited, only added or
  // marked deleted (with a newer m), so two devices merge by id without losing anything.
  function load() {
    try { const s = JSON.parse(ls.get('tally-state')); if (s && s.events) return s; } catch {}
    return { v: 1, events: {} };
  }
  function save() { ls.set('tally-state', JSON.stringify(state)); }
  function merge(a, b) {
    const events = { ...(b?.events || {}) };
    for (const [id, e] of Object.entries(a?.events || {})) {
      const o = events[id];
      events[id] = !o || (e.m || 0) >= (o.m || 0) ? e : o;
    }
    return { v: 1, events };
  }
  const pad = n => String(n).padStart(2, '0');
  function dayKey(date) {
    const d = new Date(date.getTime() - ROLLOVER_HOUR * 3600e3);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    const x = new Date(y, m - 1, d + n, 12);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  }
  const live = h => Object.values(state.events).filter(e => e.h === h && !e.del);
  const doneOn = (h, day) => live(h).some(e => e.day === day);
  function streak(h, today) {
    let day = doneOn(h, today) ? today : addDays(today, -1), n = 0;
    while (doneOn(h, day)) { n++; day = addDays(day, -1); }
    return n;
  }
  function weekDays(today) {
    const [y, m, d] = today.split('-').map(Number);
    const monday = addDays(today, -((new Date(y, m - 1, d, 12).getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }

  // ---------- actions ----------
  let lastAction = null, toastTimer = 0;
  function tap(h) {
    const now = new Date(), today = dayKey(now), habit = HABITS.find(x => x.id === h);
    if (habit.daily && doneOn(h, today)) {
      // a second tap on a daily habit takes today's tap back
      for (const e of live(h).filter(e => e.day === today)) { e.del = true; e.m = Date.now(); }
      lastAction = null;
      toast(`${habit.name}: taken back for today`, false);
    } else {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      state.events[id] = { h, day: today, t: now.getTime(), m: Date.now() };
      lastAction = id;
      toast(`${habit.name} ✓`, true);
    }
    save(); render(); sync();
  }
  function undo() {
    const e = lastAction && state.events[lastAction];
    if (e) { e.del = true; e.m = Date.now(); save(); render(); sync(); }
    lastAction = null; hideToast();
  }
  function toast(text, canUndo) {
    document.getElementById('toast-text').textContent = text;
    document.getElementById('toast-undo').hidden = !canUndo;
    document.getElementById('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }
  function hideToast() { document.getElementById('toast').hidden = true; }

  // ---------- view ----------
  function render() {
    const now = new Date(), today = dayKey(now);
    document.getElementById('today').textContent =
      now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const week = weekDays(today), month = today.slice(0, 7);
    const box = document.getElementById('habits');
    box.innerHTML = '';
    for (const h of HABITS) {
      const all = live(h.id), done = doneOn(h.id, today);
      const card = document.createElement('article');
      card.className = 'habit';
      const thisWeek = all.filter(e => week.includes(e.day)).length;
      const meta = h.daily
        ? (done ? 'Done today' : 'Not yet today')
        : `${all.filter(e => e.day.startsWith(month)).length} this month`;
      card.innerHTML = `
        <div class="row">
          <span class="icon" aria-hidden="true">${h.icon}</span>
          <div><div class="name"></div><div class="meta">${meta}</div></div>
          <button class="tap${h.daily && done ? ' done' : ''}" type="button">${h.daily && done ? '✓ Done' : '+1'}</button>
        </div>
        ${h.daily ? `<div class="week">${week.map(d => `
          <div class="day${d === today ? ' today' : ''}">${'MTWTFSS'[week.indexOf(d)]}<div class="dot${doneOn(h.id, d) ? ' on' : ''}"></div></div>`).join('')}</div>` : ''}
        <div class="stats">
          ${h.daily ? `<span>Streak <b>${streak(h.id, today)}</b></span><span>This week <b>${thisWeek}/7</b></span>` : `<span>This week <b>${thisWeek}</b></span>`}
          <span>Total <b>${all.length}</b></span>
        </div>`;
      card.querySelector('.name').textContent = h.name;
      card.querySelector('.tap').onclick = () => tap(h.id);
      box.appendChild(card);
    }
    showStatus();
  }

  // ---------- GitHub ----------
  async function gh(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts, cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...(opts.headers || {}) },
    });
    if (res.status === 304) return { status: 304 };
    if (!res.ok) { const e = new Error(res.status === 401 ? 'token' : res.status === 403 || res.status === 404 ? 'scope' : 'http'); throw e; }
    return { status: res.status, etag: res.headers.get('etag'), body: res.status === 204 ? null : await res.json() };
  }
  async function fileText(f) { return f.truncated ? (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content; }
  async function findOrCreateGist() {
    for (let page = 1; page <= 10; page++) {
      const { body } = await gh(`/gists?per_page=100&page=${page}`);
      const hit = body.find(g => g.files[FILE]);
      if (hit) return hit.id;
      if (body.length < 100) break;
    }
    const { body } = await gh('/gists', { method: 'POST', body: JSON.stringify({
      description: 'Tally', public: false, files: { [FILE]: { content: JSON.stringify(state) } } }) });
    return body.id;
  }
  async function syncOnce() {
    if (!token) return;
    if (!gistId) { gistId = await findOrCreateGist(); ls.set('tally-gist', gistId); }
    const res = await gh(`/gists/${gistId}`, { headers: etag ? { 'If-None-Match': etag } : {} });
    if (res.status !== 304) {
      etag = res.etag;
      const f = res.body.files[FILE];
      remote = f ? JSON.parse(await fileText(f) || '{}') : { events: {} };
    }
    const merged = merge(state, remote);
    if (JSON.stringify(merged) !== JSON.stringify(state)) { state = merged; save(); render(); }
    if (JSON.stringify(merged) !== JSON.stringify(merge({}, remote))) {
      await gh(`/gists/${gistId}`, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(merged) } } }) });
      remote = merged; etag = null;
    }
    lastSync = Date.now(); problem = '';
  }
  function sync() {
    if (syncing) { again = true; return syncing; }
    syncing = (async () => {
      try { await syncOnce(); }
      catch (e) {
        problem = e.message === 'token' ? 'GitHub token no longer works. Reconnect.'
          : e.message === 'scope' ? "The token can't edit gists. Reconnect."
          : 'Offline – will sync later';
        if (e.message === 'scope' || e.message === 'token') { gistId = null; ls.del('tally-gist'); }
      }
      showStatus();
      syncing = null;
      if (again) { again = false; sync(); }
    })();
    return syncing;
  }
  function showStatus() {
    const el = document.getElementById('sync-status');
    if (!el) return;
    el.textContent = problem || (lastSync
      ? `Synced ${new Date(lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
      : token ? 'Syncing…' : 'Not connected');
  }

  // ---------- setup ----------
  function setup() {
    const main = document.getElementById('app');
    const sec = document.createElement('section');
    sec.className = 'setup';
    sec.innerHTML = `
      <p>Your taps are stored in a secret gist in your GitHub account. This device needs a token once.</p>
      <ol>
        <li>On <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com › Fine-grained token</a>, create a token: under <em>Account permissions</em>, set <em>Gists</em> to “Read and write”. (The Karteikarten token works too.)</li>
        <li>Paste it here.</li>
      </ol>
      <form><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…" required>
      <button class="primary" type="submit">Connect</button></form>
      <p class="err" role="alert"></p>`;
    main.querySelector('#habits').before(sec);
    sec.querySelector('form').onsubmit = async ev => {
      ev.preventDefault();
      token = sec.querySelector('input').value.trim();
      gistId = null;
      try {
        await gh('/user');
        gistId = await findOrCreateGist();
        ls.set('tally-token', token); ls.set('tally-gist', gistId);
        sec.remove(); problem = ''; sync();
      } catch (e) {
        sec.querySelector('.err').textContent = e.message === 'token' ? "That token doesn't work." : e.message === 'scope'
          ? "That token can't read and write gists." : "Couldn't reach GitHub. Are you online?";
        token = null;
      }
    };
  }

  document.getElementById('toast-undo').onclick = undo;
  document.getElementById('reconnect').onclick = () => {
    if (document.querySelector('.setup')) return;
    ls.del('tally-token'); ls.del('tally-gist'); token = null; gistId = null; setup(); showStatus();
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); sync(); } });
  setInterval(() => { render(); }, 60e3);
  setInterval(() => { if (!document.hidden) sync(); }, 60e3);

  render();
  if (token) sync(); else setup();

  window.tally = { get state() { return state; }, tap, sync, dayKey, streak };
})();
