import { answer, untilLabel, fresh, dayOf, AGAIN, HARD, GOOD, EASY } from './srs.js';
import { createRing } from './ring.js';
import { check, answerText } from './typing.js';

const $ = sel => document.querySelector(sel);
const clock = { offset: 0 };                       // tests shift time with this
const now = () => Date.now() + clock.offset;

// ---------- data ----------
let notes = [], ranges = {}, cards = [];           // cards: { id, note, dir: 'de'|'fr' }
let state = { cards: {}, newDone: { day: -1, n: 0 }, settings: { dir: 'both', newPerDay: 20 }, game: { scores: [], runs: 0 } };

const cardState = id => state.cards[id] || fresh();
const sibling = id => id.endsWith(':f') ? id.slice(0, -1) + 'r' : id.slice(0, -1) + 'f';

// Where progress lives: the local server (server.js) by default, or the
// artifact's synced store when artifact-storage.js has set window.KK_STORAGE.
const serverStorage = {
  async load() {
    const deck = await (await fetch('/api/deck')).json();
    let saved = null;
    try { saved = await (await fetch('/api/state')).json(); } catch {}
    if (!saved || !saved.cards) { try { saved = JSON.parse(localStorage.getItem('kk-state')); } catch {} }
    return { ...deck, saved };
  },
  timer: 0,
  save(state) {
    const body = JSON.stringify(state);
    try { localStorage.setItem('kk-state', body); } catch {}
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      fetch('/api/state', { method: 'PUT', body, headers: { 'content-type': 'application/json' } })
        .then(r => { if (!r.ok) throw r; setOffline(false); })
        .catch(() => setOffline(true));
    }, 250);
  },
};
const storage = window.KK_STORAGE || serverStorage;
function setOffline(on) { $('#offline').hidden = !on; }

async function load() {
  const { notes: n, ranges: r, saved } = await storage.load();
  notes = n; ranges = r;
  cards = notes.flatMap(n => [{ id: n.id + ':f', note: n, dir: 'de' }, { id: n.id + ':r', note: n, dir: 'fr' }]);
  if (saved && saved.cards) state = { ...state, ...saved, settings: { ...state.settings, ...saved.settings }, game: { ...state.game, ...saved.game } };
  if (state.game.runs && !state.game.runsBy) state.game.runsBefore = state.game.runs;   // counted before rounds were per device
  storage.attach?.({ state: () => state, notes, setOffline, onRemote: remoteChanged });
}

// ids: the cards that changed; none means only settings / today's new count did
const save = (...ids) => storage.save(state, ids);

// another device answered cards or changed settings
function remoteChanged() {
  if (!$('#home').hidden) home();
  else if (!$('#study').hidden || !$('#wait').hidden) header();
  else if (!$('#game').hidden) renderScores();
}

// ---------- decks and queue ----------
const DECKS = [
  { key: 'all', name: 'Alle Tests', test: null },
  { key: '1', name: 'Test 1', test: 1 },
  { key: '2', name: 'Test 2', test: 2 },
  { key: '3', name: 'Test 3', test: 3 },
];
function deckCards(deck) {
  const dir = state.settings.dir;
  return cards.filter(c => (deck.test === null || c.note.test === deck.test) && (dir === 'both' || c.dir === dir));
}
function newLeftToday(t) {
  const today = dayOf(t);
  const done = state.newDone.day === today ? state.newDone.n : 0;
  return Math.max(0, state.settings.newPerDay - done);
}
// a card's twin (the reversed direction) waits until tomorrow once one of them was seen today
const buried = (id, today) => state.cards[sibling(id)]?.last === today;

function sortOut(deck, t) {
  const today = dayOf(t);
  const learnNow = [], learnLater = [], reviews = [], news = [];
  for (const c of deckCards(deck)) {
    const s = cardState(c.id);
    if (s.s === 'learn' || s.s === 'relearn') (s.due <= t ? learnNow : learnLater).push([c, s]);
    else if (s.s === 'review') { if (dayOf(s.due) <= today && !buried(c.id, today)) reviews.push([c, s]); }
    else if (!buried(c.id, today)) news.push([c, s]);
  }
  learnNow.sort((a, b) => a[1].due - b[1].due);
  learnLater.sort((a, b) => a[1].due - b[1].due);
  // a note's two directions both count as new until one is shown; only one of them comes today
  const seenNotes = new Set(), newOnce = [];
  for (const pair of news) if (!seenNotes.has(pair[0].note.id)) { seenNotes.add(pair[0].note.id); newOnce.push(pair); }
  return { learnNow, learnLater, reviews, news: newOnce.slice(0, newLeftToday(t)) };
}
function counts(deck, t) {
  const q = sortOut(deck, t);
  const learnToday = [...q.learnNow, ...q.learnLater].filter(([, s]) => dayOf(s.due) <= dayOf(t)).length;
  return { neu: q.news.length, lernen: learnToday, faellig: q.reviews.length };
}

