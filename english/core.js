const EnglishStudy = (() => {
  const aliases = {
    'uni (inf, short for university)': ['uni', 'university'],
    'to occur (syn to happen)': ['to occur', 'to happen'],
    'artificial intelligence (AI)': ['artificial intelligence', 'AI'],
    'repetitive (also monotonous)': ['repetitive', 'monotonous'],
    'to be affected (by sth)': ['to be affected', 'to be affected by sth'],
    'CEO (Chief Executive Officer)': ['CEO', 'Chief Executive Officer'],
    'CV (Curriculum Vitae) (BE)': ['CV', 'Curriculum Vitae', 'resumé', 'résumé', 'resume'],
    'resumé (AE)': ['resumé', 'résumé', 'resume', 'CV', 'Curriculum Vitae'],
    '(work) placement': ['placement', 'work placement'],
    'job advert (advertisement)': ['job advert', 'job advertisement'],
    'to (neatly) fit into sth': ['to fit into sth', 'to neatly fit into sth'],
    'ze/zie, xe/xem': ['ze', 'zie', 'xe', 'xem', 'ze/zie', 'xe/xem', 'ze/zie, xe/xem'],
    'to assemble (a team)': ['to assemble', 'to assemble a team'],
    'gut(s)': ['gut', 'guts'],
    'self-centred = egocentric': ['self-centred', 'self-centered', 'egocentric'],
    'in a good/bad temper': ['in a good temper', 'in a bad temper', 'in a good/bad temper']
  };
  const normalize = value => String(value).normalize('NFC').toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[–—-]/g, ' ').replace(/[“”"]/g, '')
    .replace(/\b(?:somebody|someone)\b/g, 'sb').replace(/\bsomething\b/g, 'sth')
    .replace(/\b(?:sb|sth)\./g, match => match.slice(0, -1))
    .replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim().replace(/^to /, '').replace(/[.!?]+$/, '');
  function answers(word) {
    const base = Object.hasOwn(aliases, word.en) ? aliases[word.en] : word.en.replace(/\s*\((?:pl|usu\. pl|opp of [^)]+|BE|AE|pl \+ sing\/pl verb)\)/g, '').split('|').map(value => value.trim());
    return [...new Set(base.flatMap(answer => {
      if (answer.includes('sth/sb')) return [answer, answer.replace('sth/sb', 'sth'), answer.replace('sth/sb', 'sb')];
      if (answer.includes('sb/sth')) return [answer, answer.replace('sb/sth', 'sb'), answer.replace('sb/sth', 'sth')];
      return [answer];
    }))];
  }
  function check(word, value, words) {
    const submitted = normalize(value);
    return Boolean(submitted) && words.filter(candidate => candidate.id === word.id || candidate.de === word.de)
      .some(candidate => answers(candidate).some(answer => normalize(answer) === submitted));
  }
  function checkGerman(word, value) {
    const german = text => normalize(text).replace(/^hier:\s*/, '').replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
    const submitted = german(value);
    return Boolean(submitted) && [word.de, ...word.de.split(/[|;,]/)].some(answer => german(answer) === submitted);
  }
  const freshState = () => ({ version: 1, known: {}, runs: {}, firstDone: false, tests: [] });
  function start(state, kind, words, random = Math.random) {
    if (!['first', 'practice', 'test'].includes(kind)) throw new Error('Unknown run');
    const previous = state.runs[kind];
    if (previous && !previous.complete) return previous;
    let ids = words.map(word => word.id);
    if (kind === 'first') {
      state.known = {}; state.firstDone = false; state.runs = {};
    }
    if (kind === 'practice') ids = ids.filter(id => state.known[id] && !state.known[id].k);
    if (!ids.length) return null;
    if (kind !== 'first') {
      for (let index = ids.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [ids[index], ids[other]] = [ids[other], ids[index]];
      }
    }
    const run = { kind, ids, i: 0, total: ids.length, correct: 0, wrong: [], complete: false };
    state.runs[kind] = run;
    return run;
  }
  function record(state, run, right, now = Date.now()) {
    if (run.complete) throw new Error('Run is already complete');
    const id = run.ids[run.i];
    if (right) run.correct++;
    else if (!run.wrong.includes(id)) run.wrong.push(id);
    if (run.kind === 'first') state.known[id] = { k: right, streak: 0 };
    else if (run.kind === 'practice') {
      const entry = state.known[id] ||= { k: false, streak: 0 };
      entry.streak = right ? entry.streak + 1 : 0;
      entry.k = entry.streak >= 2;
      if (!entry.k) run.ids.splice(Math.min(run.ids.length, run.i + (right ? 5 : 4)), 0, id);
    } else if (!right) {
      state.known[id] = { k: false, streak: 0 };
    }
    if (!right && run.kind !== 'practice') {
      const practice = state.runs.practice;
      if (practice && !practice.complete && !practice.ids.slice(practice.i).includes(id)) practice.ids.push(id);
    }
    run.i++;
    run.complete = run.i >= run.ids.length;
    if (run.complete && run.kind === 'first') state.firstDone = true;
    if (run.complete && run.kind === 'test') state.tests = [...state.tests, { at: now, score: run.correct, total: run.total }].slice(-10);
  }
  function counts(state, words) {
    const result = { known: 0, learning: 0, unseen: 0 };
    for (const word of words) {
      const entry = state.known[word.id];
      result[!entry ? 'unseen' : entry.k ? 'known' : 'learning']++;
    }
    return result;
  }
  function restore(raw, words) {
    const state = JSON.parse(raw), ids = new Set(words.map(word => word.id));
    if (state?.version !== 1 || !state.known || !state.runs || !Array.isArray(state.tests) || typeof state.firstDone !== 'boolean') throw new Error('Invalid progress');
    for (const [id, entry] of Object.entries(state.known)) {
      if (!ids.has(id) || typeof entry?.k !== 'boolean' || !Number.isInteger(entry.streak) || entry.streak < 0) throw new Error('Invalid word progress');
    }
    for (const [kind, run] of Object.entries(state.runs)) {
      if (!['first', 'practice', 'test'].includes(kind) || run?.kind !== kind || !Array.isArray(run.ids) || !run.ids.length || !run.ids.every(id => ids.has(id)) || !Number.isInteger(run.i) || run.i < 0 || run.i > run.ids.length || run.complete !== (run.i === run.ids.length) || !Array.isArray(run.wrong) || !run.wrong.every(id => ids.has(id)) || !Number.isInteger(run.correct) || run.correct < 0 || run.correct > run.i || !Number.isInteger(run.total) || run.total < 1) throw new Error('Invalid run');
    }
    for (const test of state.tests) {
      if (!Number.isFinite(test.at) || !Number.isInteger(test.score) || !Number.isInteger(test.total) || test.total < 1 || test.score < 0 || test.score > test.total) throw new Error('Invalid test');
    }
    return state;
  }
  return { answers, normalize, check, checkGerman, freshState, start, record, counts, restore };
})();
if (typeof module !== 'undefined') module.exports = EnglishStudy;
