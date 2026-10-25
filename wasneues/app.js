const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'suomen-sanat-v1';
let state = {};
let storageReadable = true;
function storageError(message) {
  $('#storage-status').textContent = message;
  $('#storage-status').dataset.error = 'true';
}
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid progress');
    state = parsed;
  }
} catch {
  storageReadable = false;
  storageError('Gespeicherter Fortschritt konnte nicht geladen werden. Neue Antworten bleiben nur bis zum Schließen dieser Seite erhalten.');
}
function save() {
  if (!storageReadable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('#storage-status').textContent = 'Fortschritt wird nur in diesem Browser gespeichert.';
    $('#storage-status').dataset.error = 'false';
  } catch {
    storageError('Speichern nicht möglich. Neue Antworten bleiben nur bis zum Schließen dieser Seite erhalten.');
  }
}
function show(id) {
  for (const screen of document.querySelectorAll('.screen')) screen.hidden = screen.id !== id;
  window.scrollTo(0, 0);
}
const trainer = initTrainer({ $, getState: () => state, save, show });
trainer.setData({ words: WORDS, cats: CATS, units: UNITS });
trainer.open();

let lastField = null;
addEventListener('focusin', e => { if (e.target.matches?.('.fr-input')) lastField = e.target; });
for (const b of document.querySelectorAll('.accents button')) {
  b.onpointerdown = e => e.preventDefault();
  b.onclick = () => {
    const input = lastField;
    if (!input || input.readOnly || !input.isConnected) return;
    const { selectionStart: a, selectionEnd: z, value } = input;
    input.value = value.slice(0, a ?? value.length) + b.textContent + value.slice(z ?? value.length);
    const pos = (a ?? value.length) + b.textContent.length;
    input.focus(); input.setSelectionRange(pos, pos);
  };
}
