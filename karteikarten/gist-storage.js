// GitHub Pages build only: vocabulary and progress live in a secret gist of the user's,
// read and written with a token they paste once per device. The public site holds no vocabulary.
// Gist files: karteikarten-deck.json ({notes, ranges}), karteikarten-grammatik.json ({verbs, adjectives})
// and karteikarten-progress.json (the app state).
// Each device keeps a full copy in localStorage, so it works offline and syncs when it can.

window.KK_STORAGE = (() => {
  const DECK = 'karteikarten-deck.json', PROGRESS = 'karteikarten-progress.json', GRAMMAR = 'karteikarten-grammatik.json';
  const API = 'https://api.github.com';
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  let ctx = null, token = ls.get('kk-token'), gistId = ls.get('kk-gist');
  let etag = null, remote = null, syncing = null, again = false, timer = 0, lastSync = 0, problem = '';

  // ---------- GitHub ----------
  async function gh(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...(opts.headers || {}) },
      cache: 'no-store',
    });
    if (res.status === 304) return { status: 304 };
    if (!res.ok) { const e = new Error(res.status === 401 ? 'token' : res.status === 403 || res.status === 404 ? 'scope' : 'http'); e.status = res.status; throw e; }
    return { status: res.status, etag: res.headers.get('etag'), body: res.status === 204 ? null : await res.json() };
  }
  async function fileText(file) {
    // big files come back truncated; the raw URL has the whole thing
    if (!file.truncated) return file.content;
    return (await fetch(file.raw_url, { cache: 'no-store' })).text();
  }
  async function findGist() {
    for (let page = 1; page <= 10; page++) {
      const { body } = await gh(`/gists?per_page=100&page=${page}`);
      const hit = body.find(g => g.files[PROGRESS]);
      if (hit) return hit.id;
      if (body.length < 100) return null;
    }
    return null;
  }

  // ---------- merging two copies ----------
  const newer = (a, b) => (!a ? b : !b ? a : (a.m || 0) >= (b.m || 0) ? a : b);
  function merge(a, b) {
    if (!b) return a;
    if (!a) return b;
    const cards = { ...b.cards };
    for (const [id, s] of Object.entries(a.cards || {})) cards[id] = newer(s, cards[id]);
    const nd = [a.newDone, b.newDone].filter(Boolean).sort((x, y) => y.day - x.day || y.n - x.n)[0] || { day: -1, n: 0 };
    // a device that never changed its settings (still the defaults) loses to the saved ones
    const settingsFrom = (a.settingsM || 0) > (b.settingsM || 0) || !b.settings ? a : b;
    const ga = a.game || {}, gb = b.game || {};
    const seen = new Set(), scores = [];
    for (const e of [...(ga.scores || []), ...(gb.scores || [])]) { const k = e.t + ':' + e.s; if (!seen.has(k)) { seen.add(k); scores.push(e); } }
    scores.sort((x, y) => y.s - x.s || x.t - y.t);
    const runsBy = { ...gb.runsBy };
    for (const [d, n] of Object.entries(ga.runsBy || {})) runsBy[d] = Math.max(n, runsBy[d] || 0);
    const runsBefore = Math.max(ga.runsBefore || 0, gb.runsBefore || 0);
    return {
      ...b, ...a, cards, newDone: nd,
      settings: { ...settingsFrom.settings }, settingsM: settingsFrom.settingsM || 0,
      game: { scores: scores.slice(0, 10), runsBy, runsBefore, runs: Object.values(runsBy).reduce((x, y) => x + y, 0) + runsBefore },
      // the verb and adjective progress: whichever device changed it last
      verbs: newer(a.verbs, b.verbs), adj: newer(a.adj, b.adj),
    };
  }
  const pick = st => ({ cards: st.cards, newDone: st.newDone, settings: st.settings, settingsM: st.settingsM || 0, game: st.game, verbs: st.verbs, adj: st.adj });

  // ---------- syncing ----------
  function status(text) { const el = document.getElementById('sync-status'); if (el) el.textContent = text; }
  function showStatus() {
    if (problem) return status(problem);
    if (!lastSync) return status('Noch nicht synchronisiert');
    const t = new Date(lastSync).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    status(`Synchronisiert um ${t}`);
  }

  async function syncOnce() {
    if (!token || !gistId) return;
    const res = await gh(`/gists/${gistId}`, { headers: etag ? { 'If-None-Match': etag } : {} });
    if (res.status !== 304) {
      etag = res.etag;
      const file = res.body.files[PROGRESS];
      remote = file ? JSON.parse(await fileText(file) || '{}') : {};
    }
    const state = ctx.state(), local = pick(state);
    const merged = merge(local, remote);
    const before = JSON.stringify(local);
    if (JSON.stringify(pick(merged)) !== before) {
      Object.assign(state, merged);
      ls.set('kk-state', JSON.stringify(pick(state)));
      ctx.onRemote();
    }
    const out = JSON.stringify(pick(merged));
    if (out !== JSON.stringify(remote && pick(remote))) {
      await gh(`/gists/${gistId}`, { method: 'PATCH', body: JSON.stringify({ files: { [PROGRESS]: { content: out } } }) });
      remote = JSON.parse(out); etag = null;
    }
    lastSync = Date.now(); problem = '';
  }
  function sync() {
    if (syncing) { again = true; return syncing; }
    syncing = (async () => {
      try { await syncOnce(); }
      catch (e) {
        problem = e.message === 'token' ? 'Der GitHub-Token gilt nicht mehr. Unten neu verbinden.'
          : e.message === 'scope' ? 'Der Token darf keine Gists bearbeiten. Unten neu verbinden.'
          : 'Offline – wird später synchronisiert';
      }
      showStatus();
      syncing = null;
      if (again) { again = false; sync(); }
    })();
    return syncing;
  }

  // ---------- first-time setup ----------
  function setupScreen() {
    return new Promise(resolve => {
      const sec = document.createElement('section');
      sec.id = 'setup'; sec.className = 'screen';
      sec.innerHTML = `
        <header class="top"><h1>Karteikarten</h1><span class="sub">Mit GitHub verbinden</span></header>
        <div class="setup">
          <p>Deine Vokabeln und dein Fortschritt liegen in einem geheimen Gist in deinem GitHub-Konto. Dieses Gerät braucht dafür einmal einen Token.</p>
          <ol class="steps">
            <li>Auf <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com › Fine-grained token</a> einen Token erstellen: unter <em>Account permissions</em> bei <em>Gists</em> „Read and write“ wählen.</li>
            <li>Den Token hier einfügen.</li>
          </ol>
          <form id="setup-form" class="setup-form">
            <label for="setup-token">GitHub-Token</label>
            <input id="setup-token" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…" required>
            <button class="primary" type="submit" id="setup-go">Verbinden</button>
          </form>
          <div id="setup-import" class="setup-import" hidden>
            <p>Noch kein Karteikarten-Gist gefunden. Wähle die Startdatei <code>karteikarten-start.json</code> von deinem Mac, dann wird der Gist angelegt.</p>
            <input id="setup-file" type="file" accept="application/json,.json">
            <label class="file-pick" for="setup-file">Startdatei wählen</label>
          </div>
          <p id="setup-error" class="setup-error" role="alert"></p>
        </div>`;
      document.body.prepend(sec);
      for (const el of document.querySelectorAll('.screen')) el.hidden = el !== sec;
      const err = t => { sec.querySelector('#setup-error').textContent = t; };
      const done = () => { sec.remove(); resolve(); };

      sec.querySelector('#setup-form').onsubmit = async e => {
        e.preventDefault();
        err('');
        token = sec.querySelector('#setup-token').value.trim();
        const go = sec.querySelector('#setup-go');
        go.disabled = true; go.textContent = 'Verbinde …';
        try {
          await gh('/user');
          gistId = await findGist();
          ls.set('kk-token', token);
          if (gistId) { ls.set('kk-gist', gistId); return done(); }
          sec.querySelector('#setup-form').hidden = true;
          sec.querySelector('#setup-import').hidden = false;
        } catch (x) {
          err(x.message === 'token' ? 'Dieser Token wird von GitHub nicht angenommen. Prüfe, ob er vollständig kopiert ist.'
            : x.message === 'scope' ? 'Der Token darf keine Gists lesen. Setze bei „Gists“ die Berechtigung „Read and write“.'
            : 'GitHub ist gerade nicht erreichbar. Prüfe die Internetverbindung.');
        }
        go.disabled = false; go.textContent = 'Verbinden';
      };

      sec.querySelector('#setup-file').onchange = async e => {
        err('');
        try {
          const start = JSON.parse(await e.target.files[0].text());
          if (!start.deck?.notes?.length) throw new Error('file');
          const { body } = await gh('/gists', {
            method: 'POST',
            body: JSON.stringify({
              description: 'Karteikarten – Vokabeln und Fortschritt',
              public: false,
              files: { [DECK]: { content: JSON.stringify(start.deck) }, [PROGRESS]: { content: JSON.stringify(start.progress || {}) } },
            }),
          });
          gistId = body.id; ls.set('kk-gist', gistId);
          done();
        } catch (x) {
          err(x.message === 'file' ? 'Das ist nicht die Startdatei von Karteikarten.' : 'Der Gist konnte nicht angelegt werden. Versuch es noch einmal.');
        }
      };
    });
  }

  async function loadDeck() {
    const cached = ls.get('kk-deck');
    try {
      const { body } = await gh(`/gists/${gistId}`);
      const deck = JSON.parse(await fileText(body.files[DECK]));
      // the verbs and adjectives were added later as their own file
      if (!deck.grammar && body.files[GRAMMAR]) deck.grammar = JSON.parse(await fileText(body.files[GRAMMAR]));
      ls.set('kk-deck', JSON.stringify(deck));
      return deck;
    } catch (e) {
      if (cached) return JSON.parse(cached);        // offline: use the copy from last time
      throw e;
    }
  }

  return {
    async load() {
      if (!token || !gistId) await setupScreen();
      const deck = await loadDeck();
      let saved = null;
      try { saved = JSON.parse(ls.get('kk-state')); } catch {}
      return { ...deck, saved };
    },
    attach(c) {
      ctx = c;
      // the sync line and a way to disconnect, under the settings on the home screen
      const row = document.createElement('div');
      row.className = 'sync-row';
      row.innerHTML = '<span id="sync-status">Synchronisiere …</span><button id="sync-forget" class="link small">Trennen</button>';
      document.querySelector('#home .settings').after(row);
      row.querySelector('#sync-forget').onclick = () => {
        ls.del('kk-token'); ls.del('kk-gist'); location.reload();
      };
      sync();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); else if (timer) { clearTimeout(timer); timer = 0; sync(); } });
      addEventListener('online', () => sync());
    },
    save(state) {
      ls.set('kk-state', JSON.stringify(pick(state)));
      clearTimeout(timer);
      timer = setTimeout(() => { timer = 0; sync(); }, 3000);
    },
  };
})();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
