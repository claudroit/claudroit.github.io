const $ = selector => document.querySelector(selector);
const study = EnglishStudy, sets = EnglishSets;
const esc = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let app = { version: 2, sets: [], active: null, draft: null }, readable = true;
let run = null, kind = null, current = null, checked = false, direction = 'de', shared = null;
const active = () => app.sets.find(set => set.id === app.active);
const trackName = () => kind === 'free' ? 'free' : 'progress';
const runName = () => kind === 'free' ? 'practice' : kind;
const blankWord = () => ({ id: sets.id(), de: '', en: '' });
function storageError(message) {
  $('#storage-status').textContent = message;
  $('#storage-status').dataset.error = 'true';
}
try { app = sets.load(localStorage, VOCABULARY); }
catch { readable = false; storageError('Dein Speicher konnte nicht geladen werden. Er bleibt unverändert. Bitte sichere die Browserdaten, bevor du fortfährst.'); }
function save(value = app) {
  if (!readable) return false;
  try {
    localStorage.setItem(sets.key, JSON.stringify(value));
    $('#storage-status').textContent = 'Sets, Entwürfe und Fortschritt werden in diesem Browser gespeichert.';
    $('#storage-status').dataset.error = 'false';
    return true;
  } catch {
    storageError('Speichern fehlgeschlagen. Bitte lasse diese Seite offen und exportiere dein Set über „Teilen“.');
    return false;
  }
}
function show(id) {
  for (const screen of document.querySelectorAll('.screen')) screen.hidden = screen.id !== id;
  window.scrollTo(0, 0);
}
function overview() {
  $('#resume-draft').hidden = !app.draft;
  $('#sets-list').innerHTML = app.sets.length ? app.sets.map(set => {
    const counts = study.counts(set.progress, set.words);
    return `<button class="set-item" data-set="${esc(set.id)}"><div><strong>${esc(set.title)}</strong><span>${set.words.length} Wörter · ${counts.known} gelernt · ${Object.keys(set.marks).length} markiert</span></div><span aria-hidden="true">›</span></button>`;
  }).join('') : '<p class="empty-note">Dein erstes Set wartet auf dich. Beginne mit eigenen Wörtern oder den Excel-Vokabeln unten.</p>';
  show('sets');
}
function library() {
  const set = active(); if (!set) return;
  const query = $('#library-search').value.trim().toLowerCase();
  const words = set.words.filter(word => `${word.en} ${word.de}`.toLowerCase().includes(query) && (!$('#library-marked').checked || set.marks[word.id]));
  $('#library').innerHTML = words.length ? words.map(word => {
    const entry = set.progress.known[word.id], marked = Boolean(set.marks[word.id]);
    return `<div class="library-entry ${entry?.k ? 'kann' : entry ? 'lernen' : ''}"><span>${esc(word.de)}</span><strong lang="en">${esc(word.en)}</strong><button class="mark" data-word="${esc(word.id)}" aria-label="${marked ? 'Markierung entfernen' : 'Wort markieren'}: ${esc(word.en)}" aria-pressed="${marked}">${marked ? '★' : '☆'}</button></div>`;
  }).join('') : '<p class="quiet">Keine passenden Wörter.</p>';
}
function home() {
  const set = active(); if (!set) return overview();
  const counts = study.counts(set.progress, set.words);
  $('#set-title').textContent = set.title; $('#set-description').textContent = set.description;
  $('#deck-description').textContent = `${set.words.length} Wörter · ${Object.keys(set.marks).length} markiert`;
  $('#summary').innerHTML = `<span><b>${counts.known}</b>kann ich</span><span><b>${counts.learning}</b>lernen</span><span><b>${counts.unseen}</b>noch offen</span>`;
  for (const mode of ['first', 'test']) {
    const previous = set.progress.runs[mode];
    $(`#${mode}`).textContent = set.pending?.kind === mode ? 'Antwort ansehen / weiter' : previous && !previous.complete ? `Weiter (${previous.i}/${previous.total})` : mode === 'test' ? 'Test starten' : set.progress.firstDone ? 'Nochmal von vorn' : 'Starten';
  }
  $('#first').classList.toggle('primary', !set.progress.firstDone);
  $('#practice').disabled = !counts.learning && set.pending?.kind !== 'practice';
  $('#practice').textContent = set.pending?.kind === 'practice' ? 'Weiter' : counts.learning ? `${counts.learning} üben` : 'Nichts zu üben';
  const fmt = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'numeric' });
  $('#tests').textContent = set.progress.tests.length ? 'Bisher: ' + set.progress.tests.slice(-4).map(test => `${test.score}/${test.total} (${fmt.format(test.at)})`).join(' · ') : '';
  $('#library-title').textContent = `Alle ${set.words.length} Wörter`;
  const freeRun = set.free.runs.practice;
  $('#free-start').textContent = (freeRun && !freeRun.complete) || set.pending?.kind === 'free' ? 'Freies Üben fortsetzen' : 'Frei üben';
  $('#free-direction').value = set.direction;
  $('#free-note').textContent = freeRun && !freeRun.complete ? `Laufende Runde: ${freeRun.direction === 'mixed' ? 'gemischt' : 'DE → EN'}. Eine geänderte Richtung gilt ab der nächsten Runde.` : '';
  library(); show('home');
}
function marker(button, wordId) {
  const marked = Boolean(active().marks[wordId]);
  button.setAttribute('aria-pressed', String(marked)); button.textContent = marked ? '★ Markiert' : '☆ Markieren';
}
function toggleMark(wordId) {
  const set = active();
  if (set.marks[wordId]) delete set.marks[wordId]; else set.marks[wordId] = true;
  $('#deck-description').textContent = `${set.words.length} Wörter · ${Object.keys(set.marks).length} markiert`;
  save();
}
function shuffle(ids) {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
function start(mode) {
  const set = active(); kind = mode;
  if (set.pending?.kind === mode) {
    run = set[trackName()].runs[runName()];
    if (run && set.words.some(word => word.id === set.pending.wordId)) return showPending();
  }
  delete set.pending;
  if (mode === 'free') {
    const previous = set.free.runs.practice;
    if (!previous || previous.complete) {
      set.free = study.freshState();
      set.free.known = Object.fromEntries(set.words.map(word => [word.id, { k: false, streak: 0 }]));
      run = study.start(set.free, 'practice', set.words);
      run.direction = set.direction;
      const shuffledIds = shuffle(set.words.map(word => word.id));
      run.directions = Object.fromEntries(shuffledIds.map((wordId, index) => [wordId, set.direction === 'mixed' && index % 2 === 0 ? 'en' : 'de']));
    } else run = previous;
  } else run = study.start(set.progress, mode, set.words);
  if (!run) return home();
  save(); ask();
}
function paintQuestion() {
  $('#run-kind').textContent = { first: 'Erster Durchgang', practice: 'Üben', test: 'Abschlusstest', free: 'Frei üben' }[kind];
  $('#progress').textContent = ['practice', 'free'].includes(kind) ? `noch ${run.ids.length - run.i + Number(checked)}` : `${Math.min(run.i + Number(!checked), run.total)}/${run.total}`;
  $('#direction-label').textContent = direction === 'en' ? 'Englisch → Deutsch' : 'Deutsch → Englisch';
  $('#prompt').textContent = direction === 'en' ? current.en : current.de;
  $('#prompt').lang = direction === 'en' ? 'en' : 'de';
  $('#answer-label').textContent = direction === 'en' ? 'Auf Deutsch' : 'Auf Englisch';
  $('#answer').lang = direction === 'en' ? 'de' : 'en';
  marker($('#mark-word'), current.id);
  show('study');
}
function ask() {
  const set = active();
  delete set.pending; save();
  if (run.complete) return finish();
  current = set.words.find(word => word.id === run.ids[run.i]); checked = false;
  direction = kind === 'free' && run.directions?.[current.id] === 'en' ? 'en' : 'de';
  paintQuestion();
  $('#answer').value = set.answerDraft?.kind === kind && set.answerDraft?.id === current.id ? set.answerDraft.value : '';
  $('#answer').readOnly = false; $('#answer').dataset.result = '';
  $('#verdict').textContent = ''; $('#verdict').dataset.result = '';
  $('#correction').textContent = ''; $('#override').hidden = true; $('#go').textContent = 'Prüfen'; $('#answer').focus();
}
function showPending() {
  const pending = active().pending;
  current = active().words.find(word => word.id === pending.wordId); direction = pending.direction; checked = true;
  paintQuestion();
  $('#answer').value = pending.typed; $('#answer').readOnly = true;
  $('#answer').dataset.result = $('#verdict').dataset.result = pending.right ? 'right' : 'wrong';
  $('#verdict').textContent = pending.right ? pending.overridden ? 'Als richtig gewertet' : 'Richtig' : 'Noch nicht richtig';
  $('#correction').textContent = direction === 'en' ? current.de : current.en;
  $('#override').hidden = pending.right; $('#go').textContent = 'Weiter';
}
function check() {
  if (checked || !run) return;
  const set = active(), value = $('#answer').value;
  const right = direction === 'en' ? study.checkGerman(current, value) : study.check(current, value, set.words);
  set.pending = { kind, wordId: current.id, direction, typed: value, right, before: sets.clone(set[trackName()]) };
  study.record(set[trackName()], run, right); delete set.answerDraft; save(); showPending(); $('#go').focus();
}
function override() {
  const set = active(), pending = set.pending;
  if (!pending || pending.right || pending.kind !== kind) return;
  set[trackName()] = sets.clone(pending.before);
  run = set[trackName()].runs[runName()];
  study.record(set[trackName()], run, true);
  pending.right = true; pending.overridden = true; save(); showPending();
}
function finish() {
  const set = active(), counts = study.counts(set[trackName()], set.words);
  $('#done-title').textContent = kind === 'test' ? `${run.correct} von ${run.total} richtig` : kind === 'first' ? 'Erster Durchgang fertig' : kind === 'free' ? 'Freie Runde geschafft' : 'Alle Lernwörter geschafft';
  $('#done-text').textContent = kind === 'free' ? 'Jedes Wort zweimal hintereinander richtig. Dein Lernplan bleibt unverändert.' : kind === 'test' ? run.wrong.length ? 'Diese Wörter kommen zurück zu „Lernen“:' : 'Alle Wörter fehlerfrei.' : `${counts.known} kannst du schon, ${counts.learning} übst du weiter.`;
  $('#done-list').innerHTML = kind === 'test' ? run.wrong.map(wordId => `<span class="chip">${esc(set.words.find(word => word.id === wordId).en)}</span>`).join('') : '';
  $('#done-next').textContent = kind === 'free' || kind === 'test' ? 'Zur Übersicht' : counts.learning ? 'Weiter üben' : 'Abschlusstest starten';
  $('#done-next').onclick = kind === 'free' || kind === 'test' ? home : counts.learning ? () => start('practice') : () => start('test');
  show('done');
}
function editorRows() {
  $('#editor-rows').innerHTML = app.draft.words.map((word, index) => `<div class="editor-row" data-id="${esc(word.id)}"><span>${index + 1}</span><label>Deutsch<input data-field="de" value="${esc(word.de)}" maxlength="2000" autocomplete="off" placeholder="Begriff oder Bedeutung"></label><label>Englisch<input data-field="en" value="${esc(word.en)}" maxlength="2000" autocomplete="off" placeholder="Übersetzung"></label><button data-remove="${esc(word.id)}" aria-label="Karte ${index + 1} entfernen">×</button></div>`).join('');
}
function draftSave() {
  $('#draft-status').textContent = save() ? 'Gerade gespeichert' : 'Nicht gespeichert – bitte Seite offen lassen';
  $('#draft-status').dataset.error = $('#storage-status').dataset.error || 'false';
}
function openEditor(edit = false, resume = false) {
  if (!resume && app.draft) { show('editor'); $('#editor-message').textContent = 'Dein bisheriger Entwurf ist noch offen. Speichere ihn zuerst.'; return renderEditor(); }
  if (!resume) {
    const set = edit ? active() : null;
    app.draft = set ? { setId: set.id, title: set.title, description: set.description, words: sets.clone(set.words), importText: '' } : { setId: null, title: '', description: '', words: [blankWord(), blankWord()], importText: '' };
    draftSave();
  }
  $('#editor-message').textContent = ''; renderEditor();
}
function renderEditor() {
  const draft = app.draft;
  $('#editor-heading').textContent = draft.setId ? 'Lernset bearbeiten' : 'Neues Lernset';
  $('#draft-title').value = draft.title; $('#draft-description').value = draft.description;
  $('#import-text').value = draft.importText || '';
  $('#import-order').value = draft.importOrder || 'de'; $('#import-delimiter').value = draft.importDelimiter || 'tab';
  $('#import-panel').hidden = !draft.importOpen;
  editorRows(); show('editor');
}
function commitDraft(learn) {
  try {
    const draft = app.draft;
    if (!draft.title.trim()) throw new Error('Gib deinem Set einen Titel.');
    const words = draft.words.filter(word => word.en.trim() || word.de.trim());
    const checkedSet = sets.validate({ title: draft.title, description: draft.description, words });
    const next = sets.clone(app);
    let set = next.sets.find(set => set.id === draft.setId);
    if (set) sets.edit(set, { ...draft, words: checkedSet.words });
    else { set = checkedSet; next.sets.push(set); }
    next.active = set.id; next.draft = null;
    if (!save(next)) throw new Error('Speichern fehlgeschlagen. Dein Entwurf bleibt geöffnet.');
    app = next; learn ? home() : overview();
  } catch (error) { $('#editor-message').textContent = error.message; }
}
function importRows() {
  try {
    const delimiter = $('#import-delimiter').value === 'tab' ? '\t' : $('#import-delimiter').value;
    const words = sets.importText($('#import-text').value, delimiter, $('#import-order').value);
    const kept = app.draft.words.filter(word => word.en.trim() || word.de.trim());
    if (kept.length + words.length > 2000) throw new Error('Maximal 2000 Karten pro Set.');
    app.draft.words = [...kept, ...words]; app.draft.importText = ''; $('#import-text').value = '';
    draftSave(); editorRows(); $('#import-message').textContent = `${words.length} Wortpaare hinzugefügt.`;
  } catch (error) { $('#import-message').textContent = error.message; }
}
function flashStart() {
  const set = active(), markedOnly = $('#flash-marked').checked;
  const ids = set.words.filter(word => !markedOnly || set.marks[word.id]).map(word => word.id);
  if (!ids.length) { $('#flash-start').textContent = 'Erst Wörter markieren'; return; }
  const previous = set.flash;
  if (!previous || previous.markedOnly !== markedOnly || !previous.ids.every(wordId => ids.includes(wordId)) || previous.ids.length !== ids.length) set.flash = { ids, i: 0, back: false, markedOnly };
  save(); flashShow();
}
function flashShow() {
  const set = active(), flash = set.flash, word = set.words.find(word => word.id === flash.ids[flash.i]);
  $('#flash-progress').textContent = `${flash.i + 1}/${flash.ids.length}`;
  $('#flash-text').textContent = flash.back ? word.en : word.de;
  $('#flash-text').lang = flash.back ? 'en' : 'de'; $('#flash-side').textContent = flash.back ? 'Englisch' : 'Deutsch';
  $('#flash-prev').disabled = flash.i === 0; $('#flash-next').disabled = flash.i === flash.ids.length - 1;
  marker($('#flash-mark'), word.id); show('flash');
}
function shareDialog() {
  $('#share-progress').checked = false; $('#share-url').hidden = true; $('#copy-link').hidden = true; $('#share-status').textContent = '';
  $('#share-dialog').showModal();
}
function previewShared(set) {
  shared = set;
  $('#shared-title').textContent = set.title;
  const counts = study.counts(set.progress, set.words);
  $('#shared-info').textContent = `${set.words.length} Wörter${counts.known || counts.learning ? ` · Mit Lernfortschritt (${counts.known} gelernt)` : ''}`;
  if (!$('#import-dialog').open) $('#import-dialog').showModal();
}
async function route() {
  try {
    if (location.hash === '#add=excel-vocabulary') {
      sets.addBuiltin(app, localStorage, VOCABULARY); save(); home();
    } else if (location.hash.startsWith('#set=')) previewShared(await sets.decode(location.hash.slice(5)));
  } catch (error) { storageError(`Import nicht möglich: ${error.message}`); }
}
$('#sets-list').onclick = event => { const button = event.target.closest('[data-set]'); if (button) { app.active = button.dataset.set; save(); home(); } };
$('#all-sets').onclick = overview;
$('#new-set').onclick = () => openEditor(); $('#resume-draft').onclick = () => openEditor(false, true);
$('#edit-set').onclick = () => openEditor(true); $('#editor-back').onclick = overview;
$('#draft-title').oninput = event => { app.draft.title = event.target.value; draftSave(); };
$('#draft-description').oninput = event => { app.draft.description = event.target.value; draftSave(); };
$('#editor-rows').oninput = event => {
  const field = event.target.dataset.field; if (!['de', 'en'].includes(field)) return;
  const word = app.draft.words.find(word => word.id === event.target.closest('[data-id]').dataset.id);
  word[field] = event.target.value; draftSave();
};
$('#editor-rows').onclick = event => {
  const button = event.target.closest('[data-remove]'); if (!button) return;
  app.draft.words = app.draft.words.filter(word => word.id !== button.dataset.remove);
  if (!app.draft.words.length) app.draft.words.push(blankWord()); draftSave(); editorRows();
};
$('#add-row').onclick = () => {
  if (app.draft.words.length >= 2000) { $('#editor-message').textContent = 'Maximal 2000 Karten pro Set.'; return; }
  app.draft.words.push(blankWord()); draftSave(); editorRows(); $('#editor-rows').lastElementChild.querySelector('input').focus();
};
$('#save-set').onclick = () => commitDraft(false); $('#save-study').onclick = () => commitDraft(true);
$('#import-open').onclick = () => { app.draft.importOpen = !app.draft.importOpen; $('#import-panel').hidden = !app.draft.importOpen; draftSave(); };
$('#import-text').oninput = event => { app.draft.importText = event.target.value; draftSave(); };
for (const [selector, field] of [['#import-order', 'importOrder'], ['#import-delimiter', 'importDelimiter']]) $(selector).onchange = event => { app.draft[field] = event.target.value; draftSave(); };
$('#import-apply').onclick = importRows;
$('#import-file').onchange = async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 8000000) throw new Error('Datei zu groß (maximal 8 MB).');
    const text = await file.text();
    if (file.name.toLowerCase().endsWith('.json')) { previewShared(sets.validate(JSON.parse(text))); }
    else {
      $('#import-text').value = app.draft.importText = text;
      const delimiter = text.includes('\t') ? 'tab' : file.name.toLowerCase().endsWith('.csv') && text.split('\n')[0].includes(';') ? ';' : ',';
      $('#import-delimiter').value = app.draft.importDelimiter = delimiter; draftSave();
      $('#import-message').textContent = 'Vorschau geladen. Prüfe die Spaltenreihenfolge und füge die Wortpaare hinzu.';
    }
  } catch (error) { $('#import-message').textContent = error.message; }
  event.target.value = '';
};
for (const mode of ['first', 'practice', 'test']) $(`#${mode}`).onclick = () => start(mode);
$('#free-start').onclick = () => start('free');
$('#free-direction').onchange = event => { active().direction = event.target.value; save(); home(); };
$('#back').onclick = home; $('#done-back').onclick = home; $('#flash-back').onclick = home;
$('#go').onclick = () => checked ? ask() : check();
$('#answer-form').onsubmit = event => { event.preventDefault(); checked ? ask() : check(); };
$('#answer').oninput = event => { active().answerDraft = { kind, id: current.id, value: event.target.value }; save(); };
$('#override').onclick = override;
$('#mark-word').onclick = () => { toggleMark(current.id); marker($('#mark-word'), current.id); };
$('#library-search').oninput = library; $('#library-marked').onchange = library;
$('#library').onclick = event => { const button = event.target.closest('[data-word]'); if (button) { toggleMark(button.dataset.word); library(); } };
$('#flash-start').onclick = flashStart;
$('#flash-card').onclick = () => { active().flash.back = !active().flash.back; save(); flashShow(); };
$('#flash-prev').onclick = () => { active().flash.i--; active().flash.back = false; save(); flashShow(); };
$('#flash-next').onclick = () => { active().flash.i++; active().flash.back = false; save(); flashShow(); };
$('#flash-shuffle').onclick = () => { active().flash.ids = shuffle(active().flash.ids); active().flash.i = 0; active().flash.back = false; save(); flashShow(); };
$('#flash-mark').onclick = () => { toggleMark(active().flash.ids[active().flash.i]); flashShow(); };
$('#share-set').onclick = shareDialog;
$('#share-progress').onchange = () => { $('#share-url').hidden = true; $('#copy-link').hidden = true; $('#share-status').textContent = 'Erstelle den Link mit der neuen Auswahl erneut.'; };
$('#make-link').onclick = async () => {
  try {
    const payload = await sets.encode(active(), $('#share-progress').checked);
    $('#share-url').value = `https://claudroit.github.io/english/#set=${payload}`;
    $('#share-url').hidden = false; $('#copy-link').hidden = false;
    $('#share-status').textContent = 'Der Link enthält das Set. Teile den vollständigen Link.';
  } catch (error) { $('#share-status').textContent = error.message; }
};
$('#copy-link').onclick = async () => {
  try { await navigator.clipboard.writeText($('#share-url').value); $('#share-status').textContent = 'Link kopiert.'; }
  catch { $('#share-url').select(); $('#share-status').textContent = 'Bitte kopiere den markierten Link.'; }
};
$('#export-set').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(sets.payload(active(), $('#share-progress').checked), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'english-set.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('#shared-cancel').onclick = () => { $('#import-dialog').close(); shared = null; history.replaceState(null, '', location.pathname); };
$('#shared-save').onclick = () => {
  if (!shared) return;
  const next = sets.clone(app); next.sets.push(shared); next.active = shared.id;
  if (!save(next)) return;
  app = next; shared = null; $('#import-dialog').close(); history.replaceState(null, '', location.pathname); home();
};
addEventListener('hashchange', route);
addEventListener('storage', event => {
  if (event.key === sets.key) { readable = false; storageError('Ein anderer Tab hat deinen Speicher geändert. Lade diese Seite neu, bevor du weiterarbeitest.'); }
});
save();
if (app.draft) openEditor(false, true); else if (active()) home(); else overview();
route();
