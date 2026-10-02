// Everything lives in IndexedDB on this device: trips (with their stops) in one
// store, photo bytes in another so opening a trip never loads the images.

const DB_NAME = 'waymark';
let dbPromise;

function open() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('trips', { keyPath: 'id' });
      db.createObjectStore('photos', { keyPath: 'id' }).createIndex('tripId', 'tripId');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

export const listTrips = () => run('trips', 'readonly', (s) => s.getAll());
export const getTrip = (id) => run('trips', 'readonly', (s) => s.get(id));

export function saveTrip(trip) {
  trip.updatedAt = Date.now();
  return run('trips', 'readwrite', (s) => s.put(trip));
}

export async function deleteTrip(id) {
  const photos = await photosOfTrip(id);
  await run('photos', 'readwrite', (s) => { photos.forEach((p) => s.delete(p.id)); });
  photos.forEach((p) => forget(p.id));
  return run('trips', 'readwrite', (s) => s.delete(id));
}

export const photosOfTrip = (tripId) => run('photos', 'readonly', (s) => s.index('tripId').getAll(tripId));
export const putPhoto = (photo) => run('photos', 'readwrite', (s) => s.put(photo));

export function deletePhoto(id) {
  forget(id);
  return run('photos', 'readwrite', (s) => s.delete(id));
}

// Object URLs are made once per photo and reused.
const urls = new Map();

function forget(id) {
  const u = urls.get(id);
  if (!u) return;
  Object.values(u).forEach((x) => URL.revokeObjectURL(x));
  urls.delete(id);
}

export async function photoUrl(id, size = 'thumb') {
  if (!urls.has(id)) {
    const p = await run('photos', 'readonly', (s) => s.get(id));
    if (!p) return '';
    urls.set(id, {
      thumb: URL.createObjectURL(new Blob([p.thumb], { type: p.type })),
      full: URL.createObjectURL(new Blob([p.full], { type: p.type })),
    });
  }
  return urls.get(id)[size];
}

export function askToPersist() {
  navigator.storage?.persist?.().catch(() => {});
}
