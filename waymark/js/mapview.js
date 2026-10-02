// The map: a recoloured OpenFreeMap style, numbered stop markers, and the route
// drawn leg by leg as arrows (or along the roads actually driven).

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const INK = '#17202a';
const PAINT = '#ffc629';
const MARKER_R = 16; // marker radius plus its white ring, so arrow tips stop at the edge

const C = {
  land: '#edf0ea', park: '#d8e5d1', wood: '#dde8d7', water: '#b7d2dc', built: '#e6e9e3',
  building: '#dfe3dc', casing: '#ccd3cb', road: '#ffffff', rail: '#cfd5cf',
  border: '#93a09a', label: '#2a353d', soft: '#6a777f', waterLabel: '#4a7686', halo: 'rgba(244,246,243,0.9)',
};

function recolour(style) {
  for (const l of style.layers) {
    const id = l.id, p = (l.paint ??= {});
    if (l.type === 'background') p['background-color'] = C.land;
    else if (id === 'park') p['fill-color'] = C.park;
    else if (id === 'water') p['fill-color'] = C.water;
    else if (id === 'waterway') p['line-color'] = C.water;
    else if (id === 'landcover_wood') p['fill-color'] = C.wood;
    else if (id === 'landuse_residential') p['fill-color'] = C.built;
    else if (id === 'building') { p['fill-color'] = C.building; p['fill-outline-color'] = C.casing; }
    else if (id.startsWith('road_') && l.type !== 'symbol') p[l.type === 'fill' ? 'fill-color' : 'line-color'] = C.land;
    else if (id.startsWith('boundary')) p['line-color'] = C.border;
    else if (id.startsWith('railway')) p['line-color'] = id.endsWith('dashline') ? C.land : C.rail;
    else if (l.type === 'line' && /casing|subtle/.test(id)) p['line-color'] = C.casing;
    else if (l.type === 'line' && /highway|tunnel/.test(id)) p['line-color'] = C.road;
    else if (l.type === 'symbol' && p['text-color']) {
      p['text-color'] = id.startsWith('water') ? C.waterLabel : /city|country|town/.test(id) ? C.label : C.soft;
      p['text-halo-color'] = C.halo;
    }
  }
  return style;
}

// ---------- geometry ----------

const mercY = (lat) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
const unmercY = (y) => (Math.atan(Math.exp((y * Math.PI) / 180)) * 360) / Math.PI - 90;

// A gentle arc from a to b, always bowing to the left of the direction of travel,
// so an out-and-back pair of legs opens into a lens instead of overlapping.
function arc(a, b) {
  let bx = b.lon;
  if (bx - a.lon > 180) bx -= 360;
  if (bx - a.lon < -180) bx += 360;
  const ax = a.lon, ay = mercY(a.lat), by = mercY(b.lat);
  const dx = bx - ax, dy = by - ay;
  const cx = (ax + bx) / 2 - dy * 0.17, cy = (ay + by) / 2 + dx * 0.17;
  const out = [];
  for (let i = 0; i <= 56; i++) {
    const t = i / 56, u = 1 - t;
    out.push([u * u * ax + 2 * u * t * cx + t * t * bx, unmercY(u * u * ay + 2 * u * t * cy + t * t * by)]);
  }
  return out;
}

function cut(coords, t) {
  if (t >= 1) return coords;
  const seg = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let want = total * t;
  const out = [coords[0]];
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i]) {
      const k = seg[i] ? want / seg[i] : 0;
      out.push([coords[i][0] + (coords[i + 1][0] - coords[i][0]) * k, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * k]);
      return out;
    }
    want -= seg[i];
    out.push(coords[i + 1]);
  }
  return out;
}

// Compass bearing at the end of a line, looking a little way back so a ragged
// last road segment does not spin the arrowhead.
function endBearing(coords) {
  const end = coords[coords.length - 1];
  let i = coords.length - 2;
  let span = 0, total = 0;
  for (let j = 1; j < coords.length; j++) total += Math.hypot(coords[j][0] - coords[j - 1][0], coords[j][1] - coords[j - 1][1]);
  while (i > 0 && span < total * 0.04) {
    span += Math.hypot(coords[i + 1][0] - coords[i][0], coords[i + 1][1] - coords[i][1]);
    i--;
  }
  const from = coords[Math.max(i, 0)];
  return (Math.atan2(end[0] - from[0], mercY(end[1]) - mercY(from[1])) * 180) / Math.PI;
}

