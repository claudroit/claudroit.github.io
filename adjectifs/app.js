const $ = selector => document.querySelector(selector);
const S = AdjectiveStudy;
const STORAGE_KEY = 'karteikarten-adjectifs-v1';
let state = S.freshState(), readable = true;
const byId = new Map(ADJECTIVES.map(adj => [adj.id, adj]));
const marks = createWordMarks('adjectifs-word-marks-v1', () => {
  if (current) marks.render($('#mark-current'), current.id);
  library();
});
const esc = text => String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
function storageError(message) {
  $('#storage-status').textContent = message;
  $('#storage-status').dataset.error = 'true';
}
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!['fr','de'].includes(parsed.mode) || !['mixed','ms','fs'].includes(parsed.base)) throw new Error('Invalid preferences');
    for (const mode of ['fr','de']) {
      const track = parsed.tracks?.[mode];
      if (!track || !track.known || !track.runs || !Array.isArray(track.tests)) throw new Error('Invalid progress');
      for (const run of Object.values(track.runs)) {
        if (!run || !Array.isArray(run.ids) || !Number.isInteger(run.i) || run.i < 0 || run.i > run.ids.length) throw new Error('Invalid run');
        // Preserve answers if the earlier 62-word upload was already used.
        const removed = new Set('régulier masculin féminin particulier certain différent autre singulier pluriel comparatif superlatif'.split(' '));
        if (!run.ids.every(id => byId.has(id) || removed.has(id))) throw new Error('Unknown adjective');
        if (run.ids.some(id => removed.has(id))) {
          run.i = run.ids.slice(0, run.i).filter(id => byId.has(id)).length;
          run.ids = run.ids.filter(id => byId.has(id));
          run.wrong = run.wrong.filter(id => byId.has(id));
          if (run.kind !== 'practice') { run.total = run.ids.length; run.correct = run.i - run.wrong.length; }
          run.complete = run.i >= run.ids.length;
          if (run.kind === 'first') track.firstDone = run.complete;
        }
      }
    }
    state = parsed;
  }
} catch {
  readable = false;
  storageError('Fortschritt konnte nicht geladen werden. Neue Antworten bleiben nur bis zum Schließen dieser Seite erhalten.');
}
function save() {
  if (!readable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('#storage-status').textContent = 'Fortschritt wird nur in diesem Browser gespeichert.';
    $('#storage-status').dataset.error = 'false';
  } catch { storageError('Speichern nicht möglich. Neue Antworten bleiben nur bis zum Schließen dieser Seite erhalten.'); }
}
function show(id) {
  for (const screen of document.querySelectorAll('.screen')) screen.hidden = screen.id !== id;
  window.scrollTo(0, 0);
}
function library() {
  const query = $('#library-search').value.trim().toLocaleLowerCase('de');
  const track = state.tracks[state.mode];
  const list = ADJECTIVES.filter(adj => (!$('#marked-only').checked || marks.has(adj.id)) && [adj.id, ...Object.values(adj.forms).flat(), ...adj.de, adj.beforeVowel || ''].some(text => text.toLocaleLowerCase('de').includes(query)));
  $('#library').innerHTML = list.length ? list.map(adj => {
    const status = track.known[adj.id];
    const cls = status?.k ? 'kann' : status ? 'lernen' : '';
    return `<details class="library-entry ${cls}"><summary><strong lang="fr">${esc(adj.id)}</strong><span>${esc(adj.dePrompt)}</span></summary><dl>${Object.entries(S.labels).map(([key,label]) => `<dt>${label}</dt><dd lang="fr">${esc(adj.forms[key].join(' / '))}</dd>`).join('')}${adj.beforeVowel ? `<dt>Maskulin vor Vokal / stummem h</dt><dd lang="fr">${adj.beforeVowel}</dd>` : ''}</dl><p>${esc(adj.group)}${adj.note ? ' · '+esc(adj.note) : ''}</p></details>`;
  }).join('') : '<p class="quiet">Keine Adjektive gefunden.</p>';
  for (const [index, entry] of [...$('#library').querySelectorAll('.library-entry')].entries()) {
    const button = document.createElement('button'); button.className = 'word-mark'; button.type = 'button';
    marks.render(button, list[index].id); entry.append(button);
  }
}
function home() {
  const track = state.tracks[state.mode], c = S.counts(track, ADJECTIVES);
  $('#deck-description').textContent = `${ADJECTIVES.length} Adjektive · Formen und Bedeutung`;
  for (const button of document.querySelectorAll('#mode button')) button.setAttribute('aria-pressed', button.dataset.mode === state.mode);
  $('#mode-description').textContent = state.mode === 'fr'
    ? 'Du siehst eine französische Singularform. Ergänze die drei anderen Formen und eine passende deutsche Bedeutung.'
    : 'Du siehst die deutsche Bedeutung. Schreibe alle vier französischen Formen.';
  $('#base-setting').hidden = state.mode !== 'fr';
  $('#base').value = state.base;
  $('#summary').innerHTML = `<span><b>${c.known}</b>kann ich</span><span><b>${c.learning}</b>lernen</span><span><b>${c.unseen}</b>noch offen</span>`;
  $('#first-description').textContent = `Alle ${ADJECTIVES.length} Adjektive einmal. Nur vollständig richtige Antworten zählen als „Kann ich“.`;
  const first = track.runs.first;
  $('#first').textContent = first && !first.complete ? `Weiter (${first.i}/${first.total})` : track.firstDone ? 'Nochmal von vorn' : 'Starten';
  $('#first').classList.toggle('primary', !track.firstDone);
  $('#practice').disabled = !c.learning;
  $('#practice').textContent = c.learning ? `${c.learning} üben` : 'Nichts zu üben';
  $('#practice').classList.toggle('primary', track.firstDone && c.learning > 0);
  const test = track.runs.test;
  $('#test').textContent = test && !test.complete ? `Weiter (${test.i}/${test.total})` : 'Test starten';
  $('#test').classList.toggle('primary', track.firstDone && !c.learning);
  const fmt = new Intl.DateTimeFormat('de-CH', { day:'numeric',month:'numeric' });
  $('#tests').textContent = track.tests.length ? 'Bisher: '+track.tests.slice(-4).map(test => `${test.score}/${test.total} (${fmt.format(test.at)})`).join(' · ') : '';
  $('#library-title').textContent = `Alle ${ADJECTIVES.length} Adjektive & Formen`;
  library(); show('home');
}
let run = null, current = null, answerFields = [], checked = false, lastField = null;
function start(kind) {
  run = S.start(state, kind, ADJECTIVES);
  if (!run) return home();
  save(); ask();
}
function ask() {
  if (run.complete) return finish();
  current = byId.get(run.ids[run.i]);
  marks.render($('#mark-current'), current.id);
  checked = false;
  const base = S.baseFor(run, current);
  answerFields = S.fields(current, run.mode, base);
  $('#run-kind').textContent = {first:'Erster Durchgang',practice:'Üben',test:'Abschlusstest'}[run.kind];
  $('#progress').textContent = run.kind === 'practice' ? `noch ${run.ids.length-run.i}` : `${run.i+1}/${run.total}`;
  $('#prompt-meta').textContent = run.mode === 'fr' ? `Gegeben: ${S.labels[base]}` : 'Deutsch → Französisch';
  $('#prompt').textContent = run.mode === 'fr' ? current.forms[base][0] : current.dePrompt;
  $('#prompt').lang = run.mode === 'fr' ? 'fr' : 'de';
  $('#hint').textContent = run.mode === 'fr' ? 'Ergänze die fehlenden Formen und eine deutsche Bedeutung.' : 'Ergänze Maskulin und Feminin, jeweils Singular und Plural.';
  $('#answer-form').innerHTML = answerFields.map(field => `<div class="form-row" data-field="${field.key}"><label for="answer-${field.key}">${field.label}</label><input id="answer-${field.key}" class="fr-input conj-input" data-key="${field.key}" lang="${field.lang}" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="next"><span class="conj-fix" aria-live="polite"></span></div>`).join('');
  $('#verdict').textContent = ''; $('#verdict').dataset.result = '';
  $('#answer-note').hidden = true; $('#answer-note').textContent = '';
  $('#go').textContent = 'Prüfen';
  show('study');
  const inputs = [...$('#answer-form').querySelectorAll('input')];
  inputs.at(-1).enterKeyHint = 'go'; inputs[0].focus();
}
function checkAnswers() {
  if (checked || !run) return;
  checked = true;
  let right = 0;
  for (const field of answerFields) {
    const input = $(`#answer-${field.key}`), row = input.closest('.form-row');
    const valid = S.check(field, input.value);
    right += Number(valid);
    row.dataset.result = valid ? 'right' : 'wrong'; input.readOnly = true;
    row.querySelector('.conj-fix').textContent = valid ? '✓' : field.answers.join(' / ');
  }
  const perfect = right === answerFields.length;
  $('#verdict').dataset.result = perfect ? 'right' : 'wrong';
  $('#verdict').textContent = perfect ? 'Perfekt' : `${right} von ${answerFields.length} richtig`;
  $('#answer-note').textContent = [current.note, `Deutsch: ${current.de.join(' / ')}`].filter(Boolean).join(' ');
  $('#answer-note').hidden = false;
  $('#go').textContent = 'Weiter';
  document.activeElement?.blur?.();
  S.record(state, run, perfect); save();
}
function finish() {
  const c = S.counts(state.tracks[run.mode], ADJECTIVES);
  $('#done-list').innerHTML = '';
  if (run.kind === 'test') {
    $('#done-title').textContent = `${run.correct} von ${run.total} perfekt`;
    $('#done-text').textContent = run.wrong.length ? 'Diese Adjektive kommen zurück zu „Lernen“:' : 'Alle Adjektive fehlerfrei.';
    $('#done-list').innerHTML = run.wrong.map(id => `<span class="chip">${esc(id)}</span>`).join('');
  } else {
    $('#done-title').textContent = run.kind === 'first' ? 'Erster Durchgang fertig' : 'Alle Adjektive gelernt';
    $('#done-text').textContent = `${c.known} kannst du schon, ${c.learning} übst du weiter.`;
  }
  const next = $('#done-next');
  next.textContent = c.learning ? `${c.learning} Adjektive üben` : run.kind === 'test' ? 'Zu den Adjektiven' : 'Abschlusstest starten';
  next.onclick = c.learning ? () => start('practice') : run.kind === 'test' ? home : () => start('test');
  show('done');
}
for (const button of document.querySelectorAll('#mode button')) button.onclick = () => { state.mode = button.dataset.mode; save(); home(); };
$('#base').onchange = event => { state.base = event.target.value; save(); };
$('#first').onclick = () => start('first');
$('#practice').onclick = () => start('practice');
$('#test').onclick = () => start('test');
$('#back').onclick = home; $('#done-back').onclick = home;
$('#go').onclick = () => checked ? ask() : checkAnswers();
$('#answer-form').onsubmit = event => event.preventDefault();
$('#answer-form').addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault(); event.stopPropagation();
  if (checked) return ask();
  const inputs = [...$('#answer-form').querySelectorAll('input')];
  const index = inputs.indexOf(event.target);
  if (index >= 0 && index < inputs.length-1) inputs[index+1].focus(); else checkAnswers();
});
addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.closest?.('button')) return;
  if (!$('#study').hidden && checked && ['Enter',' '].includes(event.key)) { event.preventDefault(); ask(); }
});
$('#library-search').oninput = library;
$('#marked-only').onchange = library;
addEventListener('focusin', event => { if (event.target.matches?.('.fr-input')) lastField = event.target; });
for (const button of document.querySelectorAll('.accents button')) {
  button.onpointerdown = event => event.preventDefault();
  button.onclick = () => {
    const input = lastField;
    if (!input || input.readOnly || !input.isConnected) return;
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    input.value = input.value.slice(0,a) + button.textContent + input.value.slice(b);
    input.focus(); input.setSelectionRange(a+button.textContent.length,a+button.textContent.length);
  };
}
home();
