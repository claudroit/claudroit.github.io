# 100 Verben — local storage only

Standalone verbs-only version of `../karteikarten`, using its 100-verb dataset from the local French/Karteikarten project.

Open `index.html` in a browser, or serve this folder with `python3 -m http.server 8080` and visit http://localhost:8080.

Includes conjugation and German-to-French translation, first pass, targeted practice, final tests, accent buttons, and separate progress for each track.

Progress is stored only in browser localStorage under `karteikarten-verben-v1`. No GitHub login, Gist synchronization, API requests, backend, analytics, or external dependencies. The verb data is bundled in `verbs-data.js`; there is no vocabulary deck, adjective quiz, or game.

Progress is specific to this browser and origin. Clearing browser data removes it; private browsing may discard it. For consistent storage, use a stable local server address. Opening files directly depends on the browser's file-storage support. Storage failures are shown on the page. Existing Karteikarten progress is not imported.

Published at https://claudroit.github.io/verben/. The bundled verb data is publicly accessible; learning progress remains only in each browser.
