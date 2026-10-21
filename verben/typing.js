// Checks a typed French answer against the card's answer (the bold part of the French side).
// Accepted: any " / " alternative, either side of a word choice like "à/en", with or without
// bracketed notes ("(m)", "(fam)", "(de qc)"), "…" and end punctuation, any capitalisation.
// Accents and spelling must be right; a wrong accent alone counts as "accent".

const decode = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };

function answerText(frHtml) {
  const m = frHtml.match(/<b>([\s\S]*?)<\/b>/);
  return decode(m ? m[1] : frHtml.split('<br>')[0]).trim();
}

function normalize(s) {
  return s.toLowerCase()
    .replace(/[’‘`´]/g, "'").replace(/[  ]/g, ' ')
    .replace(/…|\.\.\./g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+([?!:;,])/g, '$1').replace(/,(?=\S)/g, ', ')
    .replace(/\s+/g, ' ').trim()
    .replace(/[.?!]+$/, '').trim();
}
const noAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae');

// every way of writing the answer that counts as right
function candidates(frHtml) {
  const out = new Set();
  const whole = answerText(frHtml);
  out.add(normalize(whole)); out.add(normalize(whole.replace(/\s*\([^)]*\)/g, '')));   // all alternatives typed
  for (const alt of whole.split(/\s+\/\s+/)) {
    // "passer sa vie à/en" → with "à", with "en", and as written
    let forms = [alt];
    for (const tok of alt.match(/\S+\/\S+/g) || []) {
      forms = forms.flatMap(f => [f, ...tok.split('/').map(part => f.replace(tok, part))]);
    }
    for (const f of forms) {
      out.add(normalize(f.replace(/[()]/g, '')));                       // notes typed along
      out.add(normalize(f.replace(/\s*\([^)]*\)/g, '')));               // notes left out
    }
  }
  return [...out].filter(Boolean);
}

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

// letter-by-letter comparison: which typed letters are wrong, which answer letters are missing
function letterDiff(typed, answer) {
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

function check(frHtml, typedRaw) {
  const typed = normalize(typedRaw);
  const cands = candidates(frHtml);
  if (!typed) return { result: 'empty', closest: cands[0] };
  if (cands.includes(typed)) return { result: 'right', closest: typed };
  const plain = noAccents(typed);
  const accentHit = cands.find(c => noAccents(c) === plain);
  const closest = accentHit || cands.reduce((best, c) => (distance(typed, c) < distance(typed, best) ? c : best), cands[0]);
  // compare letter by letter only when the answer was close; otherwise the marks are just noise
  const close = accentHit || distance(typed, closest) <= Math.max(2, Math.ceil(closest.length * 0.4));
  return { result: accentHit ? 'accent' : 'wrong', closest, diff: close ? letterDiff(typed, closest) : null };
}
