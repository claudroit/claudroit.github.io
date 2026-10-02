import * as store from './store.js';
import {
  searchPlaces, searchCities, reverseGeocode, pinned, fetchRoad, legKey, haversine, preparePhoto, bufToBase64, base64ToBuf,
  fmtDist, fmtDur, fmtDate, fmtRange, daysBetween, today,
} from './services.js';
import { MapView } from './mapview.js';
import { h, icon, toast, openPanel, menu, askText, confirmAction, Sheet, isWide } from './ui.js';

const $ = (id) => document.getElementById(id);

const S = {
  trips: [],
  trip: null,
  selected: null,
  units: localStorage.getItem('waymark.units') || (/^en-(US|GB)/.test(navigator.language) ? 'mi' : 'km'),
  mode: localStorage.getItem('waymark.mode') || 'arrows',
};

let map, sheet, mapOk = false;
const noRoad = new Set(); // legs the router could not answer this session

// ---------- trip maths ----------

const roadOf = (stops, i) => (i > 0 && stops[i].road?.key === legKey(stops[i - 1], stops[i]) ? stops[i].road : null);
const legKm = (stops, i) => roadOf(stops, i)?.km ?? haversine(stops[i - 1], stops[i]);

function tripStats(trip) {
  const stops = trip.stops;
  let km = 0, roads = 0;
  for (let i = 1; i < stops.length; i++) { km += legKm(stops, i); if (roadOf(stops, i)) roads++; }
  const dates = stops.map((s) => s.date).filter(Boolean).sort();
  const first = dates[0], last = dates[dates.length - 1];
  return { n: stops.length, km, roads, legs: Math.max(0, stops.length - 1), first, last, days: first ? daysBetween(first, last) : 0 };
}

const unit = () => (S.units === 'mi' ? 'mi' : 'km');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- home ----------

const HERO = `
<svg class="blank__art" viewBox="0 0 340 214" role="img" aria-label="A route drawn across a map in three arrows">
  <path d="M-10 150C60 120 90 190 170 170S290 120 350 150V224H-10z" fill="#b7d2dc"/>
  <path d="M-10 60C70 40 120 90 200 60S300 20 350 44M60-10C80 60 40 110 70 224M250-10C230 70 280 120 262 224" fill="none" stroke="#fff" stroke-width="5"/>
  <g fill="none" stroke-linecap="round">
    <path class="draw" pathLength="1" d="M52 150Q82 62 150 62" stroke="#17202a" stroke-width="9" style="animation-delay:.35s"/>
    <path class="draw" pathLength="1" d="M52 150Q82 62 150 62" stroke="#ffc629" stroke-width="5" style="animation-delay:.35s"/>
    <path class="draw" pathLength="1" d="M150 62Q226 70 214 132" stroke="#17202a" stroke-width="9" style="animation-delay:1.15s"/>
    <path class="draw" pathLength="1" d="M150 62Q226 70 214 132" stroke="#ffc629" stroke-width="5" style="animation-delay:1.15s"/>
    <path class="draw" pathLength="1" d="M214 132Q262 150 290 84" stroke="#17202a" stroke-width="9" style="animation-delay:1.95s"/>
    <path class="draw" pathLength="1" d="M214 132Q262 150 290 84" stroke="#ffc629" stroke-width="5" style="animation-delay:1.95s"/>
  </g>
  <g fill="#ffc629" stroke="#17202a" stroke-width="2.4" stroke-linejoin="round">
    <g transform="translate(135 62)"><path class="pop" style="animation-delay:1s" d="M0 0L-18-10-14 0-18 10z"/></g>
    <g transform="translate(217 116.5) rotate(101)"><path class="pop" style="animation-delay:1.8s" d="M0 0L-18-10-14 0-18 10z"/></g>
    <g transform="translate(283.8 98.7) rotate(-67)"><path class="pop" style="animation-delay:2.6s" d="M0 0L-18-10-14 0-18 10z"/></g>
  </g>
  <g font-family="Overpass, sans-serif" font-weight="700" font-size="14" text-anchor="middle">
    <g class="pop" style="animation-delay:.1s"><rect x="37" y="135" width="30" height="30" rx="9" fill="#0f5f4b" stroke="#fff" stroke-width="2.5"/><text x="52" y="155.5" fill="#fff">1</text></g>
    <g class="pop" style="animation-delay:1.05s"><circle cx="150" cy="62" r="15" fill="#17202a" stroke="#fff" stroke-width="2.5"/><text x="150" y="67.5" fill="#fff">2</text></g>
    <g class="pop" style="animation-delay:1.85s"><circle cx="214" cy="132" r="15" fill="#17202a" stroke="#fff" stroke-width="2.5"/><text x="214" y="137.5" fill="#fff">3</text></g>
    <g class="pop" style="animation-delay:2.65s"><circle cx="290" cy="84" r="15" fill="#ffc629" stroke="#17202a" stroke-width="2.5"/><text x="290" y="89.5" fill="#17202a">4</text></g>
  </g>
</svg>`;

