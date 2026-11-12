const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 760px)');
const header = document.querySelector('.header');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
let menuOpen = false;
header.dataset.enhanced = '';
function setMenu(open, focus = false) {
  menuOpen = open;
  menu.setAttribute('aria-expanded', String(open));
  nav.hidden = narrow.matches && !open;
  if (focus) menu.focus();
}
setMenu(false);
menu.addEventListener('click', () => setMenu(!menuOpen));
narrow.addEventListener('change', () => setMenu(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false, true); });
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('click', e => { if (menuOpen && !header.contains(e.target)) setMenu(false); });

// Progressive enhancement: every panel is present until the controls are wired.
const tabs = [...document.querySelectorAll('[data-axis]')];
const panels = [...document.querySelectorAll('.axis-panel')];
const tablist = document.querySelector('.axis-tabs');
let selectedAxis = null;
let panelMotion = null;
tablist.setAttribute('role', 'tablist');
tablist.dataset.enhanced = '';
document.querySelector('.axis-panels').dataset.enhanced = '';
function positionTabIndicator() {
  const active = tabs.find(t => t.dataset.axis === selectedAxis);
  if (!active) return;
  tablist.style.setProperty('--indicator-transform', `translateX(${active.offsetLeft}px) scaleX(${active.offsetWidth / tablist.clientWidth})`);
}
function selectAxis(id, focus = false) {
  if (!tabs.some(t => t.dataset.axis === id)) return;
  const changed = selectedAxis !== null && selectedAxis !== id;
  panelMotion?.cancel();
  for (const tab of tabs) {
    const active = tab.dataset.axis === id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `panel-${tab.dataset.axis}`);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  }
  for (const panel of panels) {
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = panel.id !== `panel-${id}`;
    panel.tabIndex = 0;
  }
  selectedAxis = id;
  positionTabIndicator();
  document.querySelector('.agenda').dataset.axis = id;
  if (changed && !reduced.matches) {
    panelMotion = document.querySelector(`#panel-${id}`).animate([
      {opacity:.55,transform:'translateY(12px)'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:650,easing:'cubic-bezier(.37,0,.63,1)'});
  }
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectAxis(tab.dataset.axis));
  tab.addEventListener('keydown', e => {
    const target = ({ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1})[e.key];
    if (target !== undefined) { e.preventDefault(); selectAxis(tabs[target].dataset.axis, true); }
  });
});
document.querySelectorAll('[data-open-axis]').forEach(link => link.addEventListener('click', () => selectAxis(link.dataset.openAxis)));
selectAxis('royalty');

const artistCards = [...document.querySelectorAll('[data-artist]')];
const artistFilters = [...document.querySelectorAll('[data-filter]')];
const more = document.querySelector('.more-artists');
const artistStatus = document.querySelector('#artist-status');
let artistFilter = 'all';
let expanded = false;
function filterArtists(filter, announce = true) {
  const previous = new Map(artistCards.filter(card => !card.hidden).map(card => [card,card.getBoundingClientRect()]));
  artistCards.forEach(card=>card.getAnimations().forEach(animation=>animation.cancel()));
  artistFilter = filter;
  const matching = artistCards.filter(card => filter === 'all' || card.dataset.group.split(' ').includes(filter));
  artistCards.forEach(card => { card.hidden = !matching.includes(card) || (!expanded && filter === 'all' && matching.indexOf(card) >= 6); });
  artistFilters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  more.hidden = expanded || filter !== 'all';
  if (announce) artistStatus.textContent = `${matching.filter(card => !card.hidden).length} retratos exibidos.`;
  if (announce && !reduced.matches) for (const card of matching.filter(c=>!c.hidden)) {
    const before = previous.get(card);
    const after = card.getBoundingClientRect();
    const x = before ? before.left - after.left : 0;
    const y = before ? before.top - after.top : 12;
    card.animate([{transform:`translate(${x}px,${y}px)`,opacity:before ? 1 : .4},{transform:'translate(0,0)',opacity:1}],{duration:700,easing:'cubic-bezier(.37,0,.63,1)'});
  }
}
artistFilters.forEach(button => button.addEventListener('click', () => { expanded = false; filterArtists(button.dataset.filter); }));
more.addEventListener('click', () => {
  expanded = true;
  filterArtists(artistFilter);
  // Preserve keyboard position when the expansion button leaves the document flow.
  const card = artistCards[6];
  card.setAttribute('tabindex', '-1');
  card.focus({preventScroll:true});
});
filterArtists('all', false);

