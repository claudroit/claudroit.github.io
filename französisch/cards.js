// Karteikarten: tap a card to turn it over. Two modes, both can be shuffled:
//  - flip: just go through the cards, back and forth
//  - check: turn the card, then say whether you knew it; at the end the ones you didn't know can go again
// Which cards: the whole chapter, its words under „Üben“, or the words the Abschlusstest asks.
// The vocabulary progress is only read here, except in the mode „Üben zählt“: a word from „Üben“ you knew moves to „Kann ich“
// (nothing else changes, not knowing a word changes nothing). Only the card settings are saved; a round lives until the page is closed.
// One card per German meaning: words with the same German (taper qn, battre qn, frapper qn) share a card with German in front,
// and the back always lists every French word for it plus its synonyms from the synonym exercise.
function initCards({ $, getState, save, show, back, markKnown }) {
  const sameDe = new Map();
  for (const w of WORDS) sameDe.set(w.de, [...(sameDe.get(w.de) || []), w]);
  const synOf = new Map(PAIRS.syn.map(p => [p.prompt.id, p.answers]));
  // the cards for a list of words: German in front → one card per German meaning, French in front → one card per word
  function toCards(list) {
    if (settings().front === 'fr') return list.map(w => ({ id: w.id, words: [w], de: w.de, group: w.group, section: w.section }));
    const byDe = new Map();
    for (const w of list) {
      const card = byDe.get(w.de);
      if (card) card.words.push(w);
      else byDe.set(w.de, { id: w.id, words: [w], de: w.de, group: w.group, section: w.section });
    }
    return [...byDe.values()];
  }
  const frOf = card => card.words.map(w => shownFr(w.fr)).join(' / ');
  // everything French that means this card's German, and the synonyms of those words
  function backFr(card) {
    const all = sameDe.get(card.de) || card.words;
    const syn = [...new Set(all.flatMap(w => synOf.get(w.id) || []))].filter(s => !all.includes(s));
    return { all, syn };
  }
  const grading = m => m !== 'flip';   // check and count: say whether you knew it
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const settings = () => {
    const st = getState();
    st.cards ||= {};
    st.cards.mode = ['check', 'count'].includes(st.cards.mode) ? st.cards.mode : 'flip';
    st.cards.shuffle = !!st.cards.shuffle;
    st.cards.front = st.cards.front === 'fr' ? 'fr' : 'de';
    st.cards.set = ['practice', 'test'].includes(st.cards.set) ? st.cards.set : 'all';
    return st.cards;
  };
  let sets = { all: [], practice: [], test: [] };   // in book order
  let words = [];          // the chosen set
  let round = null;        // { cards: [card], i, flipped, known: [card], unknown: [card], moved }

  // ---------- setup, inside the overview ----------
  function render(lists = sets) {
    sets = lists;
    const c = settings();
    words = sets[c.set];
    const names = { all: 'Alle', practice: 'Üben', test: 'Abschlusstest' };
    for (const b of document.querySelectorAll('#cards-set button')) {
      b.setAttribute('aria-pressed', b.dataset.v === c.set);
      b.textContent = `${names[b.dataset.v]} (${sets[b.dataset.v].length})`;
    }
    const kept = c.mode === 'count' ? '' : ' Dein Fortschritt dort bleibt, wie er ist.';
    $('#cards-set-note').textContent = c.set === 'practice'
      ? 'Die Wörter, die im Vokabelteil unter „Üben“ stehen.' + kept
      : c.set === 'test' ? 'Die Wörter, die der Abschlusstest im Vokabelteil abfragt.' + kept : '';
    $('#cards-set-note').hidden = c.set === 'all';
    $('#cards-start').disabled = !words.length;
    for (const b of document.querySelectorAll('#cards-mode button')) b.setAttribute('aria-pressed', b.dataset.v === c.mode);
    for (const b of document.querySelectorAll('#cards-shuffle button')) b.setAttribute('aria-pressed', b.dataset.v === String(c.shuffle));
    for (const b of document.querySelectorAll('#cards-front button')) b.setAttribute('aria-pressed', b.dataset.v === c.front);
    $('#cards-mode-note').textContent = c.mode === 'count'
      ? 'Ein Wort aus „Üben“, das du gewusst hast, kommt im Vokabelteil sofort zu „Kann ich“. Nicht gewusst kommt etwa 4 Karten später nochmal, bis du es weisst.'
      : c.mode === 'check'
      ? 'Karte umdrehen, dann sagen, ob du es gewusst hast. Am Ende kommen die nicht gewussten nochmal.'
      : 'Karte antippen zum Umdrehen, mit den Pfeilen vor und zurück.';
    const n = toCards(words).length;
    $('#cards-start').textContent = n ? `${n} Karten starten` : 'Keine Karten';
  }
  const pick = (id, key, parse) => {
    for (const b of document.querySelectorAll(`#${id} button`)) b.onclick = () => { settings()[key] = parse(b.dataset.v); save(); render(); };
  };
  pick('cards-set', 'set', v => v);
  pick('cards-mode', 'mode', v => v);
  pick('cards-shuffle', 'shuffle', v => v === 'true');
  pick('cards-front', 'front', v => v);

  // ---------- a round ----------
  function start(cards) {
    const c = settings();
    round = { cards: c.shuffle ? shuffle(cards) : [...cards], i: 0, flipped: false, known: [], unknown: [], moved: 0 };
    draw();
  }
  function draw() {
    const c = settings(), w = round.cards[round.i], n = round.cards.length;
    const fr = round.flipped !== (c.front === 'fr');       // which side is up
    $('#cards-title').textContent = c.mode === 'count' ? 'Üben zählt' : c.mode === 'check' ? 'Wusste ich?' : 'Karteikarten';
    // „Üben zählt“ grows while you go (cards you didn't know come back), so it counts down like „Üben“
    $('#cards-progress').textContent = c.mode === 'count' ? `noch ${n - round.i}` : `${round.i + 1}/${n}`;
    $('#cards-bar').style.width = `${Math.round((round.i + (grading(c.mode) && round.flipped ? 0.5 : 0)) / n * 1000) / 10}%`;
    $('#card-meta').textContent = `${w.group} · ${w.section} · ${fr ? 'Französisch' : 'Deutsch'}`;
    // front: just this card; back: every French word for it, and the synonyms in small
    const back = backFr(w);
    if (fr && round.flipped) $('#card-text').innerHTML = back.all.map(x => `<span class="card-line">${esc(shownFr(x.fr))}</span>`).join('');
    else $('#card-text').textContent = fr ? frOf(w) : w.de;
    $('#card-text').lang = fr ? 'fr' : 'de';
    const also = round.flipped ? (fr ? back.syn : [...back.all.filter(x => !w.words.includes(x)), ...back.syn]) : [];
    $('#card-also').hidden = !also.length;
    $('#card-also').textContent = also.length ? `${fr ? 'Synonym' : 'Auch'}: ${also.map(x => shownFr(x.fr)).join(', ')}` : '';
    $('#card').dataset.flipped = round.flipped;
    $('#card-hint').textContent = round.flipped ? '' : 'Antippen zum Umdrehen';
    $('#cards-flip-nav').hidden = c.mode !== 'flip';
    $('#cards-prev').disabled = round.i === 0;
    $('#cards-next').textContent = round.i === n - 1 ? 'Fertig' : 'Weiter ›';
    $('#cards-turn').hidden = !grading(c.mode) || round.flipped;
    $('#cards-grade').hidden = !grading(c.mode) || !round.flipped;
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
    const w = round.cards[round.i];
    const count = settings().mode === 'count';
    if (knew) round.known.push(w);
    else if (!round.unknown.includes(w)) round.unknown.push(w);
    if (knew && count) for (const x of w.words) if (markKnown(x.id)) round.moved++;
    // „Üben zählt“: a card you didn't know comes back about 4 cards later, like in „Üben“
    if (!knew && count) round.cards.splice(Math.min(round.cards.length, round.i + 4), 0, w);
    go(1);
  }
  function finish() {
    const c = settings(), n = round.cards.length, miss = round.unknown;
    const again = $('#cards-again'), restart = $('#cards-restart');
    $('#cards-done-list').innerHTML = '';
    if (c.mode === 'count') {
      $('#cards-done-title').textContent = `Alle ${round.known.length} gewusst`;
      $('#cards-done-text').textContent = `${round.moved} ${round.moved === 1 ? 'Wort ist' : 'Wörter sind'} jetzt bei „Kann ich“.`
        + (miss.length === 1 ? ' Dieses kam öfter dran:' : miss.length ? ` Diese ${miss.length} kamen öfter dran:` : '');
      $('#cards-done-list').innerHTML = miss.map(w => `<span class="chip" lang="fr">${esc(frOf(w))}</span>`).join('');
      again.hidden = true;
      restart.classList.add('primary');
    } else if (grading(c.mode)) {
      $('#cards-done-title').textContent = `${round.known.length} von ${n} gewusst`;
      $('#cards-done-text').textContent = miss.length ? 'Nicht gewusst:' : 'Alle gewusst.';
      $('#cards-done-list').innerHTML = miss.map(w => `<span class="chip" lang="fr">${esc(frOf(w))}</span>`).join('');
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
  $('#cards-start').onclick = () => start(toCards(words));
  $('#card').onclick = () => { if (settings().mode === 'flip' || !round.flipped) flip(); };
  $('#cards-turn').onclick = flip;
  $('#cards-prev').onclick = () => go(-1);
  $('#cards-next').onclick = () => go(1);
  $('#cards-no').onclick = () => grade(false);
  $('#cards-yes').onclick = () => grade(true);
  $('#cards-restart').onclick = () => start(toCards(words));
  $('#cards-back').onclick = back;
  $('#cards-done-back').onclick = back;
  // keys: space/enter turns, arrows go back and forth; when checking, ← or 1 = didn't know, → or 2 = knew
  addEventListener('keydown', e => {
    if ($('#cards').hidden || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('button')) return;
    const check = grading(settings().mode);
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!check || !round.flipped) flip(); }
    else if (e.key === 'ArrowLeft' || (check && e.key === '1')) { e.preventDefault(); check ? grade(false) : go(-1); }
    else if (e.key === 'ArrowRight' || (check && e.key === '2')) { e.preventDefault(); check ? grade(true) : go(1); }
  });

  return { render };
}