function glyph(stops) {
  const size = 84, pad = 17;
  const my = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const pts = stops.map((s) => [(s.lon * Math.PI) / 180, -my(s.lat)]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const k = (size - pad * 2) / span;
  const ox = (size - (Math.max(...xs) - minX) * k) / 2, oy = (size - (Math.max(...ys) - minY) * k) / 2;
  const P = pts.map(([x, y]) => [(ox + (x - minX) * k).toFixed(1), (oy + (y - minY) * k).toFixed(1)]);
  const d = P.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join('');
  const a = P[0], z = P[P.length - 1];
  const t = document.createElement('template');
  t.innerHTML = `<svg class="tripcard__glyph" viewBox="0 0 ${size} ${size}" aria-hidden="true">${
    P.length > 1
      ? `<path d="${d}" fill="none" stroke="#17202a" stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round"/>
         <path d="${d}" fill="none" stroke="#ffc629" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
         <circle cx="${z[0]}" cy="${z[1]}" r="5.5" fill="#ffc629" stroke="#17202a" stroke-width="2.2"/>`
      : ''}${
    P.length
      ? `<rect x="${a[0] - 6}" y="${a[1] - 6}" width="12" height="12" rx="3.5" fill="#0f5f4b" stroke="#fff" stroke-width="2"/>`
      : `<circle cx="42" cy="42" r="13" fill="none" stroke="#17202a" stroke-opacity=".28" stroke-width="2" stroke-dasharray="3 5"/>`}</svg>`;
  return t.content.firstChild;
}

async function renderHome() {
  S.trips = (await store.listTrips()).sort((a, b) => b.updatedAt - a.updatedAt);
  const body = $('home-body'), foot = $('home-foot');
  body.replaceChildren();
  foot.replaceChildren();

  const filePick = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: (e) => importTrip(e.target.files[0]) });
  const openFile = h('button', { class: 'plain plain--quiet', onclick: () => filePick.click() }, 'Open a backup file');

  if (!S.trips.length) {
    const blank = h('div', { class: 'blank' });
    blank.innerHTML = HERO;
    blank.append(h('h2', null, 'No trips yet'), h('p', null, 'Start a trip, then add each place you reach. Waymark draws the route as you go.'));
    body.append(blank);
    foot.append(
      h('button', { class: 'sign sign--wide', onclick: newTrip }, 'Start a trip'),
      h('button', { class: 'plain', onclick: loadExample }, 'Look at an example trip'), openFile, filePick);
    return;
  }

  const list = h('ul', { class: 'trips' });
  for (const trip of S.trips) {
    const st = tripStats(trip);
    const line = st.n > 1 ? `${fmtDist(st.km, S.units)} ${unit()}, ${plural(st.n, 'stop')}` : st.n ? 'Starting point set' : 'No stops yet';
    list.append(h('li', { class: 'tripcard' },
      h('button', { class: 'tripcard__open', onclick: () => { location.hash = '#/trip/' + trip.id; } },
        glyph(trip.stops),
        h('div', null, h('h2', null, trip.name), st.first && h('p', null, fmtRange(st.first, st.last)), h('p', null, line))),
      h('button', { class: 'tripcard__more', 'aria-label': `Options for ${trip.name}`, onclick: () => tripMenu(trip, false) }, icon('more'))));
  }
  body.append(list);
  foot.append(h('button', { class: 'sign sign--wide', onclick: newTrip }, icon('plus'), 'Start a new trip'), openFile, filePick);
}

async function newTrip() {
  const name = await askText({ title: 'Name this trip', label: 'Trip name', placeholder: 'Alps loop, summer 2026', action: 'Start trip' });
  if (!name) return;
  const trip = { id: store.uid(), name, createdAt: Date.now(), stops: [] };
  await store.saveTrip(trip);
  store.askToPersist();
  location.hash = '#/trip/' + trip.id;
}

