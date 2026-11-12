import * as THREE from './assets/vendor/three/three.module.js';
import {sculpt,knead} from './plastic-scene.js?v=1.6';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=n=>n*n*(3-2*n);
const route=[
  ['.morph-story',[.56,.62,190],[.55,.8,210]],
  ['#festival',[.54,.48,220],[.52,.78,220]],
  ['#programacao',[.52,.25,185],[.51,.78,185]],
  ['#outras-formas',[.73,.44,400],[.76,.54,350]],
  ['#artistas',[.56,.32,220],[.5,.8,215]],
  ['#territorios',[.52,.48,220],[.5,.82,210]],
  ['#informacoes',[.48,.64,180],[.47,.82,180]],
  ['.closing',[.6,.35,230],[.62,.7,200]]
];
export function createForegroundScene(root) {
  const canvas=root.querySelector('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,3000);camera.position.z=1000;
  scene.add(new THREE.HemisphereLight('#fff5e2','#45132f',2.8));
  const key=new THREE.DirectionalLight('#fff7e7',4.4);key.position.set(-300,500,600);scene.add(key);
  const rim=new THREE.DirectionalLight('#a9e8dd',2.3);rim.position.set(400,-100,300);scene.add(rim);
  const palette=['#eea928','#55b1a4','#de7006'].map(c=>new THREE.Color(c));
  const pieces=[0,1,2].map(i=>{
    const mesh=new THREE.Mesh(sculpt(),new THREE.MeshPhysicalMaterial({color:palette[i],roughness:.29,metalness:.02,clearcoat:.55,clearcoatRoughness:.25}));
    mesh.frustumCulled=false;scene.add(mesh);return mesh;
  });
  const sections=route.map(([selector,from,to])=>({element:document.querySelector(selector),selector,from,to}));
  const footerSection={element:document.querySelector('.footer-top'),selector:'footer',from:[.5,.5,84],to:[.5,.5,84]};
  const protectedElements=[...document.querySelectorAll('main h1,main h2,main h3,main h4,main p,main a,main button,main summary,main img,footer p,footer a,footer button,footer img,footer svg,.footer-bottom,.session-date,.session-time,.artist-photo,.axis-tabs,.artist-filters,.mosaic,.urban-composition,.territory-links')].filter(el=>!el.classList.contains('sr-only'));
  const actor={x:0,y:0,size:0,vx:0,vy:0,vs:0,ax:0,ay:0,as:0};
  const guide={x:0,y:0,size:0};
  const companionPop=[{value:0,velocity:0},{value:0,velocity:0}];
  let target={x:0,y:0,size:0},width=1,height=1,header=0,landmark='',isSpotlight=false;
  let active=false,enabled=true,paused=false,frame=0,last=0,frames=0,initialized=false,disposed=false;
  let progress=0,goal=0,velocity=0,clock=0,frameCost=0,maxCost=0,lostContext=false;
  let obstacles=[],anchorId=-1,clearance=true,currentOverlap=0;
  const saved=new THREE.Color();
  function occupiedRects(element) {
    if(!element.matches('h1,h2,h3,h4,p'))return [element.getBoundingClientRect()];
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),rects=[];
    while(walker.nextNode()){
      const node=walker.currentNode;if(!node.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);rects.push(...range.getClientRects());
    }
    return rects;
  }
  function overlapAt(x,y,size) {
    const half=size*(isSpotlight?.98:.8)+12;
    let area=0;
    for(const r of obstacles)area+=Math.max(0,Math.min(x+half,r.right)-Math.max(x-half,r.left))*Math.max(0,Math.min(y+half+header,r.bottom)-Math.max(y-half+header,r.top));
    return area;
  }
  function selectTarget() {
    let chosen=sections[0];
    for(const section of sections) if(section.element.getBoundingClientRect().top<=header+height*.44)chosen=section;
    const footer=document.querySelector('footer').getBoundingClientRect();
    if(footer.top<innerHeight-40)chosen=footerSection;
    landmark=chosen.selector;isSpotlight=landmark==='#outras-formas';
    const rect=chosen.element.getBoundingClientRect();
    const t=smooth(clamp((header+height*.3-rect.top)/Math.max(height,rect.height)));
    let x=THREE.MathUtils.lerp(chosen.from[0],chosen.to[0],t)*width;
    let y=THREE.MathUtils.lerp(chosen.from[1],chosen.to[1],t)*height;
    const previous=sections[sections.indexOf(chosen)-1];
    if(previous){const blend=smooth(clamp((header+height*.45-rect.top)/(height*.55)));x=THREE.MathUtils.lerp(previous.to[0]*width,x,blend);y=THREE.MathUtils.lerp(previous.to[1]*height,y,blend);}
    const size=THREE.MathUtils.lerp(chosen.from[2],chosen.to[2],t)*.5*Math.min(1,width/1200);
    const half=size*(isSpotlight?.98:.8)+12;
    const candidates=landmark==='footer'?[.2,.35,.5,.65,.8].map(px=>[rect.left+rect.width*px,rect.top+rect.height*.5-header]):[[x,y],[width-half-12,y],[half+12,y]];
    if(landmark!=='footer')for(const py of [.16,.34,.54,.74,.88])for(const px of [.18,.3,.42,.54,.66,.78,.9])candidates.push([px*width,py*height]);
    obstacles=protectedElements.flatMap(occupiedRects).filter(r=>r.width&&r.height&&r.bottom>header&&r.top<innerHeight);
    let best=Infinity,nextAnchor=anchorId;
    const previousTarget=target;
    candidates.forEach((candidate,id)=>{
      const cx=clamp(candidate[0],half+6,width-half-6),cy=clamp(candidate[1],half+8,height-half-8);
      const overlap=overlapAt(cx,cy,size);
      const score=overlap*30+Math.hypot(cx-x,cy-y)+(id===anchorId?0:90)+Math.hypot(cx-previousTarget.x,cy-previousTarget.y)*.18;
      if(score<best){best=score;target={x:cx,y:cy,size};nextAnchor=id;}
    });
    anchorId=nextAnchor;
    goal=(landmark==='footer'?scrollY+footer.top:scrollY)/Math.max(1,height*.95);
    active=true;
    root.dataset.visible=String(active);root.dataset.landmark=landmark;
  }
  function measure() {
    header=document.querySelector('.header').offsetHeight;width=innerWidth;height=Math.max(1,innerHeight-header);
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);selectTarget();
  }
  function pose() {
    const phase=((progress*.7)%3+3)%3,elastic=clamp(velocity*.075,-.16,.18);
    pieces.forEach((mesh,i)=>{
      const reveal=i===0?1:Math.max(0,companionPop[i-1].value);
      mesh.visible=reveal>.002;if(!mesh.visible)return;
      knead(mesh.geometry,(phase+i*1.08)%3,elastic*Math.cos(i*1.4),velocity*.09*Math.cos(i));
      const radius=actor.size*.5*(i===0?1:.39*reveal);mesh.scale.setScalar(radius);
      const offset=i===0?[0,0]:i===1?[-actor.size*.53*reveal,-actor.size*.46*reveal]:[actor.size*.5*reveal,actor.size*.46*reveal];
      mesh.position.set(actor.x-width/2+offset[0],height/2-actor.y-offset[1],i===0?0:-20);
      mesh.rotation.set(.25+Math.sin(progress*.55+i)*.22+velocity*.04,[-.5,.45,-.5][i]+clock*[.09,-.11,.12][i]+progress*[.65,-.55,.75][i],[-.2,.25,-.35][i]+Math.sin(progress*.7)*.22+velocity*.035);
      const colorPhase=((progress*.55+i)%3+3)%3,index=Math.floor(colorPhase);
      saved.copy(palette[index]).lerp(palette[(index+1)%3],smooth(colorPhase-index));mesh.material.color.copy(saved);
    });
    currentOverlap=overlapAt(actor.x,actor.y,actor.size);
    const nextClearance=currentOverlap<1;
    clearance=nextClearance;
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  function draw(now) {
    frame=0;if(disposed||!enabled||!active||document.hidden||paused){last=0;return;}
    const start=performance.now(),dt=Math.min((now-last)/1000||1/60,1/30);last=now;
    const h=dt/4;
    for(let i=0;i<4;i++) {
      velocity+=(70*(goal-progress)-9*velocity)*h;progress+=velocity*h;
      companionPop.forEach((pop,index)=>{
        const open=isSpotlight&&(index===0||companionPop[0].value>.55);
        pop.velocity+=(60*((open?1:0)-pop.value)-11*pop.velocity)*h;
        pop.value+=pop.velocity*h;
        if(!open&&pop.value<0){pop.value=0;pop.velocity=0;}
      });
      for(const [position,speed,acceleration,desired] of [['x','vx','ax',target.x],['y','vy','ay',target.y],['size','vs','as',target.size]]){
        const limit=position==='x'?width*.3:position==='y'?height*.36:110;
        guide[position]+=clamp((desired-guide[position])*(1-Math.exp(-h/.16)),-limit*h,limit*h);
        actor[acceleration]=42*(guide[position]-actor[position])-13*actor[speed];
        actor[speed]+=actor[acceleration]*h;
        actor[position]+=actor[speed]*h;
      }
    }
    clock+=dt;pose();renderer.render(scene,camera);frames++;
    const cost=performance.now()-start;frameCost+=cost;maxCost=Math.max(maxCost,cost);
    if(!initialized){initialized=true;root.dataset.state='ready';root.dataset.enhanced='true';document.body.dataset.plasticActive='true';}
    frame=requestAnimationFrame(draw);
  }
  function wake(){if(!frame&&enabled&&active&&!paused&&!document.hidden&&!disposed&&!lostContext)frame=requestAnimationFrame(draw);}
  function onScroll(){selectTarget();if(active)wake();else stop();}
  const resize=()=>{measure();wake();};
  const visibility=()=>{if(document.hidden)stop();else wake();};
  const lost=event=>{event.preventDefault();lostContext=true;stop();enabled=false;root.dataset.state='fallback';root.dataset.enhanced='false';document.body.dataset.plasticActive='false';root.dispatchEvent(new Event('plastic-unavailable'));};
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);
  measure();progress=goal;Object.assign(actor,{x:target.x,y:target.y,size:target.size});Object.assign(guide,target);pose();
  return {
    setEnabled(value){if(lostContext)return;enabled=value;root.dataset.enhanced=String(value&&initialized);document.body.dataset.plasticActive=String(value&&initialized);if(value){measure();wake();}else stop();},
    setPaused(value){paused=value;if(value)stop();else wake();},
    setActive(value){active=value;root.dataset.visible=String(value);if(value)wake();else stop();},
    inspect(){return {frames,active,enabled,paused,pendingFrame:!!frame,progress,goal,velocity,clock,landmark,actor:{...actor},target:{...target},companions:companionPop.map(pop=>({...pop})),sizeRatio:.5,clearance,currentOverlap,anchorId,pixelRatio:renderer.getPixelRatio(),triangles:renderer.info.render.triangles,averageCpuMs:frames?frameCost/frames:0,maxCpuMs:maxCost,rotation:pieces[0].rotation.toArray().slice(0,3),colors:pieces.map(m=>m.material.color.getHexString()),sample:[...pieces[0].geometry.attributes.position.array.slice(150,159)],finite:pieces.every(m=>m.geometry.attributes.position.array.every(Number.isFinite)),canvas:{width:canvas.width,height:canvas.height}};},
    dispose(){disposed=true;stop();removeEventListener('scroll',onScroll);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);pieces.forEach(m=>{m.geometry.dispose();m.material.dispose();});renderer.dispose();}
  };
}
