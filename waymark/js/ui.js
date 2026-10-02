// Small DOM helpers: element builder, icons, the draggable sheet, panels, toast.

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter((k) => k != null && k !== false));
  return el;
}

const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  locate: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>',
  pencil: '<path d="M4 20h4L19.5 8.5l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 7V4h4v3M6.5 7l1 13h9l1-13"/>',
  camera: '<path d="M3.5 8.5h3.2L8.5 6h7l1.8 2.5h3.2v10.5h-17z"/><circle cx="12" cy="13.5" r="3.4"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  road: '<path d="M8.5 3L5 21M15.5 3L19 21M12 4v3M12 10.5v3M12 17v3"/>',
  save: '<path d="M12 4v11M8 11l4 4 4-4M5 15v5h14v-5"/>',
  open: '<path d="M12 15V4M8 8l4-4 4 4M5 15v5h14v-5"/>',
  ruler: '<path d="M3 15L15 3l6 6L9 21zM7.5 13.5l2 2M10.5 10.5l2 2M13.5 7.5l2 2"/>',
};

export function icon(name) {
  const t = document.createElement('template');
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstChild;
}

export const isWide = () => matchMedia('(min-width: 900px)').matches;

// ---------- toast ----------

let toastTimer;
export function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
}

// ---------- panels ----------

// kind: 'form' (tall, scrim does not dismiss), 'menu' (bottom), 'dialog' (near the top, clear of the keyboard)
export function openPanel(content, kind = 'menu', onDismiss) {
  const layer = h('div', { class: 'layer' });
  const scrim = h('div', { class: 'scrim' });
  const panel = h('div', { class: `panel panel--${kind}`, role: 'dialog', 'aria-modal': 'true' }, content);
  layer.append(scrim, panel);
  document.getElementById('layers').append(layer);
  panel.getBoundingClientRect();
  requestAnimationFrame(() => layer.classList.add('is-open'));
  let closed = false;
  const close = () => {
    if (closed) return Promise.resolve();
    closed = true;
    layer.classList.remove('is-open');
    return new Promise((r) => setTimeout(() => { layer.remove(); r(); }, 320));
  };
  if (kind !== 'form') scrim.addEventListener('click', () => { close(); onDismiss?.(); });
  return { close, panel };
}

export function menu(title, items) {
  const box = h('div', { class: 'menu' }, title && h('p', { class: 'menu__title' }, title));
  const p = openPanel(box);
  for (const it of items.filter(Boolean)) {
    box.append(h('button', { class: it.danger ? 'is-danger' : '', onclick: async () => { await p.close(); it.run(); } }, icon(it.icon), it.label));
  }
}

export function askText({ title, body, label, value = '', placeholder = '', action }) {
  return new Promise((resolve) => {
    const input = h('input', { class: 'input', type: 'text', value, placeholder, maxlength: 80, autocomplete: 'off', enterkeyhint: 'done' });
    const ok = h('button', { class: 'sign', type: 'submit' }, action);
    const sync = () => { ok.disabled = !input.value.trim(); };
    const finish = async (v) => { await p.close(); resolve(v); };
    const form = h('form', { class: 'dialog', onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) finish(input.value.trim()); } },
      h('h2', null, title), body && h('p', null, body),
      h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), input),
      h('div', { class: 'dialog__actions' }, h('button', { class: 'plain', type: 'button', onclick: () => finish(null) }, 'Cancel'), ok));
    input.addEventListener('input', sync);
    sync();
    const p = openPanel(form, 'dialog', () => resolve(null));
    setTimeout(() => { input.focus(); input.select(); }, 60);
  });
}

export function confirmAction({ title, body, action }) {
  return new Promise((resolve) => {
    const finish = async (v) => { await p.close(); resolve(v); };
    const p = openPanel(h('div', { class: 'dialog' }, h('h2', null, title), h('p', null, body),
      h('div', { class: 'dialog__actions' },
        h('button', { class: 'plain', onclick: () => finish(false) }, 'Cancel'),
        h('button', { class: 'sign sign--danger', onclick: () => finish(true) }, action))), 'dialog', () => resolve(false));
  });
}

// ---------- bottom sheet ----------

export class Sheet {
  constructor(el, onMove) {
    this.el = el;
    this.head = el.querySelector('.sheet__head');
    this.body = el.querySelector('.sheet__body');
    this.onMove = onMove;
    this.snap = 'half';
    this.y = 0;
    this.dragged = false;

    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('click', (e) => { if (this.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    el.querySelector('.sheet__grip').addEventListener('click', () => this.set(this.snap === 'peek' ? 'half' : this.snap === 'half' ? 'full' : 'half'));
    addEventListener('resize', () => this.set(this.snap, false));
  }

  points() {
    const h = this.el.offsetHeight;
    const safe = document.getElementById('probe').offsetHeight;
    return { full: 0, half: Math.max(0, h - Math.round(innerHeight * 0.48)), peek: h - this.head.offsetHeight - safe };
  }

  // Height of the sheet that is on screen, for map padding.
  visible() { return isWide() ? 0 : this.el.offsetHeight - this.y; }

  set(snap, animate = true) {
    this.snap = snap;
    this.y = this.points()[snap];
    this.el.dataset.snap = snap;
    this.el.style.transition = animate ? 'transform 0.46s cubic-bezier(0.22, 0.9, 0.24, 1)' : 'none';
    this.el.style.transform = `translateY(${this.y}px)`;
    // The part of the sheet hanging below the screen; the list pads itself by
    // this much so its last stops can still be scrolled into the visible part.
    this.el.style.setProperty('--below', (isWide() ? 0 : this.y) + 'px');
    if (snap === 'peek') this.body.scrollTop = 0;
    this.onMove?.();
  }

  down(e) {
    if (isWide() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (this.snap === 'full' && this.body.contains(e.target)) return; // the list scrolls instead
    if (e.target.closest('.strip')) return; // photo strips scroll sideways
    const startY = e.clientY, startT = this.y, pts = this.points();
    let last = { y: e.clientY, t: e.timeStamp }, v = 0, active = false;

    const move = (ev) => {
      const dy = ev.clientY - startY;
      if (!active && Math.abs(dy) < 6) return;
      active = true;
      this.y = Math.min(pts.peek, Math.max(0, startT + dy));
      if (startT + dy < 0) this.y = (startT + dy) * 0.25; // a little give past the top
      this.el.style.transition = 'none';
      this.el.style.transform = `translateY(${this.y}px)`;
      const dt = ev.timeStamp - last.t;
      if (dt > 0) v = 0.7 * ((ev.clientY - last.y) / dt) + 0.3 * v;
      last = { y: ev.clientY, t: ev.timeStamp };
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      if (!active) return;
      this.dragged = true;
      setTimeout(() => { this.dragged = false; }, 60);
      const aim = this.y + v * 180;
      const snap = Object.entries(pts).sort((a, b) => Math.abs(a[1] - aim) - Math.abs(b[1] - aim))[0][0];
      this.set(snap);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }
}