async function loadExample() {
  const mk = (name, sub, lat, lon, date, time, notes) => ({ id: store.uid(), name, sub, lat, lon, date, time, notes, photos: [], road: null });
  const trip = {
    id: store.uid(), name: 'Alps loop', createdAt: Date.now(),
    stops: [
      mk('Basel', 'Basel-Stadt, Switzerland', 47.5596, 7.5886, '2026-08-08', '08:40', 'Car packed the night before. Left an hour later than planned anyway.'),
      mk('Lucerne', 'Luzern, Switzerland', 47.0502, 8.3093, '2026-08-08', '11:15', 'Coffee by the Chapel Bridge, then the lake road instead of the motorway. Worth the extra half hour.'),
      mk('Andermatt', 'Uri, Switzerland', 46.6357, 8.5939, '2026-08-09', '16:30', 'Came over the old Gotthard road with the windows down. Fog at the top, sun ten minutes later.'),
      mk('Lugano', 'Ticino, Switzerland', 46.0037, 8.9511, '2026-08-10', '13:05', 'Suddenly everything is in Italian and the palm trees are real. Swam before dinner.'),
      mk('St. Moritz', 'Graubünden, Switzerland', 46.4908, 9.8355, '2026-08-12', '18:20', 'Long day through Italy and up the Maloja. The hairpins at the end are no joke.'),
      mk('Zürich', 'Zürich, Switzerland', 47.3769, 8.5417, '2026-08-14', '15:45', 'Last stop. Returned the roof box, kept the playlist.'),
    ],
  };
  await store.saveTrip(trip);
  location.hash = '#/trip/' + trip.id;
}

function tripMenu(trip, inside) {
  menu(trip.name, [
    { icon: 'pencil', label: 'Rename trip', run: () => renameTrip(trip) },
    inside && { icon: 'ruler', label: S.units === 'mi' ? 'Show distances in kilometres' : 'Show distances in miles', run: toggleUnits },
    { icon: 'save', label: 'Save a backup file', run: () => exportTrip(trip) },
    { icon: 'trash', label: 'Delete trip', danger: true, run: () => removeTrip(trip) },
  ]);
}

async function renameTrip(trip) {
  const name = await askText({ title: 'Rename trip', label: 'Trip name', value: trip.name, action: 'Rename' });
  if (!name) return;
  trip.name = name;
  await store.saveTrip(trip);
  if (S.trip?.id === trip.id) { S.trip.name = name; $('trip-name').textContent = name; }
  else renderHome();
}

async function removeTrip(trip) {
  const ok = await confirmAction({
    title: `Delete ${trip.name}?`,
    body: 'Its stops, notes and photos are removed from this device. This cannot be undone.',
    action: 'Delete trip',
  });
  if (!ok) return;
  await store.deleteTrip(trip.id);
  toast('Trip deleted');
  if (S.trip?.id === trip.id) location.hash = '#/';
  else renderHome();
}

function toggleUnits() {
  S.units = S.units === 'mi' ? 'km' : 'mi';
  localStorage.setItem('waymark.units', S.units);
  renderTrip();
}

// ---------- backup ----------