// ---------- screens ----------
let typing = false, suggested = GOOD;
let deck = DECKS[0], current = null, revealed = false, shown = 0, undoStack = [];
const ring = createRing($('#ring'), {
  progress: () => wait ? (now() - wait.from) / (wait.until - wait.from) : 0,
  label: () => {
    if (!wait) return '';
    const s = Math.max(0, Math.ceil((wait.until - now()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },
  onContinue: () => { wait = null; next(); },
});
let wait = null;

function show(id) {
  for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== id;
  if (id !== 'wait') ring.stop();
  if (id !== 'game') gameRing.stop();
}

function home() {
  current = null; wait = null;
  const t = now();
  $('#decks').innerHTML = DECKS.map(d => {
    const c = counts(d, t), range = d.test ? ranges[d.test] : '1.1–6.3';
    return `<button class="deck" data-key="${d.key}">
      <span class="deck-name">${d.name}<small>${range ?? ''}</small></span>
      <span class="deck-counts">
        <span title="Neu">${c.neu}<small>neu</small></span>
        <span title="Lernen">${c.lernen}<small>lernen</small></span>
        <span title="Fällig">${c.faellig}<small>fällig</small></span>
      </span></button>`;
  }).join('');
  for (const b of document.querySelectorAll('.deck')) b.onclick = () => { deck = DECKS.find(d => d.key === b.dataset.key); start(); };
  for (const b of document.querySelectorAll('#dir button')) b.setAttribute('aria-pressed', b.dataset.dir === state.settings.dir);
  for (const b of document.querySelectorAll('#typing button')) b.setAttribute('aria-pressed', (b.dataset.typing === 'on') === (state.settings.typeDE !== false));
  $('#new-per-day').textContent = state.settings.newPerDay;
  const best = state.game.scores[0]?.s;
  $('#game-best').textContent = best ? `Bestwert ${best}` : '';
  show('home');
}

function start() { shown = 0; undoStack = []; next(); }

function next() {
  const t = now(), q = sortOut(deck, t);
  let pick = q.learnNow[0];
  if (!pick) {
    // mix reviews and new cards like Anki does
    const preferNew = q.news.length && (!q.reviews.length || shown % 3 === 2);
    pick = preferNew ? q.news[0] : q.reviews[0];
  }
  if (pick) return study(pick[0]);
  const later = q.learnLater.find(([, s]) => dayOf(s.due) <= dayOf(t));
  if (later) return waitFor(later);
  done();
}

function header() {
  const c = counts(deck, now());
  $('#study-deck').textContent = deck.name;
  $('#study-counts').innerHTML = `<span>${c.neu}</span><span>${c.lernen}</span><span>${c.faellig}</span>`;
}

function study(card) {
  current = card; revealed = false;
  const n = card.note;
  $('#card-meta').textContent = `Test ${n.test} · ${n.chapter} · ${card.dir === 'de' ? 'DE → FR' : 'FR → DE'}`;
  $('#front').innerHTML = card.dir === 'de' ? n.de : n.fr;
  $('#back').innerHTML = card.dir === 'de' ? n.fr : n.de;
  $('#back-wrap').hidden = true;
  $('#reveal').hidden = false;
  $('#grades').hidden = true;
  $('#undo').hidden = !undoStack.length;
  // DE → FR: type the French, like in the test
  typing = card.dir === 'de' && state.settings.typeDE !== false;
  $('#type-form').hidden = !typing;
  $('#type-result').hidden = true;
  $('#reveal').textContent = typing ? 'Prüfen' : 'Antwort zeigen';
  const input = $('#type-input');
  input.value = ''; input.readOnly = false;
  header();
  show('study');
  if (typing) input.focus();
}

const VERDICT = { right: 'Richtig', accent: 'Fast: ein Akzent stimmt nicht', wrong: 'Nicht ganz', empty: 'Nicht gewusst' };
const SUGGEST = { right: GOOD, accent: HARD, wrong: AGAIN, empty: AGAIN };
const marked = parts => parts.map(p => {
  const c = p.c === ' ' ? '\u00a0' : p.c;
  const span = document.createElement('span');
  span.textContent = c;
  if (!p.ok) span.className = 'off';
  return span.outerHTML;
}).join('');

function checkTyped() {
  const input = $('#type-input');
  const r = check(current.note.fr, input.value);
  input.readOnly = true; input.blur();
  $('#type-form').hidden = true;
  $('#type-result').hidden = false;
  $('#type-result').dataset.result = r.result;
  $('#verdict').textContent = VERDICT[r.result];
  $('#diff').hidden = !r.diff;
  if (r.diff) { $('#diff-typed').innerHTML = marked(r.diff.typed); $('#diff-answer').innerHTML = marked(r.diff.answer); }
  suggested = SUGGEST[r.result];
}

function reveal() {
  if (!current || revealed) return;
  revealed = true;
  suggested = GOOD;
  if (typing) checkTyped();
  $('#back-wrap').hidden = false;
  $('#reveal').hidden = true;
  const t = now(), s = cardState(current.id);
  for (const b of document.querySelectorAll('#grades button')) {
    b.querySelector('small').textContent = untilLabel(answer(s, Number(b.dataset.grade), t), t);
    b.classList.toggle('primary', Number(b.dataset.grade) === suggested);   // the typed answer's suggestion
  }
  $('#grades').hidden = false;
}

function grade(g) {
  if (!current || !revealed) return;
  const t = now(), id = current.id, before = state.cards[id];
  undoStack.push({ id, before, newDone: { ...state.newDone }, card: current });
  if (cardState(id).s === 'new') {
    const today = dayOf(t);
    state.newDone = { day: today, n: (state.newDone.day === today ? state.newDone.n : 0) + 1 };
  }
  state.cards[id] = { ...answer(cardState(id), g, t), m: Date.now() };
  shown++;
  save(id);
  next();
}

function undo() {
  const u = undoStack.pop();
  if (!u) return;
  state.cards[u.id] = { ...(u.before || fresh()), m: Date.now() };
  state.newDone = u.newDone;
  shown = Math.max(0, shown - 1);
  save(u.id);
  wait = null;
  study(u.card);
}

// the only real wait in the app: a card you're still learning isn't due yet
function waitFor([card, s]) {
  current = null;
  wait = { from: now(), until: s.due, card };
  header();
  $('#wait-deck').textContent = deck.name;
  show('wait');
  ring.start();
}

function done() {
  current = null;
  const t = now(), tomorrow = dayOf(t) + 1;
  const dueTomorrow = deckCards(deck).filter(c => { const s = state.cards[c.id]; return s && s.s === 'review' && dayOf(s.due) === tomorrow; }).length;
  const newLeft = sortOut(deck, t).news.length === 0 && newLeftToday(t) === 0;
  $('#done-text').textContent = dueTomorrow
    ? `Morgen ${dueTomorrow === 1 ? 'ist 1 Karte' : `sind ${dueTomorrow} Karten`} fällig.`
    : 'Morgen ist nichts fällig.';
  $('#more-new').hidden = !newLeft;
  show('done');
}

// ---------- the ring game ----------
const deviceId = (() => {
  try {
    let id = localStorage.getItem('kk-device');
    if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem('kk-device', id); }
    return id;
  } catch { return 'browser'; }
})();
let gameScore = 0, gameStarted = false;
const gameRing = createRing($('#game-ring'), {
  game: true,
  radius: (w, h) => Math.max(60, Math.min(w, h) * 0.38),
  label: () => gameStarted ? String(gameScore) : '',
  onStart: () => { gameScore = 0; gameStarted = true; $('#game-status').textContent = ''; },
  onHit: () => { gameScore++; },
  onMiss: () => recordRun(gameScore),
});

function recordRun(score) {
  const g = state.game;
  // rounds are counted per device, so devices can add theirs up when they sync
  g.runsBy = { ...(g.runsBy || {}), [deviceId]: (g.runsBy?.[deviceId] || 0) + 1 };
  g.runs = Object.values(g.runsBy).reduce((a, b) => a + b, 0) + (g.runsBefore || 0);
  let rank = -1;
  if (score > 0) {
    g.scores = [...g.scores, { s: score, t: now() }].sort((a, b) => b.s - a.s || a.t - b.t).slice(0, 10);
    rank = g.scores.findIndex(e => e.s === score && e.t >= now() - 1000);
  }
  save();
  $('#game-status').textContent = rank === 0 && g.scores.length > 1 ? `${score} – neuer Bestwert`
    : score === 1 ? '1 Treffer' : `${score} Treffer`;
  renderScores(rank);
}

const dateFmt = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'numeric', year: '2-digit' });
function renderScores(highlight = -1) {
  const { scores, runs } = state.game;
  $('#game-runs').textContent = runs ? `${runs} ${runs === 1 ? 'Runde' : 'Runden'}` : '';
  $('#scores').innerHTML = scores.length
    ? scores.map((e, i) => `<li${i === highlight ? ' class="new"' : ''}><span class="rank">${i + 1}</span><span class="pts">${e.s}</span><span class="when">${dateFmt.format(e.t)}</span></li>`).join('')
    : '<li class="empty">Noch keine Runde gespielt.</li>';
}

