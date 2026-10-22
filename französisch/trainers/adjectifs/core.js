// Pure learning logic shared by the browser and tests.
const AdjectiveStudy = (() => {
  const labels = { ms: 'Maskulin Singular', fs: 'Feminin Singular', mp: 'Maskulin Plural', fp: 'Feminin Plural' };
  const freshTrack = () => ({ known: {}, runs: {}, firstDone: false, tests: [] });
  const freshState = () => ({ mode: 'fr', base: 'mixed', tracks: { fr: freshTrack(), de: freshTrack() } });
  const normalize = value => value.normalize('NFC').toLocaleLowerCase('de').trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const german = value => normalize(value).replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/-$/, '');
  function fields(adj, mode, base) {
    const result = Object.entries(labels).filter(([key]) => mode === 'de' || key !== base)
      .map(([key, label]) => ({ key, label, answers: adj.forms[key], lang: 'fr' }));
    if (adj.beforeVowel) result.push({ key: 'vowel', label: 'Maskulin vor Vokal / stummem h', answers: [adj.beforeVowel], lang: 'fr' });
    if (mode === 'fr') result.push({ key: 'de', label: 'Auf Deutsch', answers: adj.de, lang: 'de' });
    return result;
  }
  function check(field, value) {
    if (field.lang === 'de') {
      const parts = value.split(/[,;/]+/).map(german);
      const accepted = field.answers.map(german);
      return parts.every(part => part && accepted.includes(part));
    }
    return field.answers.map(normalize).includes(normalize(value));
  }
  function shuffled(ids, random = Math.random) {
    const a = [...ids];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function start(state, kind, adjectives, random = Math.random) {
    const track = state.tracks[state.mode];
    const previous = track.runs[kind];
    if (previous && previous.i < previous.ids.length) return previous;
    let ids = adjectives.map(adj => adj.id);
    if (kind === 'first') { track.known = {}; track.firstDone = false; delete track.runs.practice; }
    if (kind === 'practice') ids = ids.filter(id => track.known[id] && !track.known[id].k);
    if (kind !== 'first') ids = shuffled(ids, random);
    if (!ids.length) return null;
    const run = { kind, mode: state.mode, base: state.base, ids, i: 0, total: ids.length, correct: 0, wrong: [], complete: false };
    track.runs[kind] = run;
    return run;
  }
  function baseFor(run, adj) {
    return run.base === 'mixed' ? (adj.n % 2 ? 'ms' : 'fs') : run.base;
  }
  function record(state, run, perfect, now = Date.now()) {
    if (run.complete || run.i >= run.ids.length) throw new Error('Run is already complete');
    const track = state.tracks[run.mode], id = run.ids[run.i];
    if (perfect) run.correct++;
    else if (!run.wrong.includes(id)) run.wrong.push(id);
    if (run.kind === 'first') track.known[id] = { k: perfect, streak: 0 };
    else if (run.kind === 'practice') {
      const entry = track.known[id] ||= { k: false, streak: 0 };
      entry.streak = perfect ? entry.streak + 1 : 0;
      entry.k = entry.streak >= 2;
      if (!entry.k) run.ids.splice(Math.min(run.ids.length, run.i + (perfect ? 5 : 4)), 0, id);
    } else if (!perfect) {
      track.known[id] = { k: false, streak: 0 };
      const practice = track.runs.practice;
      if (practice && !practice.complete && !practice.ids.slice(practice.i).includes(id)) practice.ids.push(id);
    }
    run.i++;
    if (run.i >= run.ids.length) {
      run.complete = true;
      if (run.kind === 'first') track.firstDone = true;
      if (run.kind === 'test') track.tests = [...track.tests, { at: now, score: run.correct, total: run.total }].slice(-10);
    }
    return run.complete;
  }
  function counts(track, adjectives) {
    const result = { known: 0, learning: 0, unseen: 0 };
    for (const adj of adjectives) {
      const entry = track.known[adj.id];
      if (!entry) result.unseen++;
      else if (entry.k) result.known++;
      else result.learning++;
    }
    return result;
  }
  return { labels, freshState, fields, check, start, baseFor, record, counts };
})();
if (typeof module !== 'undefined') module.exports = AdjectiveStudy;
