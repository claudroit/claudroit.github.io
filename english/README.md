# Englisch

Unit 1 vocabulary trainer at `/english/`, built like `/verben`: Erster Durchgang → Üben → Abschlusstest,
German → English only. Progress stays in this browser (`english-unit1-v1`), one per chapter choice
(Alle, 1.1, 1.3, Weitere). No accounts, no syncing.

`words-data.js` holds the 356 words in book order (1.1 Identity p. 21–25, 1.3 Work p. 47–57), checked
against the book pages; group `x` = extra words from the vocabulary.xlsx list that aren't on those pages.

`check.js` accepts only the book's word (the test allows no synonyms). It ignores labels like (pl), (BE),
(opp of …), (syn …) and irregular forms in brackets, treats other brackets and sth/sb as optional, and
ignores capitals and accents. A missing "to" or a hyphen difference is "Fast" and counts as not yet known.
Typing another card's word says which German word that one belongs to.

Run `node english/tests.cjs` from the repository root.
