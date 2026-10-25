// Finnish word trainer, adapted from the French verb trainer. Both tracks save locally.
// Tracks: "trans" (German -> Finnish word) and "form" (verb ich-form, noun stems / case forms, countries).
// Progress per word is shared by all categories; first pass, practice run and tests are per category and track.

function initTrainer({ $, getState, save, show }) {
  let data = null;                                 // { words, cats }
  let byId = new Map();
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- state ----------
  function S() {
    const st = getState();
    if (!st.scope || (st.scope !== 'all' && !data.cats[st.scope] && !unitOf(st.scope))) st.scope = data.units[0].id;
    st.track ||= 'trans';
    st.words ||= {}; st.words.trans ||= {}; st.words.form ||= {};
    st.runs ||= {};
    return st;
  }
  const scope = () => S().scope;
  const track = () => S().track;
  const known = () => S().words[track()];                       // { id: { k: 1 } | { k: 0, st } }
  const unitOf = id => data.units.find(u => u.id === id);
  const items = () => {
    const u = unitOf(scope());
    const base = u ? u.ids.map(id => byId.get(id)) : data.words.filter(w => scope() === 'all' || w.cat === scope());
    return base.filter(w => track() === 'trans' || w.forms);
  };
  function P() {                                                // first pass, run and tests of this category + track
    const runs = S().runs, key = scope() + ':' + track();
    runs[key] ||= { first: { i: 0, done: false }, run: null, tests: [] };
    return runs[key];
  }
  const touch = () => save();
  function counts() {
    const s = known(), list = items();
    let kann = 0, lernen = 0;
    for (const w of list) { const e = s[w.n]; if (e?.k) kann++; else if (e) lernen++; }
    return { kann, lernen, offen: list.length - kann - lernen };
  }

  // ---------- one word on screen ----------
  let session = null;      // { kind: 'first' | 'practice' | 'test', queue: [id], i, total }
  let word = null, checked = false;
  const catLabel = w => data.cats[w.cat].label;

  function rowsFor(w) {
    return track() === 'trans' ? [{ label: 'Finnisch', answer: w.fi }] : w.forms.map(([label, answer]) => ({ label, answer }));
  }

  function askWord(w) {
    word = w; checked = false;
    const k = session.kind;
    $('#conj-mode').textContent = k === 'first' ? 'Erster Durchgang' : k === 'practice' ? 'Üben' : 'Abschlusstest';
    $('#conj-progress').textContent = k === 'practice' ? `noch ${session.queue.length - session.i}` : `${session.i + 1}/${session.total}`;
    $('#conj-meta').textContent = `Nr. ${w.n} · ${catLabel(w)}` + (track() === 'trans' ? ' · auf Finnisch?' : '');
    $('#conj-inf').textContent = track() === 'trans' ? w.de : w.fi;
    $('#conj-de').textContent = track() === 'trans' ? '' : w.de;
    $('#conj-verdict').textContent = '';
    $('#conj-verdict').dataset.result = '';
    const form = $('#conj-form');
    form.innerHTML = rowsFor(w).map((r, i) => `
      <label class="conj-row ${track() === 'trans' ? 'trans-row' : 'form-row'}" data-p="${i}">
        <span class="conj-pron">${r.label}</span>
        <input class="fr-input conj-input" data-p="${i}" lang="fi" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="next">
        <span class="conj-fix" aria-live="polite"></span>
      </label>`).join('');
    const inputs = [...form.querySelectorAll('input')];
    inputs.at(-1).enterKeyHint = 'go';
    $('#conj-go').textContent = 'Prüfen';
    show('conj');
    inputs[0].focus();
  }

  function checkWord() {
    if (!word || checked) return;
    checked = true;
    const rows = rowsFor(word);
    let right = 0;
    for (const input of $('#conj-form').querySelectorAll('input')) {
      const answer = rows[Number(input.dataset.p)].answer;
      // the pronoun is already shown; stem hyphens are optional
      let typed = input.value;
      if (track() === 'form') typed = typed.replace(/^\s*minä\s+/i, '').replace(/-+\s*$/, '');
      const r = check(`<b>${answer}</b>`, typed);
      const row = input.closest('.conj-row');
      row.dataset.result = r.result; input.readOnly = true;
      const fix = row.querySelector('.conj-fix');
      if (r.result === 'right') { right++; fix.textContent = '✓'; } else fix.textContent = answer;
    }
    document.activeElement?.blur?.();
    const total = rows.length, perfect = right === total;
    $('#conj-verdict').dataset.result = perfect ? 'right' : 'wrong';
    $('#conj-verdict').textContent = total === 1 ? (perfect ? 'Richtig' : 'Nicht ganz') : perfect ? 'Perfekt' : `${right} von ${total} richtig`;
    $('#conj-go').textContent = 'Weiter';
    record(perfect);
  }

  // ---------- the three runs ----------
  function record(perfect) {
    const p = P(), s = known(), id = word.n;
    if (session.kind === 'first') {
      s[id] = perfect ? { k: 1 } : { k: 0, st: 0 };
      p.first.i = session.i + 1;
      if (p.first.i >= items().length) p.first.done = true;
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
      const run = p.run;
      run.i = session.i + 1;
      if (perfect) run.ok++;
      else { run.wrong.push(id); s[id] = { k: 0, st: 0 }; }
    }
    touch();
  }

  function nextWord() {
    session.i++;
    if (session.i >= session.queue.length) return finish();
    askWord(byId.get(session.queue[session.i]));
  }

  function finish() {
    const p = P(), c = counts();
    const list = $('#conj-done-list'), next = $('#conj-done-next');
    list.innerHTML = '';
    if (session.kind === 'first') {
      $('#conj-done-title').textContent = 'Erster Durchgang fertig';
      $('#conj-done-text').textContent = `${c.kann} Wörter kannst du schon perfekt, ${c.lernen} übst du jetzt.`;
      next.textContent = c.lernen ? `${c.lernen} Wörter üben` : 'Zum Abschlusstest';
      next.onclick = c.lernen ? startPractice : startTest;
    } else if (session.kind === 'practice') {
      $('#conj-done-title').textContent = 'Alle Wörter gelernt';
      $('#conj-done-text').textContent = 'Jedes Wort unter „Lernen“ sitzt jetzt. Zeit für den Abschlusstest.';
      next.textContent = 'Abschlusstest starten';
      next.onclick = startTest;
    } else {
      const run = p.run, score = run.ok;
      p.tests = [...(p.tests || []), { t: Date.now(), s: score, of: run.order.length }].slice(-10);
      $('#conj-done-title').textContent = `${score} von ${run.order.length} perfekt`;
      $('#conj-done-text').textContent = run.wrong.length
        ? `Diese ${run.wrong.length === 1 ? 'kommt' : `${run.wrong.length} kommen`} zurück zu „Lernen“:`
        : 'Alle Wörter fehlerfrei.';
      list.innerHTML = run.wrong.map(id => `<span class="chip">${byId.get(id).fi.split(' / ')[0]}</span>`).join('');
      p.run = null;
      touch();
      next.textContent = run.wrong.length ? `${run.wrong.length} Wörter üben` : 'Zur Übersicht';
      next.onclick = run.wrong.length ? startPractice : openHome;
    }
    show('conj-done');
  }

  function startFirst() {
    const p = P(), list = items();
    if (!list.length) return;
    if (p.first.done) { p.first = { i: 0, done: false }; for (const w of list) delete known()[w.n]; touch(); }
    session = { kind: 'first', queue: list.map(w => w.n), i: p.first.i, total: list.length };
    askWord(byId.get(session.queue[session.i]));
  }
  function startPractice() {
    const s = known();
    const queue = shuffle(items().filter(w => s[w.n] && !s[w.n].k).map(w => w.n));
    if (!queue.length) return openHome();
    session = { kind: 'practice', queue, i: 0, total: queue.length };
    askWord(byId.get(queue[0]));
  }
  function startTest() {
    const p = P(), list = items();
    if (!list.length) return;
    if (!p.run) { p.run = { order: shuffle(list.map(w => w.n)), i: 0, ok: 0, wrong: [] }; touch(); }
    session = { kind: 'test', queue: p.run.order, i: p.run.i, total: p.run.order.length };
    if (session.i >= session.queue.length) return finish();
    askWord(byId.get(session.queue[session.i]));
  }

  // ---------- overview ----------
  const dateFmt = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'numeric' });
  const STEPS = {
    trans: n => [`Alle ${n} Wörter einmal: Du siehst die deutsche Bedeutung und schreibst das finnische Wort.`,
      'Nur die Wörter unter „Lernen“. Ein Wort sitzt, wenn du es zweimal richtig geschrieben hast.',
      `Alle ${n} Bedeutungen gemischt, auch die, die du schon konntest. Fehler kommen zurück zu „Lernen“.`],
    form: n => [`Alle ${n} Wörter einmal: Du siehst das finnische Wort und schreibst die verlangte Form.`,
      'Nur die Wörter unter „Lernen“. Ein Wort sitzt, wenn du es zweimal perfekt geschrieben hast.',
      `Alle ${n} Wörter gemischt, auch die, die du schon konntest. Fehler kommen zurück zu „Lernen“.`],
  };
  function openHome() {
    const st = S(), p = P(), c = counts(), list = items(), count = list.length, empty = !count;
    const sel = $('#scope');
    if (!sel.options.length) {
      sel.innerHTML = `<optgroup label="Häppchen">` +
        data.units.map(u => `<option value="${u.id}">${u.label} (${u.ids.length})</option>`).join('') +
        `</optgroup><optgroup label="Nach Wortart">` +
        `<option value="all">Alle Wörter (${data.words.length})</option>` +
        Object.entries(data.cats).map(([k, v]) => `<option value="${k}">${v.label} (${data.words.filter(w => w.cat === k).length})</option>`).join('') +
        `</optgroup>`;
    }
    sel.value = st.scope;
    for (const b of document.querySelectorAll('#verb-track button')) b.setAttribute('aria-pressed', b.dataset.track === st.track);
    const note = st.scope === 'all' ? 'Alle Kategorien gemischt, in der Reihenfolge der Liste.' : (unitOf(st.scope) || data.cats[st.scope]).note;
    $('#scope-note').textContent = empty ? `${note} Hier gibt es keine Formen zum Üben, wähle „Übersetzen“.` : note;
    $('.verbs-sub').textContent = st.track === 'trans' ? 'Deutsche Bedeutung → finnisches Wort' : 'Finnisches Wort → Verb- oder Fallform';
    $('#verb-list-label').textContent = `Alle ${count} Wörter`;
    STEPS[st.track](count).forEach((t, i) => { $(['#step-first', '#step-practice', '#step-test'][i]).textContent = t; });
    $('#verb-summary').innerHTML = `
      <span><b>${c.kann}</b>kann ich</span><span><b>${c.lernen}</b>lernen</span><span><b>${c.offen}</b>noch offen</span>`;
    $('#verb-first').textContent = p.first.done ? 'Nochmal von vorn' : p.first.i ? `Weiter (${p.first.i}/${count})` : 'Starten';
    $('#verb-first').disabled = empty;
    $('#verb-skip').hidden = empty || p.first.done;
    $('#verb-first').classList.toggle('primary', !p.first.done && !empty);
    $('#verb-practice').textContent = c.lernen ? `${c.lernen} üben` : 'Nichts zu üben';
    $('#verb-practice').disabled = !c.lernen;
    $('#verb-practice').classList.toggle('primary', p.first.done && c.lernen > 0);
    $('#verb-test').textContent = p.run ? `Weiter (${p.run.i}/${p.run.order.length})` : 'Test starten';
    $('#verb-test').disabled = empty;
    $('#verb-test').classList.toggle('primary', p.first.done && !c.lernen);
    const tests = p.tests || [];
    $('#verb-tests').textContent = tests.length ? 'Bisher: ' + tests.slice(-4).map(t => `${t.s}/${t.of} (${dateFmt.format(t.t)})`).join(' · ') : '';
    const s = known();
    $('#verb-list').innerHTML = list.map(w => {
      const e = s[w.n], cls = e?.k ? 'kann' : e ? 'lernen' : 'offen';
      return `<div class="vrow ${cls}"><span class="vn">${w.n}</span><span class="vinf">${w.fi}</span><span class="vde">${w.de}</span></div>`;
    }).join('');
    show('verbs');
  }

  // ---------- wiring ----------
  const reset = () => { session = null; word = null; checked = false; };
  $('#scope').onchange = e => { S().scope = e.target.value; reset(); save(); openHome(); };
  for (const b of document.querySelectorAll('#verb-track button')) b.onclick = () => { S().track = b.dataset.track; reset(); save(); openHome(); };
  $('#verb-first').onclick = startFirst;
  $('#open-cheat').onclick = () => show('cheat');
  // skip the first pass: every word not yet seen goes straight to "Lernen"
  $('#verb-skip').onclick = () => {
    const p = P(), s = known(), list = items();
    for (const w of list) if (!s[w.n]) s[w.n] = { k: 0, st: 0 };
    p.first = { i: list.length, done: true };
    touch(); openHome();
  };
  $('#verb-practice').onclick = startPractice;
  $('#verb-test').onclick = startTest;
  $('#conj-back').onclick = openHome;
  for (const b of document.querySelectorAll('[data-to-verbs]')) b.onclick = openHome;
  $('#conj-go').onclick = () => (checked ? nextWord() : checkWord());
  $('#conj-form').onsubmit = e => e.preventDefault();
  $('#conj-form').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || checked) return;
    // this Enter only checks; without stopping it, the "Enter = next word" shortcut below
    // would see the word as checked and skip the result straight away
    e.preventDefault(); e.stopPropagation();
    const inputs = [...$('#conj-form').querySelectorAll('input')];
    const at = inputs.indexOf(e.target);
    if (at >= 0 && at < inputs.length - 1) inputs[at + 1].focus(); else checkWord();
  });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!$('#conj').hidden && checked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nextWord(); }
  });

  return {
    setData(d) { data = d; byId = new Map(d.words.map(w => [w.n, w])); },
    open: openHome,
  };
}
