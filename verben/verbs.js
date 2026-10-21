// Verb trainer adapted from Karteikarten. Both tracks save locally.
function initVerbs({ $, getState, save, show }) {
  let data = null;                                 // Bundled verb data
  const PERSONS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
  const REFLEXIVE = ['me', 'te', 'se', 'nous', 'vous', 'se'];
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- state ----------
  function V() {
    const st = getState();
    st.verbs ||= { s: {}, first: { i: 0, done: false }, run: null, tests: [], m: 0 };
    const v = st.verbs;
    v.t ||= {}; v.tfirst ||= { i: 0, done: false }; v.ttests ||= []; if (v.trun === undefined) v.trun = null;
    return v;
  }
  // which track the runs work on: conjugating (s, first, run, tests) or translating (t, tfirst, trun, ttests)
  let track = 'conj';
  const KEYS = { conj: { s: 's', first: 'first', run: 'run', tests: 'tests' }, trans: { s: 't', first: 'tfirst', run: 'trun', tests: 'ttests' } };
  const T = () => { const v = V(), k = KEYS[track]; return { s: v[k.s], get first() { return v[k.first]; }, set first(x) { v[k.first] = x; }, get run() { return v[k.run]; }, set run(x) { v[k.run] = x; }, get tests() { return v[k.tests]; }, set tests(x) { v[k.tests] = x; } }; };
  const touch = () => { V().m = Date.now(); save(); };
  function verbCounts(which = track) {
    const s = V()[KEYS[which].s];
    let kann = 0, lernen = 0;
    for (const v of data.verbs) { const e = s[v.inf]; if (e?.k) kann++; else if (e) lernen++; }
    return { kann, lernen, offen: data.verbs.length - kann - lernen };
  }

  // ---------- one verb on screen ----------
  let session = null;      // { kind: 'first' | 'practice' | 'test', queue: [inf], i, total }
  let verb = null, checked = false;

  function label(v, p) {
    const forms = v.forms[p];
    if (v.reflexive) {
      const pron = REFLEXIVE[p];
      return `${PERSONS[p]} ${pron}`;
    }
    if (p === 0 && /^[aeiouyéèêâîôûh]/i.test(forms[0])) return "j'";
    return PERSONS[p];
  }

  function askVerb(v) {
    verb = v; checked = false;
    const k = session.kind;
    $('#conj-mode').textContent = k === 'first' ? 'Erster Durchgang' : k === 'practice' ? 'Üben' : 'Abschlusstest';
    $('#conj-progress').textContent = k === 'practice' ? `noch ${session.queue.length - session.i}` : `${session.i + 1}/${session.total}`;
    $('#conj-meta').textContent = track === 'conj' ? `Nr. ${v.n} · ${v.group}` : `Nr. ${v.n} · auf Französisch?`;
    $('#conj-inf').textContent = track === 'conj' ? v.inf : v.de;
    $('#conj-de').textContent = track === 'conj' ? v.de : '';
    $('#conj-verdict').textContent = '';
    $('#conj-verdict').dataset.result = '';
    const form = $('#conj-form');
    if (track === 'trans') form.innerHTML = `
      <label class="conj-row trans-row" data-p="inf">
        <span class="conj-pron">Infinitiv</span>
        <input class="fr-input conj-input" data-p="inf" lang="fr" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="go">
        <span class="conj-fix" aria-live="polite"></span>
      </label>`;
    else form.innerHTML = v.forms.map((f, p) => f ? `
      <label class="conj-row" data-p="${p}">
        <span class="conj-pron">${label(v, p)}</span>
        <input class="fr-input conj-input" data-p="${p}" lang="fr" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="next">
        <span class="conj-fix" aria-live="polite"></span>
      </label>` : '').join('');
    const inputs = [...form.querySelectorAll('input')];
    inputs.at(-1).enterKeyHint = 'go';
    $('#conj-go').textContent = 'Prüfen';
    show('conj');
    inputs[0].focus();
  }

  function checkVerb() {
    if (!verb || checked) return;
    checked = true;
    let right = 0, total = 0;
    for (const input of $('#conj-form').querySelectorAll('input')) {
      if (input.dataset.p === 'inf') {
        // translating: the French infinitive, accents and "se" included
        total++;
        const r = check(`<b>${verb.inf}</b>`, input.value);
        const row = input.closest('.conj-row');
        row.dataset.result = r.result; input.readOnly = true;
        const fix = row.querySelector('.conj-fix');
        if (r.result === 'right') { right++; fix.textContent = '✓'; } else fix.textContent = verb.inf;
        continue;
      }
      const p = Number(input.dataset.p), alts = verb.forms[p];
      total++;
      // the pronoun is already shown; take it off if it was typed anyway
      const typed = input.value.replace(/^\s*(?:j'\s*|(?:je|tu|il|elle|on|nous|vous|ils|elles)\s+)/i, '').replace(/^\s*(?:(?:me|te|se|nous|vous)\s+|[mts]')/i, '');
      const r = check(`<b>${alts.join(' / ')}</b>`, typed);
      const row = input.closest('.conj-row');
      row.dataset.result = r.result;
      input.readOnly = true;
      const fix = row.querySelector('.conj-fix');
      if (r.result === 'right') { right++; fix.textContent = '✓'; }
      else fix.textContent = alts[0];
    }
    document.activeElement?.blur?.();
    const perfect = right === total;
    $('#conj-verdict').dataset.result = perfect ? 'right' : 'wrong';
    $('#conj-verdict').textContent = track === 'trans' ? (perfect ? 'Richtig' : 'Nicht ganz') : perfect ? 'Perfekt' : `${right} von ${total} richtig`;
    $('#conj-go').textContent = 'Weiter';
    record(perfect);
  }

  // ---------- the three runs ----------
  function record(perfect) {
    const st = T(), s = st.s, inf = verb.inf;
    if (session.kind === 'first') {
      s[inf] = perfect ? { k: 1 } : { k: 0, st: 0 };
      st.first.i = session.i + 1;
      if (st.first.i >= data.verbs.length) st.first.done = true;
    } else if (session.kind === 'practice') {
      const e = s[inf] || { k: 0, st: 0 };
      if (perfect) {
        e.st = (e.st || 0) + 1;
        if (e.st >= 2) { e.k = 1; delete e.st; }
        else session.queue.splice(Math.min(session.queue.length, session.i + 5), 0, inf);   // once more, a bit later
      } else {
        e.st = 0;
        session.queue.splice(Math.min(session.queue.length, session.i + 4), 0, inf);
      }
      s[inf] = e;
    } else {
      const run = st.run;
      run.i = session.i + 1;
      if (perfect) run.ok++;
      else { run.wrong.push(inf); s[inf] = { k: 0, st: 0 }; }
    }
    touch();
  }

  function nextVerb() {
    session.i++;
    if (session.i >= session.queue.length) return finish();
    askVerb(data.verbs.find(v => v.inf === session.queue[session.i]));
  }

  function finish() {
    const st = T(), c = verbCounts();
    const list = $('#conj-done-list'), next = $('#conj-done-next');
    list.innerHTML = '';
    if (session.kind === 'first') {
      $('#conj-done-title').textContent = track === 'conj' ? 'Erster Durchgang fertig' : 'Übersetzen: erster Durchgang fertig';
      $('#conj-done-text').textContent = `${c.kann} Verben kannst du schon perfekt, ${c.lernen} übst du jetzt.`;
      next.textContent = c.lernen ? `${c.lernen} Verben üben` : 'Zum Abschlusstest';
      next.onclick = c.lernen ? startPractice : startTest;
    } else if (session.kind === 'practice') {
      $('#conj-done-title').textContent = 'Alle Verben gelernt';
      $('#conj-done-text').textContent = 'Jedes Verb unter „Lernen“ sitzt jetzt. Zeit für den Abschlusstest.';
      next.textContent = 'Abschlusstest starten';
      next.onclick = startTest;
    } else {
      const run = st.run, score = run.ok;
      st.tests = [...(st.tests || []), { t: Date.now(), s: score, of: run.order.length }].slice(-10);
      $('#conj-done-title').textContent = `${score} von ${run.order.length} perfekt`;
      $('#conj-done-text').textContent = run.wrong.length
        ? `Diese ${run.wrong.length === 1 ? 'kommt' : `${run.wrong.length} kommen`} zurück zu „Lernen“:`
        : 'Alle Verben fehlerfrei.';
      list.innerHTML = run.wrong.map(inf => `<span class="chip">${inf}</span>`).join('');
      st.run = null;
      touch();
      next.textContent = run.wrong.length ? `${run.wrong.length} Verben üben` : 'Zu den Verben';
      next.onclick = run.wrong.length ? startPractice : openVerbs;
    }
    show('conj-done');
  }

  function startFirst() {
    const st = T();
    if (st.first.done) { st.first = { i: 0, done: false }; for (const v of data.verbs) delete st.s[v.inf]; touch(); }
    session = { kind: 'first', queue: data.verbs.map(v => v.inf), i: st.first.i, total: data.verbs.length };
    askVerb(data.verbs[session.i]);
  }
  function startPractice() {
    const s = T().s;
    const queue = shuffle(data.verbs.filter(v => s[v.inf] && !s[v.inf].k).map(v => v.inf));
    if (!queue.length) return openVerbs();
    session = { kind: 'practice', queue, i: 0, total: queue.length };
    askVerb(data.verbs.find(v => v.inf === queue[0]));
  }
  function startTest() {
    const st = T();
    if (!st.run) { st.run = { order: shuffle(data.verbs.map(v => v.inf)), i: 0, ok: 0, wrong: [] }; touch(); }
    session = { kind: 'test', queue: st.run.order, i: st.run.i, total: st.run.order.length };
    if (session.i >= session.queue.length) return finish();
    askVerb(data.verbs.find(v => v.inf === session.queue[session.i]));
  }

  // ---------- overview ----------
  const dateFmt = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'numeric' });
  const STEPS = {
    conj: ['Alle 100 Verben einmal, alle sechs Formen. Was du perfekt konjugierst, kommt zu „Kann ich“, der Rest zu „Lernen“.',
      'Nur die Verben unter „Lernen“. Ein Verb sitzt, wenn du es zweimal perfekt konjugiert hast.',
      'Alle 100 Verben gemischt, auch die, die du schon konntest. Fehler kommen zurück zu „Lernen“.'],
    trans: ['Alle 100 Verben einmal: Du siehst die deutsche Bedeutung und schreibst den Infinitiv auf Französisch.',
      'Nur die Verben unter „Lernen“. Ein Verb sitzt, wenn du es zweimal richtig geschrieben hast.',
      'Alle 100 Bedeutungen gemischt. Fehler kommen zurück zu „Lernen“.'],
  };
  function openVerbs() {
    track = V().track || 'conj';
    const st = T(), c = verbCounts();
    for (const b of document.querySelectorAll('#verb-track button')) b.setAttribute('aria-pressed', b.dataset.track === track);
    ['#step-first', '#step-practice', '#step-test'].forEach((id, i) => { $(id).textContent = STEPS[track][i]; });
    $('.verbs-sub').textContent = track === 'conj' ? 'Präsens: je, tu, il, nous, vous, ils' : 'Deutsche Bedeutung → französischer Infinitiv';
    $('#verb-summary').innerHTML = `
      <span><b>${c.kann}</b>kann ich</span><span><b>${c.lernen}</b>lernen</span><span><b>${c.offen}</b>noch offen</span>`;
    $('#verb-first').textContent = st.first.done ? 'Nochmal von vorn' : st.first.i ? `Weiter (${st.first.i}/100)` : 'Starten';
    $('#verb-first').classList.toggle('primary', !st.first.done);
    $('#verb-practice').textContent = c.lernen ? `${c.lernen} üben` : 'Nichts zu üben';
    $('#verb-practice').disabled = !c.lernen;
    $('#verb-practice').classList.toggle('primary', st.first.done && c.lernen > 0);
    $('#verb-test').textContent = st.run ? `Weiter (${st.run.i}/100)` : 'Test starten';
    $('#verb-test').classList.toggle('primary', st.first.done && !c.lernen);
    const tests = st.tests || [];
    $('#verb-tests').textContent = tests.length ? 'Bisher: ' + tests.slice(-4).map(t => `${t.s}/${t.of} (${dateFmt.format(t.t)})`).join(' · ') : '';
    $('#verb-list').innerHTML = data.verbs.map(v => {
      const e = st.s[v.inf], cls = e?.k ? 'kann' : e ? 'lernen' : 'offen';
      return `<div class="vrow ${cls}"><span class="vn">${v.n}</span><span class="vinf">${v.inf}</span><span class="vde">${v.de}</span></div>`;
    }).join('');
    show('verbs');
  }

  // ---------- wiring ----------
  $('#verb-first').onclick = startFirst;
  for (const b of document.querySelectorAll('#verb-track button')) b.onclick = () => { V().track = b.dataset.track; touch(); openVerbs(); };
  $('#verb-practice').onclick = startPractice;
  $('#verb-test').onclick = startTest;
  $('#conj-back').onclick = openVerbs;
  for (const b of document.querySelectorAll('[data-to-verbs]')) b.onclick = openVerbs;
  $('#conj-go').onclick = () => (checked ? nextVerb() : checkVerb());
  $('#conj-form').onsubmit = e => e.preventDefault();
  $('#conj-form').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || checked) return;
    // this Enter only checks; without stopping it, the "Enter = next verb" shortcut below
    // would see the verb as checked and skip the result straight away
    e.preventDefault(); e.stopPropagation();
    const inputs = [...$('#conj-form').querySelectorAll('input')];
    const at = inputs.indexOf(e.target);
    if (at >= 0 && at < inputs.length - 1) inputs[at + 1].focus(); else checkVerb();
  });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const inField = e.target.matches?.('input');
    if (!$('#conj').hidden && checked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nextVerb(); }
  });

  return {
    setData(d) { data = d; },
    open: openVerbs,
  };
}
