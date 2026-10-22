# French accounts and verified competitions

Only `/französisch/` uses this backend. The original `/verben/` and `/adjectifs/` files remain unchanged.

## One-time project setup

1. In Supabase, open **SQL Editor → New query**. Paste all of `setup.sql` and run it. It creates the private tables, access restrictions, registration trigger, scoring functions and 907 questions. No admin key is placed in the website.
2. Open **Authentication → Sign In / Providers → Email**. Keep email/password sign-in enabled and turn **Confirm email** off. The UI uses a username and password; internally it maps the lowercase username to `username@learners.example.invalid`. These internal identifiers are not mailboxes. Do not enable email confirmation or email-based recovery for these accounts.
3. Under **Authentication → URL Configuration**, set Site URL to `https://claudroit.github.io/franz%C3%B6sisch/`.
4. Keep Data API enabled. Do not expose `french_private` in API settings. The only browser-accessible database operation is `public.french_api`, restricted to authenticated accounts with a learning profile.

No email is collected and no email recovery is provided. Supabase Auth hashes and verifies passwords; the app never stores passwords in learning data. Usernames are case-insensitive and unique. Existing users may not change names. The signup trigger derives the name from the authenticated login identifier, not editable user metadata.

## Game rules

Ranked tests: 10 questions (5 verbs and 5 adjectives), 30 seconds per question, max 10 minutes after beginning. One active ranked run per user, max 10 starts/hour. Best score ranks first, lowest server-measured time breaks ties. The timer includes network latency. Abandoned expired attempts receive zero points and 30 seconds for each remaining question.

Duels: challenge an exact username; recipient accepts or declines. Invitations expire after 24 hours. On acceptance both get identical questions and have 24 hours to complete the run, each with the same timing rules. Max 5 outgoing invitations/hour, max 10 pending invitations per recipient. Closing the page does not stop an active timer. Scores and times decide the outcome; exact equality is a draw.

The server chooses questions, timestamps them, checks answers, and records scores atomically. Clients cannot read private answer tables, write results, replay an answer, access another player's run or accept someone else's challenge. This prevents score fabrication; it cannot prevent looking up vocabulary, automation or cooperation between players.

Ordinary practice saves are client-generated and never count toward ranking. Per-account copies of the trainers use separate local storage. Cloud writes require a matching revision; conflicts preserve a local copy and offer a backup before loading the cloud version. Guest progress is only imported on request.

## Development

- Regenerate the setup script: `node scripts/build-french-setup.cjs`
- Tests use PGlite (PostgreSQL compiled to WASM): `npm install --prefix /private/tmp/french-backend-check @electric-sql/pglite@0.5.11`, then `node supabase/tests/security.cjs`.
- Browser client is a bundled `@supabase/supabase-js@2.118.0`, with its MIT license alongside it.
- Reapplying `setup.sql` preserves data; it replaces this application's functions and updates the question corpus. Future corpus changes should version questions to preserve outstanding matches.
