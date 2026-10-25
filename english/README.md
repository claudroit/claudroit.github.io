# English

Set-based vocabulary trainer at `/english/`, following the French trainers’ first pass → practice → final test method. Create your own sets, import two columns from Excel by pasting, or load CSV, TSV and JSON files. The paired-row editor saves every input immediately, including unfinished cards and import text. Reloading reopens the draft.

## Vocabulary

`data.js` is an optional starter set containing all 358 rows from the supplied `vocabulary.xlsx`, sheet `Vocabulary`, rows 2–359. Add it with `/english/#add=excel-vocabulary`. IDs retain the source row numbers. The only added translation is `geeky` → `nerdig`, because the source German cell B318 is blank. The workbook itself is unchanged and is not published. New users can start with their own set instead.

The library and answer feedback retain the source English text. Answers omit grammatical labels such as `(pl)`, `(BE)` and `(opp of ...)`. Explicit source alternatives such as `repetitive` / `monotonous` accept either translation. Capitalization, spacing, typographic apostrophes, hyphens and initial infinitive `to` are normalized; `something`, `somebody` and `someone` are accepted for the source placeholders. Identical German prompts accept either matching translation. Custom alternatives use `|`. There is always one translation field, never conjugation fields. “Ich hatte das richtig” restores the pre-answer state and records a correct response, including scores, practice queues and streaks; it is available after reload until moving on.

## Learning

- First pass follows workbook order and sorts answers into known / learning.
- Practice repeats learning words until each receives two consecutive correct answers; a mistake resets that word’s streak.
- Final tests shuffle all 358 entries and put mistakes back into practice.
- Runs resume at the next unanswered word after reload. Starting a new first pass resets classification and pending runs while retaining test history.
- Free practice shuffles all words and requires two consecutive correct answers per word on a separate track. Choose DE → EN or mixed DE ↔ EN; running rounds retain their direction until completion. Guided learning always uses DE → EN.
- Flashcards flip between German and English, retain the current card on reload, support shuffling and marked-only browsing, and never affect mastery.
- Mark words during questions, in the library or on flashcards. Search or filter the library to marked words.
- Browser-local sets, drafts and progress use `english-sets-v2`. The original `karteikarten-english-v1` save is copied into the starter set once and never overwritten or removed. The starter link opens an existing copy without resetting it. Storage belongs to a browser and origin; localhost and the live website are separate. Use a share link or JSON export with progress to move a save between origins/devices.
- Editing titles preserves all progress; changing cards retains mastery for unchanged IDs, invalidates pending runs, and retains historical scores. No account or leaderboard.

## Sharing

The share dialog creates a public URL with a gzip/base64url set payload in the fragment. Recipients preview and save an independent local copy. Progress and marks are omitted by default, with an explicit option to include them. Links are immutable snapshots: later edits do not update recipients. The fragment is not sent to the hosting server. No Supabase migration, authentication or network request is required. Limits: 2000 cards, 2000 characters per side, 180000 encoded characters per link, 8 MB decoded import limit. Very large sets can be shared as JSON files. Native `.xlsx` files should be copied as two columns or exported as CSV before importing.

The old `/französisch/` portal was removed; `/verben/` and `/adjectifs/` retain their original learning storage and use separate marking keys through `shared/word-marks.js`.

## Checks

Run `node english/tests.cjs`, `node english/sets-tests.cjs` and `node adjectifs/tests.cjs` from the repository root. Serve the repository with any static HTTP server and open `/english/`. The stylesheet references `../adjectifs/style.css`; deploy alongside the existing site.
