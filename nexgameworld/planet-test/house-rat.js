import {LONGHOUSE} from './hearth-house.js?v=5';
import {HOUSE_RAT_COMPRESSED} from './house-rat-data.js?v=1';

// Decorative resident of the longhouse. This is deliberately NOT a server mob:
// it has no collision, target, damage, loot or economy state.
const safeX=LONGHOUSE.width/2-LONGHOUSE.wallThickness-.8;
const safeZ=LONGHOUSE.depth/2-LONGHOUSE.wallThickness-.8;
const chestPadX=1.155+.55,chestPadZ=.725+.55;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function ratCanStand(x,z){
 return Number.isFinite(x)&&Number.isFinite(z)&&
  Math.abs(x)<safeX&&Math.abs(z)<safeZ&&
  !(Math.abs(x-LONGHOUSE.chestLocalX)<chestPadX&&
    Math.abs(z-LONGHOUSE.chestLocalZ)<chestPadZ);
}
export function ratRouteOpen(ax,az,bx,bz){
 const samples=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.25));
 for(let i=0;i<=samples;i++){
  const t=i/samples;
  if(!ratCanStand(ax+(bx-ax)*t,az+(bz-az)*t))return false;
 }
 return true;
}
export function createRatPatrol(seed=0x51a7){
 let state=seed>>>0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 let x=-2,z=-1,targetX=x,targetZ=z,heading=0,rest=.65,speed=1.5,travel=0;
 function chooseTarget(){
  for(let i=0;i<48;i++){
   const tx=(rand()*2-1)*(safeX-.35),tz=(rand()*2-1)*(safeZ-.35);
   if(Math.hypot(tx-x,tz-z)>2.3&&ratRouteOpen(x,z,tx,tz)){
    targetX=tx;targetZ=tz;speed=1.3+rand()*1.05;return true;
   }
  }
  // Stay in place rather than pass through the chest or an outside wall.
  rest=.75;return false;
 }
 function update(delta){
  const dt=clamp(Number(delta)||0,0,.05);
  if(rest>0){
   rest=Math.max(0,rest-dt);
   if(rest===0)chooseTarget();
  }else{
   const dx=targetX-x,dz=targetZ-z,dist=Math.hypot(dx,dz);
   if(dist<.16){
    rest=.3+rand()*1.3;travel=0;
   }else{
    const desired=Math.atan2(dx,dz);
    const turn=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
    heading+=clamp(turn,-dt*7.5,dt*7.5);
    const step=Math.min(dist,speed*dt*Math.max(0,Math.cos(turn)));
    const nx=x+dx/dist*step,nz=z+dz/dist*step;
    if(ratRouteOpen(x,z,nx,nz)){
     x=nx;z=nz;travel+=step;
    }else {rest=.5;chooseTarget();}
   }
  }
  return {x,z,heading,running:rest===0,travel};
 }
 return {update,get position(){return {x,z}},get destination(){return {x:targetX,z:targetZ}}};
}
const srgbToLinear=x=>{
 x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
};
export async function unpackHouseRatMesh(){
 if(typeof DecompressionStream!=='function')throw Error('gzip decompression is unavailable');
 const binary=atob(HOUSE_RAT_COMPRESSED),packed=Uint8Array.from(binary,c=>c.charCodeAt(0));
 const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
 const view=new DataView(await new Response(stream).arrayBuffer());
 if(view.byteLength<34||view.getUint32(0,false)!==0x52415431)throw Error('Invalid house rat mesh');
 const vertexCount=view.getUint16(4,true),indexCount=view.getUint32(6,true);
 if(vertexCount<100||vertexCount>30000||indexCount%3||indexCount>200000||
    view.byteLength!==34+vertexCount*9+indexCount*2)throw Error('Invalid rat mesh sizes');
 const min=[],range=[];
 for(let i=0;i<3;i++){
  min[i]=view.getFloat32(10+i*4,true);
  range[i]=view.getFloat32(22+i*4,true)-min[i];
 }
 const positions=new Float32Array(vertexCount*3);
 const colors=new Float32Array(vertexCount*3);
 for(let i=0;i<vertexCount;i++){
  const o=34+i*9;
  for(let j=0;j<3;j++){
   positions[i*3+j]=min[j]+view.getUint16(o+j*2,true)/65535*range[j];
   colors[i*3+j]=srgbToLinear(view.getUint8(o+6+j));
  }
 }
 const indices=new Uint16Array(indexCount);
 const offset=34+vertexCount*9;
 for(let i=0;i<indexCount;i++){
  const index=view.getUint16(offset+i*2,true);
  if(index>=vertexCount)throw Error('Out of range rat index');
  indices[i]=index;
 }
 return {positions,colors,indices};
}
export function createHouseRat(THREE,houseRoot){
 const patrol=createRatPatrol();
 const pivot=new THREE.Group();pivot.name='Крыска-Лариска';
 houseRoot.add(pivot);
 const body=new THREE.Group();pivot.add(body);
 // Lightweight nameplate follows the rat; never intercepts taps or targeting.
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const ctx=canvas.getContext('2d');
 ctx.font='bold 43px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.lineWidth=7;ctx.strokeStyle='rgba(20,15,12,.9)';ctx.strokeText('Крыска-Лариска',256,48);
 ctx.fillStyle='#f3e1bb';ctx.fillText('Крыска-Лариска',256,48);
 const texture=new THREE.CanvasTexture(canvas);
 const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
 label.name='rat-nameplate';label.position.set(0,.72,0);label.scale.set(1.65,.31,1);
 pivot.add(label);
 let geometry=null,tailIndices=[],tailRest=[],lastTravel=0,runPhase=0;
 // Decompress once; game startup and other modules continue independently.
 void unpackHouseRatMesh().then(({positions,colors,indices})=>{
  geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.setIndex(new THREE.BufferAttribute(indices,1));
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({
   color:0xffffff,vertexColors:true,roughness:1,metalness:0,
   side:THREE.DoubleSide
  });
  const model=new THREE.Mesh(geometry,material);
  model.name='street_rat_lowpoly_baked';
  model.receiveShadow=true;
  body.add(model);
  for(let i=0;i<positions.length;i+=3)if(positions[i+2]<-.18){
   tailIndices.push(i);tailRest.push(positions[i]);
  }
 }).catch(error=>console.warn('Cannot load house rat mesh:',error));
 let prevTime=0;
 return {
  root:pivot,
  animate(time){
   const t=Number.isFinite(time)?time:0,dt=clamp(t-prevTime,0,.05);
   prevTime=t;
   const current=patrol.update(dt);
   pivot.position.set(current.x,.22,current.z);
   pivot.rotation.y=current.heading;
   const moved=current.travel-lastTravel;
   lastTravel=current.travel;
   if(moved>0)runPhase+=moved*24;
   const running=current.running&&moved>1e-5;
   body.position.y=running?Math.abs(Math.sin(runPhase))*.023:Math.sin(t*4)*.006;
   body.rotation.z=running?Math.sin(runPhase*.5)*.028:Math.sin(t*1.5)*.008;
   body.rotation.x=running?Math.sin(runPhase)*.018:Math.sin(t*2)*.01;
   if(geometry&&tailIndices.length){
    const pos=geometry.getAttribute('position');
    for(let i=0;i<tailIndices.length;i++){
     const n=tailIndices[i],z=pos.array[n+2],weight=clamp((-.18-z)/.43,0,1);
     pos.array[n]=tailRest[i]+Math.sin(t*(running?17:4)+weight*3)*.075*weight;
    }
    pos.needsUpdate=true;
    geometry.computeVertexNormals();
   }
  }
 };
}
