// Finnish word list, bundled with the page.
// Each word: n (unique number), cat, fi (accepted answers separated by " / "), de (prompt),
// forms (optional): [[label, answer], ...] for the "Formen" track.

const CATS = {
  verbs:      { label: 'Verben', note: 'Stamm + Personenendung: puhu- + n = puhun (ich spreche).' },
  places:     { label: 'Orte & Gebäude', note: 'Ort-Endung an den Stamm: talo- + ssa = talossa (im Haus).' },
  people:     { label: 'Personen, Familie & Beruf', note: 'Formen: der Stamm für die Fälle, ohne Bindestrich (ihminen → ihmise).' },
  food:       { label: 'Essen, Trinken & Alltag', note: 'Formen: der Stamm für die Fälle, ohne Bindestrich (vesi → vede).' },
  things:     { label: 'Verkehr, Natur & Dinge', note: 'Formen: der Stamm für die Fälle, ohne Bindestrich (sade → satee).' },
  time:       { label: 'Zeitangaben', note: 'Keine Formen, nur Übersetzen.' },
  countries:  { label: 'Länder', note: 'In einem Land: -ssa / -ssä. Aus einem Land: -sta / -stä.' },
  adjectives: { label: 'Adjektive', note: 'Adjektive stehen vor dem Nomen: hyvä talo = ein gutes Haus.' },
  particles:  { label: 'Partikeln & Verbindungswörter', note: 'Diese Wörter verändern sich nie.' },
};

