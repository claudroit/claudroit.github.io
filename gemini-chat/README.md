# Lumen — Gemini Chat

A mobile-first chat app for Google Gemini where you bring your own API key. It has no build step and no backend: the browser calls the Gemini API directly.

## Features

- **Bring your own key.** Paste a key from [Google AI Studio](https://aistudio.google.com/apikey). It's checked against Google, then stored only in your browser's `localStorage`.
- **Favorite models.** The app loads the live model list from your key. Star any model to pin it to the top of the picker and to quick-switch chips on the home screen.
- **Streaming replies** with Markdown, syntax-highlighted code blocks (each with a copy button), plus copy and regenerate buttons on replies.
- **Image input.** Attach, paste, or drag images in. They're downscaled on your device before sending.
- **Chat history** grouped by date, with search, delete, and undo.
- **Settings:** light, dark, or system theme; system instructions; temperature; and an Enter-to-send toggle.
- **Mobile details:** safe-area insets, bottom sheets you can swipe down to close, a drawer you can swipe to close, keyboard-aware layout, and you can install it to your home screen as a PWA.

## Run locally

Any static file server works:

```sh
cd gemini-chat
python3 -m http.server 8000
# open http://localhost:8000
```

To try it on your phone, open `http://<your-computer-ip>:8000` while both devices are on the same Wi‑Fi. You can also deploy the folder to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup, icon sprite, sheets |
| `styles.css` | Design tokens, light and dark themes, all components |
| `app.js` | State, storage, Gemini streaming, UI logic |
| `manifest.webmanifest`, `icons/` | PWA install metadata |

## Privacy

Your API key and chats never leave the device except in requests sent straight to `generativelanguage.googleapis.com`. To remove the key, go to **Settings → Remove key**.