function arrowImage() {
  const s = 2, c = document.createElement('canvas');
  c.width = 26 * s; c.height = 26 * s;
  const g = c.getContext('2d');
  g.scale(s, s);
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(13, 2.5); g.lineTo(23.5, 22.5); g.lineTo(13, 17.5); g.lineTo(2.5, 22.5);
  g.closePath();
  g.fillStyle = PAINT; g.fill();
  g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke();
  return { width: c.width, height: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
}

const ease = (t) => 1 - Math.pow(1 - t, 3);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class MapView {
  constructor(container, { onStopTap }) {
    this.container = container;
    this.onStopTap = onStopTap;
    this.stops = [];
    this.mode = 'arrows';
    this.markers = [];
    this.pad = { top: 90, bottom: 200, left: 44, right: 70 };
    this.token = 0;
    this.ready = this.init();
  }

  async init() {
    const style = recolour(await (await fetch(STYLE_URL)).json());
    const map = (this.map = new maplibregl.Map({
      container: this.container, style,
      center: [8.3, 46.8], zoom: 4.2,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
      fadeDuration: 150,
    }));
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('map timed out')), 20000);
      map.once('load', () => { clearTimeout(timer); resolve(); });
    });

    map.addImage('waymark-head', arrowImage(), { pixelRatio: 2 });
    const empty = { type: 'FeatureCollection', features: [] };
    for (const id of ['legs', 'heads', 'names']) map.addSource(id, { type: 'geojson', data: empty });

    const round = { 'line-cap': 'round', 'line-join': 'round' };
    const width = (a, b) => ['interpolate', ['linear'], ['zoom'], 3, a, 9, b];
    map.addLayer({ id: 'leg-edge', type: 'line', source: 'legs', layout: round, paint: { 'line-color': INK, 'line-width': width(5.5, 8) } });
    map.addLayer({ id: 'leg-fill', type: 'line', source: 'legs', layout: round, paint: { 'line-color': PAINT, 'line-width': width(2.8, 4.6) } });
    map.addLayer({
      id: 'heads', type: 'symbol', source: 'heads',
      layout: {
        'icon-image': 'waymark-head', 'icon-anchor': 'top', 'icon-rotate': ['get', 'bearing'], 'icon-offset': ['get', 'offset'],
        'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      },
    });
    map.addLayer({
      id: 'names', type: 'symbol', source: 'names',
      layout: {
        'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 13.5,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'], 'text-radial-offset': 1.45, 'text-max-width': 9,
      },
      paint: { 'text-color': INK, 'text-halo-color': '#fff', 'text-halo-width': 1.8 },
    });
  }

  resize() { this.map?.resize(); }
  setPadding(pad) { this.pad = pad; }

  // Point moves are centred in the area the sheet and buttons leave free. This is
  // an offset rather than a camera padding because MapLibre keeps a padding once
  // given one, and fitBounds would then add its own on top.
  offset() { const p = this.pad; return [(p.left - p.right) / 2, (p.top - p.bottom) / 2]; }

  // ---------- data ----------

  setTrip(stops, mode, { enter = -1 } = {}) {
    this.token++;
    this.stops = stops;
    this.mode = mode;
    this.geoms = stops.map((s, i) => (i === 0 ? null : mode === 'roads' && s.road?.coords?.length > 1 ? s.road.coords : arc(stops[i - 1], s)));

    this.markers.forEach((m) => m.marker.remove());
    this.markers = stops.map((s, i) => {
      const dot = document.createElement('div');
      dot.className = 'mk' + (i === 0 ? ' mk--start' : i === stops.length - 1 ? ' mk--now' : '') + (i === enter ? ' mk--enter' : '');
      dot.textContent = i + 1;
      const wrap = document.createElement('div');
      wrap.className = 'mk-wrap';
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('aria-label', `Stop ${i + 1}, ${s.name}`);
      wrap.append(dot);
      wrap.addEventListener('click', (e) => { e.stopPropagation(); this.onStopTap(s.id); });
      return { id: s.id, dot, marker: new maplibregl.Marker({ element: wrap }).setLngLat([s.lon, s.lat]).addTo(this.map) };
    });
    this.draw();
  }

  // Draw legs 1..upto in full; `partial` draws one more leg up to fraction t.
  draw(upto = this.stops.length - 1, partial = null) {
    const legs = [], heads = [];
    const add = (i, t) => {
      const coords = cut(this.geoms[i], t);
      if (coords.length < 2) return;
      legs.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
      heads.push({
        type: 'Feature',
        properties: { bearing: endBearing(coords), offset: [0, MARKER_R * Math.pow(t, 4)] },
        geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
      });
    };
    for (let i = 1; i <= upto; i++) add(i, 1);
    if (partial) add(partial.i, partial.t);
    const shown = partial ? partial.i - 1 : upto;
    this.map.getSource('legs').setData({ type: 'FeatureCollection', features: legs });
    this.map.getSource('heads').setData({ type: 'FeatureCollection', features: heads });
    this.map.getSource('names').setData({
      type: 'FeatureCollection',
      features: this.stops.filter((_, i) => i <= shown).map((s) => ({
        type: 'Feature', properties: { name: s.name }, geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      })),
    });
    this.markers.forEach((m, i) => m.dot.classList.toggle('mk--hidden', i > shown));
  }

  select(id) {
    this.markers.forEach((m) => m.dot.classList.toggle('mk--sel', m.id === id));
  }

  // ---------- camera ----------

  moved(run, max = 2500) {
    return new Promise((resolve) => {
      const done = () => { clearTimeout(timer); this.map.off('moveend', done); resolve(); };
      const timer = setTimeout(done, max);
      this.map.once('moveend', done);
      run();
    });
  }

  bounds(from = 0, to = this.stops.length - 1) {
    const b = new maplibregl.LngLatBounds();
    for (let i = from; i <= to; i++) {
      b.extend([this.stops[i].lon, this.stops[i].lat]);
      if (i > from && this.geoms[i]) this.geoms[i].forEach((c) => b.extend(c));
    }
    return b;
  }

  fit({ duration = 900, from, to } = {}) {
    const n = this.stops.length;
    if (!n) return Promise.resolve();
    if (n === 1 || (from != null && from === to)) {
      const s = this.stops[from ?? 0];
      return this.moved(() => this.map.easeTo({ center: [s.lon, s.lat], zoom: Math.max(this.map.getZoom(), 8.5), offset: this.offset(), duration }));
    }
    return this.moved(() => this.map.fitBounds(this.bounds(from, to), { padding: this.pad, maxZoom: 11.5, duration }));
  }

  focus(stop) {
    return this.moved(() => this.map.easeTo({ center: [stop.lon, stop.lat], zoom: Math.max(this.map.getZoom(), 9), offset: this.offset(), duration: 800 }));
  }

  center() { const c = this.map.getCenter(); return { lat: c.lat, lon: c.lng }; }

  showMe(lat, lon) {
    if (!this.me) {
      const el = document.createElement('div');
      el.className = 'me';
      this.me = new maplibregl.Marker({ element: el });
    }
    this.me.setLngLat([lon, lat]).addTo(this.map);
    return this.moved(() => this.map.easeTo({ center: [lon, lat], zoom: Math.max(this.map.getZoom(), 10), offset: this.offset(), duration: 900 }));
  }

  // ---------- motion ----------

  animateLeg(i, ms = 1100) {
    const token = this.token;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (token !== this.token) return resolve(false);
        const t = still ? 1 : Math.min(1, (now - t0) / ms);
        this.draw(i - 1, { i, t: ease(t) });
        if (t < 1) requestAnimationFrame(frame);
        else { this.draw(i); resolve(true); }
      };
      requestAnimationFrame(frame);
    });
  }

  // Walk the trip from the start, one leg at a time. Resolves false if cancelled.
  async replay(onStep) {
    const token = ++this.token;
    const alive = () => token === this.token;
    this.draw(0);
    onStep(0);
    await this.fit({ from: 0, to: 0, duration: 900 });
    for (let i = 1; i < this.stops.length && alive(); i++) {
      await wait(650);
      if (!alive()) break;
      await this.fit({ from: i - 1, to: i, duration: 1000 });
      if (!alive()) break;
      this.token = token; // animateLeg checks the same token
      if (!(await this.animateLeg(i, 1300))) break;
      onStep(i);
    }
    if (!alive()) return false;
    await wait(900);
    if (!alive()) return false;
    await this.fit({ duration: 1200 });
    return true;
  }

  cancel() {
    this.token++;
    if (this.stops.length) this.draw();
  }
}
