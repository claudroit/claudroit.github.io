// English word trainer, built like /verben: first pass → practice → final test, saved in this browser.
// Each chapter choice (all, 1.1, 1.3, extra words) keeps its own progress.
function initWords({ $, getState, save, show }) {
  const SCOPES = {
    all: { note: 'Alle Wörter aus 1.1 und 1.3 und die weiteren Wörter aus der Excel-Liste.', list: 'Alle Wörter' },
    '1.1': { note: '1.1 Identity: Who are you? · How do you identify? · The need to belong', list: 'Alle Wörter aus 1.1' },
    '1.3': { note: '1.3 Work: Technology · Fourth Industrial Revolution · Workplace · Agile · Finding and applying for a job', list: 'Alle Wörter aus 1.3' },
    x: { note: 'Wörter aus der Excel-Liste, die nicht auf den Buchseiten 21–57 stehen.', list: 'Alle weiteren Wörter' },
  };
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byId = new Map(WORDS.map(w => [w.id, w]));
  const sameDe = new Map();
  for (const w of WORDS) sameDe.set(w.de, [...(sameDe.get(w.de) || []), w]);

  const scope = () => SCOPES[getState().scope] ? getState().scope : 'all';
  const selected = () => scope() === 'all' ? WORDS : WORDS.filter(w => w.group === scope());

  // ---------- state ----------
  function S() {
    const st = getState();
    st.scopes ||= {};
    st.scopes[scope()] ||= { s: {}, first: { i: 0, done: false }, run: null, tests: [] };
    return st.scopes[scope()];
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
    $('#ask-mode').textContent = k === 'first' ? 'Erster Durchgang' : k === 'practice' ? 'Üben' : 'Abschlusstest';
    $('#ask-progress').textContent = k === 'practice' ? `noch ${session.queue.length - session.i}` : `${session.i + 1}/${session.total}`;
    $('#ask-meta').textContent = `${w.group === 'x' ? 'Weitere Wörter' : w.group} · ${w.section}`;
    $('#ask-de').textContent = w.de;
    const input = $('#ask-input');
    input.value = ''; input.readOnly = false; input.dataset.result = '';
    $('#ask-verdict').textContent = ''; $('#ask-verdict').dataset.result = '';
    $('#ask-answer').hidden = true; $('#ask-other').hidden = true;
    $('#ask-go').textContent = 'Prüfen';
    show('ask');
    input.focus();
  }

  const VERDICT = { right: 'Richtig', noTo: 'Fast: „to“ fehlt', dash: 'Fast: Bindestrich oder Leerzeichen', wrong: 'Nicht ganz', empty: 'Nicht gewusst' };
  function checkWord() {
    if (!word || checked) return;
    checked = true;
    const input = $('#ask-input');
    const r = checkEn(word, input.value, (sameDe.get(word.de) || []).filter(x => x !== word), WORDS);
    const perfect = r.result === 'right';
    input.readOnly = true; input.blur();
    input.dataset.result = perfect ? 'right' : 'wrong';
    $('#ask-verdict').dataset.result = perfect ? 'right' : 'wrong';
    $('#ask-verdict').textContent = VERDICT[r.result];
    $('#ask-answer').textContent = shownEn(word.en);
    $('#ask-answer').hidden = false;
    // the test wants this card's word: say so when the typed word is another one from the book
    $('#ask-other').hidden = !r.other;
    if (r.other) $('#ask-other').innerHTML = `„${esc(shownEn(r.other.en))}“ ist im Buch: ${esc(r.other.de)}`;
    $('#ask-go').textContent = 'Weiter';
    record(perfect);
  }

  // ---------- the three runs ----------
  function record(perfect) {
    const st = S(), s = st.s, id = word.id;
    if (session.kind === 'first') {
      s[id] = perfect ? { k: 1 } : { k: 0, st: 0 };
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
      $('#done-text').textContent = 'Jedes Wort unter „Lernen“ sitzt jetzt. Zeit für den Abschlusstest.';
      nextBtn.textContent = 'Abschlusstest starten';
      nextBtn.onclick = startTest;
    } else {
      const run = st.run, score = run.ok;
      st.tests = [...(st.tests || []), { t: Date.now(), s: score, of: run.order.length }].slice(-10);
      $('#done-title').textContent = `${score} von ${run.order.length} richtig`;
      $('#done-text').textContent = run.wrong.length
        ? `Diese ${run.wrong.length === 1 ? 'kommt' : `${run.wrong.length} kommen`} zurück zu „Lernen“:`
        : 'Alle Wörter fehlerfrei.';
      list.innerHTML = run.wrong.map(id => `<span class="chip">${esc(shownEn(byId.get(id).en))}</span>`).join('');
      st.run = null;
      save();
      nextBtn.textContent = run.wrong.length ? `${run.wrong.length} Wörter üben` : 'Zu den Wörtern';
      nextBtn.onclick = run.wrong.length ? startPractice : open;
    }
    show('done');
  }

  function startFirst() {
    const st = S();
    if (st.first.done) { st.first = { i: 0, done: false }; for (const w of selected()) delete st.s[w.id]; save(); }
    session = { kind: 'first', queue: selected().map(w => w.id), i: st.first.i, total: selected().length };
    ask(selected()[session.i]);
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
    if (!st.run) { st.run = { order: shuffle(selected().map(w => w.id)), i: 0, ok: 0, wrong: [] }; save(); }
    session = { kind: 'test', queue: st.run.order, i: st.run.i, total: st.run.order.length };
    if (session.i >= session.queue.length) return finish();
    ask(byId.get(session.queue[session.i]));
  }

  // ---------- overview ----------
  const dateFmt = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'numeric' });
  function open() {
    const st = S(), c = counts(), count = selected().length;
    for (const b of document.querySelectorAll('#scope button')) b.setAttribute('aria-pressed', b.dataset.scope === scope());
    $('#scope-note').textContent = `${SCOPES[scope()].note} ${count} Wörter.`;
    $('#list-label').textContent = SCOPES[scope()].list;
    $('#step-first').textContent = `Alle ${count} Wörter einmal in Buchreihenfolge: Du siehst das Deutsche und schreibst das englische Wort aus dem Buch. Richtig kommt zu „Kann ich“, der Rest zu „Lernen“.`;
    $('#step-practice').textContent = 'Nur die Wörter unter „Lernen“. Ein Wort sitzt, wenn du es zweimal richtig geschrieben hast.';
    $('#step-test').textContent = `Alle ${count} Wörter gemischt, wie im Test. Fehler kommen zurück zu „Lernen“.`;
    $('#summary').innerHTML = `<span><b>${c.kann}</b>kann ich</span><span><b>${c.lernen}</b>lernen</span><span><b>${c.offen}</b>noch offen</span>`;
    $('#go-first').textContent = st.first.done ? 'Nochmal von vorn' : st.first.i ? `Weiter (${st.first.i}/${count})` : 'Starten';
    $('#go-first').classList.toggle('primary', !st.first.done);
    $('#go-practice').textContent = c.lernen ? `${c.lernen} üben` : 'Nichts zu üben';
    $('#go-practice').disabled = !c.lernen;
    $('#go-practice').classList.toggle('primary', st.first.done && c.lernen > 0);
    $('#go-test').textContent = st.run ? `Weiter (${st.run.i}/${count})` : 'Test starten';
    $('#go-test').classList.toggle('primary', st.first.done && !c.lernen);
    const tests = st.tests || [];
    $('#tests').textContent = tests.length ? 'Bisher: ' + tests.slice(-4).map(t => `${t.s}/${t.of} (${dateFmt.format(t.t)})`).join(' · ') : '';
    $('#word-list').innerHTML = selected().map(w => {
      const e = st.s[w.id], cls = e?.k ? 'kann' : e ? 'lernen' : 'offen';
      return `<div class="vrow wrow ${cls}"><span class="vn">${w.n}</span><span class="vinf" lang="en">${esc(w.en)}</span><span class="vde">${esc(w.de)}</span></div>`;
    }).join('');
    session = null; word = null;
    show('words');
  }

  // ---------- wiring ----------
  for (const b of document.querySelectorAll('#scope button')) b.onclick = () => { getState().scope = b.dataset.scope; save(); open(); };
  $('#go-first').onclick = startFirst;
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
