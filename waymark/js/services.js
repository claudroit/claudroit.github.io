// Place search (Photon), road routing (OSRM), photo resizing and formatting.

const PHOTON = 'https://photon.komoot.io';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

const lang = (() => {
  const l = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return ['en', 'de', 'fr'].includes(l) ? l : 'en';
})();

function toPlace(f) {
  const p = f.properties || {};
  const [lon, lat] = f.geometry.coordinates;
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const name = p.name || street || p.city || p.county || p.state || p.country || '';
  const sub = [p.city, p.state, p.country].filter((x, i, a) => x && x !== name && a.indexOf(x) === i).join(', ');
  return { name, sub, lat, lon };
}

export async function searchPlaces(q, near, signal) {
  const u = new URL(PHOTON + '/api/');
  u.searchParams.set('q', q);
  u.searchParams.set('limit', '7');
  u.searchParams.set('lang', lang);
  if (near) {
    u.searchParams.set('lat', near.lat.toFixed(3));
    u.searchParams.set('lon', near.lon.toFixed(3));
    // A light pull towards the last stop: enough to settle ties, not enough
    // to rank a café next door above the city of the same name.
    u.searchParams.set('zoom', '6');
    u.searchParams.set('location_bias_scale', '0.1');
  }
  const r = await fetch(u, { signal });
  if (!r.ok) throw new Error('search failed');
  const seen = new Set();
  return (await r.json()).features.map(toPlace).filter((p) => {
    const k = p.name + '|' + p.sub;
    if (!p.name || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Towns and cities only, but it answers in well under a second, so its results
// are on screen while the fuller search above is still thinking.
export async function searchCities(q, signal) {
  const u = new URL('https://geocoding-api.open-meteo.com/v1/search');
  u.searchParams.set('name', q);
  u.searchParams.set('count', '8');
  u.searchParams.set('language', lang);
  const r = await fetch(u, { signal });
  if (!r.ok) throw new Error('search failed');
  const plain = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const stem = plain(q).slice(0, 3);
  return ((await r.json()).results || [])
    .filter((c) => plain(c.name).includes(stem)) // drop its looser sound-alike guesses
    .sort((x, y) => (y.population || 0) - (x.population || 0))
    .slice(0, 5)
    .map((c) => ({ name: c.name, sub: [c.admin1, c.country].filter((x) => x && x !== c.name).join(', '), lat: c.latitude, lon: c.longitude }));
}

export const pinned = (lat, lon) => ({ name: 'Pinned place', sub: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon });

// Names a point on the map by the town it is in. Resolves null if nothing answers
// within a few seconds; the caller already has `pinned` to show meanwhile.
export async function reverseGeocode(lat, lon) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lon}&lang=${lang}`, { signal: ctl.signal });
    const p = r.ok && (await r.json()).features[0]?.properties;
    if (!p) return null;
    const name = p.city || p.town || p.village || p.name || p.county || p.state;
    if (!name) return null;
    const sub = [p.state, p.country].filter((x, i, a) => x && x !== name && a.indexOf(x) === i).join(', ');
    return { name, sub, lat, lon };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const legKey = (a, b) => [a.lat, a.lon, b.lat, b.lon].map((n) => n.toFixed(5)).join(',');

export async function fetchRoad(a, b) {
  const r = await fetch(`${OSRM}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`);
  if (!r.ok) throw new Error('routing failed');
  const j = await r.json();
  if (j.code !== 'Ok' || !j.routes?.[0]) return null;
  const route = j.routes[0];
  let coords = route.geometry.coordinates;
  const step = Math.ceil(coords.length / 500);
  if (step > 1) {
    const last = coords[coords.length - 1];
    coords = coords.filter((_, i) => i % step === 0);
    coords.push(last);
  }
  return {
    key: legKey(a, b),
    km: route.distance / 1000,
    min: route.duration / 60,
    coords: coords.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]),
  };
}

export function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ---------- photos ----------

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
}

function scaled(img, max, quality) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? b.arrayBuffer().then(resolve) : reject(new Error('encode failed'))), 'image/jpeg', quality));
}

// Photos are stored as bytes rather than Blobs; WebKit is more reliable with that.
export async function preparePhoto(file) {
  const img = await loadImage(file);
  return { type: 'image/jpeg', full: await scaled(img, 1800, 0.84), thumb: await scaled(img, 360, 0.8) };
}

export function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBuf(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

// ---------- formatting ----------

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function fmtDist(km, units) {
  const v = units === 'mi' ? km * 0.621371 : km;
  return v < 10 ? (Math.round(v * 10) / 10).toLocaleString() : nf.format(v);
}

export function fmtDur(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const parseDate = (d) => new Date(d + 'T12:00:00');
const thisYear = new Date().getFullYear();

export function fmtDate(d, time) {
  if (!d) return '';
  const date = parseDate(d);
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  if (date.getFullYear() !== thisYear) opts.year = 'numeric';
  const s = date.toLocaleDateString(undefined, opts);
  return time ? `${s}, ${time}` : s;
}

export function fmtRange(a, b) {
  if (!a) return '';
  const A = parseDate(a), B = parseDate(b || a);
  const full = { day: 'numeric', month: 'short', year: 'numeric' };
  if (a === b || !b) return A.toLocaleDateString(undefined, full);
  const sameYear = A.getFullYear() === B.getFullYear();
  const start = A.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : full);
  return `${start} to ${B.toLocaleDateString(undefined, full)}`;
}

export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5) + 1;

export function today() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return { date: `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`, time: `${p(n.getHours())}:${p(n.getMinutes())}` };
}