async function exportTrip(trip) {
  const photos = (await store.photosOfTrip(trip.id)).map((p) => ({ id: p.id, type: p.type, full: bufToBase64(p.full), thumb: bufToBase64(p.thumb) }));
  const json = JSON.stringify({ app: 'waymark', version: 1, trip, photos });
  const name = `waymark-${trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trip'}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (e) { if (e.name !== 'AbortError') toast('The backup could not be shared'); }
    return;
  }
  const a = h('a', { href: URL.createObjectURL(file), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup saved');
}

async function importTrip(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'waymark' || !Array.isArray(data.trip?.stops)) throw new Error('wrong file');
    const ids = new Map((data.photos || []).map((p) => [p.id, store.uid()]));
    const trip = {
      id: store.uid(), name: String(data.trip.name || 'Imported trip').slice(0, 80), createdAt: Date.now(),
      stops: data.trip.stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)).map((s) => ({
        id: store.uid(), name: String(s.name || 'Stop'), sub: String(s.sub || ''), lat: s.lat, lon: s.lon,
        date: /^\d{4}-\d\d-\d\d$/.test(s.date) ? s.date : '', time: /^\d\d:\d\d$/.test(s.time) ? s.time : '',
        notes: String(s.notes || ''), photos: (s.photos || []).map((id) => ids.get(id)).filter(Boolean), road: s.road || null,
      })),
    };
    for (const p of data.photos || []) {
      await store.putPhoto({ id: ids.get(p.id), tripId: trip.id, type: 'image/jpeg', full: base64ToBuf(p.full), thumb: base64ToBuf(p.thumb) });
    }
    await store.saveTrip(trip);
    toast(`Opened ${trip.name}`);
    renderHome();
  } catch {
    toast('That file is not a Waymark backup');
  }
}

// ---------- trip view ----------

function camPad() {
  if (isWide()) return { top: 60, bottom: 60, left: 470, right: 90 };
  return { top: 104, bottom: Math.min(sheet.visible(), innerHeight * 0.55) + 34, left: 46, right: 74 };
}

async function openTrip(id) {
  const trip = await store.getTrip(id);
  if (!trip) { location.hash = '#/'; return; }
  S.trip = trip;
  S.selected = null;
  document.body.classList.add('in-trip');
  $('home').inert = true;
  $('trip').inert = false;
  $('trip').removeAttribute('aria-hidden');
  renderTrip();
  sheet.set('half', false);

  map ??= new MapView($('map'), { onStopTap: (stopId) => selectStop(stopId, true) });
  try {
    await map.ready;
    mapOk = true;
  } catch {
    toast('The map could not load. Check the connection.');
    return;
  }
  if (S.trip !== trip) return;
  map.resize();
  map.setPadding(camPad());
  map.setTrip(trip.stops, S.mode);
  if (trip.stops.length) map.fit({ duration: 0 });
  ensureRoads();
}

function closeTrip() {
  map?.cancel();
  stopReplay();
  S.trip = null;
  document.body.classList.remove('in-trip');
  $('home').inert = false;
  $('trip').inert = true;
  $('trip').setAttribute('aria-hidden', 'true');
  renderHome();
}

function renderTrip() {
  const trip = S.trip, stops = trip.stops, st = tripStats(trip);
  $('trip-name').textContent = trip.name;
  document.title = `${trip.name}, Waymark`;

  // Say so when the figure is road distance; until routes arrive it is straight lines.
  const how = st.legs && st.roads === st.legs ? ' by road' : st.legs ? ' direct' : '';
  const sub = !st.n ? 'No stops yet' : st.n === 1 ? 'Starting point set' : plural(st.n, 'stop') + (st.days > 1 ? ` over ${st.days} days` : '');
  $('tally').replaceChildren(
    h('div', { class: 'tally__km' }, fmtDist(st.km, S.units), h('small', null, unit() + how)),
    h('div', { class: 'tally__sub' }, sub));
  $('btn-add').replaceChildren(icon('plus'), st.n ? 'Add stop' : 'Add start');
  $('btn-mode').hidden = $('btn-replay').hidden = st.n < 2;
  $('btn-fit').hidden = !st.n;
  $('btn-mode').setAttribute('aria-pressed', String(S.mode === 'roads'));

  const body = $('sheet-body');
  if (!st.n) {
    body.replaceChildren(h('div', { class: 'invite' },
      h('h2', null, 'Where does the trip start?'),
      h('p', null, 'Add your starting point. Every place you add after that gets an arrow from the one before.')));
    return;
  }

  const keep = body.scrollTop;
  const list = h('ol', { class: 'tl' });
  stops.forEach((s, i) => {
    const road = roadOf(stops, i);
    const leg = i > 0 && h('div', { class: 'stop__leg' },
      `${fmtDist(legKm(stops, i), S.units)} ${unit()}` + (road ? `, ${fmtDur(road.min)} drive` : ''));
    const meta = fmtDate(s.date, s.time);
    const li = h('li', { class: 'stop' + (s.id === S.selected ? ' stop--sel' : ''), 'data-id': s.id },
      h('span', { class: 'stop__rail' }),
      leg,
      h('span', { class: 'badge' + (i === 0 ? ' badge--start' : i === stops.length - 1 ? ' badge--now' : '') }, String(i + 1)),
      h('div', { class: 'stop__main' },
        h('button', { class: 'stop__open', onclick: () => selectStop(s.id, false) }, h('h3', null, s.name), meta && h('p', { class: 'stop__meta' }, meta)),
        h('button', { class: 'stop__edit', 'aria-label': `Edit ${s.name}`, onclick: () => editStop(s) }, icon('pencil'))),
      s.notes && h('p', { class: 'stop__notes' }, s.notes));
    if (s.photos?.length) {
      const strip = h('div', { class: 'strip' });
      s.photos.forEach((pid, n) => {
        const img = h('img', { alt: `Photo ${n + 1} from ${s.name}`, loading: 'lazy' });
        store.photoUrl(pid).then((u) => { img.src = u; });
        strip.append(h('button', { 'aria-label': `Open photo ${n + 1} from ${s.name}`, onclick: () => lightbox(s, n) }, img));
      });
      li.append(strip);
    }
    list.append(li);
  });
  body.replaceChildren(list);
  body.scrollTop = keep;
}

function selectStop(id, fromMap) {
  const stop = S.trip.stops.find((s) => s.id === id);
  if (!stop) return;
  S.selected = id;
  document.querySelectorAll('.stop').forEach((el) => el.classList.toggle('stop--sel', el.dataset.id === id));
  if (!isWide()) {
    if (fromMap && sheet.snap === 'peek') sheet.set('half');
    if (!fromMap && sheet.snap === 'full') sheet.set('half');
  }
  if (fromMap) {
    // Bring the tapped stop to the top of the journal without covering the map.
    const el = document.querySelector(`.stop[data-id="${id}"]`);
    const body = $('sheet-body');
    if (el) body.scrollTo({ top: el.offsetTop - body.offsetTop - 6, behavior: 'smooth' });
  }
  if (!mapOk) return;
  map.select(id);
  map.setPadding(camPad());
  map.focus(stop);
}

async function ensureRoads() {
  const trip = S.trip;
  let changed = false;
  for (let i = 1; i < trip.stops.length; i++) {
    const a = trip.stops[i - 1], b = trip.stops[i], key = legKey(a, b);
    if (b.road?.key === key || noRoad.has(key)) continue;
    try {
      const road = await fetchRoad(a, b);
      if (road) { b.road = road; changed = true; } else noRoad.add(key);
    } catch {
      noRoad.add(key);
    }
    if (S.trip !== trip) return;
  }
  if (!changed) return;
  await store.saveTrip(trip);
  if (S.trip !== trip) return;
  renderTrip();
  if (S.mode === 'roads' && mapOk && !document.body.classList.contains('is-replaying')) map.setTrip(trip.stops, S.mode);
}

async function tripChanged({ added = -1 } = {}) {
  const trip = S.trip, stops = trip.stops;
  renderTrip();
  if (!mapOk) return;
  if (!isWide()) sheet.set(stops.length > 1 ? 'peek' : 'half');
  map.setPadding(camPad());
  map.setTrip(stops, S.mode, { enter: added });
  const drawNew = added > 0 && added === stops.length - 1;
  if (drawNew) map.draw(added - 1);
  await map.fit();
  if (drawNew && S.trip === trip) await map.animateLeg(added);
  if (S.trip === trip) ensureRoads();
}

// ---------- map buttons ----------

function toggleMode() {
  const stops = S.trip.stops;
  if (S.mode === 'arrows' && !stops.some((_, i) => roadOf(stops, i))) {
    toast('No road route found for these stops');
    return;
  }
  S.mode = S.mode === 'roads' ? 'arrows' : 'roads';
  localStorage.setItem('waymark.mode', S.mode);
  $('btn-mode').setAttribute('aria-pressed', String(S.mode === 'roads'));
  map.setTrip(stops, S.mode);
  map.select(S.selected);
  toast(S.mode === 'roads' ? 'Following the roads' : 'Showing arrows');
}

function locate() {
  if (!navigator.geolocation) return Promise.reject();
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }), reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }));
}

async function showMe() {
  try {
    const me = await locate();
    map.setPadding(camPad());
    map.showMe(me.lat, me.lon);
  } catch {
    toast('Your location is not available. Allow location access for this site.');
  }
}

async function startReplay() {
  const stops = S.trip.stops;
  document.body.classList.add('is-replaying');
  $('replay').hidden = false;
  map.select(null);
  map.setPadding(isWide() ? camPad() : { top: 110, bottom: 150, left: 56, right: 56 });
  await map.replay((i) => {
    $('replay-n').textContent = i + 1;
    $('replay-n').className = 'badge' + (i === 0 ? ' badge--start' : i === stops.length - 1 ? ' badge--now' : '');
    $('replay-name').textContent = stops[i].name;
    $('replay-meta').textContent = fmtDate(stops[i].date, stops[i].time);
  });
  endReplay();
}

function endReplay() {
  if (!document.body.classList.contains('is-replaying')) return;
  document.body.classList.remove('is-replaying');
  $('replay').hidden = true;
  if (S.trip) { sheet.set(sheet.snap); map.setPadding(camPad()); }
}

function stopReplay() {
  if (!document.body.classList.contains('is-replaying')) return;
  map.cancel();
  endReplay();
  if (S.trip) map.fit();
}

function pickOnMap() {
  return new Promise((resolve) => {
    document.body.classList.add('is-picking');
    $('pick').hidden = false;
    const done = (value) => {
      document.body.classList.remove('is-picking');
      $('pick').hidden = true;
      sheet.set(sheet.snap);
      $('pick-ok').onclick = $('pick-cancel').onclick = null;
      resolve(value);
    };
    $('pick-ok').onclick = () => done(map.center());
    $('pick-cancel').onclick = () => done(null);
  });
}

// ---------- add / edit a stop ----------

function addStop() {
  const now = today();
  stopForm({ id: null, place: null, name: '', date: now.date, time: now.time, notes: '', photos: [], removed: [] });
}

async function editStop(stop) {
  const photos = await Promise.all((stop.photos || []).map(async (id) => ({ id, url: await store.photoUrl(id) })));
  stopForm({
    id: stop.id, place: { name: stop.name, sub: stop.sub, lat: stop.lat, lon: stop.lon },
    name: stop.name, autoName: stop.name, date: stop.date, time: stop.time, notes: stop.notes, photos, removed: [],
  });
}

function stopForm(draft, point) {
  const trip = S.trip, stops = trip.stops;
  const index = draft.id ? stops.findIndex((s) => s.id === draft.id) : -1;
  const isStart = draft.id ? index === 0 : !stops.length;

  const save = h('button', { class: 'sign sign--compact', onclick: commit }, draft.id ? 'Save' : isStart ? 'Add start' : 'Add stop');
  const placeBox = h('div');
  const rest = h('div');
  const root = h('div', { style: 'display:contents' },
    h('div', { class: 'panel__head' },
      h('button', { class: 'plain', onclick: () => p.close() }, 'Cancel'),
      h('h2', null, draft.id ? 'Edit stop' : isStart ? 'Starting point' : 'New stop'),
      save),
    h('div', { class: 'panel__scroll' }, placeBox, rest));
  const p = openPanel(root, 'form');

  function renderPlace() {
    save.disabled = !draft.place;
    rest.hidden = !draft.place;
    if (draft.place) {
      placeBox.replaceChildren(h('div', { class: 'place' }, icon('pin'),
        h('div', { class: 'place__text' }, h('strong', null, draft.place.name), h('span', null, draft.place.sub || 'On the map')),
        h('button', { class: 'plain', onclick: () => { draft.place = null; renderPlace(); } }, 'Change')));
      return;
    }

    const results = h('ul', { class: 'results' });
    const input = h('input', {
      class: 'input', type: 'search', placeholder: isStart ? 'Where are you starting from?' : 'Where have you arrived?',
      autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-label': 'Search for a place',
    });
    let timer, ctl;
    const near = stops.length ? stops[stops.length - 1] : mapOk ? map.center() : null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      ctl?.abort();
      const q = input.value.trim();
      if (q.length < 2) { results.replaceChildren(); return; }
      if (!results.querySelector('button')) results.replaceChildren(h('li', { class: 'results__note' }, 'Searching'));
      timer = setTimeout(() => {
        ctl = new AbortController();
        const signal = ctl.signal;
        const found = [];
        let pending = 2, failed = 0;
        // Two searches run side by side. Whatever arrives second is added below
        // what is already showing, so the list never shifts under a finger.
        const settle = (list) => {
          if (signal.aborted) return;
          pending--;
          if (!list) failed++;
          for (const r of list || []) {
            const twin = found.some((f) => haversine(f, r) < 12 && f.name.slice(0, 4).toLowerCase() === r.name.slice(0, 4).toLowerCase());
            if (!twin) found.push(r);
          }
          if (found.length) {
            results.replaceChildren(...found.slice(0, 9).map((r) => h('li', null, h('button', { onclick: () => choose(r) }, h('strong', null, r.name), h('span', null, r.sub)))));
          } else if (!pending) {
            results.replaceChildren(h('li', { class: 'results__note' }, failed === 2
              ? 'Search is not reachable. Check the connection, or pick the place on the map.'
              : `No places found for “${q}”. Check the spelling, or pick the place on the map.`));
          }
        };
        searchCities(q, signal).then(settle, () => settle(null));
        searchPlaces(q, near, signal).then(settle, () => settle(null));
      }, 260);
    });

    placeBox.replaceChildren(
      h('div', { class: 'searchbox' }, icon('search'), input),
      results,
      h('div', { class: 'quick' },
        h('button', { onclick: here }, icon('locate'), 'My location'),
        h('button', { onclick: pick, disabled: !mapOk }, icon('pin'), 'Pick on map')));
    if (!draft.id) setTimeout(() => input.focus(), 380);
  }

  function choose(place) {
    if (!draft.name || draft.name === draft.autoName || !draft.id) draft.name = place.name;
    draft.autoName = place.name;
    draft.place = place;
    nameInput.value = draft.name;
    renderPlace();
  }

  // A point from the map or from GPS is usable at once; its town name follows
  // when the lookup answers, unless the name has been typed over by then.
  function usePoint(at) {
    const temp = pinned(at.lat, at.lon);
    choose(temp);
    reverseGeocode(at.lat, at.lon).then((place) => {
      if (!place || draft.place !== temp) return;
      const untouched = draft.name === temp.name;
      draft.place = place;
      if (untouched) { draft.name = place.name; nameInput.value = place.name; }
      renderPlace();
    });
  }

  async function here() {
    try {
      toast('Finding where you are');
      usePoint(await locate());
    } catch {
      toast('Your location is not available. Allow location access for this site.');
    }
  }

  async function pick() {
    await p.close();
    const at = await pickOnMap();
    stopForm(draft, at);
  }

  const nameInput = h('input', { class: 'input', type: 'text', value: draft.name, maxlength: 80, autocomplete: 'off', oninput: (e) => { draft.name = e.target.value; } });
  const shots = h('div', { class: 'shots' });

  function renderShots() {
    const add = h('label', { class: 'shots__add' }, icon('camera'), 'Add photos',
      h('input', { type: 'file', accept: 'image/*', multiple: true, onchange: addPhotos }));
    shots.replaceChildren(...draft.photos.map((ph) => h('div', { class: 'shot' },
      h('img', { src: ph.url, alt: '' }),
      h('button', { 'aria-label': 'Remove photo', onclick: () => {
        draft.photos = draft.photos.filter((x) => x !== ph);
        if (!ph.data) draft.removed.push(ph.id);
        renderShots();
      } }, icon('close')))), add);
  }

  async function addPhotos(e) {
    const files = [...e.target.files];
    let failed = 0;
    for (const file of files) {
      try {
        const data = await preparePhoto(file);
        draft.photos.push({ id: store.uid(), data, url: URL.createObjectURL(new Blob([data.thumb], { type: data.type })) });
        renderShots();
      } catch { failed++; }
    }
    if (failed) toast(failed === 1 ? 'One photo could not be read' : `${failed} photos could not be read`);
  }

  rest.append(
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Name'), nameInput),
    h('div', { class: 'fieldrow', style: 'margin-top:18px' },
      h('label', { class: 'field' }, h('span', { class: 'field__label' }, isStart ? 'Date' : 'Arrived on'),
        h('input', { class: 'input', type: 'date', value: draft.date, oninput: (e) => { draft.date = e.target.value; } })),
      h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Time'),
        h('input', { class: 'input', type: 'time', value: draft.time, oninput: (e) => { draft.time = e.target.value; } }))),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Notes'),
      h('textarea', { class: 'input', placeholder: 'What happened here?', oninput: (e) => { draft.notes = e.target.value; } }, draft.notes)),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Photos'), shots));

  if (draft.id) {
    rest.append(h('div', { class: 'form__extra' },
      h('button', { disabled: index === 0, onclick: () => move(-1) }, icon('up'), 'Move earlier in the trip'),
      h('button', { disabled: index === stops.length - 1, onclick: () => move(1) }, icon('down'), 'Move later in the trip'),
      h('button', { class: 'is-danger', onclick: remove }, icon('trash'), 'Delete stop')));
  }

  renderPlace();
  renderShots();
  if (point) usePoint(point);

  async function commit() {
    if (!draft.place) return;
    save.disabled = true;
    let stop = draft.id && stops[index];
    let added = -1;
    if (!stop) {
      stop = { id: store.uid(), photos: [], road: null };
      // Slot it in by date, so a stop added late still lands in the right place.
      const when = (s) => `${s.date || ''} ${s.time || ''}`;
      added = stops.length;
      while (added > 0 && draft.date && stops[added - 1].date && when(stops[added - 1]) > `${draft.date} ${draft.time || '99'}`) added--;
      stops.splice(added, 0, stop);
    }
    Object.assign(stop, {
      name: draft.name.trim() || draft.place.name, sub: draft.place.sub, lat: draft.place.lat, lon: draft.place.lon,
      date: draft.date, time: draft.time, notes: draft.notes.trim(),
    });
    for (const ph of draft.photos) if (ph.data) await store.putPhoto({ id: ph.id, tripId: trip.id, ...ph.data });
    for (const id of draft.removed) await store.deletePhoto(id);
    stop.photos = draft.photos.map((ph) => ph.id);
    await store.saveTrip(trip);
    store.askToPersist();
    await p.close();
    tripChanged({ added });
  }

  async function move(dir) {
    const [s] = stops.splice(index, 1);
    stops.splice(index + dir, 0, s);
    await store.saveTrip(trip);
    await p.close();
    tripChanged();
  }

  async function remove() {
    const ok = await confirmAction({ title: `Delete ${stops[index].name}?`, body: 'Its notes and photos are removed too. This cannot be undone.', action: 'Delete stop' });
    if (!ok) return;
    const [s] = stops.splice(index, 1);
    for (const id of s.photos || []) await store.deletePhoto(id);
    await store.saveTrip(trip);
    if (S.selected === s.id) S.selected = null;
    await p.close();
    tripChanged();
  }
}

// ---------- photos, full screen ----------

function lightbox(stop, start) {
  const count = h('span');
  const track = h('div', { class: 'lightbox__track' });
  const close = () => { box.classList.remove('is-open'); setTimeout(() => box.remove(), 260); };
  const box = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Photos from ${stop.name}` },
    h('div', { class: 'lightbox__bar' }, h('div', null, h('strong', null, stop.name), count),
      h('button', { class: 'round', 'aria-label': 'Close photos', onclick: close }, icon('close'))),
    track);
  const total = stop.photos.length;
  const label = (i) => { count.textContent = `${i + 1} of ${total}`; };
  stop.photos.forEach((id, i) => {
    const img = h('img', { alt: `Photo ${i + 1} from ${stop.name}` });
    store.photoUrl(id, 'full').then((u) => { img.src = u; });
    track.append(h('figure', null, img));
  });
  track.addEventListener('scroll', () => label(Math.round(track.scrollLeft / track.clientWidth)), { passive: true });
  document.body.append(box);
  track.scrollLeft = start * track.clientWidth;
  label(start);
  requestAnimationFrame(() => box.classList.add('is-open'));
}

