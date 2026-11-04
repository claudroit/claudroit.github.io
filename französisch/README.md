# Französisch

Vocabulary trainer for TSW chapter 3 (Der Mensch und menschliche Beziehungen, 3.2–3.6, book p. 42–57) at `/französisch/`.
A copy of `/english/`: Erster Durchgang (or Überspringen) → Üben → Abschlusstest, plus Verwechslungsgefahr groups.
German → French only. Progress stays in this browser (`franzoesisch-kap3-v1`), one per chapter choice (Alle, 3.2 … 3.6). No accounts, no syncing.

`words-data.js` holds the 301 blue words in book order with the book's German. Words printed twice in the chapter appear once.
Only additions to the book's German: "(mit Nomen)" / "(ohne Nomen)" for chaque / chacun and "(Subjekt)" / "(Objekt)" for personne … ne / ne … personne (from the book's margin notes), so those cards can be told apart.

`check.js` accepts only the book's word. Brackets, qn/qc, labels like (m)/(fpl) and the plural after ";" are optional;
words with the same German accept each other's answers. Accents, the article and the feminine form are required:
missing ones show "Fast" and count as not yet known. Accent buttons sit under the answer field.

`groups-data.js` names words by their French entry; `tests.cjs` fails if one doesn't match.

index.html links its files with `?v=N`. Raise N with every change, or browsers can mix the new page with cached old scripts.

Run `node französisch/tests.cjs` from the repository root.
