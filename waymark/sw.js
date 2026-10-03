// Keeps the app itself available without a connection. Map tiles and place
// search still need the network; trips and photos live in IndexedDB.

const CACHE = 'waymark-v2';
const SHELL = ['./', 'index.html', 'styles.css', 'js/app.js', 'js/ui.js', 'js/store.js', 'js/services.js', 'js/mapview.js', 'js/photos.js', 'js/importer.js', 'icons/icon.svg'];
const LIBS = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const own = url.origin === location.origin;
  if (!own && !LIBS.includes(url.hostname)) return;
  // Newest copy when online, the saved one when not.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok || res.type === 'opaque') caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res.clone();
      })
      .catch(() => caches.match(e.request, { ignoreSearch: own }))
  );
});
