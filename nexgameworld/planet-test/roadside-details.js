// P2.3.12: tiny, instanced verge stones and dry grasses link the village
// track to the tall forest. Decorative only: no collision, raycasts or physics.
import {createWeatheredStoneGeometry} from './stone-surface.js?v=1';
import {forestTrailLatitude,forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS}
 from './whispering-forest.js';
const TAU=Math.PI*2,R=261;
export function roadsideBudget(quality='balanced',preview=false){
 if(preview)return {stones:0,tufts:0};
 if(quality==='economy')return {stones:65,tufts:40};
 if(quality==='high')return {stones:450,tufts:330};
 return {stones:245,tufts:180};
}
export function roadsideLayout(startRoute,seed=612831){
 let state=seed>>>0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const stones=[],tufts=[];
 function scatter(p,side,distance,kind){
  const size=kind==='stones'?.11+rand()*.25:.21+rand()*.34;
  (kind==='stones'?stones:tufts).push(Object.freeze({
   ...p,side,distance,size,variation:rand(),yaw:rand()*TAU
  }));
 }
 const route=Array.isArray(startRoute)?startRoute:[];
 for(let i=0;i<route.length-1;i++){
  const [x,z]=route[i],[x2,z2]=route[i+1];
  const dx=x2-x,dz=z2-z,len=Math.hypot(dx,dz);
  if(len<.1)continue;
  const px=-dz/len,pz=dx/len;
  const steps=Math.max(1,Math.ceil(len/2.9));
  for(let j=0;j<steps;j++){
   const t=(j+.35+.3*rand())/steps;
   const cx=x+dx*t,cz=z+dz*t;
   // Leave the central camp's path clean near the main interaction area.
   if(Math.hypot(cx,cz)<7)continue;
   for(const side of [-1,1]){
    const distance=2.75+rand()*2.75,kind=rand()<.58?'stones':'tufts';
    scatter({coord:'start',x:cx+px*side*distance,
     z:cz+pz*side*distance},side,distance,kind);
   }
  }
 }
 for(let lon=.19;lon<1.44;lon+=.0105){
  const lat=forestTrailLatitude(lon);
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
   FOREST_CAMP.clearingRadius+6)continue;
  if(FOREST_SITE_CLEARINGS.some(p=>forestDistance(lon,lat,p.lon,p.lat)<p.radius+7))continue;
  for(const side of [-1,1]){
   const distance=2.6+rand()*2.8;
   const lonJitter=(rand()-.5)*.006;
   const atLon=lon+lonJitter;
   const latOffset=side*distance/R;
   const kind=rand()<.61?'stones':'tufts';
   scatter({coord:'forest',lon:atLon,lat:forestTrailLatitude(atLon)+latOffset},
    side,distance,kind);
  }
 }
 return Object.freeze({stones:Object.freeze(stones),tufts:Object.freeze(tufts)});
}
export function roadsideTuftData(){
 const positions=[],colors=[];
 for(let blade=0;blade<6;blade++){
  const angle=blade*TAU/6;
  const dx=Math.cos(angle),dz=Math.sin(angle),tx=-dz,tz=dx;
  const h=.48+(blade%3)*.15,r=.25+.03*(blade%2),w=.053;
  positions.push(0,0,0,dx*r+tx*w,h*.42,dz*r+tz*w,dx*(r+.21),h,dz*(r+.21));
  positions.push(0,0,0,dx*(r+.21),h,dz*(r+.21),dx*r-tx*w,h*.42,dz*r-tz*w);
  for(let j=0;j<6;j++)colors.push(.76,.83,.62);
 }
 return {positions,colors};
}
export function createRoadsideDetails(THREE,{scene,radius,heightAt,startRoute}){
 const layout=roadsideLayout(startRoute),up=new THREE.Vector3(0,1,0),
  normal=new THREE.Vector3(),align=new THREE.Quaternion(),yaw=new THREE.Quaternion(),
  dummy=new THREE.Object3D(),color=new THREE.Color(),batches=[];
 const grass=roadsideTuftData(),grassGeo=new THREE.BufferGeometry();
 grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(grass.positions,3));
 grassGeo.setAttribute('color',new THREE.Float32BufferAttribute(grass.colors,3));
 grassGeo.computeVertexNormals();
 function add(kind,geometry){
  const rows=layout[kind],isStone=kind==='stones';
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({
   color:'#ffffff',vertexColors:true,roughness:1,
   side:THREE.DoubleSide,flatShading:isStone
  }),rows.length);
  mesh.name='road-'+kind+'-decorative-no-collision';
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  for(let i=0;i<rows.length;i++){
   const p=rows[i];
   if(p.coord==='start'){
    const d=Math.hypot(p.x,p.z),angle=d/radius;
    normal.set(d>1e-9?Math.sin(angle)*p.x/d:0,
     d>1e-9?Math.sin(angle)*p.z/d:0,Math.cos(angle));
   }else{
    normal.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),
     Math.cos(p.lat)*Math.cos(p.lon));
   }
   const h=isStone?p.size*.20:.032;
   dummy.position.copy(normal).multiplyScalar(radius+heightAt(normal)+h);
   dummy.quaternion.copy(align.setFromUnitVectors(up,normal))
    .multiply(yaw.setFromAxisAngle(up,p.yaw));
   if(isStone)dummy.scale.set(p.size,p.size*.30,p.size*.7);
   else dummy.scale.set(p.size,p.size,p.size);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   const palette=isStone?['#7c7466','#91816c','#6c746b','#868578']:
    ['#b5a473','#8c956a','#a39b72','#788d65'];
   mesh.setColorAt(i,color.set(palette[Math.min(3,Math.floor(p.variation*4))]));
  }
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);batches.push({kind,mesh});
 }
 add('stones',createWeatheredStoneGeometry(THREE,'trail'));
 add('tufts',grassGeo);
 function setQuality(quality='balanced',preview=false){
  const budget=roadsideBudget(quality,preview);
  for(const {kind,mesh} of batches){
   mesh.count=Math.min(mesh.instanceMatrix.count,budget[kind]);
   mesh.visible=mesh.count>0;
  }
 }
 setQuality();
 return {setQuality,layout,decorativeOnly:true,drawCalls:2};
}
