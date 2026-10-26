// Answer rules against every word: node english/tests.cjs
const fs = require('fs'), path = require('path');
const WORDS = require('./words-data.js');
const { checkEn, shownEn } = new Function(fs.readFileSync(path.join(__dirname, 'check.js'), 'utf8') + ';return { checkEn, shownEn };')();
let bad = 0;
const ids = new Set(WORDS.map(w => w.id));
if (ids.size !== WORDS.length) { bad++; console.log('FAIL duplicate ids'); }
const t = (en, typed, want) => {
  const w = WORDS.find(x => x.en === en);
  if (!w) { bad++; return console.log('FAIL missing word', en); }
  const r = checkEn(w, typed, [], WORDS);
  if (r.result !== want) { bad++; console.log('FAIL', JSON.stringify(en), JSON.stringify(typed), r.result, 'want', want); }
};
for (const w of WORDS) if (checkEn(w, shownEn(w.en), [], WORDS).result !== 'right') { bad++; console.log('FAIL own', w.en); }
t('to affirm sth', 'to affirm', 'right');
t('to affirm sth', 'to affirm something', 'right');
t('to affirm sth', 'affirm', 'noTo');
t('to affirm sth', 'to confirm', 'wrong');
t('second-hand', 'second hand', 'dash');
t('values (pl)', 'Values', 'right');
t('short-term (opp of long-term)', 'long-term', 'wrong');
t('repetitive (also monotonous)', 'monotonous', 'right');
t('to occur (syn to happen)', 'to happen', 'wrong');
t('(work) placement', 'placement', 'right');
t('(work) placement', 'work placement', 'right');
t('CV (Curriculum Vitae) (BE) / resumé (AE)', 'resume', 'right');
t('covering letter (BE) / cover letter (AE)', 'cover letter', 'right');
t('to deal (dealt, dealt) with sth', 'to deal with', 'right');
t("to set (set, set) up one's own business", 'to set up your own business', 'right');
t('artificial intelligence (AI)', 'AI', 'right');
t('CEO (Chief Executive Officer)', 'chief executive officer', 'right');
t('job advert / job advertisement', 'job advertisement', 'right');
t('gut(s)', 'guts', 'right');
t('in a good/bad temper', 'in a bad temper', 'right');
t('property & construction', 'property and construction', 'right');
t('the ... in question', 'the … in question', 'right');
t('self-centred = egocentric', 'egocentric', 'right');
const other = (en, typed, want) => { const w = WORDS.find(x => x.en === en); const r = checkEn(w, typed, [], WORDS); if (r.other?.en !== want) { bad++; console.log('FAIL other', en, typed, r.other?.en); } };
other('job sector', 'sector', 'sector');
other('perk', 'benefits', 'benefits (pl)');
other('(work) placement', 'internship', 'internship');
console.log(WORDS.length, 'words,', bad ? bad + ' failures' : 'all checks pass');
process.exit(bad ? 1 : 0);