const RAW = {
  verbs: [
    ['olla', 'sein', 'olen'], ['ei', 'nicht (Verneinungsverb)', 'en'], ['asua', 'wohnen', 'asun'],
    ['elää', 'leben', 'elän'], ['puhua', 'sprechen', 'puhun'], ['oppia', 'lernen', 'opin'],
    ['opiskella', 'studieren / lernen', 'opiskelen'], ['ymmärtää', 'verstehen', 'ymmärrän'],
    ['tietää', 'wissen', 'tiedän'], ['tuntea', 'kennen / fühlen', 'tunnen'],
    ['osata', 'können (Fähigkeit)', 'osaan'], ['voida', 'können (Möglichkeit)', 'voin'],
    ['haluta', 'wollen', 'haluan'], ['tarvita', 'brauchen', 'tarvitsen'],
    ['pitää', 'mögen / müssen (+ sta)', 'pidän'], ['rakastaa', 'lieben', 'rakastan'],
    ['syödä', 'essen', 'syön'], ['juoda', 'trinken', 'juon'], ['ostaa', 'kaufen', 'ostan'],
    ['myydä', 'verkaufen', 'myyn'], ['maksaa', 'bezahlen / kosten', 'maksan'], ['tulla', 'kommen', 'tulen'],
    ['mennä', 'gehen', 'menen'], ['matkustaa', 'reisen', 'matkustan'], ['ajaa', 'fahren', 'ajan'],
    ['istua', 'sitzen', 'istun'], ['seisoa', 'stehen', 'seison'], ['nukkua', 'schlafen', 'nukun'],
    ['herätä', 'aufwachen', 'herään'], ['tehdä', 'machen / tun', 'teen'], ['nähdä', 'sehen', 'näen'],
    ['katsoa', 'schauen / ansehen', 'katson'], ['kuulla', 'hören', 'kuulen'],
    ['kuunnella', 'zuhören', 'kuuntelen'], ['sanoa', 'sagen', 'sanon'], ['kertoa', 'erzählen', 'kerron'],
    ['kysyä', 'fragen', 'kysyn'], ['vastata', 'antworten', 'vastaan'], ['kirjoittaa', 'schreiben', 'kirjoitan'],
    ['lukea', 'lesen', 'luen'], ['työskennellä', 'arbeiten', 'työskentelen'],
    ['tehdä työtä', 'arbeiten (wörtlich: Arbeit machen)', 'teen työtä'], ['tavata', 'treffen', 'tapaan'],
    ['odottaa', 'warten', 'odotan'], ['auttaa', 'helfen', 'autan'], ['löytää', 'finden', 'löydän'],
    ['etsiä', 'suchen', 'etsin'], ['saada', 'bekommen / dürfen', 'saan'], ['antaa', 'geben', 'annan'],
    ['ottaa', 'nehmen', 'otan'], ['käyttää', 'benutzen', 'käytän'], ['avata', 'öffnen', 'avaan'],
    ['sulkea', 'schließen', 'suljen'], ['aloittaa / alottaa', 'anfangen', 'aloitan / alotan'],
    ['lopettaa', 'beenden', 'lopetan'], ['muistaa', 'sich erinnern', 'muistan'],
    ['unohtaa / unohdella', 'vergessen', 'unohdan'], ['nauttia', 'genießen', 'nautin'],
    ['toivoa', 'hoffen / wünschen', 'toivon'], ['luvata', 'versprechen', 'lupaan'],
  ].map(([fi, de, a]) => [fi, de, [['minä', a]]]),

  places: [
    ['talo', 'Haus', 'im Haus', 'talossa'], ['koti', 'Zuhause', 'zuhause', 'kotona'],
    ['kaupunki', 'Stadt', 'in der Stadt', 'kaupungissa'], ['maa', 'Land / Erde', 'im Land', 'maassa'],
    ['katu', 'Straße', 'auf der Straße', 'kadulla'], ['kauppa', 'Laden / Geschäft', 'im Laden', 'kaupassa'],
    ['tori', 'Markt', 'auf dem Markt', 'torilla'], ['ravintola', 'Restaurant', 'im Restaurant', 'ravintolassa'],
    ['kahvila', 'Café', 'im Café', 'kahvilassa'], ['hotelli', 'Hotel', 'im Hotel', 'hotellissa'],
    ['koulu', 'Schule', 'in der Schule', 'koulussa'], ['yliopisto', 'Universität', 'an der Uni', 'yliopistossa'],
    ['työpaikka', 'Arbeitsplatz', 'am Arbeitsplatz', 'työpaikalla'], ['toimisto', 'Büro', 'im Büro', 'toimistossa'],
    ['sairaala', 'Krankenhaus', 'im Krankenhaus', 'sairaalassa'], ['pankki', 'Bank', 'in der Bank', 'pankissa'],
    ['asema', 'Bahnhof', 'am Bahnhof', 'asemalla'], ['lentokenttä', 'Flughafen', 'am Flughafen', 'lentokentällä'],
    ['pysäkki', 'Haltestelle', 'an der Haltestelle', 'pysäkillä'], ['huone', 'Zimmer', 'im Zimmer', 'huoneessa'],
    ['keittiö', 'Küche', 'in der Küche', 'keittiössä'], ['vessa / wc', 'Toilette', 'auf der Toilette', 'vessassa'],
    ['puisto', 'Park', 'im Park', 'puistossa'], ['metsä', 'Wald', 'im Wald', 'metsässä'],
    ['ranta', 'Strand / Ufer', 'am Strand', 'rannalla'], ['meri', 'Meer', 'auf dem Meer', 'merellä'],
    ['järvi', 'See', 'am See', 'järvellä'], ['keskusta', 'Zentrum', 'im Zentrum', 'keskustassa'],
    ['raja', 'Grenze', 'an der Grenze', 'rajalla'], ['paikka', 'Ort / Platz', 'vor Ort', 'paikalla'],
  ].map(([fi, de, l, a]) => [fi, de, [[l, a]]]),

  people: [
    ['ihminen', 'Mensch', 'ihmise'], ['mies', 'Mann', 'miehe'], ['nainen', 'Frau', 'naise'],
    ['lapsi', 'Kind', 'lapse'], ['poika', 'Junge / Sohn', 'poja'], ['tyttö', 'Mädchen', 'tytö'],
    ['ystävä', 'Freund / Freundin', 'ystävä'], ['kaveri', 'Kumpel', 'kaveri'], ['perhe', 'Familie', 'perhee'],
    ['äiti', 'Mutter', 'äidi'], ['isä', 'Vater', 'isä'], ['veli', 'Bruder', 'velje'], ['sisko', 'Schwester', 'sisko'],
    ['kumppani', 'Partner', 'kumppani'], ['opettaja', 'Lehrer', 'opettaja'], ['opiskelija', 'Student', 'opiskelija'],
    ['lääkäri', 'Arzt', 'lääkäri'], ['työntekijä', 'Mitarbeiter', 'työntekijä'], ['pomo', 'Chef', 'pomo'],
    ['asiakas', 'Kunde', 'asiakkaa'], ['naapuri', 'Nachbar', 'naapuri'], ['nimi', 'Name', 'nime'],
    ['ryhmä', 'Gruppe', 'ryhmä'], ['numero', 'Nummer', 'numero'], ['kieli', 'Sprache', 'kiele'],
  ].map(([fi, de, a]) => [fi, de, [['Stamm', a]]]),

  food: [
    ['ruoka', 'Essen / Speise', 'ruoa'], ['vesi', 'Wasser', 'vede'], ['kahvi', 'Kaffee', 'kahvi'],
    ['tee', 'Tee', 'tee'], ['maito', 'Milch', 'maido'], ['olut', 'Bier', 'olue'], ['viini', 'Wein', 'viini'],
    ['leipä', 'Brot', 'leivä'], ['juusto', 'Käse', 'juusto'], ['liha', 'Fleisch', 'liha'], ['kala', 'Fisch', 'kala'],
    ['omena', 'Apfel', 'omena'], ['kasvis', 'Gemüse', 'kasvikse'], ['aamupala', 'Frühstück', 'aamupala'],
    ['lounas', 'Mittagessen', 'lounaa'], ['illallinen', 'Abendessen', 'illallise'], ['pöytä', 'Tisch', 'pöydä'],
    ['tuoli', 'Stuhl', 'tuoli'], ['sänky', 'Bett', 'sängy'], ['ovi', 'Tür', 'ove'], ['ikkuna', 'Fenster', 'ikkuna'],
    ['avain', 'Schlüssel', 'avaime'], ['puhelin', 'Telefon / Handy', 'puhelime'],
    ['tietokone', 'Computer', 'tietokonee'], ['kirja', 'Buch', 'kirja'], ['kirje', 'Brief', 'kirjee'],
    ['sähköposti', 'E-Mail', 'sähköposti'], ['raha', 'Geld', 'raha'], ['kortti', 'Karte (EC / Guthaben)', 'kortti'],
    ['lasku', 'Rechnung', 'lasku'],
  ].map(([fi, de, a]) => [fi, de, [['Stamm', a]]]),

  things: [
    ['auto', 'Auto', 'auto'], ['bussi', 'Bus', 'bussi'], ['juna', 'Zug', 'juna'], ['lentokone', 'Flugzeug', 'lentokonee'],
    ['pyörä', 'Fahrrad', 'pyörä'], ['matka', 'Reise / Fahrt', 'matka'], ['lippu', 'Ticket', 'lipu'],
    ['laukku', 'Tasche / Koffer', 'lauku'], ['sää', 'Wetter', 'sää'], ['aurinko', 'Sonne', 'aurinko'],
    ['sade', 'Regen', 'satee'], ['lumi', 'Schnee', 'lume'], ['ilma', 'Luft', 'ilma'], ['maailma', 'Welt', 'maailma'],
    ['tavara', 'Gegenstand / Zeug', 'tavara'], ['asia', 'Sache / Thema', 'asia'], ['ongelma', 'Problem', 'ongelma'],
    ['kysymys', 'Frage', 'kysymykse'], ['vastaus', 'Antwort', 'vastaukse'], ['syy', 'Grund', 'syy'],
    ['tulos', 'Ergebnis', 'tulokse'], ['idea', 'Idee', 'idea'], ['kuva', 'Bild', 'kuva'],
    ['musiikki', 'Musik', 'musiiki'], ['peli', 'Spiel', 'peli'],
  ].map(([fi, de, a]) => [fi, de, [['Stamm', a]]]),

  time: [
    ['aika', 'Zeit'], ['hetki', 'Moment'], ['kello', 'Uhr / Uhrzeit'], ['tunti', 'Stunde'], ['päivä', 'Tag'],
    ['viikko', 'Woche'], ['kuukausi', 'Monat'], ['vuosi', 'Jahr'], ['aamu', 'Morgen (Tageszeit)'], ['ilta', 'Abend'],
    ['yö', 'Nacht'], ['viikonloppu', 'Wochenende'], ['maanantai', 'Montag'], ['perjantai', 'Freitag'],
    ['tänään', 'heute'], ['huomenna', 'morgen (der Tag nach heute)'], ['eilen', 'gestern'], ['nyt', 'jetzt'],
    ['pian / kohta', 'bald'], ['aina', 'immer'], ['ei koskaan', 'nie'], ['usein', 'oft'], ['joskus', 'manchmal'],
    ['jo', 'schon'], ['vielä', 'noch'], ['varhain', 'früh'], ['myöhään', 'spät'], ['kesä', 'Sommer'], ['talvi', 'Winter'],
  ],

  countries: [
    ['Saksa', 'Deutschland', 'Saksassa', 'Saksasta'], ['Suomi', 'Finnland', 'Suomessa', 'Suomesta'],
    ['Itävalta', 'Österreich', 'Itävallassa', 'Itävallasta'], ['Sveitsi', 'Schweiz', 'Sveitsissä', 'Sveitsistä'],
    ['Englanti', 'England', 'Englannissa', 'Englannista'], ['Ranska', 'Frankreich', 'Ranskassa', 'Ranskasta'],
    ['Venäjä', 'Russland', 'Venäjällä', 'Venäjältä'], ['Viro', 'Estland', 'Virossa', 'Virosta'],
    ['Ruotsi', 'Schweden', 'Ruotsissa', 'Ruotsista'], ['Espanja', 'Spanien', 'Espanjassa', 'Espanjasta'],
  ].map(([fi, de, inn, from]) => {
    const art = de === 'Schweiz' ? 'der ' : '';
    return [fi, de, [[`in ${art}${de}`, inn], [`aus ${art}${de}`, from]]];
  }),

  adjectives: [
    ['hyvä', 'gut'], ['huono / paha', 'schlecht'], ['suuri / iso / isompi', 'groß'], ['pieni', 'klein'],
    ['uusi', 'neu'], ['vanha', 'alt'], ['kaunis', 'schön'], ['ruma', 'hässlich'], ['halpa', 'billig'],
    ['kallis', 'teuer'], ['helppo', 'einfach / leicht'], ['vaikea', 'schwer / schwierig'], ['lämmin', 'warm'],
    ['kylmä', 'kalt'], ['kuuma', 'heiß'], ['viileä', 'kühl'], ['nopea', 'schnell'], ['hidas', 'langsam'],
    ['nuori', 'jung'], ['iloinen', 'glücklich / froh'], ['surullinen', 'traurig'], ['rikas', 'reich'],
    ['köyhä', 'arm'], ['terve', 'gesund'], ['sairas', 'krank'], ['puhdas', 'sauber'], ['likainen', 'schmutzig'],
    ['täynnä', 'voll'], ['tyhjä', 'leer'], ['tärkeä', 'wichtig'], ['tarpeeton', 'unwichtig'], ['valmis', 'fertig'],
    ['kesken', 'unfertig'], ['kiva / mukava', 'nett / angenehm'], ['ikävä', 'unangenehm'], ['ainoa', 'einzig'],
    ['moni', 'viele (+ Plural)'], ['sama', 'derselbe / gleiche'], ['eri', 'verschieden'],
  ],

  particles: [
    ['ja', 'und'], ['tai / vai', 'oder (vai nur bei Fragen)'], ['mutta', 'aber'], ['koska', 'weil / da'],
    ['jos', 'wenn / falls'], ['sitten', 'dann'], ['siis', 'also'], ['myös', 'auch'], ['vain', 'nur'],
    ['kanssa', 'mit (steht nach dem Wort)'], ['ilman', 'ohne'], ['mukaan', 'laut / gemäß'], ['täällä', 'hier'],
    ['siellä', 'dort'], ['missä', 'wo'], ['miten', 'wie'], ['paljon', 'viel'], ['vähän', 'wenig / ein bisschen'],
    ['erittäin / hyvin', 'sehr'], ['liian', 'zu (z. B. zu teuer)'], ['melkein', 'fast'], ['ehkä', 'vielleicht'],
    ['tottakai', 'natürlich'], ['anteeksi', 'Entschuldigung'], ['kiitos', 'Danke'], ['ole hyvä', 'Bitte sehr'],
    ['hei / terve', 'Hallo'], ['näkemiin / moikka', 'Auf Wiedersehen / Tschüss'], ['kyllä / joo', 'Ja'], ['ei', 'Nein'],
  ],
};

const WORDS = [];
for (const cat of Object.keys(CATS)) {
  for (const [fi, de, forms] of RAW[cat]) WORDS.push({ n: WORDS.length + 1, cat, fi, de, forms: forms || null });
}
