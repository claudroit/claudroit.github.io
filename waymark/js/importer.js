// Turns a pile of photos (or a zip of them) into stops: reads where and when each
// was taken, groups shots taken close together into places, names each place,
// and shows the result sorted by city before anything is added to the trip.

import * as store from './store.js';
import { preparePhoto, placeAt, haversine, fmtRange } from './services.js';
import { readMeta, zipPhotos, isZip, isImage } from './photos.js';
import { h, icon, openPanel } from './ui.js';

const SAME_PLACE_KM = 0.35; // photos closer than this, and close in time, are one place
const SAME_PLACE_GAP = 4 * 3600e3;
const NEAREST_MATCH = 12 * 3600e3; // photos without a location join the stop closest in time, within this

const plural = (n, word, many = word + 's') => `${n} ${n === 1 ? word : many}`;
const tsOf = (s) => (s.date ? new Date(`${s.date}T${s.time || '12:00'}:00`).getTime() : null);

// Resolves { stops, attach: Map(stopId -> photoIds), keys } or null if cancelled.
export function importPhotos(trip, files) {
  return new Promise((resolve) => {
    let cancelled = false;
    const stored = []; // photo ids written so far, removed again on cancel
    const urls = [];

    const add = h('button', { class: 'sign sign--compact', disabled: true }, 'Add');
    const body = h('div', { class: 'panel__scroll' });
    const p = openPanel(h('div', { style: 'display:contents' },
      h('div', { class: 'panel__head' },
        h('button', { class: 'plain', onclick: cancel }, 'Cancel'),
        h('h2', null, 'Photos'),
        add),
      body), 'form');

    async function cancel() {
      cancelled = true;
      await p.close();
      urls.forEach((u) => URL.revokeObjectURL(u));
      for (const id of stored) await store.deletePhoto(id);
      resolve(null);
    }

    // ---------- progress ----------

    const step = h('strong'), count = h('span'), fill = h('i');
    body.replaceChildren(h('div', { class: 'importing' },
      h('div', { class: 'importing__art' }, icon('photos')),
      step, count, h('div', { class: 'bar' }, fill)));
    const progress = (label, done, total, unit = 'photos') => {
      step.textContent = label;
      count.textContent = total ? `${done} of ${plural(total, unit.replace(/s$/, ''), unit)}` : '';
      fill.style.width = total ? `${(done / total) * 100}%` : '0%';
    };

    run().catch(() => {
      if (cancelled) return;
      body.replaceChildren(h('div', { class: 'importing' }, h('strong', null, 'Those photos could not be read'),
        h('span', null, 'Try choosing fewer at a time, or a different zip file.')));
    });

    async function run() {
      // 1. Collect the photos, unpacking zips.
      progress('Opening', 0, 0);
      const sources = [];
      let badZip = 0;
      for (const f of files) {
        if (isZip(f)) {
          try { (await zipPhotos(f)).forEach((e) => sources.push(e)); } catch { badZip++; }
        } else if (isImage(f)) {
          sources.push({ name: f.name, size: f.size, file: async () => f });
        }
      }
      if (cancelled) return;
      if (!sources.length) {
        body.replaceChildren(h('div', { class: 'importing' }, h('strong', null, 'No photos found'),
          h('span', null, badZip ? 'That zip file could not be opened.' : 'Choose photos, or a zip file with photos in it.')));
        return;
      }

      // 2. Read each one: location and time, plus a resized copy kept for the journal.
      const inTrip = new Set(trip.photoKeys || []), seen = new Set();
      const items = [];
      let already = 0, twice = 0, unreadable = 0;
      for (let i = 0; i < sources.length && !cancelled; i++) {
        progress('Reading photos', i, sources.length);
        const src = sources[i];
        let file;
        try { file = await src.file(); } catch { unreadable++; continue; }
        const meta = await readMeta(file);
        const key = `${src.name}|${file.size}|${meta.ts || ''}`;
        if (inTrip.has(key)) { already++; continue; }
        if (seen.has(key)) { twice++; continue; }
        seen.add(key);
        const item = { key, name: src.name, ...meta, photoId: null, thumb: '' };
        try {
          const data = await preparePhoto(file);
          if (cancelled) break;
          item.photoId = store.uid();
          await store.putPhoto({ id: item.photoId, tripId: trip.id, ...data });
          stored.push(item.photoId);
          item.thumb = URL.createObjectURL(new Blob([data.thumb], { type: data.type }));
          urls.push(item.thumb);
        } catch {
          item.undisplayable = true; // e.g. HEIC in a browser that cannot show it; its location still counts
        }
        items.push(item);
      }
      if (cancelled) return;

      // 3. Group photos taken close together into places, in the order they were taken.
      const located = items.filter((x) => x.lat != null)
        .sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity) || a.name.localeCompare(b.name, undefined, { numeric: true }));
      const places = [];
      for (const it of located) {
        const cur = places[places.length - 1];
        const close = cur && haversine(cur, it) < SAME_PLACE_KM && (!cur.last || !it.ts || it.ts - cur.last < SAME_PLACE_GAP);
        if (close) {
          cur.items.push(it);
          const n = cur.items.length;
          cur.lat += (it.lat - cur.lat) / n;
          cur.lon += (it.lon - cur.lon) / n;
          if (it.ts) cur.last = it.ts;
        } else {
          places.push({ items: [it], lat: it.lat, lon: it.lon, first: it.ts, last: it.ts, date: it.date || '', time: it.time || '' });
        }
      }

      // 4. Name each place, and find the city it is in.
      const cache = new Map();
      let done = 0;
      progress('Finding the places', 0, places.length, 'places');
      await pool(places, 2, async (pl) => {
        const k = pl.lat.toFixed(3) + ',' + pl.lon.toFixed(3);
        if (!cache.has(k)) cache.set(k, placeAt(pl.lat, pl.lon).catch(() => null));
        const found = await cache.get(k);
        pl.name = found?.name || `Near ${pl.lat.toFixed(3)}, ${pl.lon.toFixed(3)}`;
        pl.city = found?.city || '';
        pl.country = found?.country || '';
        pl.sub = found?.sub || '';
        progress('Finding the places', ++done, places.length, 'places');
      }, () => cancelled);
      if (cancelled) return;

      // 5. Photos without a location go with whichever stop was closest in time.
      const attach = new Map();
      let unplaced = 0;
      const targets = [
        ...places.filter((pl) => pl.first).map((pl) => ({ ts: pl.first, end: pl.last, place: pl })),
        ...trip.stops.filter((s) => s.date).map((s) => ({ ts: tsOf(s), end: tsOf(s), stop: s })),
      ];
      for (const it of items.filter((x) => x.lat == null && x.photoId)) {
        let best = null, gap = Infinity;
        if (it.ts) {
          for (const t of targets) {
            const d = it.ts < t.ts ? t.ts - it.ts : it.ts > t.end ? it.ts - t.end : 0;
            if (d < gap) { gap = d; best = t; }
          }
        }
        if (!best || gap > NEAREST_MATCH) { unplaced++; it.unplaced = true; continue; }
        if (best.place) best.place.items.push(it);
        else attach.set(best.stop.id, [...(attach.get(best.stop.id) || []), it.photoId]);
        it.attached = best.place?.name || best.stop.name;
      }

      review({ items, places, attach, already, twice, unreadable, unplaced });
    }

    // ---------- review ----------

    function review({ items, places, attach, already, twice, unreadable, unplaced }) {
      const cities = [];
      for (const pl of places) {
        const key = `${pl.city}|${pl.country}`.toLowerCase();
        let c = cities.find((x) => x.key === key);
        if (!c) cities.push((c = { key, name: pl.city || 'Unnamed area', country: pl.country, places: [], on: true }));
        c.places.push(pl);
      }
      const attachedCount = [...attach.values()].reduce((n, ids) => n + ids.length, 0);
      const noLocation = items.filter((x) => x.lat == null).length;
      const undisplayable = items.filter((x) => x.undisplayable).length;

      const update = () => {
        const n = cities.filter((c) => c.on).reduce((k, c) => k + c.places.length, 0);
        add.disabled = !n && !attachedCount;
        add.textContent = n ? `Add ${plural(n, 'stop')}` : attachedCount ? 'Add photos' : 'Add';
      };

      const dates = places.flatMap((pl) => pl.items.map((x) => x.date)).filter(Boolean).sort();
      const photoCount = places.reduce((n, pl) => n + pl.items.length, 0);
      const out = [];

      if (places.length) {
        out.push(h('div', { class: 'found' },
          h('p', { class: 'found__big' }, `${plural(places.length, 'place')} in ${plural(cities.length, 'city', 'cities')}`),
          h('p', null, [plural(photoCount, 'photo'), dates.length && fmtRange(dates[0], dates[dates.length - 1])].filter(Boolean).join(', '))));
      } else if (!items.length) {
        out.push(h('div', { class: 'importing' }, h('strong', null, 'Nothing new to add'),
          h('span', null, already ? 'These photos are already in this trip.' : 'None of these photos could be read.')));
      } else {
        out.push(h('div', { class: 'importing' }, h('strong', null, 'No locations in these photos'),
          h('span', null, attachedCount
            ? `${plural(attachedCount, 'photo')} can still go with the stops taken at about the same time.`
            : 'They have no GPS position saved in them, so there is nothing to place on the map.')));
      }

      for (const c of cities) {
        const thumbs = c.places.flatMap((pl) => pl.items).filter((x) => x.thumb);
        const cDates = c.places.flatMap((pl) => pl.items.map((x) => x.date)).filter(Boolean).sort();
        const toggle = h('input', { type: 'checkbox', class: 'switch', checked: true, 'aria-label': `Include ${c.name}` });
        const card = h('section', { class: 'citycard' });
        toggle.addEventListener('change', () => { c.on = toggle.checked; card.classList.toggle('is-off', !c.on); update(); });
        card.append(
          h('label', { class: 'citycard__head' },
            h('div', null,
              h('h3', null, c.name, c.country && c.country !== c.name && h('span', null, c.country)),
              h('p', null, [plural(c.places.length, 'place'), plural(c.places.reduce((n, pl) => n + pl.items.length, 0), 'photo'),
                cDates.length && fmtRange(cDates[0], cDates[cDates.length - 1])].filter(Boolean).join(' · '))),
            toggle),
          thumbs.length ? h('div', { class: 'strip strip--small' },
            ...thumbs.slice(0, 12).map((x) => h('span', null, h('img', { src: x.thumb, alt: '' }))),
            thumbs.length > 12 && h('span', { class: 'strip__more' }, `+${thumbs.length - 12}`)) : null,
          h('ol', { class: 'citycard__places' }, ...c.places.map((pl) =>
            h('li', null, h('span', null, pl.name), h('small', null, [pl.time, plural(pl.items.length, 'photo')].filter(Boolean).join(' · '))))));
        out.push(card);
      }

      const notes = [];
      if (noLocation) {
        const parts = [`${plural(noLocation, 'photo')} had no location saved in ${noLocation === 1 ? 'it' : 'them'}.`];
        const joined = noLocation - unplaced - items.filter((x) => x.lat == null && !x.photoId).length;
        if (joined > 0) parts.push(`${joined === noLocation ? (joined === 1 ? 'It goes' : 'They go') : joined === 1 ? '1 goes' : `${joined} go`} with the stop taken closest in time.`);
        if (unplaced) parts.push(`${unplaced} could not be matched to a stop and ${unplaced === 1 ? 'is' : 'are'} left out.`);
        parts.push('On iPhone, photos picked from the photo library can arrive without their location. Saving them to Files first, or zipping them, keeps it.');
        notes.push(parts.join(' '));
      }
      if (undisplayable) notes.push(`${plural(undisplayable, 'photo')} ${undisplayable === 1 ? 'is' : 'are'} in a format this browser cannot show (often HEIC). ${undisplayable === 1 ? 'Its location is' : 'Their locations are'} still used.`);
      if (already) notes.push(`${plural(already, 'photo')} ${already === 1 ? 'was' : 'were'} already in this trip and ${already === 1 ? 'was' : 'were'} skipped.`);
      if (twice) notes.push(`${plural(twice, 'photo')} appeared twice in what you chose; ${twice === 1 ? 'the copy was' : 'the copies were'} skipped.`);
      if (unreadable) notes.push(`${plural(unreadable, 'file')} could not be opened.`);
      if (places.length) notes.push('Each place becomes a stop. On the trip, switch between Every place and Cities to see the detailed route or just the cities.');
      if (notes.length) out.push(h('div', { class: 'importnotes' }, ...notes.map((t) => h('p', null, t))));

      body.replaceChildren(...out);
      body.scrollTop = 0;
      update();

      add.onclick = async () => {
        add.disabled = true;
        const chosen = cities.filter((c) => c.on).flatMap((c) => c.places).sort((a, b) => (a.first ?? Infinity) - (b.first ?? Infinity));
        const keep = new Set([...chosen.flatMap((pl) => pl.items.map((x) => x.photoId)), ...[...attach.values()].flat()].filter(Boolean));
        const stops = chosen.map((pl) => ({
          id: store.uid(), name: pl.name, sub: pl.sub, lat: +pl.lat.toFixed(6), lon: +pl.lon.toFixed(6),
          city: pl.city || undefined, country: pl.country,
          date: pl.date, time: pl.time, notes: '', road: null, source: 'photos',
          photos: pl.items.map((x) => x.photoId).filter(Boolean),
        }));
        const keys = items.filter((x) => !x.photoId || keep.has(x.photoId)).map((x) => x.key);
        for (const id of stored) if (!keep.has(id)) await store.deletePhoto(id);
        urls.forEach((u) => URL.revokeObjectURL(u));
        await p.close();
        resolve({ stops, attach, keys });
      };
    }
  });
}

async function pool(list, n, fn, stop) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length && !stop()) await fn(list[i++]);
  }));
}
