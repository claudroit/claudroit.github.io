// French word trainer (TSW Kapitel 3), built like /verben: first pass → practice → final test, saved in this browser.
// Each chapter choice (all, 3.2 … 3.5) and the synonym and opposite exercises keep their own progress.
function initWords({ $, getState, save, show }) {
  const cards = initCards({ $, getState, save, show, back: () => open() });
  const SCOPES = {
    all: { note: 'TSW Kapitel 3.2 bis 3.5', list: 'Alle Wörter' },
    '3.2': { note: '', list: 'Alle Wörter aus 3.2' },
    '3.3': { note: '', list: 'Alle Wörter aus 3.3' },
    '3.4': { note: '', list: 'Alle Wörter aus 3.4' },
    '3.5': { note: '', list: 'Alle Wörter aus 3.5' },
    syn: { note: 'Zum französischen Wort ein Synonym (gleiche Bedeutung) aus Kapitel 3.2 bis 3.5 schreiben.', list: 'Alle Synonyme', items: PAIRS.syn, sub: 'Wort → Synonym', ask: 'Synonym', placeholder: 'Synonym …' },
    ant: { note: 'Zum französischen Wort das Gegenteil aus Kapitel 3.2 bis 3.5 schreiben.', list: 'Alle Gegenteile', items: PAIRS.ant, sub: 'Wort → Gegenteil', ask: 'Gegenteil', placeholder: 'Gegenteil …' },
  };
  const CHAPTERS = ['all', '3.2', '3.3', '3.4', '3.5'];
  const modeOf = sc => (SCOPES[sc].items ? sc : 'words');
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byId = new Map([...WORDS, ...PAIRS.syn, ...PAIRS.ant].map(w => [w.id, w]));
  // what the card asks for and what counts: a word's own entry, or (synonyms, opposites) its partners
  const answersOf = w => w.answers || [w, ...(sameDe.get(w.de) || []).filter(x => x !== w)];
  const shownAnswer = w => w.answers ? w.answers.map(a => shownFr(a.fr)).join(' / ') : shownFr(w.fr);
  const sameDe = new Map();
  for (const w of WORDS) sameDe.set(w.de, [...(sameDe.get(w.de) || []), w]);

  const scope = () => SCOPES[getState().scope] ? getState().scope : 'all';
  const selected = () => SCOPES[scope()].items || (scope() === 'all' ? WORDS : WORDS.filter(w => w.group === scope()));

  // ---------- state ----------
  function S() {
    const st = getState();
    st.scopes ||= {};
    st.scopes[scope()] ||= { s: {}, first: { i: 0, done: false }, run: null, tests: [] };
    const sc = st.scopes[scope()];
    // the words the first pass did not get right; the final test asks only these
    if (!sc.miss && sc.first.done) {
      // progress from before this list existed: best guess is every word not known yet
      sc.miss = selected().filter(w => sc.s[w.id] && !sc.s[w.id].k).map(w => w.id);
      if (sc.run && sc.run.order.some(id => !sc.miss.includes(id))) sc.run = null;
    }
    sc.miss ||= [];
    // drop words that were removed from the list (chapter 3.6)
    sc.miss = sc.miss.filter(id => byId.has(id));
    if (sc.run && sc.run.order.some(id => !byId.has(id))) sc.run = null;
    return sc;
  }
  // what the final test asks: the first-pass mistakes, or everything if there were none
  function testIds() {
    const st = S(), miss = new Set(st.miss);
    const ids = selected().filter(w => miss.has(w.id)).map(w => w.id);
    return st.first.done && ids.length ? ids : selected().map(w => w.id);
  }
  function counts() {
    const s = S().s;
    let kann = 0, lernen = 0;
    for (const w of selected()) { const e = s[w.id]; if (e?.k) kann++; else if (e) lernen++; }
    return { kann, lernen, offen: selected().length - kann - lernen };
  }

  // ---------- one word on screen ----------
  let session = null;      // { kind: 'first' | 'practice' | 'test', queue: [id], i, total }
  let word = null, checked = false;

  function ask(w) {
    word = w; checked = false;
    const k = session.kind;
    $('#ask-mode').textContent = k === 'first' ? 'Erster Durchgang' : k === 'practice' ? 'Üben'  : 'Abschlusstest';
    const loose = k === 'practice';
    $('#ask-progress').textContent = loose ? `noch ${session.queue.length - session.i}` : `${session.i + 1}/${session.total}`;
    const done = loose ? session.i / Math.max(1, session.queue.length) : session.i / Math.max(1, session.total);
    $('#ask-bar').style.width = `${Math.round(done * 1000) / 10}%`;
    $('#ask-meta').textContent = w.prompt ? `${SCOPES[scope()].ask} zu …` : `${w.group} · ${w.section}`;
    $('#ask-de').textContent = w.prompt ? shownFr(w.prompt.fr) : w.de;
    $('#ask-de').lang = w.prompt ? 'fr' : 'de';
    $('#ask-hint').hidden = !w.prompt;
    $('#ask-hint').textContent = w.prompt ? w.prompt.de : '';
    const input = $('#ask-input');
    input.value = ''; input.readOnly = false; input.dataset.result = '';
    $('#ask-verdict').textContent = ''; $('#ask-verdict').dataset.result = '';
    $('#ask-result').hidden = true; $('#ask-other').hidden = true; $('#ask-diff').hidden = true;
    $('#ask-override').hidden = true;
    $('#ask-go').textContent = 'Prüfen';
    $('#accents').hidden = false;
    show('ask');
    input.focus();
  }

  const VERDICT = { right: 'Richtig', accent: 'Fast: Akzent', article: 'Fast: Artikel fehlt', fem: 'Fast: weibliche Form fehlt', dash: 'Fast: Bindestrich oder Leerzeichen', wrong: 'Nicht ganz', empty: 'Nicht gewusst' };
  function checkWord() {
    if (!word || checked) return;
    checked = true;
    const input = $('#ask-input');
    // answers you counted as right before ("Ich hatte es richtig") are right from then on
    const mine = (getState().accepted?.[word.id] || []).includes(normalizeFr(input.value));
    const [main, ...others] = answersOf(word);
    let r = mine ? { result: 'right' } : checkFr(main, input.value, others, WORDS);
    // the asked word itself is not an answer
    if (word.prompt && r.result === 'wrong' && candidatesFr(word.prompt).some(c => foldFr(c) === foldFr(normalizeFr(input.value)))) r = { ...r, other: null, self: true };
    const perfect = r.result === 'right';
    input.readOnly = true; input.blur();
    $('#accents').hidden = true;
    input.dataset.result = perfect ? 'right' : 'wrong';
    $('#ask-verdict').dataset.result = perfect ? 'right' : 'wrong';
    $('#ask-verdict').textContent = VERDICT[r.result];
    $('#ask-answer').textContent = shownAnswer(word);
    $('#ask-result').hidden = false;
    // close misses: show letter by letter what was wrong (red) and what was missing (underlined)
    const diff = !perfect && input.value.trim() && r.closest && (r.result !== 'wrong' || r.close) ? letterDiffFr(normalizeFr(input.value), r.closest) : null;
    $('#ask-diff').hidden = !diff;
    if (diff) { $('#diff-typed').innerHTML = marked(diff.typed); $('#diff-book').innerHTML = marked(diff.answer); }
    $('#ask-override').hidden = perfect || !input.value.trim() || !!r.self;
    snapshot = perfect ? null : { scope: JSON.stringify(S()), queue: [...session.queue], misses: [...(session.misses || [])], typed: normalizeFr(input.value) };
    // the test wants this card's word: say so when the typed word is another one from the book
    $('#ask-other').hidden = !r.other && !r.self;
    if (r.self) $('#ask-other').textContent = 'Das ist das Wort selbst. Gesucht ist ein anderes Wort.';
    else if (r.other) $('#ask-other').innerHTML = `„${esc(shownFr(r.other.fr))}“ ist im Buch: ${esc(r.other.de)}`;
    $('#ask-go').textContent = 'Weiter';
    record(perfect);
  }

  const marked = parts => parts.map(p => `<span${p.ok ? '' : ' class="off"'}>${p.c === ' ' ? '&nbsp;' : esc(p.c)}</span>`).join('');

  // "Ich hatte es richtig": undo what the wrong answer did, count it as right, and accept that answer from now on
  let snapshot = null;
  function override() {
    if (!checked || !snapshot) return;
    const st = getState();
    st.scopes[scope()] = JSON.parse(snapshot.scope);
    session.queue = snapshot.queue;
    if (session.misses) session.misses = snapshot.misses;
    st.accepted ||= {};
    st.accepted[word.id] = [...new Set([...(st.accepted[word.id] || []), snapshot.typed])];
    snapshot = null;
    record(true);
    $('#ask-input').dataset.result = 'right';
    $('#ask-verdict').dataset.result = 'right';
    $('#ask-verdict').textContent = 'Als richtig gezählt';
    $('#ask-diff').hidden = true; $('#ask-other').hidden = true; $('#ask-override').hidden = true;
  }

  // ---------- the three runs ----------
  function record(perfect) {
    const st = S(), s = st.s, id = word.id;
    if (session.kind === 'first') {
      s[id] = perfect ? { k: 1 } : { k: 0, st: 0 };
      st.miss = st.miss.filter(x => x !== id);
      if (!perfect) st.miss.push(id);
      st.first.i = session.i + 1;
      if (st.first.i >= selected().length) st.first.done = true;
    } else if (session.kind === 'practice') {
      const e = s[id] || { k: 0, st: 0 };
      if (perfect) {
        e.st = (e.st || 0) + 1;
        if (e.st >= 2) { e.k = 1; delete e.st; }
        else session.queue.splice(Math.min(session.queue.length, session.i + 5), 0, id);   // once more, a bit later
      } else {
        e.st = 0;
        session.queue.splice(Math.min(session.queue.length, session.i + 4), 0, id);
      }
      s[id] = e;
    } else {
      const run = st.run;
      run.i = session.i + 1;
      if (perfect) run.ok++;
      else { run.wrong.push(id); s[id] = { k: 0, st: 0 }; }
    }
    save();
  }

  function next() {
    session.i++;
    if (session.i >= session.queue.length) return finish();
    ask(byId.get(session.queue[session.i]));
  }

  function finish() {
    const st = S(), c = counts();
    const list = $('#done-list'), nextBtn = $('#done-next');
    list.innerHTML = '';
    if (session.kind === 'first') {
      $('#done-title').textContent = 'Erster Durchgang fertig';
      $('#done-text').textContent = `${c.kann} Wörter kannst du schon, ${c.lernen} übst du jetzt.`;
      nextBtn.textContent = c.lernen ? `${c.lernen} Wörter üben` : 'Zum Abschlusstest';
      nextBtn.onclick = c.lernen ? startPractice : startTest;
    } else if (session.kind === 'practice') {
      $('#done-title').textContent = 'Alle Wörter gelernt';
      $('#done-text').textContent = 'Jedes Wort unter „Üben“ sitzt jetzt. Zeit für den Abschlusstest.';
      nextBtn.textContent = 'Abschlusstest starten';
      nextBtn.onclick = startTest;
    } else {
      const run = st.run, score = run.ok;
      st.tests = [...(st.tests || []), { t: Date.now(), s: score, of: run.order.length }].slice(-10);
      $('#done-title').textContent = `${score} von ${run.order.length} richtig`;
      $('#done-text').textContent = run.wrong.length
        ? `Diese ${run.wrong.length === 1 ? 'kommt' : `${run.wrong.length} kommen`} zurück zu „Üben“:`
        : 'Alle Wörter fehlerfrei.';
      list.innerHTML = run.wrong.map(id => `<span class="chip">${esc(chipText(byId.get(id)))}</span>`).join('');
      st.run = null;
      save();
      nextBtn.textContent = run.wrong.length ? `${run.wrong.length} Wörter üben` : 'Zu den Wörtern';
      nextBtn.onclick = run.wrong.length ? startPractice : open;
    }
    show('done');
  }

  const chipText = w => w.prompt ? `${shownFr(w.prompt.fr)} → ${shownAnswer(w)}` : shownFr(w.fr);

  function startFirst() {
    const st = S();
    if (st.first.done) { st.first = { i: 0, done: false }; st.miss = []; st.run = null; for (const w of selected()) delete st.s[w.id]; save(); }
    session = { kind: 'first', queue: selected().map(w => w.id), i: st.first.i, total: selected().length };
    ask(selected()[session.i]);
  }
  // skip the first pass: what was answered keeps its result, everything not reached yet goes to "Üben"
  function skipFirst() {
    const st = S();
    for (const w of selected()) if (!st.s[w.id]) { st.s[w.id] = { k: 0, st: 0 }; st.miss.push(w.id); }
    st.first = { i: selected().length, done: true };
    save(); open();
  }
  function startPractice() {
    const s = S().s;
    const queue = shuffle(selected().filter(w => s[w.id] && !s[w.id].k).map(w => w.id));
    if (!queue.length) return open();
    session = { kind: 'practice', queue, i: 0, total: queue.length };
    ask(byId.get(queue[0]));
  }
  function startTest() {
    const st = S();
    if (!st.run) { st.run = { order: shuffle(testIds()), i: 0, ok: 0, wrong: [] }; save(); }
    session = { kind: 'test', queue: st.run.order, i: st.run.i, total: st.run.order.length };
    if (session.i >= session.queue.length) return finish();
    ask(byId.get(session.queue[session.i]));
  }

  // ---------- overview ----------
  const dateFmt = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'numeric' });
  function open() {
    const st = S(), c = counts(), count = selected().length;
    const isCards = getState().tab === 'cards';
    const mode = isCards ? 'cards' : modeOf(scope());
    for (const b of document.querySelectorAll('#scope button')) b.setAttribute('aria-pressed', b.dataset.scope === scope());
    for (const b of document.querySelectorAll('#mode button')) b.setAttribute('aria-pressed', b.dataset.mode === mode);
    $('#scope').hidden = mode !== 'words' && mode !== 'cards';
    // Karteikarten: the chapter row and the card settings instead of the three steps
    for (const el of [$('#summary'), $('.steps-list'), $('.verb-list')]) el.hidden = isCards;
    $('#cards-setup').hidden = !isCards;
    if (isCards) cards.render(selected());
    $('#mode-sub').textContent = isCards ? 'Karteikarten' : SCOPES[scope()].sub || 'Deutsch → Französisch';
    $('#ask-input').placeholder = SCOPES[scope()].placeholder || 'Auf Französisch …';
    $('#scope-note').textContent = isCards ? `${SCOPES[scope()].note} ${count} Karten.`.trim() : `${SCOPES[scope()].note} ${count} Wörter.`;
    $('#list-label').textContent = SCOPES[scope()].list;
    $('#step-first').textContent = `Alle ${count} Wörter einmal, in Buchreihenfolge. Richtig kommt zu „Kann ich“, der Rest zu „Üben“`;
    $('#step-practice').textContent = 'Nur die Wörter unter „Üben“. Ein Wort sitzt, wenn du es zweimal richtig geschrieben hast';
    const nTest = testIds().length;
    $('#step-test').textContent = nTest < count
      ? `Nur die ${nTest} Wörter, die im ersten Durchgang falsch waren, gemischt. Fehler kommen zurück zu „Üben“`
      : `Alle ${count} Wörter gemischt, wie im Test. Fehler kommen zurück zu „Üben“`;
    $('#summary').innerHTML = `<span><b${c.kann ? ' class="good"' : ''}>${c.kann}</b>kann ich</span><span><b${c.lernen ? ' class="bad"' : ''}>${c.lernen}</b>üben</span><span><b>${c.offen}</b>noch offen</span>`;
    $('#go-first').textContent = st.first.done ? 'Nochmal von vorn' : st.first.i ? `Weiter (${st.first.i}/${count})` : 'Starten';
    $('#go-first').classList.toggle('primary', !st.first.done);
    $('#skip-first').hidden = st.first.done;
    $('#go-practice').textContent = c.lernen ? `${c.lernen} üben` : 'Nichts zu üben';
    $('#go-practice').disabled = !c.lernen;
    $('#go-practice').classList.toggle('primary', st.first.done && c.lernen > 0);
    $('#go-test').textContent = st.run ? `Weiter (${st.run.i}/${st.run.order.length})` : 'Test starten';
    $('#go-test').classList.toggle('primary', st.first.done && !c.lernen);
    const tests = st.tests || [];
    $('#tests').textContent = tests.length ? 'Bisher: ' + tests.slice(-4).map(t => `${t.s}/${t.of} (${dateFmt.format(t.t)})`).join(' · ') : '';
    renderList();
    session = null; word = null;
    show('words');
  }

  // the word list: grouped by the book's sections, searchable in both languages
  const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function renderList() {
    const st = S(), q = fold($('#list-search').value.trim());
    const text = w => w.prompt ? [w.prompt.fr, w.de, ...w.answers.map(a => a.fr)].join(' ') : w.fr + ' ' + w.de;
    const shown = selected().filter(w => !q || fold(text(w)).includes(q));
    let section = '', html = '';
    for (const w of shown) {
      const e = st.s[w.id], cls = e?.k ? 'kann' : e ? 'lernen' : 'offen';
      if (w.prompt) {
        const head = `${w.group} · ${w.section}`;
        if (head !== section) { section = head; html += `<h3 class="wsec">${esc(head)}</h3>`; }
        html += `<div class="vrow wrow ${cls}"><span class="vn">${w.n}</span><span class="vinf" lang="fr">${esc(shownFr(w.prompt.fr))}</span><span class="vde" lang="fr">${esc(shownAnswer(w))}</span></div>`;
        continue;
      }
      const head = `${w.group + ' · '}${w.section}`;
      if (head !== section) { section = head; html += `<h3 class="wsec">${esc(head)}</h3>`; }
      html += `<div class="vrow wrow ${cls}"><span class="vn">${w.n}</span><span class="vinf" lang="fr">${esc(w.fr)}</span><span class="vde">${esc(w.de)}</span></div>`;
    }
    $('#word-list').innerHTML = html || '<p class="quiet small">Kein Wort gefunden.</p>';
  }

  // ---------- wiring ----------
  // accent buttons under the field: put the letter where the cursor is
  for (const b of document.querySelectorAll('#accents button')) {
    b.onpointerdown = e => e.preventDefault();   // keep the focus (and the phone keyboard) in the field
    b.onclick = () => {
      const input = $('#ask-input');
      if (input.readOnly) return;
      const a = input.selectionStart ?? input.value.length, z = input.selectionEnd ?? a;
      input.value = input.value.slice(0, a) + b.textContent + input.value.slice(z);
      input.setSelectionRange(a + 1, a + 1);
      input.focus();
    };
  }
  $('#list-search').oninput = renderList;
  $('#ask-override').onclick = override;
  for (const b of document.querySelectorAll('#scope button')) b.onclick = () => { getState().scope = getState().chapter = b.dataset.scope; save(); open(); };
  // Vokabeln goes back to the chapter chosen last
  for (const b of document.querySelectorAll('#mode button')) b.onclick = () => {
    const st = getState();
    const chapter = CHAPTERS.includes(st.chapter) ? st.chapter : 'all';
    st.tab = b.dataset.mode === 'cards' ? 'cards' : null;
    st.scope = b.dataset.mode === 'words' || b.dataset.mode === 'cards' ? chapter : b.dataset.mode;
    save(); open();
  };
  $('#go-first').onclick = startFirst;
  $('#skip-first').onclick = skipFirst;
  $('#go-practice').onclick = startPractice;
  $('#go-test').onclick = startTest;
  $('#ask-back').onclick = open;
  for (const b of document.querySelectorAll('[data-to-words]')) b.onclick = open;
  $('#ask-go').onclick = () => (checked ? next() : checkWord());
  $('#ask-form').onsubmit = e => {
    e.preventDefault();
    // this Enter only checks; stopping it keeps the "Enter = next word" shortcut below from skipping the result
    e.stopPropagation();
    if (!checked) checkWord();
  };
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('button')) return;
    if (!$('#ask').hidden && checked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); }
  });

  return { open, get word() { return word; } };
}
