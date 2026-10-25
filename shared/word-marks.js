function createWordMarks(storageKey, onChange) {
  let marks = {}, readable = true;
  const error = () => {
    const status = document.querySelector('#storage-status');
    if (status) { status.textContent = 'Markierungen konnten nicht gespeichert oder geladen werden. Bitte lasse diese Seite offen.'; status.dataset.error = 'true'; }
  };
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid marks');
      marks = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value === true));
    }
  } catch { readable = false; error(); }
  const has = id => Object.hasOwn(marks, id) && marks[id] === true;
  function toggle(id) {
    if (has(id)) delete marks[id]; else Object.defineProperty(marks, id, { value: true, configurable: true, enumerable: true });
    if (readable) {
      try { localStorage.setItem(storageKey, JSON.stringify(marks)); }
      catch { error(); }
    }
    onChange();
  }
  function render(button, id) {
    button.setAttribute('aria-pressed', String(has(id)));
    button.textContent = has(id) ? '★ Markiert' : '☆ Markieren';
    button.onclick = () => toggle(id);
  }
  return { has, toggle, render };
}
