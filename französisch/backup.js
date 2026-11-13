// Fortschritt sichern: export the whole progress as a file or text, import it again (also on another device).
// Before an import the old progress is kept under its own key, so the last import can be undone.
(() => {
  const BACKUP_KEY = STORAGE_KEY + '-vor-import';
  const APP = 'franzoesisch-kap3';
  const status = (text, kind) => {
    const el = $('#backup-status');
    el.textContent = text;
    el.dataset.error = kind === 'error';
    el.dataset.ok = kind === 'ok';
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const exportText = () => JSON.stringify({ app: APP, version: 1, exported: new Date().toISOString(), state }, null, 1);
  const summary = st => {
    const all = st?.scopes?.all, s = all?.s || {};
    const kann = Object.values(s).filter(e => e?.k).length, lernen = Object.values(s).filter(e => e && !e.k).length;
    return `${kann} kann ich, ${lernen} üben`;
  };

  // a file or text from the export (or the bare progress object)
  function parse(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Das ist kein gültiger Fortschritt (kein JSON).'); }
    if (data && data.app === APP && data.state) data = data.state;
    else if (data && data.app && data.app !== APP) throw new Error('Diese Datei gehört zu einer anderen Seite.');
    if (!data || typeof data !== 'object' || Array.isArray(data) || (!data.scopes && !data.cards && !data.accepted)) {
      throw new Error('In diesem Text ist kein Fortschritt von dieser Seite.');
    }
    return data;
  }
  function replaceWith(next, label) {
    if (!confirm(`Fortschritt ersetzen?\n\nJetzt: ${summary(state)}\nImport: ${summary(next)}\n\nDein jetziger Fortschritt wird vorher gesichert und kann mit „Letzten Import rückgängig“ zurückgeholt werden.`)) return;
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(state)); } catch {}
    state = next;
    storageReadable = true;
    save();
    trainer.open();
    refreshUndo();
    status(`${label} importiert: ${summary(state)}.`, 'ok');
  }
  function refreshUndo() {
    let has = false;
    try { has = !!localStorage.getItem(BACKUP_KEY); } catch {}
    $('#backup-undo').hidden = !has;
  }

  $('#backup-export').onclick = () => {
    const blob = new Blob([exportText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `franzoesisch-fortschritt-${today()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    status(`Gespeichert als ${a.download} (${summary(state)}).`, 'ok');
  };
  $('#backup-import').onclick = () => $('#backup-file').click();
  $('#backup-file').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { replaceWith(parse(await file.text()), `„${file.name}“`); } catch (err) { status(err.message, 'error'); }
  };
  $('#backup-copy').onclick = async () => {
    const text = exportText();
    try { await navigator.clipboard.writeText(text); status(`Kopiert (${summary(state)}). Zum Beispiel in eine Notiz einfügen.`, 'ok'); }
    catch { prompt('Kopieren ging nicht automatisch. Bitte diesen Text kopieren:', text); }
  };
  $('#backup-paste').onclick = () => {
    const text = prompt('Exportierten Fortschritt hier einfügen:');
    if (!text) return;
    try { replaceWith(parse(text), 'Text'); } catch (err) { status(err.message, 'error'); }
  };
  $('#backup-undo').onclick = () => {
    let old;
    try { old = JSON.parse(localStorage.getItem(BACKUP_KEY)); } catch {}
    if (!old) return refreshUndo();
    if (!confirm(`Zurück zum Fortschritt vor dem letzten Import?\n\nJetzt: ${summary(state)}\nVorher: ${summary(old)}`)) return;
    state = old;
    save();
    try { localStorage.removeItem(BACKUP_KEY); } catch {}
    trainer.open();
    refreshUndo();
    status(`Zurückgeholt: ${summary(state)}.`, 'ok');
  };
  refreshUndo();
})();
