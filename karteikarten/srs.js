// Anki-style scheduling (SM-2 with learning steps).
// Every card is scheduled once, globally: a deck is just a filter over the same cards,
// so grading a word in "Test 1" grades it in "Alle Tests" too.

export const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
const LEARN_STEPS = [1 * MIN, 10 * MIN];
const RELEARN_STEPS = [10 * MIN];
const ROLLOVER = 4 * HOUR;        // a new day starts at 4:00, like Anki

export const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;

// local day number, counting from the 4:00 rollover
export function dayOf(t) {
  return Math.floor((t - new Date(t).getTimezoneOffset() * MIN - ROLLOVER) / DAY);
}
export function dayStart(day) {
  const guess = day * DAY + ROLLOVER;
  return guess + new Date(guess).getTimezoneOffset() * MIN;
}

export const fresh = () => ({ s: 'new', step: 0, due: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: null });

// returns the card's new state after answering it at time t
export function answer(card, grade, t) {
  const c = { ...card, reps: card.reps + 1, last: dayOf(t) };
  const review = days => { c.s = 'review'; c.step = 0; c.ivl = Math.max(1, Math.round(days)); c.due = dayStart(dayOf(t) + c.ivl); };

  if (c.s === 'new' || c.s === 'learn' || c.s === 'relearn') {
    const steps = c.s === 'relearn' ? RELEARN_STEPS : LEARN_STEPS;
    if (c.s === 'new') c.s = 'learn';
    if (grade === AGAIN) { c.step = 0; c.due = t + steps[0]; }
    else if (grade === HARD) {
      const d = c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[c.step] * 1.5;
      c.due = t + d;
    } else if (grade === GOOD) {
      if (c.step + 1 < steps.length) { c.step++; c.due = t + steps[c.step]; }
      else review(c.s === 'relearn' ? c.ivl : 1);
    } else review(c.s === 'relearn' ? c.ivl + 1 : 4);
    return c;
  }

  // review card
  if (grade === AGAIN) {
    c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2);
    c.s = 'relearn'; c.step = 0; c.ivl = 1; c.due = t + RELEARN_STEPS[0];
  } else if (grade === HARD) { c.ease = Math.max(1.3, c.ease - 0.15); review(Math.max(c.ivl + 1, c.ivl * 1.2)); }
  else if (grade === GOOD) review(Math.max(c.ivl + 1, c.ivl * c.ease));
  else { c.ease += 0.15; review(Math.max(c.ivl + 1, c.ivl * c.ease * 1.3)); }
  return c;
}

// "10 Min", "1 T", "2,5 Mon" — when the card would come back
export function untilLabel(card, t) {
  const ms = card.s === 'review' ? card.ivl * DAY : card.due - t;
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} Min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} Std`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)} T`;
  if (days < 365) return `${(days / 30).toFixed(1).replace('.0', '').replace('.', ',')} Mon`;
  return `${(days / 365).toFixed(1).replace('.0', '').replace('.', ',')} J`;
}
