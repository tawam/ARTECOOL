// One bounded exchange at a time; the six brand modules keep their positions.
export function createMosaic(root, story, reduced) {
  const button=document.querySelector('.mosaic-toggle');
  const artists=JSON.parse(document.querySelector('#mosaic-data').textContent);
  const tiles=[...root.querySelectorAll('.tile')];
  let timer=0,paused=false,inView=false,hovered=false,focused=false,busy=false;
  let cursor=0,slot=0,outgoing=0,exchanges=0,generation=0;
  let settle=null,activeAnimations=[];
  const order=[0,2,3,5,1,4];
  const canRun=()=>!paused&&!reduced.matches&&!document.hidden&&inView&&!hovered&&!focused;
  const portraits=()=>tiles.filter(tile=>tile.querySelector('.tile-photo'));
  function updateNotes(){
    root.querySelector('.mosaic-notes').replaceChildren(...tiles.flatMap(tile=>{
      const caption=tile.querySelector('.tile-photo:not([aria-hidden]) .tile-caption');
      if(!caption)return [];
      const note=caption.cloneNode(true);note.className='mosaic-note';return [note];
    }));
  }
  function refresh() {
    clearTimeout(timer);timer=0;
    button.hidden=reduced.matches;
    button.textContent=paused?'Retomar mosaico':'Pausar mosaico';
    button.setAttribute('aria-pressed',String(paused));
    root.dataset.rotation=reduced.matches?'reduced':canRun()?'running':'paused';
    if(!canRun()) {
      generation++;
      if(reduced.matches||document.hidden||!inView)settle?.();
      else activeAnimations.forEach(animation=>animation.pause());
      return;
    }
    activeAnimations.forEach(animation=>animation.play());
    if(!busy)timer=setTimeout(exchange,6200);
  }
  async function exchange() {
    timer=0;
    if(!canRun()||busy)return;
    busy=true;
    const token=++generation;
    const occupied=portraits();
    const visibleIds=new Set(occupied.map(tile=>tile.querySelector('.tile-photo').dataset.portrait));
    let artist;
    for(let i=0;i<artists.length;i++) {
      const candidate=artists[cursor++%artists.length];
      if(!visibleIds.has(candidate.id)){artist=candidate;break;}
    }
    let destination;
    for(let i=0;i<order.length;i++){
      const candidate=tiles[order[slot++%order.length]];
      if(!occupied.includes(candidate)){destination=candidate;break;}
    }
    const photo=new Image(480,600);
    photo.alt='';photo.decoding='async';
    photo.src=`assets/artists/${artist.id}-mosaic.webp`;
    try { await photo.decode(); }
    catch {busy=false;if(token===generation)refresh();return;}
    if(token!==generation||!canRun()){busy=false;refresh();return;}
    const source=occupied[outgoing++%occupied.length];
    const old=source.querySelector('.tile-photo');
    const frame=document.createElement('div');frame.className='tile-photo';frame.dataset.portrait=artist.id;
    const caption=document.createElement('span');caption.className='tile-caption';
    const name=document.createElement('strong');name.textContent=artist.name;
    const meta=document.createElement('span');meta.textContent=`${artist.date} · ${artist.place}`;
    caption.append(name,meta);frame.append(photo,caption);destination.append(frame);
    const timing={duration:1250,easing:'cubic-bezier(.37,0,.63,1)',fill:'both'};
    const entrance=frame.animate([{opacity:0,transform:'scale(.93)'},{opacity:1,transform:'scale(1)'}],timing);
    const exit=old.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.045)'}],timing);
    activeAnimations=[entrance,exit];
    // Keep assistive navigation stable: the outgoing copy leaves the accessibility
    // tree immediately while its pixels complete the transition.
    old.setAttribute('aria-hidden','true');
    updateNotes();
    let finished=false;
    const commit=()=>{
      if(finished)return;finished=true;
      old.remove();entrance.cancel();exit.cancel();
      exchanges++;root.dataset.exchanges=String(exchanges);
      busy=false;settle=null;activeAnimations=[];
    };
    settle=commit;
    await Promise.allSettled([entrance.finished,exit.finished]);
    commit();refresh();
  }
  button.addEventListener('click',()=>{paused=!paused;refresh();});
  root.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;refresh();}});
  root.addEventListener('pointerleave',()=>{hovered=false;refresh();});
  const hasFocus=()=>story.contains(document.activeElement)&&document.activeElement!==button;
  story.addEventListener('focusin',()=>{focused=hasFocus();refresh();});
  story.addEventListener('focusout',()=>queueMicrotask(()=>{focused=hasFocus();refresh();}));
  document.addEventListener('visibilitychange',refresh);
  reduced.addEventListener('change',refresh);
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;refresh();},{threshold:0});
  observer.observe(story);
  root.dataset.exchanges='0';refresh();
}
