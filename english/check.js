// Checks a typed English answer against the book's word. The test allows no synonyms, so only the
// book's own wording counts. Lenient where the book's notation isn't part of the word:
//  - labels like (pl), (BE), (AE), (usu. pl), (inf, …), (opp of …), (syn …), (dealt, dealt) are left out
//  - other brackets are optional: "(work) placement", "to be affected (by sth)", "gut(s)"
//  - "(also …)", " / " and " = " give alternatives the book itself lists
//  - sth / sb / something / somebody / someone may be typed or left out; "your"/"their" for "one's"
//  - "&" or "and", any capitalisation, any apostrophe, accents or none
// Nearly right (suggests "Schwer"): only the infinitive "to" is missing, or only hyphens/spaces differ.

const LABEL = /^(pl\b|sing\b|be$|ae$|usu\b|inf\b|opp\b|syn\b|also\b|pl \+)|,/;

function normalizeEn(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()   // résumé = resume
    .replace(/[’‘`´]/g, "'").replace(/[“”„"]/g, '').replace(/[  ]/g, ' ')
    .replace(/…|\.{3}/g, ' ... ')
    .replace(/[–—]/g, '-')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\b(your|their)\b/g, "one's")
    .replace(/\b(sth|sb|something|somebody|someone)(\s*\/\s*(sth|sb|something|somebody|someone))*\b/g, ' ')
    .replace(/[.!?,;:]+$/, '')
    .replace(/\s+/g, ' ').trim();
}
const squash = s => s.replace(/[-\s]/g, '');

// the ways of writing one book entry that count as right
function candidatesEn(en) {
  const alts = [];
  let main = en.trim();
  main = main.replace(/\(also ([^)]*)\)/g, (_, x) => { alts.push(x); return ''; });
  main = main.replace(/\((?:syn|opp of) [^)]*\)/g, '');
  for (const part of main.split(/\s+\/\s+|\s+=\s+/)) alts.push(part);
  const out = new Set();
  for (const alt of alts) {
    // drop label brackets, keep the rest as optional pieces
    const clean = alt.replace(/\s*\(([^)]*)\)/g, (m, inner) => LABEL.test(inner.trim().toLowerCase()) ? '' : m);
    const opts = [...clean.matchAll(/\(([^)]*)\)/g)].map(m => m[0]);
    let forms = [clean];
    for (const o of opts) forms = forms.flatMap(f => [f.replace(o, ''), f.replace(o, o.slice(1, -1))]);
    // an abbreviation and its long form: "CEO (Chief Executive Officer)", "artificial intelligence (AI)"
    for (const o of opts) { const inner = o.slice(1, -1); if (inner.split(' ').length > 1 || /^[A-Z]{2,}$/.test(inner)) forms.push(inner); }
    // "in a good/bad temper" → each word on its own too
    forms = forms.flatMap(f => {
      let fs = [f];
      for (const tok of f.match(/[A-Za-z]+\/[A-Za-z]+/g) || []) fs = fs.flatMap(x => [x, ...tok.split('/').map(p => x.replace(tok, p))]);
      return fs;
    });
    for (const f of forms) { const n = normalizeEn(f); if (n) out.add(n); }
  }
  // the whole entry as printed, brackets and all
  out.add(normalizeEn(shownEn(en).replace(/[()]/g, '')));
  for (const part of shownEn(en).split(/\s+=\s+/)) out.add(normalizeEn(part.replace(/[()]/g, '')));
  return [...out].filter(Boolean);
}

// what to show as "the" answer: the entry without its labels
function shownEn(en) {
  return en.replace(/\s*\((?:pl|BE|AE|usu\. pl|inf[^)]*|pl \+[^)]*|opp of [^)]*|syn [^)]*)\)/g, '').trim();
}

function distanceEn(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

/**
 * note: the card's note; others: notes with the same German (their answers count too);
 * all: every English note, to say which card a wrong-but-real word belongs to.
 */
function checkEn(note, typedRaw, others = [], all = []) {
  const typed = normalizeEn(typedRaw.replace(/\s*\((?:pl|BE|AE)\)/gi, '').replace(/[()]/g, ''));
  const cands = [...new Set([note, ...others].flatMap(n => candidatesEn(n.en)))];
  if (!typed) return { result: 'empty', closest: cands[0] };
  if (cands.includes(typed)) return { result: 'right', closest: typed };
  const noTo = s => s.replace(/^to /, '');
  const toHit = cands.find(c => c.startsWith('to ') && noTo(c) === typed);
  if (toHit) return { result: 'noTo', closest: toHit };
  const dashHit = cands.find(c => squash(c) === squash(typed));
  if (dashHit) return { result: 'dash', closest: dashHit };
  // a real word from the list, just not this card's
  const other = all.find(n => n !== note && !others.includes(n) && candidatesEn(n.en).some(c => c === typed || noTo(c) === noTo(typed)));
  const closest = cands.reduce((best, c) => (distanceEn(typed, c) < distanceEn(typed, best) ? c : best), cands[0]);
  const close = distanceEn(typed, closest) <= Math.max(2, Math.ceil(closest.length * 0.4));
  return { result: 'wrong', closest, other, close };
}

// letter-by-letter comparison (from Karteikarten): which typed letters are wrong, which book letters are missing
function letterDiffEn(typed, answer) {
  const a = [...typed], b = [...answer];
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const ta = [], tb = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { ta.push({ c: a[i++], ok: true }); tb.push({ c: b[j++], ok: true }); }
    else if (j < b.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) tb.push({ c: b[j++], ok: false });
    else ta.push({ c: a[i++], ok: false });
  }
  return { typed: ta, answer: tb };
}
