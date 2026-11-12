// Synonyms and opposites inside Kapitel 3.2–3.5: every entry is written exactly as in words-data.js.
// Synonyms: one group per line, "a = b = c" (each word is asked, every other word of its group counts).
// Opposites: one pair per line, "a <> b" (asked both ways; a word with several opposites accepts each of them).
// Ids come from the asked word's id (syn-f6, ant-f5), so keep words-data.js ids stable.
const SYNONYMS_RAW = `
se marier (avec qn) = épouser qn
un ami, une amie = un copain, une copine = un pote
un bisou = un baiser
mon amour = mon trésor = mon cœur = mon lapin = chéri, chérie
flirter avec = draguer qn
faire l'amour avec qn = coucher avec qn
homosexuel, homosexuelle = gay/gai, gaie
tromper qn = trahir qn
aider qn = rendre service à qn
se servir de qn = profiter de qn
encourager qn à faire qc = motiver qn
une dispute = un conflit
énerver qn = embêter qn
déranger qn = gêner qn
en avoir assez (de qc) = en avoir marre (de qc)
être fâché, fâchée = être en colère = furieux, furieuse
se fâcher = s'énerver
obliger qn à faire qc = forcer qn à faire qc
agresser qn = attaquer qn
le mobbing = le harcèlement
taper qn = battre qn = frapper qn
Arrête! = Ça suffit!
Tu m'énerves! = Tu me casses les pieds!
Quel idiot! Quelle idiote! = Quel imbécile!
Zut! = Mince!
`;
const OPPOSITES_RAW = `
se marier (avec qn) <> divorcer (de qn)
le mariage <> le divorce
être marié, mariée <> être divorcé, divorcée
être marié, mariée <> célibataire
se rencontrer <> se séparer (de qn)
aimer <> détester qn
adorer qn <> détester qn
fidèle <> infidèle
s'entendre avec qn <> s'entendre mal avec qn
rendre qn heureux, heureuse <> briser le cœur à qn
tendre <> violent, violente
la tendresse <> la violence
compter sur qn <> se méfier de qn/qc
défendre qn <> attaquer qn
se défendre <> attaquer qn
faire plaisir à qn <> décevoir qn
rassurer qn <> faire peur à qn
laisser qn tranquille <> embêter qn
prendre qn au sérieux <> se moquer de qn/qc
respecter <> mépriser qn
se disputer <> se réconcilier avec qn
une dispute <> la réconciliation
pardonner qc à qn <> en vouloir à qn
un agresseur, une agresseuse <> une victime
`;

const PAIRS = (() => {
  const words = typeof WORDS !== 'undefined' ? WORDS : require('./words-data.js');
  const byFr = new Map(words.map(w => [w.fr, w]));
  const find = fr => {
    const w = byFr.get(fr.trim());
    if (!w) throw new Error('pairs-data.js: not in the word list: ' + fr);
    return w;
  };
  function build(kind, raw, sep) {
    const answers = new Map();   // asked word → its partners
    const add = (a, b) => { if (a !== b) answers.set(a, [...new Set([...(answers.get(a) || []), b])]); };
    for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
      const group = line.split(sep).map(find);
      for (const a of group) for (const b of group) add(a, b);
    }
    return [...answers.keys()].sort((a, b) => a.n - b.n).map((w, i) => {
      const ans = answers.get(w).sort((a, b) => a.n - b.n);
      return { id: kind + '-' + w.id, n: i + 1, kind, group: w.group, section: w.section, prompt: w, answers: ans, fr: ans[0].fr, de: w.de };
    });
  }
  return { syn: build('syn', SYNONYMS_RAW, ' = '), ant: build('ant', OPPOSITES_RAW, ' <> ') };
})();
if (typeof module !== 'undefined') module.exports = PAIRS;
