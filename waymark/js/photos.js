// Reads where and when a photo was taken from its EXIF data (JPEG, HEIC/HEIF,
// PNG, WebP), and lists the photos inside a zip without loading all of it.
// Only small slices of each file are read, so large photos and archives are fine.

const IMAGE_EXT = /\.(jpe?g|heic|heif|png|webp|avif)$/i;
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', heic: 'image/heic', heif: 'image/heif', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

export const isZip = (f) => /\.zip$/i.test(f.name) || /zip/.test(f.type);
export const isImage = (f) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name);

// { lat, lon, date: 'YYYY-MM-DD', time: 'HH:MM', ts } — any of them may be missing.
export async function readMeta(file) {
  try {
    const head = new DataView(await file.slice(0, 512 * 1024).arrayBuffer());
    const tiff = await findTiff(file, head);
    return tiff ? parseTiff(tiff) : {};
  } catch {
    return {};
  }
}

const fourcc = (v, o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
const sub = (v, start, end) => new DataView(v.buffer, v.byteOffset + start, Math.max(0, Math.min(end, v.byteLength) - start));

async function findTiff(file, v) {
  if (v.byteLength < 12) return null;
  if (v.getUint16(0) === 0xffd8) return jpegTiff(v);
  if (v.getUint32(0) === 0x89504e47) return pngTiff(v);
  if (fourcc(v, 0) === 'RIFF' && fourcc(v, 8) === 'WEBP') return webpTiff(v);
  if (fourcc(v, 4) === 'ftyp') return heifTiff(file, v);
  return null;
}

function jpegTiff(v) {
  let o = 2;
  while (o + 4 <= v.byteLength) {
    if (v.getUint8(o) !== 0xff) return null;
    const m = v.getUint8(o + 1);
    if (m === 0xff) { o++; continue; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { o += 2; continue; }
    if (m === 0xda || m === 0xd9) return null; // image data starts; no EXIF before it
    const len = v.getUint16(o + 2);
    if (m === 0xe1 && len > 8 && v.getUint32(o + 4) === 0x45786966 && v.getUint16(o + 8) === 0) return sub(v, o + 10, o + 2 + len);
    o += 2 + len;
  }
  return null;
}

function pngTiff(v) {
  let o = 8;
  while (o + 12 <= v.byteLength) {
    const len = v.getUint32(o), type = fourcc(v, o + 4);
    if (type === 'eXIf') return sub(v, o + 8, o + 8 + len);
    if (type === 'IDAT' || type === 'IEND') return null;
    o += 12 + len;
  }
  return null;
}

function webpTiff(v) {
  let o = 12;
  while (o + 8 <= v.byteLength) {
    const type = fourcc(v, o), len = v.getUint32(o + 4, true);
    if (type === 'EXIF') {
      const start = fourcc(v, o + 8) === 'Exif' ? o + 14 : o + 8;
      return sub(v, start, o + 8 + len);
    }
    o += 8 + len + (len & 1);
  }
  return null;
}

// HEIC/HEIF/AVIF: find the item of type "Exif" in the meta box, then read its bytes
// from wherever the item location table says they are.
async function heifTiff(file, v) {
  const boxes = (start, end) => {
    const out = [];
    let o = start;
    while (o + 8 <= end) {
      let size = v.getUint32(o), hdr = 8;
      const type = fourcc(v, o + 4);
      if (size === 1) { size = Number(v.getBigUint64(o + 8)); hdr = 16; }
      else if (size === 0) size = end - o;
      if (size < hdr) break;
      out.push({ type, start: o + hdr, end: Math.min(o + size, end) });
      o += size;
    }
    return out;
  };
  const meta = boxes(0, v.byteLength).find((b) => b.type === 'meta');
  if (!meta) return null;
  const kids = boxes(meta.start + 4, meta.end);
  const iinf = kids.find((b) => b.type === 'iinf'), iloc = kids.find((b) => b.type === 'iloc');
  if (!iinf || !iloc) return null;

  let o = iinf.start;
  o += 4 + (v.getUint8(o) === 0 ? 2 : 4);
  let exifId = null;
  for (const b of boxes(o, iinf.end)) {
    if (b.type !== 'infe') continue;
    const ver = v.getUint8(b.start);
    if (ver < 2) continue;
    let p = b.start + 4;
    const id = ver === 3 ? v.getUint32(p) : v.getUint16(p);
    p += (ver === 3 ? 4 : 2) + 2;
    if (fourcc(v, p) === 'Exif') { exifId = id; break; }
  }
  if (exifId == null) return null;

  o = iloc.start;
  const ver = v.getUint8(o);
  o += 4;
  const sizes = v.getUint16(o);
  o += 2;
  const offSize = sizes >> 12, lenSize = (sizes >> 8) & 15, baseSize = (sizes >> 4) & 15, idxSize = ver > 0 ? sizes & 15 : 0;
  const num = (n) => { let x = 0; for (let i = 0; i < n; i++) x = x * 256 + v.getUint8(o + i); o += n; return x; };
  const count = num(ver < 2 ? 2 : 4);
  for (let i = 0; i < count; i++) {
    const id = num(ver < 2 ? 2 : 4);
    const method = ver > 0 ? num(2) & 15 : 0;
    num(2); // data reference index
    const base = num(baseSize);
    const extents = num(2);
    let first = null;
    for (let e = 0; e < extents; e++) {
      if (idxSize) num(idxSize);
      const off = num(offSize), len = num(lenSize);
      first ??= { off: base + off, len: len || 256 * 1024 };
    }
    if (id !== exifId) continue;
    if (method !== 0 || !first) return null;
    const buf = new DataView(await file.slice(first.off, first.off + first.len).arrayBuffer());
    return sub(buf, 4 + buf.getUint32(0), buf.byteLength);
  }
  return null;
}

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function parseTiff(v) {
  if (v.byteLength < 8) return {};
  const mark = v.getUint16(0);
  if (mark !== 0x4949 && mark !== 0x4d4d) return {};
  const le = mark === 0x4949;
  const u16 = (o) => v.getUint16(o, le), u32 = (o) => v.getUint32(o, le);

  const value = (type, count, at) => {
    if (type === 2) {
      let s = '';
      for (let i = 0; i < count; i++) { const c = v.getUint8(at + i); if (!c) break; s += String.fromCharCode(c); }
      return s.trim();
    }
    const out = [];
    for (let i = 0; i < Math.min(count, 4); i++) {
      if (type === 3) out.push(u16(at + i * 2));
      else if (type === 4) out.push(u32(at + i * 4));
      else if (type === 9) out.push(v.getInt32(at + i * 4, le));
      else if (type === 5) out.push(u32(at + i * 8) / (u32(at + i * 8 + 4) || 1));
      else if (type === 10) out.push(v.getInt32(at + i * 8, le) / (v.getInt32(at + i * 8 + 4, le) || 1));
      else out.push(v.getUint8(at + i));
    }
    return count === 1 ? out[0] : out;
  };
  const ifd = (o) => {
    const tags = {};
    if (!o || o + 2 > v.byteLength) return tags;
    const n = u16(o);
    for (let i = 0; i < n; i++) {
      const e = o + 2 + i * 12;
      if (e + 12 > v.byteLength) break;
      const type = u16(e + 2), count = u32(e + 4);
      const size = (TYPE_SIZE[type] || 1) * count;
      const at = size > 4 ? u32(e + 8) : e + 8;
      if (at + size > v.byteLength) continue;
      tags[u16(e)] = value(type, count, at);
    }
    return tags;
  };

  const ifd0 = ifd(u32(4));
  const exif = ifd(ifd0[0x8769]);
  const gps = ifd(ifd0[0x8825]);
  const out = {};

  const deg = (x) => (Array.isArray(x) ? x[0] + (x[1] || 0) / 60 + (x[2] || 0) / 3600 : NaN);
  let lat = deg(gps[2]), lon = deg(gps[4]);
  if (gps[1] === 'S') lat = -lat;
  if (gps[3] === 'W') lon = -lon;
  // Some cameras write 0,0 when they have no fix.
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat || lon)) {
    out.lat = +lat.toFixed(6);
    out.lon = +lon.toFixed(6);
  }

  const stamp = [exif[0x9003], exif[0x9004], ifd0[0x0132]].find((s) => typeof s === 'string' && /^\d{4}:\d\d:\d\d \d\d:\d\d/.test(s) && !s.startsWith('0000'));
  if (stamp) {
    const [, y, mo, d, hh, mm] = stamp.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/);
    out.date = `${y}-${mo}-${d}`;
    out.time = `${hh}:${mm}`;
    out.ts = new Date(+y, +mo - 1, +d, +hh, +mm).getTime();
  } else if (typeof gps[29] === 'string' && /^\d{4}:\d\d:\d\d$/.test(gps[29])) {
    out.date = gps[29].replace(/:/g, '-');
    out.ts = new Date(out.date + 'T12:00:00').getTime();
  }
  return out;
}

