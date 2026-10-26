const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'english-unit1-v1';
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
const trainer = initWords({ $, getState: () => state, save, show });
trainer.open();
window.en = { trainer, get state() { return state; } };   // for tests