// The original modules persist. Scroll only changes their spatial relationships.
const story = document.querySelector('.morph-story');
const stage = document.querySelector('.morph-stage');
const mosaic = document.querySelector('.mosaic');
const tiles = [...document.querySelectorAll('.tile')];
const sceneButtons = [...document.querySelectorAll('[data-scene-target]')];
const caption = document.querySelector('.scene-caption');
const captions = ['A música encontra novas formas.', 'A arte abre outros caminhos.', 'A cidade também faz parte da obra.'];
let range = 0, storyTop = 0, cell = 0, scheduled = false, activeScene = -1;
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
function measure() {
  storyTop = story.getBoundingClientRect().top + scrollY;
  range = Math.max(0, story.offsetHeight - stage.offsetHeight);
  // Layout width stays stable while the tile itself is transformed.
  cell = tiles[0].offsetWidth;
  schedule();
}
function setScene(scene) {
  if (scene === activeScene) return;
  activeScene = scene;
  stage.dataset.scene = String(scene);
  caption.textContent = captions[scene];
  sceneButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === scene)));
}
function draw() {
  scheduled = false;
  if (reduced.matches || range < 20) {
    tiles.forEach(tile => { tile.style.transform = ''; tile.style.borderRadius = ''; });
    setScene(0);
    return;
  }
  const p = clamp((scrollY - storyTop + header.offsetHeight) / range);
  const phase = p * Math.PI;
  const spread = Math.sin(phase);
  const offsets = [[-.14,.08,90],[.12,-.12,0],[.08,.06,-90],[-.12,-.12,180],[.08,.06,0],[.16,-.06,90]];
  tiles.forEach((tile,i) => {
    const [x,y,r] = offsets[i];
    const horizontal = (x * spread + (i % 2 ? .03 : -.03) * p) * cell;
    const vertical = y * spread * cell;
    tile.style.transform = `translate3d(${horizontal.toFixed(2)}px,${vertical.toFixed(2)}px,0) rotate(${(r*p).toFixed(2)}deg) scale(${(1 - .08*spread).toFixed(4)})`;
    if (i === 1 || i === 4) tile.style.borderRadius = `${(Math.sin(phase)*48).toFixed(2)}%`;
  });
  setScene(p < .33 ? 0 : p < .72 ? 1 : 2);
  stage.style.setProperty('--story-progress', p.toFixed(4));
}
function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(draw); } }
function configureMotion() {
  if (reduced.matches) document.getAnimations().forEach(animation=>animation.cancel());
  document.body.classList.toggle('motion-enabled', !reduced.matches);
  activeScene = -1;
  measure();
}
sceneButtons.forEach((button,i) => button.addEventListener('click', () => {
  if (!reduced.matches && range > 20) scrollTo({top: storyTop - header.offsetHeight + range * [0,.52,.95][i], behavior:'smooth'});
  else setScene(i);
}));
addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', () => {measure();positionTabIndicator();}, {passive:true});
reduced.addEventListener('change', configureMotion);
document.fonts.ready.then(() => {measure();positionTabIndicator();});
configureMotion();

const sections = [...document.querySelectorAll('main>section[id]')];
if ('IntersectionObserver' in window) {
  const current = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const id = entry.target.id;
      nav.querySelectorAll('a').forEach(link => {
        if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, {rootMargin:'-20% 0px -50% 0px'});
  sections.forEach(section => current.observe(section));
}
