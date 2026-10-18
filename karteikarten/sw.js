// Keeps the app available without a connection. Vocabulary and progress are kept by the
// page itself (localStorage) and synced with GitHub, which this worker never caches.

const CACHE = 'karteikarten-f9f02f73';
const SHELL = ['./', 'index.html', 'style.css', 'srs.js', 'ring.js', 'typing.js', 'app.js', 'gist-storage.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('karteikarten-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.includes('/karteikarten/')) return;
  // Newest copy when online, the saved one when not.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res.clone();
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
