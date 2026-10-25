# Suomen sanat — Finnisch lernen, nur lokaler Speicher

Umbau des 100-Verben-Trainers (Französisch) auf eine finnische Wortliste: 278 Wörter in 9 Kategorien (Verben, Orte, Personen, Essen & Alltag, Verkehr & Natur, Zeitangaben, Länder, Adjektive, Partikeln).

Öffnen: `index.html` im Browser, oder `python3 -m http.server 8080` und http://localhost:8080.

Zwei Übungsarten:
- **Übersetzen**: deutsche Bedeutung → finnisches Wort (alle 278).
- **Formen**: Verben → ich-Form (olen, puhun …), Orte → Ort-Endung (talossa), Länder → in/aus (Saksassa, Saksasta), übrige Nomen → Stamm (vede, satee). 180 Wörter.

Pro Kategorie und Übungsart: Erster Durchgang, Üben (zweimal perfekt = gelernt), Abschlusstest. Der Lernstatus pro Wort gilt kategorieübergreifend. Sonderzeichen-Buttons: ä ö å. ä/ö müssen stimmen.

Fortschritt nur im Browser (localStorage, Schlüssel `suomen-sanat-v1`), keine Anfragen, kein Backend. Wörter stehen in `words-data.js` und lassen sich dort leicht ergänzen.
