const EnglishSets = (() => {
  const key = 'english-sets-v2';
  const legacyKey = 'karteikarten-english-v1';
  const builtinId = 'excel-vocabulary';
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => crypto.randomUUID();
  function validWords(words) {
    if (!Array.isArray(words) || !words.length || words.length > 2000) throw new Error('Ein Set braucht 1–2000 vollständige Wortpaare.');
    const ids = new Set();
    return words.map(word => {
      if (!word || typeof word.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(word.id) || ['__proto__', 'constructor', 'prototype'].includes(word.id) || ids.has(word.id)) throw new Error('Ungültige oder doppelte Karten-ID.');
      ids.add(word.id);
      if (typeof word.en !== 'string' || typeof word.de !== 'string' || !word.en.trim() || !word.de.trim() || word.en.length > 2000 || word.de.length > 2000) throw new Error('Jede Karte braucht Deutsch und Englisch (je maximal 2000 Zeichen).');
      return { id: word.id, en: word.en.trim(), de: word.de.trim() };
    });
  }
  function create(title, words, description = '', setId = id()) {
    return { id: setId, title, description, words: validWords(words), progress: EnglishStudy.freshState(), free: EnglishStudy.freshState(), marks: {}, direction: 'de', flash: null, updated: Date.now() };
  }
  function validate(value) {
    if (!value || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 160 || typeof value.description !== 'string' || value.description.length > 3000) throw new Error('Titel oder Beschreibung ist ungültig.');
    const set = create(value.title.trim(), value.words, value.description);
    if (value.progress) set.progress = EnglishStudy.restore(JSON.stringify(value.progress), set.words);
    if (value.free) set.free = EnglishStudy.restore(JSON.stringify(value.free), set.words);
    if (value.marks && typeof value.marks === 'object') for (const word of set.words) if (value.marks[word.id] === true) set.marks[word.id] = true;
    set.direction = value.direction === 'mixed' ? 'mixed' : 'de';
    return set;
  }
  function load(storage, builtin) {
    const raw = storage.getItem(key);
    if (raw) {
      const app = JSON.parse(raw);
      if (app?.version !== 2 || !Array.isArray(app.sets)) throw new Error('Ungültiger Spielstand.');
      for (const set of app.sets) {
        validate(set);
        if (typeof set.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(set.id)) throw new Error('Ungültige Set-ID.');
      }
      if (new Set(app.sets.map(set => set.id)).size !== app.sets.length) throw new Error('Doppelte Set-ID.');
      return app;
    }
    const app = { version: 2, sets: [], active: null, draft: null };
    const legacy = storage.getItem(legacyKey);
    if (legacy) {
      const set = create('English vocabulary', builtin, 'Die 358 Vokabeln aus deiner Excel-Datei.', builtinId);
      set.progress = EnglishStudy.restore(legacy, builtin);
      app.sets.push(set); app.active = set.id;
    }
    return app;
  }
  function addBuiltin(app, storage, builtin) {
    let set = app.sets.find(set => set.id === builtinId);
    if (!set) {
      set = create('English vocabulary', builtin, 'Die 358 Vokabeln aus deiner Excel-Datei.', builtinId);
      const legacy = storage.getItem(legacyKey);
      if (legacy) set.progress = EnglishStudy.restore(legacy, builtin);
      app.sets.push(set);
    }
    app.active = set.id;
    return set;
  }
  function edit(set, draft) {
    const words = validWords(draft.words);
    const previous = new Map(set.words.map(word => [word.id, word]));
    const unchanged = new Set(words.filter(word => {
      const old = previous.get(word.id);
      return old && old.en === word.en && old.de === word.de;
    }).map(word => word.id));
    const changed = words.length !== set.words.length || unchanged.size !== words.length;
    if (changed) {
      for (const track of [set.progress, set.free]) {
        track.known = Object.fromEntries(Object.entries(track.known).filter(([wordId]) => unchanged.has(wordId)));
        track.runs = {}; track.firstDone = false;
      }
      set.flash = null; delete set.pending;
    }
    set.marks = Object.fromEntries(Object.entries(set.marks).filter(([wordId]) => words.some(word => word.id === wordId)));
    set.words = words; set.title = draft.title.trim(); set.description = draft.description.trim(); set.updated = Date.now();
    return set;
  }
  function parseDelimited(text, delimiter) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (char === '"') {
        if (quoted && text[index + 1] === '"') { cell += '"'; index++; }
        else if (!quoted && cell.length || quoted && text[index + 1] && ![delimiter, '\r', '\n'].includes(text[index + 1])) cell += char;
        else quoted = !quoted;
      } else if (!quoted && char === delimiter) { row.push(cell); cell = ''; }
      else if (!quoted && (char === '\n' || char === '\r')) {
        if (char === '\r' && text[index + 1] === '\n') index++;
        row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = '';
      } else cell += char;
    }
    if (quoted) throw new Error('Ein Anführungszeichen wurde nicht geschlossen.');
    row.push(cell); if (row.some(value => value.trim())) rows.push(row);
    return rows;
  }
  function importText(text, delimiter = '\t', order = 'de') {
    const rows = parseDelimited(text.replace(/^\uFEFF/, ''), delimiter);
    if (!rows.length) throw new Error('Keine Wortpaare gefunden.');
    const header = rows[0].map(value => value.trim().toLowerCase());
    const english = ['en', 'english', 'englisch'], german = ['de', 'german', 'deutsch'];
    if (english.includes(header[0]) && german.includes(header[1])) { order = 'en'; rows.shift(); }
    else if (german.includes(header[0]) && english.includes(header[1])) { order = 'de'; rows.shift(); }
    return validWords(rows.map((row, index) => {
      if (row.length !== 2) throw new Error(`Zeile ${index + 1}: Bitte genau zwei Spalten importieren.`);
      return { id: id(), de: row[order === 'de' ? 0 : 1], en: row[order === 'de' ? 1 : 0] };
    }));
  }
  function payload(set, progress = false) {
    const value = { version: 1, title: set.title, description: set.description, words: set.words };
    if (progress) Object.assign(value, { progress: set.progress, free: set.free, marks: set.marks, direction: set.direction });
    return value;
  }
  async function encode(set, progress = false) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload(set, progress)));
    const compressed = typeof CompressionStream !== 'undefined';
    const data = compressed ? new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()) : bytes;
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    const result = (compressed ? 'g.' : 'j.') + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (result.length > 180000) throw new Error('Dieses Set ist für einen Link zu groß. Teile es als JSON-Datei.');
    return result;
  }
  async function decode(encoded) {
    if (encoded.length > 180000 || !/^[gj]\.[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Ungültiger Freigabelink.');
    const bytes = Uint8Array.from(atob(encoded.slice(2).replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
    let text;
    if (encoded.startsWith('g.')) {
      const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
      const chunks = []; let size = 0;
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.length;
        if (size > 8000000) { await reader.cancel(); throw new Error('Das Set ist zu groß.'); }
        chunks.push(chunk.value);
      }
      text = await new Blob(chunks).text();
    } else text = new TextDecoder().decode(bytes);
    const value = JSON.parse(text);
    if (value.version !== 1) throw new Error('Unbekanntes Freigabeformat.');
    return validate(value);
  }
  return { key, legacyKey, builtinId, clone, id, create, validate, load, addBuiltin, edit, importText, payload, encode, decode };
})();
if (typeof module !== 'undefined') module.exports = EnglishSets;