function openGame() {
  gameScore = 0; gameStarted = false;
  $('#game-status').textContent = '';
  renderScores();
  show('game');
  gameRing.start();
}

// ---------- speech ----------
function speakFrench() {
  if (!current || !('speechSynthesis' in window)) return;
  const html = current.note.fr.split('<br>')[0];
  const div = document.createElement('div'); div.innerHTML = html;
  const u = new SpeechSynthesisUtterance(div.textContent);
  u.lang = 'fr-FR'; u.rate = 0.9;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

// ---------- wiring ----------
$('#reveal').onclick = reveal;
$('#type-form').onsubmit = e => { e.preventDefault(); reveal(); };
// accent buttons type at the cursor without taking the focus away
for (const b of document.querySelectorAll('.accents button')) {
  b.onpointerdown = e => e.preventDefault();
  b.onclick = () => {
    const input = $('#type-input');
    if (input.readOnly) return;
    const { selectionStart: a, selectionEnd: z, value } = input;
    input.value = value.slice(0, a ?? value.length) + b.textContent + value.slice(z ?? value.length);
    const pos = (a ?? value.length) + b.textContent.length;
    input.focus(); input.setSelectionRange(pos, pos);
  };
}
for (const b of document.querySelectorAll('#typing button')) b.onclick = () => setSetting('typeDE', b.dataset.typing === 'on');
for (const b of document.querySelectorAll('#grades button')) b.onclick = () => grade(Number(b.dataset.grade));
for (const b of document.querySelectorAll('.back-home')) b.onclick = home;
$('#undo').onclick = undo;
$('#open-game').onclick = openGame;
$('#speak').onclick = speakFrench;
$('#early').onclick = () => { if (wait) { const c = wait.card; wait = null; study(c); } };
$('#more-new').onclick = () => {
  const today = dayOf(now());
  if (state.newDone.day === today) state.newDone.n = Math.max(0, state.newDone.n - 10);
  else state.newDone = { day: today, n: -10 };
  save(); next();
};
function setSetting(key, value) { state.settings[key] = value; state.settingsM = Date.now(); save(); home(); }
for (const b of document.querySelectorAll('#dir button')) b.onclick = () => setSetting('dir', b.dataset.dir);
$('#fewer').onclick = () => setSetting('newPerDay', Math.max(0, state.settings.newPerDay - 5));
$('#more').onclick = () => setSetting('newPerDay', Math.min(200, state.settings.newPerDay + 5));

addEventListener('keydown', e => {
  const inField = e.target.matches?.('input');
  if (e.metaKey && e.key === 'z' && !inField) { e.preventDefault(); return undo(); }
  if ($('#study').hidden || e.metaKey || e.ctrlKey || e.altKey || inField) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); revealed ? grade(suggested) : reveal(); }
  else if (revealed && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key));
});

load().then(home).catch(err => {
  $('#home').hidden = false;
  $('#decks').innerHTML = `<p class="error">Die Vokabeln konnten nicht geladen werden.<br><small>${String(err)}</small></p>`;
});

window.kk = { clock, get state() { return state; }, next, home, sortOut: () => sortOut(deck, now()), DECKS, gameRing };
