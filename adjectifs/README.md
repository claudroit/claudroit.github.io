# Adjectifs

Standalone local-storage adjective trainer at https://claudroit.github.io/adjectifs/.

## Source coverage

The user-supplied screenshots of “22 L’adjectif”, page 64: 51 distinct adjectives from the learning tables, examples and the placement explanation (court). Grammar terminology from headings is excluded. Inflections are grouped under their lemma, not counted as separate words. Includes drôle, fidèle, préféré, court, vert, ennuyeux, meilleur and pire from examples, as well as the complete endings and exceptions tables. Numerals, possessive determiners, nouns (such as rosé for wine), adverbs and passive verb forms are not treated as adjective vocabulary.

`data.js` lists every adjective, all four forms, accepted German translations, section category and relevant notes. The original screenshots are not published. Position-dependent meanings of ancien, vieux, cher, pauvre, sale and propre are covered in translations and answer notes.

## Learning

- FR → DE + Formen: given a masculine or feminine singular, type the other three forms and one accepted German meaning. Mixed/masculine/feminine base options; existing runs retain the setting with which they started.
- DE → FR + Formen: given a German meaning, type all four French forms.
- Beau, nouveau and vieux also ask for bel, nouvel and vieil before a vowel or silent h.
- First pass classifies perfect cards as known; targeted practice requires two consecutive perfect responses; final tests shuffle all cards and send mistakes to practice.
- Modes have independent progress. First pass, practice and tests resume after reload from the next unanswered card. All progress stays in localStorage under `karteikarten-adjectifs-v1`. No login, GitHub syncing, API, analytics or external dependencies.
- French accents are required. Accepted alternative forms are explicit. German accepts capitalization differences, Swiss ss / ß and ae/oe/ue spellings; multiple submitted meanings must all be accepted.

## Verified alternatives

- OQLF, masculine plurals in -al: https://vitrinelinguistique.oqlf.gouv.qc.ca/21819/la-grammaire/ladjectif/masculin-pluriel-des-adjectifs-en-8209al — both finals and finaux accepted; banals, fatals, navals retained.
- Académie française, frais: https://www.dictionnaire-academie.fr/article/A9F1506 — fraîche/fraîches and fraiche/fraiches accepted.

## Run and test

Open index.html directly, or use a static HTTP server. Run `node tests.cjs` for data, answer validation and learning-state regression checks.
