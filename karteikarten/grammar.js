// The two grammar modes: the 100 verbs (all six present-tense forms) and adjective placement.
// Their progress lives in state.verbs and state.adj and syncs with everything else.
//
// Verbs: a first pass over all 100 sorts them into "kann ich" (all six forms right) and "lernen".
// Practice only asks the "lernen" ones; a verb is learned after two perfect rounds.
// The final test asks all 100 again, shuffled; mistakes go back to "lernen".
import { check } from './typing.js';

export function initGrammar({ $, getState, save, show, home }) {
  let data = null;                                 // { verbs, adjectives } from the deck
  const PERSONS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
  const REFLEXIVE = ['me', 'te', 'se', 'nous', 'vous', 'se'];
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- state ----------
  function V() {
    const st = getState();
    st.verbs ||= { s: {}, first: { i: 0, done: false }, run: null, tests: [], m: 0 };
    return st.verbs;
  }
  const touch = () => { V().m = Date.now(); save(); };
  function verbCounts() {
    const s = V().s;
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
    $('#conj-meta').textContent = `Nr. ${v.n} · ${v.group}`;
    $('#conj-inf').textContent = v.inf;
    $('#conj-de').textContent = v.de;
    $('#conj-verdict').textContent = '';
    $('#conj-verdict').dataset.result = '';
    const form = $('#conj-form');
    form.innerHTML = v.forms.map((f, p) => f ? `
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
    $('#conj-verdict').textContent = perfect ? 'Perfekt' : `${right} von ${total} richtig`;
    $('#conj-go').textContent = 'Weiter';
    record(perfect);
  }

  // ---------- the three runs ----------
  function record(perfect) {
    const st = V(), s = st.s, inf = verb.inf;
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
    const st = V(), c = verbCounts();
    const list = $('#conj-done-list'), next = $('#conj-done-next');
    list.innerHTML = '';
    if (session.kind === 'first') {
      $('#conj-done-title').textContent = 'Erster Durchgang fertig';
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
    const st = V();
    if (st.first.done) { st.first = { i: 0, done: false }; for (const v of data.verbs) delete st.s[v.inf]; touch(); }
    session = { kind: 'first', queue: data.verbs.map(v => v.inf), i: st.first.i, total: data.verbs.length };
    askVerb(data.verbs[session.i]);
  }
  function startPractice() {
    const s = V().s;
    const queue = shuffle(data.verbs.filter(v => s[v.inf] && !s[v.inf].k).map(v => v.inf));
    if (!queue.length) return openVerbs();
    session = { kind: 'practice', queue, i: 0, total: queue.length };
    askVerb(data.verbs.find(v => v.inf === queue[0]));
  }
  function startTest() {
    const st = V();
    if (!st.run) { st.run = { order: shuffle(data.verbs.map(v => v.inf)), i: 0, ok: 0, wrong: [] }; touch(); }
    session = { kind: 'test', queue: st.run.order, i: st.run.i, total: st.run.order.length };
    if (session.i >= session.queue.length) return finish();
    askVerb(data.verbs.find(v => v.inf === session.queue[session.i]));
  }

  // ---------- overview ----------
  const dateFmt = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'numeric' });
  function openVerbs() {
    const st = V(), c = verbCounts();
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

  // ---------- adjectives ----------
  const A = () => { const st = getState(); st.adj ||= { best: 0, last: null, runs: 0, m: 0 }; return st.adj; };
  let quiz = null, q = null, answered = false;

  function openAdj() {
    $('#adj-table').innerHTML = data.adjectives.map(a => `
      <div class="adj-pair">
        <div class="adj-word">${a.adj}</div>
        ${a.items.map(it => `<div class="adj-item"><span class="adj-pos">${it.pos === 'vor' ? 'vor dem Nomen' : 'nach dem Nomen'}</span><span class="adj-fr">${it.fr}</span><span class="adj-de">${it.de}</span></div>`).join('')}
      </div>`).join('');
    const a = A();
    $('#adj-best').textContent = a.runs ? `Letztes Mal ${a.last} von 24 · Bestwert ${a.best} von 24` : '';
    $('#adj-intro').hidden = false; $('#adj-quiz').hidden = true; $('#adj-foot').hidden = true;
    $('#adj-progress').textContent = '';
    show('adj');
  }
  function startAdj() {
    // every phrase twice: once typed from the German, once by choosing what the French means
    const items = data.adjectives.flatMap((a, ai) => a.items.map((it, ii) => ({ a: ai, i: ii })));
    quiz = { queue: shuffle([...items.map(x => ({ ...x, type: 'type' })), ...items.map(x => ({ ...x, type: 'pick' }))]), pos: 0, firstTry: 0 };
    $('#adj-intro').hidden = true; $('#adj-quiz').hidden = false; $('#adj-foot').hidden = false;
    askAdj();
  }
  function askAdj() {
    q = quiz.queue[quiz.pos]; answered = false;
    const pair = data.adjectives[q.a], it = pair.items[q.i];
    $('#adj-progress').textContent = `${quiz.pos + 1}/${quiz.queue.length}`;
    $('#adj-result').hidden = true;
    $('#adj-go').textContent = 'Prüfen';
    if (q.type === 'type') {
      $('#adj-ask').textContent = 'Wie sagt man auf Französisch?';
      $('#adj-prompt').textContent = it.de;
      $('#adj-form').hidden = false; $('#adj-choices').hidden = true;
      $('#adj-input').value = ''; $('#adj-input').readOnly = false;
      $('#adj-go').hidden = false;
      $('#adj-input').focus();
    } else {
      $('#adj-ask').textContent = 'Was bedeutet das?';
      $('#adj-prompt').textContent = it.fr;
      $('#adj-form').hidden = true; $('#adj-choices').hidden = false;
      $('#adj-go').hidden = true;
      $('#adj-choices').innerHTML = shuffle(pair.items.map((x, k) => ({ x, k }))).map(({ x, k }, n) =>
        `<button class="adj-choice" data-k="${k}"><span class="key">${n + 1}</span>${x.de}</button>`).join('');
      for (const b of $('#adj-choices').querySelectorAll('button')) b.onclick = () => answerAdj(Number(b.dataset.k) === q.i, b);
    }
  }
  function answerAdj(right, chosen) {
    if (answered) return;
    answered = true;
    const pair = data.adjectives[q.a], it = pair.items[q.i];
    if (right && !q.retry) quiz.firstTry++;
    if (!right) quiz.queue.push({ ...q, retry: true });   // comes back at the end
    $('#adj-result').hidden = false;
    $('#adj-result').dataset.result = right ? 'right' : 'wrong';
    $('#adj-verdict').textContent = right ? 'Richtig' : 'Nicht ganz';
    $('#adj-answer').textContent = q.type === 'type' ? it.fr : `${it.fr} = ${it.de}`;
    $('#adj-rule').innerHTML = `<b>${pair.adj}</b> vor dem Nomen: ${pair.before} · nach dem Nomen: ${pair.after}`;
    if (chosen) for (const b of $('#adj-choices').querySelectorAll('button')) {
      b.disabled = true;
      if (Number(b.dataset.k) === q.i) b.classList.add('is-right'); else if (b === chosen) b.classList.add('is-wrong');
    }
    $('#adj-go').hidden = false;
    $('#adj-go').textContent = 'Weiter';
  }
  function adjGo() {
    if (!quiz) return;
    if (!answered) {
      if (q.type !== 'type') return;
      const it = data.adjectives[q.a].items[q.i];
      $('#adj-input').readOnly = true; $('#adj-input').blur();
      return answerAdj(check(`<b>${it.fr}</b>`, $('#adj-input').value).result === 'right');
    }
    quiz.pos++;
    if (quiz.pos < quiz.queue.length) return askAdj();
    // done: the score counts only answers right on the first try
    const a = A();
    a.last = quiz.firstTry; a.best = Math.max(a.best || 0, quiz.firstTry); a.runs = (a.runs || 0) + 1; a.m = Date.now();
    save();
    quiz = null;
    openAdj();
    $('#adj-best').textContent = `${a.last} von 24 beim ersten Versuch richtig · Bestwert ${a.best} von 24`;
  }

  // ---------- wiring ----------
  $('#open-verbs').onclick = () => data && openVerbs();
  $('#open-adj').onclick = () => data && openAdj();
  $('#verb-first').onclick = startFirst;
  $('#verb-practice').onclick = startPractice;
  $('#verb-test').onclick = startTest;
  $('#conj-back').onclick = openVerbs;
  for (const b of document.querySelectorAll('[data-to-verbs]')) b.onclick = openVerbs;
  $('#conj-go').onclick = () => (checked ? nextVerb() : checkVerb());
  $('#conj-form').onsubmit = e => e.preventDefault();
  $('#conj-form').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || checked) return;
    e.preventDefault();
    const inputs = [...$('#conj-form').querySelectorAll('input')];
    const at = inputs.indexOf(e.target);
    if (at >= 0 && at < inputs.length - 1) inputs[at + 1].focus(); else checkVerb();
  });
  $('#adj-start').onclick = startAdj;
  $('#adj-go').onclick = adjGo;
  $('#adj-form').onsubmit = e => { e.preventDefault(); adjGo(); };
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const inField = e.target.matches?.('input');
    if (!$('#conj').hidden && checked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nextVerb(); }
    else if (!$('#adj').hidden && quiz) {
      if (answered && (e.key === 'Enter' || e.key === ' ') && !inField) { e.preventDefault(); adjGo(); }
      else if (!answered && q?.type === 'pick' && ['1', '2'].includes(e.key)) $('#adj-choices').querySelectorAll('button')[Number(e.key) - 1]?.click();
    }
  });

  return {
    setData(d) { data = d && d.verbs ? d : null; $('#grammar-rows').hidden = !data; },
    renderHome() {
      if (!data) return;
      const c = verbCounts(), a = A();
      $('#verb-counts').innerHTML = `<span>${c.kann}<small>kann ich</small></span><span>${c.lernen}<small>lernen</small></span><span>${c.offen}<small>offen</small></span>`;
      $('#adj-counts').innerHTML = a.runs ? `<span>${a.best}/24<small>Bestwert</small></span>` : '';
    },
    refresh() { if (!$('#verbs').hidden) openVerbs(); },
  };
}
