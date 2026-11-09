// Checks a typed French answer against the book's word. Only the book's own wording counts (no synonyms).
// Lenient where the book's notation isn't part of the word:
//  - labels (m), (f), (mf), (pl), (mpl), (fpl) and the plural after ";" (des messieurs, amicaux) are left out
//  - other brackets are optional: "se marier (avec qn)", "(être) enceinte", "traiter qn (comme …)"
//  - qn / qc may be typed or left out; "…" may be left out
//  - "gay/gai" and the forms listed in a word's `also` are alternatives
//  - masculine and feminine may be separated by a comma, a slash or just a space; any capitals; œ = oe
// Nearly right ("Fast", still counts as wrong): only accents differ, only the article is missing,
// only the feminine form is missing, or only hyphens/spaces differ.

const LABEL_FR = /^(m|f|mf|pl|mpl|fpl)$/;

function baseFr(s) {
  return s.toLowerCase()
    .replace(/[’‘`´]/g, "'").replace(/[“”„"«»]/g, '').replace(/[  ]/g, ' ')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/…|\.{3}/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\b(qn|qc)(\s*\/\s*(qn|qc))*\b/g, ' ')
    .replace(/'\s+/g, "'")
    .replace(/\s*[,/]\s*/g, ' ')
    .replace(/[.!?;:]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
const normalizeFr = s => baseFr(s);
const foldFr = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const squashFr = s => s.replace(/[-\s]/g, '');

// the entry as shown: without its labels
function shownFr(fr) {
  return fr.replace(/\s*\((?:m|f|mf|pl|mpl|fpl)\)/g, '').trim();
}

// the masculine form alone: "fiancé, fiancée" → "fiancé", "un, une célibataire" → "un célibataire",
// "tomber amoureux, amoureuse de qn" → "tomber amoureux de qn", "Quel idiot! Quelle idiote!" → "Quel idiot!"
function mascFr(fr) {
  const s = shownFr(fr).split(';')[0].trim();
  const bang = s.match(/^([^!]+!)\s*[^!]+!$/);
  if (bang) return bang[1];
  const i = s.indexOf(', ');
  if (i < 0) return null;
  const left = s.slice(0, i), right = s.slice(i + 2).split(' ');
  if (/^(un|le)$/i.test(left)) return left + ' ' + right.slice(1).join(' ');
  if (/^(une|la)$/.test(right[0]) || /^l'/.test(right[0])) return left;
  return [left, ...right.slice(1)].join(' ');
}

// the ways of writing one book entry that count as right
// the same word with the other article of the same gender: une rencontre ↔ la rencontre, le divorce ↔ un divorce,
// les gens ↔ des gens. l' hides the gender, so "une amitié" counts only where the book adds (f) or (m).
const SWAP = { un: 'le', une: 'la', le: 'un', la: 'une', les: 'des', des: 'les' };
function otherArticleFr(fr) {
  const segs = fr.split(';')[0].split(', ').map(seg => {
    const lab = seg.match(/^l'(.+?) \((m|f)\)(.*)$/);
    if (lab) return (lab[2] === 'm' ? 'un ' : 'une ') + lab[1] + lab[3];
    const m = seg.match(/^(un|une|le|la|les|des)\b ?(.*)$/i);
    if (!m) return seg;
    const art = SWAP[m[1].toLowerCase()], rest = m[2];
    if ((art === 'le' || art === 'la') && /^[aeiouyéèêâàîïôûh]/i.test(rest)) return "l'" + rest;
    return rest ? art + ' ' + rest : art;
  });
  const out = segs.join(', ');
  return out === fr.split(';')[0] ? null : out;
}

function candidatesFr(w) {
  const out = new Set();
  const forms = [shownFr(w.fr), shownFr(w.fr).split(';')[0], w.fr.split(';')[0], otherArticleFr(w.fr), ...(w.also || [])].filter(Boolean);
  for (const form of forms) {
    // brackets are optional pieces: with or without them
    const opts = [...form.matchAll(/\(([^)]*)\)/g)].map(m => m[0]);
    let fs = [form];
    for (const o of opts) fs = fs.flatMap(f => [f.replace(o, ''), f.replace(o, o.slice(1, -1))]);
    // "gay/gai" → each word on its own too
    fs = fs.flatMap(f => {
      let xs = [f];
      for (const tok of f.match(/[\p{L}]+\/[\p{L}]+/gu) || []) if (!/^(qn|qc)\//.test(tok)) xs = xs.flatMap(x => [x, ...tok.split('/').map(p => x.replace(tok, p))]);
      return xs;
    });
    for (const f of fs) { const n = normalizeFr(f); if (n) out.add(n); }
  }
  return [...out];
}

function distanceFr(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

const ARTICLE = /^(le |la |les |un |une |des |l')/;

/**
 * note: the card's word; others: words with the same German (their answers count too);
 * all: every word, to say which card a wrong-but-real word belongs to.
 */
function checkFr(note, typedRaw, others = [], all = []) {
  const typed = normalizeFr(typedRaw);
  const cands = [...new Set([note, ...others].flatMap(candidatesFr))];
  if (!typed) return { result: 'empty', closest: cands[0] };
  if (cands.includes(typed)) return { result: 'right', closest: typed };
  const accentHit = cands.find(c => foldFr(c) === foldFr(typed));
  if (accentHit) return { result: 'accent', closest: accentHit };
  const artHit = cands.find(c => ARTICLE.test(c) && foldFr(c.replace(ARTICLE, '')) === foldFr(typed));
  if (artHit) return { result: 'article', closest: artHit };
  const masc = [note, ...others].map(n => mascFr(n.fr)).filter(Boolean)
    .flatMap(m => { const tok = m.match(/[\p{L}]+\/[\p{L}]+/u); return tok ? tok[0].split('/').map(p => m.replace(tok[0], p)) : [m]; })
    .map(normalizeFr);
  const mascHit = masc.find(m => foldFr(m) === foldFr(typed));
  if (mascHit) return { result: 'fem', closest: cands.find(c => c.startsWith(mascHit.split(' ')[0])) || cands[0] };
  const dashHit = cands.find(c => foldFr(squashFr(c)) === foldFr(squashFr(typed)));
  if (dashHit) return { result: 'dash', closest: dashHit };
  // a real word from the list, just not this card's
  const other = all.find(n => n !== note && !others.includes(n) && candidatesFr(n).some(c => foldFr(c) === foldFr(typed)));
  const closest = cands.reduce((best, c) => (distanceFr(typed, c) < distanceFr(typed, best) ? c : best), cands[0]);
  const close = distanceFr(typed, closest) <= Math.max(2, Math.ceil(closest.length * 0.4));
  return { result: 'wrong', closest, other, close };
}

// letter-by-letter comparison: which typed letters are wrong, which book letters are missing
function letterDiffFr(typed, answer) {
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
