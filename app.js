import {createMosaic} from './mosaic.js?v=1.12';
import {reducedMotion as reduced} from './motion.js?v=1.12';
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
selectAxis(location.hash==='#territorios'||location.hash==='#panel-urban'?'urban':'royalty');
addEventListener('hashchange',()=>{if(location.hash==='#territorios'||location.hash==='#panel-urban')selectAxis('urban');});

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
  const visible = matching.filter(card => !card.hidden);
  // Read the next layout once before starting any animation writes.
  const next = announce && !reduced.matches
    ? new Map(visible.map(card => [card, card.getBoundingClientRect()])) : null;
  if (next) for (const card of visible) {
    const before = previous.get(card);
    const after = next.get(card);
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
document.querySelectorAll('[data-reveal-artist]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  expanded=true;filterArtists('all');
  const card=artistCards.find(card=>card.dataset.artist===link.dataset.revealArtist);
  card.setAttribute('tabindex','-1');card.focus({preventScroll:true});
  card.scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});
}));

// Scroll changes the scene; mosaic.js alone owns the block choreography.
const story = document.querySelector('.morph-story');
const stage = document.querySelector('.morph-stage');
const mosaic = document.querySelector('.mosaic');
const sceneButtons = [...document.querySelectorAll('[data-scene-target]')];
const caption = document.querySelector('.scene-caption');
const captions = ['A música encontra novas formas.', 'A arte abre outros caminhos.', 'A cidade também faz parte da obra.'];
let range = 0, storyTop = 0, scheduled = false, activeScene = -1;
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
function measure() {
  storyTop = story.getBoundingClientRect().top + scrollY;
  range = Math.max(0, story.offsetHeight - stage.offsetHeight);
  const heroLogo=stage.querySelector('.hero-logo');
  stage.style.setProperty('--hero-copy-top',`${heroLogo.offsetTop+heroLogo.offsetHeight+28}px`);
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
    setScene(0);
    return;
  }
  const p = clamp((scrollY - storyTop + header.offsetHeight) / range);
  setScene(p < .33 ? 0 : p < .72 ? 1 : 2);
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
reduced.subscribe(configureMotion);
document.fonts.ready.then(() => {measure();positionTabIndicator();});
configureMotion();
createMosaic(mosaic,story,reduced);

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
