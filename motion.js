// One reduced-motion policy for the page, mosaic and 3D loader.
const query=matchMedia('(prefers-reduced-motion: reduce)');
const listeners=new Set();
let previous=query.matches;
function sync(){
  const current=query.matches;
  if(current===previous)return;
  previous=current;
  for(const listener of listeners)listener();
}
export const reducedMotion={
  get matches(){return query.matches;},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
};
query.addEventListener('change',sync);
// Some emulated/embedded Chromium surfaces update CSS without delivering the
// media-query event after resize. Layout/visibility changes reconcile the same
// preference without polling, animation frames, or geometry reads.
if('ResizeObserver'in window)new ResizeObserver(sync).observe(document.documentElement);
addEventListener('resize',sync,{passive:true});
addEventListener('pageshow',sync);
document.addEventListener('visibilitychange',sync);