// ---------- zip ----------

const dosTime = (d, t) => new Date(1980 + (d >> 9), ((d >> 5) & 15) - 1, d & 31, t >> 11, (t >> 5) & 63, (t & 31) * 2).getTime();

// Lists the photos in a zip. Each entry's file() unpacks just that photo.
export async function zipPhotos(zip) {
  const size = zip.size;
  const tailLen = Math.min(size, 65557);
  const tail = new DataView(await zip.slice(size - tailLen).arrayBuffer());
  let e = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('not a zip');
  let count = tail.getUint16(e + 10, true), cdSize = tail.getUint32(e + 12, true), cdOff = tail.getUint32(e + 16, true);
  if (count === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {
    const loc = e - 20; // zip64
    if (loc >= 0 && tail.getUint32(loc, true) === 0x07064b50) {
      const at = Number(tail.getBigUint64(loc + 8, true));
      const r = new DataView(await zip.slice(at, at + 56).arrayBuffer());
      if (r.getUint32(0, true) === 0x06064b50) {
        cdSize = Number(r.getBigUint64(40, true));
        cdOff = Number(r.getBigUint64(48, true));
      }
    }
  }

  const cd = new DataView(await zip.slice(cdOff, cdOff + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const entries = [];
  let o = 0;
  while (o + 46 <= cd.byteLength && cd.getUint32(o, true) === 0x02014b50) {
    const flags = cd.getUint16(o + 8, true), method = cd.getUint16(o + 10, true);
    const mtime = dosTime(cd.getUint16(o + 14, true), cd.getUint16(o + 12, true));
    let comp = cd.getUint32(o + 20, true), plain = cd.getUint32(o + 24, true), local = cd.getUint32(o + 42, true);
    const nl = cd.getUint16(o + 28, true), xl = cd.getUint16(o + 30, true), cl = cd.getUint16(o + 32, true);
    const path = dec.decode(new Uint8Array(cd.buffer, o + 46, nl));
    for (let x = o + 46 + nl; x + 4 <= o + 46 + nl + xl; ) {
      const id = cd.getUint16(x, true), len = cd.getUint16(x + 2, true);
      if (id === 1) {
        let p = x + 4;
        if (plain === 0xffffffff) { plain = Number(cd.getBigUint64(p, true)); p += 8; }
        if (comp === 0xffffffff) { comp = Number(cd.getBigUint64(p, true)); p += 8; }
        if (local === 0xffffffff) local = Number(cd.getBigUint64(p, true));
      }
      x += 4 + len;
    }
    o += 46 + nl + xl + cl;
    const name = path.split('/').pop();
    if (path.endsWith('/') || flags & 1 || path.startsWith('__MACOSX/') || name.startsWith('.') || !IMAGE_EXT.test(name)) continue;
    if (method !== 0 && method !== 8) continue;
    entries.push({ name, comp, size: plain, method, local, mtime });
  }

  return entries.map((en) => ({
    name: en.name,
    size: en.size,
    async file() {
      const h = new DataView(await zip.slice(en.local, en.local + 30).arrayBuffer());
      const start = en.local + 30 + h.getUint16(26, true) + h.getUint16(28, true);
      let blob = zip.slice(start, start + en.comp);
      if (en.method === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('unsupported');
        blob = await new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      }
      const ext = en.name.split('.').pop().toLowerCase();
      return new File([blob], en.name, { type: MIME[ext] || 'image/jpeg', lastModified: en.mtime });
    },
  }));
}
