// Karteikarten: tap a card to turn it over. Two modes, both can be shuffled:
//  - flip: just go through the cards, back and forth
//  - check: turn the card, then say whether you knew it; at the end the ones you didn't know can go again
// Only the settings are saved; a round lives until the page is closed.
function initCards({ $, getState, save, show, back }) {
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const settings = () => {
    const st = getState();
    st.cards ||= {};
    st.cards.mode = st.cards.mode === 'check' ? 'check' : 'flip';
    st.cards.shuffle = !!st.cards.shuffle;
    st.cards.front = st.cards.front === 'fr' ? 'fr' : 'de';
    return st.cards;
  };
  let words = [];          // the chapter's words, in book order
  let round = null;        // { cards: [word], i, flipped, known: [word], unknown: [word] }

  // ---------- setup, inside the overview ----------
  function render(list) {
    words = list;
    const c = settings();
    for (const b of document.querySelectorAll('#cards-mode button')) b.setAttribute('aria-pressed', b.dataset.v === c.mode);
    for (const b of document.querySelectorAll('#cards-shuffle button')) b.setAttribute('aria-pressed', b.dataset.v === String(c.shuffle));
    for (const b of document.querySelectorAll('#cards-front button')) b.setAttribute('aria-pressed', b.dataset.v === c.front);
    $('#cards-mode-note').textContent = c.mode === 'check'
      ? 'Karte umdrehen, dann sagen, ob du es gewusst hast. Am Ende kommen die nicht gewussten nochmal.'
      : 'Karte antippen zum Umdrehen, mit den Pfeilen vor und zurück.';
    $('#cards-start').textContent = `${words.length} Karten starten`;
  }
  const pick = (id, key, parse) => {
    for (const b of document.querySelectorAll(`#${id} button`)) b.onclick = () => { settings()[key] = parse(b.dataset.v); save(); render(words); };
  };
  pick('cards-mode', 'mode', v => v);
  pick('cards-shuffle', 'shuffle', v => v === 'true');
  pick('cards-front', 'front', v => v);

  // ---------- a round ----------
  function start(list) {
    const c = settings();
    round = { cards: c.shuffle ? shuffle(list) : [...list], i: 0, flipped: false, known: [], unknown: [] };
    draw();
  }
  function draw() {
    const c = settings(), w = round.cards[round.i], n = round.cards.length;
    const fr = round.flipped !== (c.front === 'fr');       // which side is up
    $('#cards-title').textContent = c.mode === 'check' ? 'Wusste ich?' : 'Karteikarten';
    $('#cards-progress').textContent = `${round.i + 1}/${n}`;
    $('#cards-bar').style.width = `${Math.round((round.i + (c.mode === 'check' && round.flipped ? 0.5 : 0)) / n * 1000) / 10}%`;
    $('#card-meta').textContent = `${w.group} · ${w.section} · ${fr ? 'Französisch' : 'Deutsch'}`;
    $('#card-text').textContent = fr ? shownFr(w.fr) : w.de;
    $('#card-text').lang = fr ? 'fr' : 'de';
    $('#card').dataset.flipped = round.flipped;
    $('#card-hint').textContent = round.flipped ? '' : 'Antippen zum Umdrehen';
    $('#cards-flip-nav').hidden = c.mode !== 'flip';
    $('#cards-prev').disabled = round.i === 0;
    $('#cards-next').textContent = round.i === n - 1 ? 'Fertig' : 'Weiter ›';
    $('#cards-turn').hidden = c.mode !== 'check' || round.flipped;
    $('#cards-grade').hidden = c.mode !== 'check' || !round.flipped;
    show('cards');
  }
  function flip() { round.flipped = !round.flipped; draw(); }
  function go(step) {
    const i = round.i + step;
    if (i < 0) return;
    if (i >= round.cards.length) return finish();
    round.i = i; round.flipped = false; draw();
  }
  function grade(knew) {
    if (!round.flipped) return;
    (knew ? round.known : round.unknown).push(round.cards[round.i]);
    go(1);
  }
  function finish() {
    const c = settings(), n = round.cards.length, miss = round.unknown;
    const again = $('#cards-again'), restart = $('#cards-restart');
    $('#cards-done-list').innerHTML = '';
    if (c.mode === 'check') {
      $('#cards-done-title').textContent = `${round.known.length} von ${n} gewusst`;
      $('#cards-done-text').textContent = miss.length ? `Nicht gewusst:` : 'Alle gewusst.';
      $('#cards-done-list').innerHTML = miss.map(w => `<span class="chip" lang="fr">${esc(shownFr(w.fr))}</span>`).join('');
      again.hidden = !miss.length;
      again.textContent = `Die ${miss.length} nochmal`;
      again.onclick = () => start(miss);
      restart.classList.toggle('primary', !miss.length);
    } else {
      $('#cards-done-title').textContent = 'Alle Karten durch';
      $('#cards-done-text').textContent = `${n} Karten.`;
      again.hidden = true;
      restart.classList.add('primary');
    }
    restart.textContent = 'Alle nochmal';
    show('cards-done');
  }

  // ---------- wiring ----------
  $('#cards-start').onclick = () => start(words);
  $('#card').onclick = () => { if (settings().mode === 'flip' || !round.flipped) flip(); };
  $('#cards-turn').onclick = flip;
  $('#cards-prev').onclick = () => go(-1);
  $('#cards-next').onclick = () => go(1);
  $('#cards-no').onclick = () => grade(false);
  $('#cards-yes').onclick = () => grade(true);
  $('#cards-restart').onclick = () => start(words);
  $('#cards-back').onclick = back;
  $('#cards-done-back').onclick = back;
  // keys: space/enter turns, arrows go back and forth; when checking, ← or 1 = didn't know, → or 2 = knew
  addEventListener('keydown', e => {
    if ($('#cards').hidden || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('button')) return;
    const check = settings().mode === 'check';
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!check || !round.flipped) flip(); }
    else if (e.key === 'ArrowLeft' || (check && e.key === '1')) { e.preventDefault(); check ? grade(false) : go(-1); }
    else if (e.key === 'ArrowRight' || (check && e.key === '2')) { e.preventDefault(); check ? grade(true) : go(1); }
  });

  return { render };
}
