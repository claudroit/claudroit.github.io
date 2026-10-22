const pages = {
  verben: { title: 'Verben', path: '../verben/' },
  adjectifs: { title: 'Adjektive', path: '../adjectifs/' },
};
const overview = document.getElementById('overview');
const trainer = document.getElementById('trainer');
const frame = document.getElementById('lesson');
const loading = document.getElementById('loading');
let active = null;
frame.addEventListener('load', () => {
  if (!active || !frame.contentDocument) return;
  // Reuse the existing trainers and their local storage, with one shared navigation bar.
  const style = frame.contentDocument.createElement('style');
  style.textContent = '#home > .bar, #verbs > .bar { display: none; }';
  frame.contentDocument.head.append(style);
  loading.hidden = true;
  frame.hidden = false;
});
function route() {
  const key = location.hash.slice(1), page = pages[key];
  overview.hidden = Boolean(page);
  trainer.hidden = !page;
  document.body.classList.toggle('learning', Boolean(page));
  document.title = page ? `${page.title} · Französisch` : 'Französisch · Grammatik Test 1';
  if (!page) {
    if (active) { frame.removeAttribute('src'); frame.hidden = true; }
    active = null;
    return;
  }
  document.getElementById('topic-title').textContent = page.title;
  document.getElementById('standalone').href = page.path;
  frame.title = `${page.title} lernen`;
  if (active !== key) {
    active = key;
    loading.hidden = false;
    frame.hidden = true;
    frame.src = page.path;
  }
}
addEventListener('hashchange', route);
route();