// ---------- start ----------

function route() {
  const m = location.hash.match(/^#\/trip\/(.+)$/);
  document.getElementById('layers').replaceChildren();
  if (m) openTrip(m[1]);
  else { closeTrip(); document.title = 'Waymark'; }
}

function boot() {
  $('btn-back').append(icon('back'));
  $('btn-menu').append(icon('more'));
  $('btn-fit').append(icon('fit'));
  $('btn-mode').append(icon('road'));
  $('btn-locate').append(icon('locate'));
  $('btn-replay').append(icon('play'));
  $('replay-stop').append(icon('stop'));
  $('trip').append(h('p', { class: 'credit' }, 'Map data from ', h('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener' }, 'OpenStreetMap'), ', tiles by OpenFreeMap'));

  sheet = new Sheet($('sheet'), () => { if (mapOk) map.setPadding(camPad()); });
  $('trip').inert = true;

  $('btn-add').addEventListener('click', addStop);
  $('btn-title').addEventListener('click', () => renameTrip(S.trip));
  $('btn-menu').addEventListener('click', () => tripMenu(S.trip, true));
  $('btn-fit').addEventListener('click', () => { map.setPadding(camPad()); map.select((S.selected = null)); renderTrip(); map.fit(); });
  $('btn-mode').addEventListener('click', toggleMode);
  $('btn-locate').addEventListener('click', showMe);
  $('btn-replay').addEventListener('click', startReplay);
  $('replay-stop').addEventListener('click', stopReplay);

  addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
