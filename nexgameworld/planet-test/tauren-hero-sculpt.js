// Original NexGameWorld Tauren v3 mane sculpture.
// One cached, lit and textured geometric master: worn by the live actor's
// existing hair meshes and by the 45-instanced strand portrait detail.
// No bones, animation joints, raycast targets, hitboxes or new render passes.
const TAU=Math.PI*2;
const cache=new WeakMap();
export const TAUREN_FUR_LOCK_BUDGET=Object.freeze({rings:5,sides:7,triangles:63});
export function taurenFurLockData(){
 const {rings,sides}=TAUREN_FUR_LOCK_BUDGET;
 const positions=[],uv=[],colors=[],indices=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),height=t-.5;
  const radius=[.83,1,.78,.45,.015][j];
  const curveX=.18*t*t+.032*Math.sin(t*Math.PI*1.3);
  const curveZ=-.065*t*t;
  for(let i=0;i<=sides;i++){
   const a=TAU*i/sides+.21*t+.065*Math.sin(5*t+i*.7);
   const r=radius*(1+.07*Math.sin(a*3+4*t));
   positions.push(curveX+r*Math.cos(a),height,curveZ+r*Math.sin(a));
   uv.push(i/sides,t);
   // Fur is darker in recessed valleys and warm on the individual tips.
   const light=Math.min(1,Math.max(0,
    .70+.12*t+.09*Math.cos(a+1)+.07*Math.sin(3*a-2*t)));
   colors.push(light*.97,light*.88,light*.75);
  }
 }
 for(let j=0;j<rings-1;j++)for(let i=0;i<sides;i++){
  const a=j*(sides+1)+i,b=a+sides+1;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 const end=positions.length/3;
 positions.push(0,-.5,0);uv.push(.5,0);colors.push(.69,.60,.50);
 for(let i=0;i<sides;i++)indices.push(end,i,i+1);
 if(!positions.every(Number.isFinite)||!colors.every(Number.isFinite))
  throw Error('Invalid Tauren fur lock geometry');
 return {positions,uv,colors,indices};
}
export function createTaurenFurLockGeometry(THREE){
 if(cache.has(THREE))return cache.get(THREE);
 const data=taurenFurLockData(),geo=new THREE.BufferGeometry();
 geo.name='NGW carved tapered mane master';
 geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
 geo.setIndex(data.indices);
 geo.computeVertexNormals();
 geo.computeBoundingSphere();
 geo.userData.actorShared=true;
 cache.set(THREE,geo);
 return geo;
}

// Carve shallow, asymmetrical growth lines directly into the same horn rings.
// Baseline horn tips, paths and the eight radial sectors are unchanged.
export function carveTaurenHornRadius(t,angle,base){
 if(!Number.isFinite(t)||!Number.isFinite(angle)||!Number.isFinite(base)||base<0)
  throw new RangeError('Invalid horn profile');
 const growth=Math.sin(7*angle+18*t+1.1*Math.sin(3*t));
 const ridge=Math.sin(4*angle-9*t)*Math.sin(Math.PI*Math.min(1,Math.max(0,t)));
 const variation=1+.037*growth+.022*ridge;
 return base*Math.max(.93,Math.min(1.07,variation));
}
