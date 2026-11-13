// Individual translate/scale compose with the scroll transform in app.js.
export function shuffled(values, random=Math.random) {
  const bag=[...values];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag;
}
export function ringLayout(positions,direction) {
  const ring=[0,1,2,5,4,3];
  return positions.map(position=>ring[(ring.indexOf(position)+direction+ring.length)%ring.length]);
}
export function createMosaic(root, story, reduced) {
  const button=document.querySelector('.mosaic-toggle');
  const artists=JSON.parse(document.querySelector('#mosaic-data').textContent);
  const tiles=[...root.querySelectorAll('.tile')];
  let preference=null;
  try{preference=localStorage.getItem('artecool-mosaic');}catch{}
  let timer=0,inView=false,busy=false,exchanges=0,reorders=0,generation=0;
  let nextAt=performance.now()+2500,wasRunning=false;
  let positions=tiles.map((_,i)=>i),artistBag=shuffled(artists),slotBag=shuffled(tiles);
  let portraitOrder=tiles.filter(tile=>tile.querySelector('.tile-photo'));
  let settle=null,activeAnimations=[];
  const enabled=()=>preference==='on'||(preference!=='off'&&!reduced.matches);
  const canRun=()=>enabled()&&!document.hidden&&inView;
  const portraits=()=>tiles.filter(tile=>tile.querySelector('.tile-photo:not([aria-hidden])'));
  const translation=index=>{
    const destination=positions[index];
    return `calc(var(--cell) * ${destination%3-index%3}) calc(var(--cell) * ${Math.floor(destination/3)-Math.floor(index/3)})`;
  };
  function updateNotes(){
    root.querySelector('.mosaic-notes').replaceChildren(...portraitOrder.flatMap(tile=>{
      const caption=tile.querySelector('.tile-photo:not([aria-hidden]) .tile-caption');
      if(!caption)return [];
      const note=caption.cloneNode(true);note.className='mosaic-note';return [note];
    }));
  }
  function refresh() {
    clearTimeout(timer);timer=0;
    const running=canRun();if(running&&!wasRunning)nextAt=performance.now()+2500;wasRunning=running;
    button.hidden=false;
    button.textContent=enabled()?'Pausar mosaico':preference==='off'?'Retomar mosaico':'Ativar mosaico';
    button.setAttribute('aria-pressed',String(!enabled()));
    root.dataset.rotation=!enabled()&&reduced.matches&&preference!=='off'?'reduced':canRun()?'running':'paused';
    if(!canRun()) {
      generation++;
      if(document.hidden||!inView||!enabled()&&reduced.matches)settle?.();
      else activeAnimations.forEach(animation=>animation.pause());
      return;
    }
    activeAnimations.forEach(animation=>animation.play());
    if(!busy)timer=setTimeout(exchange,Math.max(0,nextAt-performance.now()));
  }
  function animate(animations,finish,phase) {
    activeAnimations=animations;root.dataset.phase=phase;
    let finished=false;
    const commit=()=>{
      if(finished)return;finished=true;finish();
      animations.forEach(animation=>animation.cancel());
      busy=false;settle=null;activeAnimations=[];root.dataset.phase='idle';
    };
    settle=commit;
    Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{commit();refresh();});
  }
  function nextArtist(visibleIds){
    if(!artistBag.some(artist=>!visibleIds.has(artist.id)))artistBag=shuffled(artists);
    const index=artistBag.findIndex(artist=>!visibleIds.has(artist.id));
    return artistBag.splice(index,1)[0];
  }
  function nextEmpty(occupied){
    if(!slotBag.some(tile=>!occupied.includes(tile)))slotBag=shuffled(tiles);
    const index=slotBag.findIndex(tile=>!occupied.includes(tile));
    return slotBag.splice(index,1)[0];
  }
  async function exchange() {
    timer=0;if(!canRun()||busy)return;
    nextAt=performance.now()+2500;
    busy=true;const token=++generation;
    const occupied=portraits();
    const visibleIds=new Set(occupied.map(tile=>tile.querySelector('.tile-photo:not([aria-hidden])').dataset.portrait));
    const artist=nextArtist(visibleIds);
    const source=portraitOrder[0];
    const destination=exchanges%2===0?nextEmpty(occupied):source;
    const photo=new Image(480,600);photo.alt='';photo.decoding='async';
    photo.src=`assets/artists/${artist.id}-mosaic.webp`;
    try{await photo.decode();}
    catch{busy=false;refresh();return;}
    if(token!==generation||!canRun()){busy=false;refresh();return;}
    const old=source.querySelector('.tile-photo');
    const frame=document.createElement('div');frame.className='tile-photo';frame.dataset.portrait=artist.id;
    const caption=document.createElement('span');caption.className='tile-caption';
    const name=document.createElement('strong');name.textContent=artist.name;
    const meta=document.createElement('span');meta.textContent=`${artist.date} · ${artist.place}`;
    caption.append(name,meta);frame.append(photo,caption);destination.append(frame);
    const timing={duration:1500,easing:'cubic-bezier(.37,0,.63,1)',fill:'both'};
    const entrance=frame.animate([{opacity:0},{opacity:1}],timing);
    const exit=old.animate([{opacity:1},{opacity:0}],timing);
    old.setAttribute('aria-hidden','true');
    portraitOrder=[...portraitOrder.slice(1),destination];updateNotes();
    const reorder=(exchanges+1)%4===0&&!reduced.matches;
    const layout=reorder?layoutAnimations():[];
    animate([entrance,exit,...layout],()=>{
      old.remove();exchanges++;root.dataset.exchanges=String(exchanges);
      if(reorder){reorders++;root.dataset.reorders=String(reorders);root.dataset.layout=positions.join(',');}
    },reorder?'photo-layout':'photo');
  }
  function layoutAnimations() {
    const before=positions;positions=ringLayout(before,Math.random()<.5?-1:1);
    return tiles.map((tile,i)=>{
      const from=`calc(var(--cell) * ${before[i]%3-i%3}) calc(var(--cell) * ${Math.floor(before[i]/3)-Math.floor(i/3)})`;
      const to=translation(i);tile.style.translate=to;
      return tile.animate([
        {translate:from,scale:'1',offset:0},
        {translate:from,scale:'.92',offset:.16},
        {translate:to,scale:'.92',offset:.84},
        {translate:to,scale:'1',offset:1}
      ],{duration:1800,easing:'cubic-bezier(.37,0,.63,1)',fill:'both'});
    });
  }
  button.addEventListener('click',()=>{
    preference=enabled()?'off':'on';
    try{localStorage.setItem('artecool-mosaic',preference);}catch{}
    refresh();
  });
  document.addEventListener('visibilitychange',refresh);
  reduced.addEventListener('change',()=>{settle?.();refresh();});
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;refresh();},{threshold:0});
  observer.observe(story);
  root.dataset.exchanges='0';root.dataset.reorders='0';root.dataset.layout=positions.join(',');root.dataset.phase='idle';refresh();
}
