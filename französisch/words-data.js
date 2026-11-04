// Französisch, TSW Kapitel 3 (Der Mensch und menschliche Beziehungen), 3.2–3.6: the blue words, in book order (p. 42–57).
// One line per word: French | German [| other forms the book also gives, separated by " ¦ "].
// "# 3.x Title" starts a chapter, "## Title" a section inside it.
// Ids are line positions (f1, f2, …), and saved progress uses them: add new words only at the very end.
// Words printed twice in the chapter (décevoir qn, agressif, défendre qn, le sexe, un ami) appear once.
const WORDS_RAW = `
# 3.2 Partnerschaft, Ehe, Trennung
un couple | Paar
vivre avec qn | mit jdm zusammenleben
être marié, mariée | verheiratet sein
le mariage | Ehe, Trauung
se marier (avec qn) | (jdn) heiraten
épouser qn | jdn heiraten
l'union libre (f) | Konkubinat, nichteheliche Lebensgemeinschaft
la femme | (Ehe)Frau
le mari | (Ehe)Mann
l'époux (m), l'épouse (f) | (Ehe)Gatte, (Ehe)Gattin
un compagnon, une compagne | Lebenspartner(in), Lebensgefährte/Lebensgefährtin
une relation | Beziehung, Verhältnis
se fiancer avec | sich verloben mit
fiancé, fiancée | verlobt
un fiancé, une fiancée | Verlobte(r)
les fiançailles (fpl) | Verlobung
célibataire | Single; ledig
un, une célibataire | Alleinstehende(r)
séparé, séparée | getrennt (lebend)
quitter qn | jdn verlassen
être divorcé, divorcée | geschieden sein
divorcer (de qn) | sich (von jdm) scheiden lassen
le divorce | Scheidung
se séparer (de qn) | sich (von jdm) trennen
la séparation | Trennung
veuf, veuve | verwitwet
# 3.3 Kennenlernen, Freundschaft und Liebe
un rendez-vous | Verabredung; Termin
connaître | kennen; kennenlernen
faire la connaissance de qn | jdn kennenlernen
rencontrer qn | jdn begegnen; jdn treffen
se rencontrer | sich treffen, sich begegnen
une rencontre | Begegnung; Treffen
aborder qn | jdn ansprechen
un ami, une amie | Freund(in)
l'amitié (f) | Freundschaft
amical, amicale; amicaux (mpl) | freundschaftlich
un copain, une copine | Freund(in)
un pote | Freund(in), Kumpel
un, une camarade | Kamerad(in)
s'entendre avec qn | sich mit jdm verstehen
être attaché, attachée à qn | mit jdm verbunden sein, sich mit jdm verbunden fühlen
adorer qn | jdn sehr gerne mögen
aimer | lieben, gernhaben
l'amour (m) | Liebe
amoureux, amoureuse | verliebt
tomber amoureux, amoureuse de qn | sich in jdn verlieben
être inséparable | unzertrennlich sein
un coup de foudre | Liebe auf den ersten Blick
mon lapin | mein Häschen
mon amour | mein Liebling; mein Liebster, meine Liebste
mon trésor | mein Schatz
mon cœur | mein Herz
chéri, chérie | (mein) Liebling, (mein) Schatz
s'intéresser à | sich interessieren für
flirter avec | flirten mit
draguer qn | jdn anmachen, jdn anbaggern
faire la cour à qn | jdm den Hof machen
craquer pour qn | für jdn schwärmen, jdn toll finden
sortir avec qn | mit jdm gehen
manquer à qn | jdm fehlen
jaloux, jalouse | eifersüchtig
la jalousie | Eifersucht
s'accrocher à qn | sich an jdn klammern
fidèle | treu
infidèle | untreu
tromper qn | jdn betrügen, jdn täuschen
décevoir qn | jdn enttäuschen
la déception | Enttäuschung
briser le cœur à qn | jdm das Herz brechen
le chagrin d'amour | Liebeskummer
embrasser | küssen; umarmen
un bisou | (Wangen)Kuss
un baiser | Kuss
désirer qn | jdn begehren
la passion | Leidenschaft
tendre | zärtlich
la tendresse | Zärtlichkeit
caresser | streicheln
faire l'amour avec qn | intim werden, mit jdm schlafen
coucher avec qn | intim werden, mit jdm schlafen
nu, nue | nackt
vierge | jungfräulich
la sexualité | Sexualität
sexuel, sexuelle | sexuell
sexy | sexy, sexuell attraktiv
le sexe | Sex; das Geschlecht
homosexuel, homosexuelle | homosexuell
gay/gai, gaie | homosexuell
attendre un enfant | ein Kind erwarten
(être) enceinte | schwanger (sein)
la grossesse | Schwangerschaft
la pilule | (Antibaby)Pille
un préservatif | Kondom, Verhütungsmittel
# 3.4 Umgang mit Menschen
aider qn | jdm helfen
l'aide (f) | Hilfe, Unterstützung
l'entraide (f) | gegenseitige Hilfe
rendre service à qn | jdm behilflich sein, helfen, einen Gefallen tun
sauver qn | jdn retten
protéger qn | jdn beschützen
traiter qn (comme …) | jdn behandeln (wie …)
garder qn | auf jdn aufpassen
s'occuper de qn/qc | sich um jdn kümmern; sich mit etw. beschäftigen
défendre qn | jdn verteidigen
être solidaire | solidarisch sein
partager qc avec qn | etw. mit jdm teilen
compter sur qn | auf jdn zählen, sich auf jdn verlassen
la confiance | Vertrauen
se méfier de qn/qc | jdm/etw. misstrauen
avoir besoin de qn | jdn brauchen
dépendre de qn | von jdm abhängen/abhängig sein
influencer qn | jdn beeinflussen
se servir de qn | jdn benutzen
profiter de qn | jdn ausnutzen
encourager qn à faire qc | jdn ermutigen etw. zu tun
motiver qn | jdn motivieren
promettre qc à qn | jdm etw. versprechen
promettre à qn de faire qc | jdm versprechen etw. zu tun
une promesse | Versprechen
une surprise | Überraschung
faire une surprise à qn | jdm eine Überraschung bereiten, jdn überraschen
rendre qn heureux, heureuse | jdn glücklich machen
étonner qn | jdn erstaunen
faire plaisir à qn | jdm Freude machen
impressionner qn | jdn beeindrucken
respecter | respektieren, achten
le respect | Respekt
prendre qn au sérieux | jdn ernst nehmen
laisser qn tranquille | jdn in Ruhe lassen
supporter qn | jdn ertragen
consoler qn | jdn trösten
rassurer qn | jdn beruhigen
# 3.5 Streit, Konflikte, Versöhnung und Gewalt
un problème | Problem
une dispute | Streit
se disputer | streiten
faire une scène à qn | jdm eine Szene machen
un conflit | Konflikt
un drame | Drama
mentir à qn | jdn belügen
le mensonge | Lüge
un malentendu | Missverständnis
trahir qn | jdn verraten, jdn hintergehen
la trahison | Verrat
détester qn | jdn überhaupt nicht mögen, jdn nicht ausstehen können
s'entendre mal avec qn | sich mit jdm schlecht verstehen
énerver qn | jdm auf die Nerven gehen
déranger qn | jdn stören
embêter qn | jdm auf die Nerven gehen, jdn belästigen
être comme chien et chat | wie Hund und Katze sein, sich nicht verstehen
gêner qn | jdn stören; jdn verlegen machen
critiquer qn | jdn kritisieren
la critique | Kritik
râler (contre) | meckern (über), motzen (über)
un reproche | Vorwurf
reprocher qc à qn | jdm etw. vorwerfen/vorhalten
interrompre qn | jdn unterbrechen
se moquer de qn/qc | sich über jdn/etw. lustig machen, jdn auslachen, jdn/etw. verspotten
rigoler dans le dos de qn | sich hinter dem Rücken lustig machen über jdn
mépriser qn | jdn verachten, missachten
une injure | Beleidigung
insulter qn | jdn beschimpfen, beleidigen
provoquer qn | jdn provozieren
une provocation | Provokation, Herausforderung
s'énerver | sich aufregen
crier | schreien
en avoir assez (de qc) | (von etw.) genug haben
en avoir marre (de qc) | (von etw.) die Nase voll haben
être fâché, fâchée | ärgerlich, böse sein
se fâcher | sich ärgern; böse, wütend werden
un cri | Schrei
faire la tête | sauer sein, schmollen
en vouloir à qn | jdm böse sein, jdm etw. übel nehmen
la colère | Wut
être en colère | wütend sein
agressif, agressive | aggressiv
l'agressivité (f) | Aggressivität
furieux, furieuse | wütend
faire peur à qn | jdm Angst machen
faire mal à qn | jdm wehtun
pleurer | weinen
être blessé, blessée | verletzt sein
blesser qn | jdn verletzen
craquer | die Nerven verlieren
faire exprès | mit Absicht tun
être vache | gemein sein
piéger qn | jdn hereinlegen, in eine Falle locken
interdire qc à qn/à qn de faire qc | jdm etw. verbieten, untersagen/jdm verbieten etw. zu tun | interdire qc à qn ¦ interdire à qn de faire qc
une interdiction | Verbot
obliger qn à faire qc | jdn zwingen etw. zu tun
forcer qn à faire qc | jdn zwingen etw. zu tun
obéir à qn | jdm gehorchen
punir qn | jdn bestrafen
demander pardon à qn | jdn um Verzeihung/Entschuldigung bitten
pardonner qc à qn | jdm etw. verzeihen, vergeben
pardonner à qn d'avoir fait qc | jdm verzeihen, etw. getan zu haben
se réconcilier avec qn | sich mit jdm versöhnen, vertragen
la réconciliation | Versöhnung, Aussöhnung
s'arranger avec qn | sich mit jdm einigen, verständigen
la violence | Gewalt
violent, violente | gewalttätig
menacer qn | jdn bedrohen
une menace | Drohung, Bedrohung
intimider qn | jdn einschüchtern
agresser qn | jdn angreifen
un agresseur, une agresseuse | Angreifer(in)
se venger | sich rächen
la vengeance | Rache
attaquer qn | jdn angreifen
une attaque | Angriff
le mobbing | Mobbing
le harcèlement | Mobbing
une victime | Opfer
se défendre | sich verteidigen
se protéger | sich schützen
## Ärger und Wut ausdrücken
Ça suffit! | Es reicht!
Arrête! | Hör auf!
Arrête ton cinéma! | Hör mit deinem Theater auf!
Tu m'énerves! | Du gehst mir auf die Nerven!
Tu me casses les pieds! | Du gehst mir auf den Wecker!
N'importe quoi! | So ein Quatsch!
Ferme ta gueule! | Halt's Maul!
Quel idiot! Quelle idiote! | Was für ein Trottel!
Quel imbécile! | Was für ein Dummkopf/Trottel!
Il est con! Elle est conne! | Er/Sie ist blöd, doof.
Zut! | Verflixt! Mist!
Mince! | Verflixt! Mist!
Merde! | Scheisse!
Fiche le camp! | Hau ab!/Zieh Leine!
Fiche-moi la paix! | Lass mich in Ruhe!
C'est dégueulasse! | Das ist ekelhaft/fies!
C'est vache! | Das ist gemein!
Quelle horreur! | Wie furchtbar! Wie schrecklich!
## Gewalt
un coup | Schlag, Tritt
taper qn | jdn schlagen
battre qn | jdn schlagen
une bagarre | Schlägerei, Rauferei
frapper qn | jdn schlagen
casser la figure à qn | jdn zusammenschlagen
enfermer qn | jdn einsperren, einschliessen
# 3.6 Menschen, Gruppen und Zugehörigkeit
l'homme (m) | Mensch
les gens (mpl) | die Leute
les jeunes gens (mpl) | Jugendliche, junge Leute
une personne | Person
une personne en situation de handicap | Mensch mit Behinderung/Beeinträchtigung
un être humain | Mensch
une génération | Generation
mineur, mineure | minderjährig
majeur, majeure | volljährig
une dame | Dame, Frau
un monsieur; des messieurs (pl) | Herr, Mann
une demoiselle | Fräulein, junges Mädchen (veraltet)
une femme | Frau
un homme | Mann
féminin, féminine | weiblich
masculin, masculine | männlich
le genre | Geschlecht
non-binaire | nicht binär, divers
l'identité sexuelle (f) | sexuelle Identität
un, une enfant | Kind
un garçon | Junge
une fille | Mädchen
une jeune fille | junges Mädchen
un, une jeune | Jugendliche(r)
une personne âgée | ein älterer Mensch; Senior(in)
les personnes âgées (fpl) | Senioren, ältere Leute/Menschen
une famille | Familie
un voisin, une voisine | Nachbar(in)
un, une camarade de classe | Klassenkamerad(in)
un, une collègue | Kollege, Kollegin
un parent, une parente | Verwandte(r)
un groupe | Gruppe
un club | Club
une équipe | Mannschaft, Team
une bande | Gruppe, Bande, Clique
une communauté | Gemeinschaft
beaucoup de monde | viele Leute
une foule | Menschenmenge
se rassembler | sich versammeln
tout le monde | alle, allen
tous (mpl), toutes (fpl) | alle
chaque | jede(r, s) (mit Nomen)
chacun, chacune | jede(r, s) (ohne Nomen)
personne … ne | niemand (Subjekt)
ne … personne | niemand (Objekt)
on | man
quelqu'un | jemand
plusieurs | mehrere
certains, certaines | einige
quelques-uns, quelques-unes | einige
autre | andere(r, s)
l'autre (mf); les autres (pl) | der/die/das andere, die anderen
quelqu'un d'autre | jemand anderes/anderen/anderem
participer à qc | an etw. teilnehmen
un participant, une participante | Teilnehmer(in)
faire partie de | gehören zu
être membre de qc | Mitglied von etw. sein
appartenir à qc | etw. angehören, zu etw. gehören
ensemble | zusammen, gemeinsam
avec | mit
sans | ohne
seul, seule | allein, einsam
parmi | unter, zwischen
`;

const CHAPTERS = {};
const WORDS = (() => {
  const out = [];
  let group = '', section = '';
  for (const line of WORDS_RAW.split('\n').map(l => l.trim()).filter(Boolean)) {
    let m;
    if ((m = line.match(/^# (\d\.\d) (.+)$/))) { group = m[1]; section = m[2]; CHAPTERS[group] = m[2]; continue; }
    if ((m = line.match(/^## (.+)$/))) { section = m[1]; continue; }
    const [fr, de, also] = line.split(' | ');
    const n = out.length + 1;
    out.push({ id: 'f' + n, n, group, section, fr, de, ...(also ? { also: also.split(' ¦ ') } : {}) });
  }
  return out;
})();
if (typeof module!== 'undefined') module.exports = WORDS;
