// Präpositionen: the verbs of Kapitel 3.2–3.5 with à or de, one card per gap ("mentir ___ qn" → à),
// plus verbs that take no preposition in French although German uses a dative ("aider ___ qn" → –).
// Cards are built from words-data.js; ids come from the word's id and the gap number (prep-f40-0).
const PREP_SKIP = ['un coup de foudre', "le chagrin d'amour"];   // nouns, not verbs
// no preposition: the traps (written exactly as in words-data.js)
const PREP_NONE = [
  'aborder qn', 'rencontrer qn', 'épouser qn', 'quitter qn', 'tromper qn', 'décevoir qn',
  'aider qn', 'protéger qn', 'défendre qn', 'consoler qn', 'énerver qn', 'embêter qn', 'déranger qn',
  'menacer qn', 'critiquer qn', 'insulter qn', 'punir qn', 'blesser qn',
];
const GAP = '___';

const PREPS = (() => {
  const words = typeof WORDS !== 'undefined' ? WORDS : require('./words-data.js');
  const label = fr => fr.replace(/\s*\((?:m|f|mf|pl|mpl|fpl)\)/g, '').trim();
  const out = [];
  for (const w of words) {
    if (PREP_SKIP.includes(w.fr)) continue;
    // the forms to cut gaps into: "(de qn)" counts as written out, "x/y" forms come from `also`
    const forms = (w.also || [label(w.fr)]).map(f => f.replace(/\((à|de) ([^)]*)\)/g, '$1 $2'));
    let k = 0;
    for (const form of forms) {
      const re = /(^|\s)(à|de)(?=\s|$)|(^|\s)(d')(?=\p{L})/gu;
      for (const m of form.matchAll(re)) {
        const lead = m[1] ?? m[3] ?? '', prep = m[2] || m[4];
        const at = m.index + lead.length;
        const gapped = form.slice(0, at) + GAP + (prep === "d'" ? ' ' : '') + form.slice(at + prep.length);
        out.push({ id: `prep-${w.id}-${k++}`, word: w, gapped, full: form, answer: prep === "d'" ? 'de' : prep, prep });
      }
    }
  }
  for (const fr of PREP_NONE) {
    const w = words.find(x => x.fr === fr);
    if (!w) throw new Error('prep-data.js: not in the word list: ' + fr);
    out.push({ id: `prep-${w.id}-0`, word: w, gapped: fr.replace(/ qn\b/, ` ${GAP} qn`), full: fr, answer: '–', prep: '' });
  }
  return out.sort((a, b) => a.word.n - b.word.n || a.id.localeCompare(b.id))
    .map((p, i) => ({ ...p, n: i + 1, choice: true, group: p.word.group, section: p.word.section, de: p.word.de, fr: p.word.fr }));
})();
if (typeof module !== 'undefined') module.exports = PREPS;
