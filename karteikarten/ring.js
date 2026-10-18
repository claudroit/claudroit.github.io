// The playable loading ring (from OnePongLoading/neutral.html), as a component.
// The arc is a spinner until you drag it; then it's the paddle and you keep the ball inside.
// progress() 0..1 fills the track; at 1 the inside fills into a play button.
// Clicking it shrinks the ring away and calls onContinue().
// With game: true it never fills: a missed ball ends the run (onMiss) and every
// return counts (onHit); dragging again starts the next run. radius() sizes it.

const TAU = Math.PI * 2;
const wrap = a => ((a % TAU) + TAU) % TAU;
const diff = (a, b) => { let d = wrap(a - b); return d > Math.PI ? d - TAU : d; };
const IDLE_SPIN = 5;          // rad/s, the plain spinner

export function createRing(cv, { progress = () => 0, label, onContinue, game = false, radius = () => 30, onStart, onHit, onMiss }) {
  const g = cv.getContext('2d');
  let R = 30, k = 1;            // k scales strokes and the ball with the ring
  let W, H, cx, cy;
  const pad = { angle: -Math.PI / 2, target: null, span: 0 };
  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 3.5, live: false, out: false, wait: 1.5, speed: 0, alpha: 1, fading: false };
  let mode = 'idle';          // idle → play → ready → leaving → gone; game: idle ⇄ play → over
  let idleT = 0, lastInput = -1e9, now = 0, fill = 0, leaveT = 0, flash = 0, miss = 0;
  let dragging = false, raf = 0, last = 0;

  const css = getComputedStyle(document.documentElement);
  const ink = a => `rgba(${css.getPropertyValue('--ink-rgb').trim()},${a})`;
  const bg = () => css.getPropertyValue('--bg').trim();

  function resize() {
    const dpr = window.devicePixelRatio || 1, box = cv.getBoundingClientRect();
    W = box.width; H = box.height;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2;
    R = radius(W, H); k = R / 30; ball.r = 3.5 * k;
  }

  function launch() {
    let a = Math.random() * TAU;
    ball.speed = R * 1.5;
    if (mode === 'idle') {
      // teaser: aim where the spinning arc will be when the ball gets there
      ball.speed = R * 2;
      a = pad.angle + IDLE_SPIN * (R - ball.r - 2) / ball.speed;
    }
    ball.x = cx; ball.y = cy;
    ball.vx = Math.cos(a) * ball.speed; ball.vy = Math.sin(a) * ball.speed;
    ball.live = true; ball.out = false; ball.alpha = 1; ball.fading = false;
  }

  // ---- input ----
  const local = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const pointerAngle = e => { const [x, y] = local(e); return Math.atan2(y - cy, x - cx); };
  const overButton = e => { const [x, y] = local(e); return fill > 0.5 && Math.hypot(x - cx, y - cy) < R + 4; };
  function wake() {
    lastInput = now;
    if (mode === 'idle') {
      mode = 'play';
      if (ball.live) { ball.fading = false; ball.alpha = 1; } else ball.wait = 0.3;
    }
  }
  function down(e) {
    if (mode === 'ready') { if (overButton(e)) { mode = 'leaving'; leaveT = 0; } return; }
    if (mode === 'over') { mode = 'idle'; ball.live = false; }
    if (mode !== 'idle' && mode !== 'play') return;
    if (game && mode === 'idle') onStart?.();
    dragging = true;
    try { cv.setPointerCapture(e.pointerId); } catch {}
    pad.target = pointerAngle(e); wake();
  }
  function move(e) {
    if (dragging) { pad.target = pointerAngle(e); lastInput = now; }
    cv.style.cursor = mode === 'ready' && overButton(e) ? 'pointer' : '';
  }
  const up = () => { dragging = false; };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);

  // ---- update ----
  function update(dt) {
    now += dt; idleT += dt;
    const p = Math.min(1, Math.max(0, progress()));
    if (!game && p >= 1 && (mode === 'play' || mode === 'idle')) { mode = 'ready'; ball.live = false; dragging = false; }
    if (mode === 'ready' || mode === 'leaving') fill = Math.min(1, fill + dt / 0.7);

    // once ready, the paddle wraps the whole ring while the inside fills
    const want = mode === 'idle' ? 0.6 + 0.45 * Math.sin(idleT * 2.4) : mode === 'play' ? 1.15 : TAU;
    pad.span += (want - pad.span) * Math.min(1, dt * 8);
    if (mode === 'idle') pad.angle = wrap(pad.angle + IDLE_SPIN * dt);
    else if (pad.target !== null) pad.angle = wrap(pad.angle + diff(pad.target, pad.angle) * Math.min(1, dt * 18));

    // fall back to a plain spinner when nobody is playing
    if (mode === 'play' && now - lastInput > 6 && !dragging && !(game && ball.live)) mode = 'idle';
    if (mode === 'over' && now - lastInput > 4) mode = 'idle';

    if (mode === 'leaving') {
      leaveT += dt;
      if (leaveT > 0.6) { mode = 'gone'; stop(); onContinue(); }
      return;
    }
    if (mode === 'ready') return;

    if (!ball.live) {
      if (mode === 'over') return;
      if (ball.wait > 0 && (ball.wait -= dt) <= 0) launch();
      return;
    }
    if (ball.fading && (ball.alpha -= dt * 2.5) <= 0) { ball.live = false; ball.wait = 2.5 + Math.random() * 2; return; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy) || 1e-6;
    const nx = dx / d, ny = dy / d, vn = ball.vx * nx + ball.vy * ny;
    const edge = R - ball.r - 2 * k;
    if (!ball.out && d >= edge && vn > 0) {
      const a = Math.atan2(dy, dx);
      if (Math.abs(diff(a, pad.angle)) <= pad.span / 2 + 0.08) {
        // bounce off the arc, steered by where it landed on the paddle
        let vx = ball.vx - 2 * vn * nx, vy = ball.vy - 2 * vn * ny;
        const off = Math.max(-1, Math.min(1, diff(a, pad.angle) / (pad.span / 2)));
        const turn = off * 0.45, c = Math.cos(turn), s = Math.sin(turn);
        [vx, vy] = [vx * c - vy * s, vx * s + vy * c];
        ball.speed = Math.min(ball.speed * 1.04, R * (game ? 4.5 : 3.2));
        const m = Math.hypot(vx, vy);
        ball.vx = vx / m * ball.speed; ball.vy = vy / m * ball.speed;
        ball.x = cx + nx * edge; ball.y = cy + ny * edge;
        flash = 1;
        if (mode !== 'play') ball.fading = true;   // teaser: one bounce, then gone
        else onHit?.();
      } else ball.out = true;
    }
    if (ball.out && d > R * 1.7) {
      ball.live = false; ball.wait = 0.7; miss = 1;
      if (game && mode === 'play') { mode = 'over'; dragging = false; lastInput = now; onMiss?.(); }
    }
  }

  // ---- draw ----
  function text(str, x, y, size, color, weight = 500) {
    g.font = `${weight} ${size}px -apple-system, system-ui, 'Helvetica Neue', sans-serif`;
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(str, x, y);
  }
  function draw(dt) {
    g.clearRect(0, 0, W, H);
    flash = Math.max(0, flash - dt * 5); miss = Math.max(0, miss - dt * 2);
    const out = mode === 'leaving' ? Math.min(1, leaveT / 0.6) : 0;
    g.save();
    g.globalAlpha = 1 - out;
    g.translate(cx, cy); g.scale(1 - out * 0.6, 1 - out * 0.6); g.translate(-cx, -cy);

    // track: the full ring, filled by progress
    const p = Math.min(1, Math.max(0, progress()));
    g.lineCap = 'butt'; g.lineWidth = 2 * k;
    g.strokeStyle = ink(0.08 + miss * 0.2);
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.strokeStyle = ink(0.2);
    g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * p); g.stroke();

    // the spinner / paddle
    g.strokeStyle = ink(1); g.lineWidth = (4 + flash * 1.5) * k; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy, R, pad.angle - pad.span / 2, pad.angle + pad.span / 2); g.stroke();

    // label inside the circle, behind the ball
    const ga0 = g.globalAlpha;
    g.globalAlpha = ga0 * (1 - fill);
    text(label(mode), cx, cy + k, 11 * k, ink(0.35), game ? 600 : 500);
    g.globalAlpha = ga0;

    if (ball.live) {
      // a missed ball just fades as it leaves the ring
      const away = ball.out ? Math.max(0, 1 - (Math.hypot(ball.x - cx, ball.y - cy) - R) / (R * 0.7)) : 1;
      g.fillStyle = ink(0.9 * Math.max(0, ball.alpha) * away);
      g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, TAU); g.fill();
    }

    // ready: the inside fills into the button you click
    if (fill > 0) {
      const e = 1 - Math.pow(1 - fill, 3);
      g.fillStyle = ink(1);
      g.beginPath(); g.arc(cx, cy, R * e, 0, TAU); g.fill();
      const a = Math.max(0, (fill - 0.55) / 0.45), t = R * 0.36 * (1 + 0.05 * Math.sin(now * 4) * a);
      g.fillStyle = bg(); g.globalAlpha *= a;
      g.beginPath(); g.moveTo(cx - t * 0.7, cy - t); g.lineTo(cx + t, cy); g.lineTo(cx - t * 0.7, cy + t); g.closePath(); g.fill();
    }
    g.restore();
  }

  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000); last = t;
    update(dt);
    if (mode !== 'gone') { draw(dt); raf = requestAnimationFrame(frame); }
  }
  function start() {
    stop();
    mode = 'idle'; fill = 0; leaveT = 0; ball.live = false; ball.wait = 1.5; pad.angle = -Math.PI / 2; dragging = false;
    resize(); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  addEventListener('resize', () => { if (raf) resize(); });

  // `peek` is for scripted tests: where the ball is, relative to the canvas
  return { start, stop, resize: () => raf && resize(), get mode() { return mode; }, peek: () => ({ mode, live: ball.live, x: ball.x, y: ball.y, cx, cy, R }) };
}
