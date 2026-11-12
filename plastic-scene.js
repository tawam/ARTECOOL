import * as THREE from './assets/vendor/three/three.module.js';

// Three silhouettes from the brand share one topology, so the clay never swaps meshes.
const count = 128;
const pivot = [.65, -.65];
const clamp = (value, min=0, max=1) => Math.max(min,Math.min(max,value));
const smooth = value => value*value*(3-2*value);
const circle = Array.from({length:256},(_,i)=>[Math.cos(i*Math.PI/128),Math.sin(i*Math.PI/128)]);
const quarter = [[-1,-1],[1,-1],...Array.from({length:65},(_,i)=>[-1+2*Math.cos(i*Math.PI/128),-1+2*Math.sin(i*Math.PI/128)])];
const steps = [[-1,-1],[1,-1],[1,1],[.5,1],[.5,.5],[0,.5],[0,0],[-.5,0],[-.5,-.5],[-1,-.5]];
function radialContour(polygon) {
  return Array.from({length:count},(_,i)=>{
    const angle=i*Math.PI*2/count, dx=Math.cos(angle),dy=Math.sin(angle);
    let nearest=Infinity;
    for(let j=0;j<polygon.length;j++) {
      const a=polygon[j], b=polygon[(j+1)%polygon.length],ex=b[0]-a[0],ey=b[1]-a[1];
      const denominator=dx*ey-dy*ex;
      if(Math.abs(denominator)<1e-8) continue;
      const ax=a[0]-pivot[0],ay=a[1]-pivot[1];
      const t=(ax*ey-ay*ex)/denominator,u=(ax*dy-ay*dx)/denominator;
      if(t>0&&u>=-1e-7&&u<=1+1e-7) nearest=Math.min(nearest,t);
    }
    if(!Number.isFinite(nearest)) throw Error('Contorno geométrico inválido');
    return [pivot[0]+dx*nearest,pivot[1]+dy*nearest];
  });
}
const outlines=[circle,quarter,steps].map(radialContour);
// Closely spaced shoulder rings soften the extrusion; face rings keep deformation continuous.
const rings=[[.22,.35],[.55,.35],[.87,.35],[.96,.33],[.995,.27],[1,.19],[1,-.19],[.995,-.27],[.96,-.33],[.87,-.35],[.55,-.35],[.22,-.35]];
export function sculpt() {
  const positions=new Float32Array(rings.length*count*3+6),indices=[];
  for(let r=0;r<rings.length-1;r++) for(let i=0;i<count;i++) {
    const a=r*count+i,b=r*count+(i+1)%count,c=(r+1)*count+i,d=(r+1)*count+(i+1)%count;
    indices.push(a,c,b,b,c,d);
  }
  const front=rings.length*count,back=front+1;
  for(let i=0;i<count;i++) indices.push(front,i,(i+1)%count,back,(rings.length-1)*count+(i+1)%count,(rings.length-1)*count+i);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  return geometry;
}
export function knead(geometry,phase,stretch,twist) {
  const a=Math.floor(phase)%3,b=(a+1)%3,mix=smooth(phase-Math.floor(phase));
  const points=geometry.attributes.position.array;
  const sx=1+stretch,sy=1/Math.sqrt(sx),sz=sy;
  for(let r=0;r<rings.length;r++) for(let i=0;i<count;i++) {
    const [ratio,z]=rings[r];
    const x=pivot[0]+(THREE.MathUtils.lerp(outlines[a][i][0],outlines[b][i][0],mix)-pivot[0])*ratio;
    const y=pivot[1]+(THREE.MathUtils.lerp(outlines[a][i][1],outlines[b][i][1],mix)-pivot[1])*ratio;
    const turn=twist*y, c=Math.cos(turn),s=Math.sin(turn),n=(r*count+i)*3;
    points[n]=(x*c-z*s)*sx;points[n+1]=y*sy;points[n+2]=(x*s+z*c)*sz;
  }
  const front=rings.length*count*3;
  for(let i=0;i<2;i++) {
    const z=i===0?.35:-.35,turn=twist*pivot[1],c=Math.cos(turn),s=Math.sin(turn);
    points[front+i*3]=(pivot[0]*c-z*s)*sx;
    points[front+i*3+1]=pivot[1]*sy;
    points[front+i*3+2]=(pivot[0]*s+z*c)*sz;
  }
  geometry.attributes.position.needsUpdate=true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

