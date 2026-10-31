// NGW-ART-REMASTER-001, G-10: original, buried spherical ground stones.
// Isolated render-only layer: no terrain, character, camera or physics changes.
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,forestTrailLatitude,createForestLayout} from './whispering-forest.js?v=22';
import {VALLEY_ROCKS} from './planet-landmarks.js?v=1';
import {BANDIT_CAMP} from './bandit-camp-data.js?v=2';

const R=261,TAU=Math.PI*2;
export const G10_STONE_VERSION='R1-G10-1';
export const G10_STONE_CAPS=Object.freeze({pebbles:850,boulders:150,outcrops:150,soil:260});
const kinds=Object.keys(G10_STONE_CAPS);
const colors={
 pebbles:['#958a75','#7f8580','#aa997e','#796e62'],
 boulders:['#8d8c7e','#716f66','#9d8e79','#7b817b'],
 outcrops:['#9b8d77','#777c79','#b09b7b','#6b766e'],
 soil:['#80644c','#927358','#665d4b','#9f8260']
};
const seeded=seed=>{let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)};
const dist=(x,z,a,b)=>Math.hypot(x-a,z-b);
const segmentDistance=(x,z,s)=>{
 const dx=s.bx-s.ax,dz=s.bz-s.az,len=dx*dx+dz*dz;
 if(len<1e-9)return Infinity;
 const t=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/len));
 return dist(x,z,s.ax+t*dx,s.az+t*dz);
};
export function g10StoneBudget(quality='balanced',preview=false){
 const ratio=preview?0:quality==='high'?1:quality==='economy'?.16:.62;
 return Object.fromEntries(kinds.map(k=>[k,Math.floor(G10_STONE_CAPS[k]*ratio)]));
}
export function g10StoneLayout({startSegments=[],lakeRadius=()=>Infinity,
 banditCamp=BANDIT_CAMP.center,seed=631047}={}){
 const rand=seeded(seed),rows=Object.fromEntries(kinds.map(k=>[k,[]]));
 const trees=createForestLayout().trees;
 const picks=['pebbles','pebbles','pebbles','pebbles','soil','soil','outcrops','boulders'];
 const pick=()=>picks[Math.floor(rand()*picks.length)];
 const big=k=>k==='boulders'||k==='outcrops';
 function add(k,at){
  const size=k==='pebbles'?.12+rand()*.24:k==='boulders'?.64+rand()*.86:
   k==='outcrops'?.60+rand()*1.05:.38+rand()*.70;
  rows[k].push(Object.freeze({...at,size,yaw:rand()*TAU,
   stretch:.76+rand()*.65,heightScale:.65+rand()*.32,tint:rand()}));
 }
 const quota=Object.fromEntries(kinds.map(k=>[k,Math.ceil(G10_STONE_CAPS[k]*.28)]));
 for(let i=0;i<22000;i++){
  if(kinds.every(k=>rows[k].length>=quota[k]))break;
  const k=pick();if(rows[k].length>=quota[k])continue;
  const x=(rand()-.5)*162,z=(rand()-.5)*162;
  if(dist(x,z,0,0)<20||dist(x,z,0,0)>79)continue;
  if(dist(x,z,-27,-2)<20||banditCamp&&dist(x,z,banditCamp.x,banditCamp.z)<16)continue;
  if(lakeRadius(x,z)<1.48)continue;
  if(startSegments.some(seg=>segmentDistance(x,z,seg)<(big(k)?7.4:3.35)))continue;
  if(VALLEY_ROCKS.some(p=>dist(x,z,p.x,p.z)<p.radius+(big(k)?2.8:.9)))continue;
  add(k,{zone:'start',x,z});
 }
 for(let i=0;i<34000;i++){
  if(kinds.every(k=>rows[k].length>=G10_STONE_CAPS[k]))break;
  const k=pick();if(rows[k].length>=G10_STONE_CAPS[k])continue;
  const lon=.19+rand()*1.24,side=rand()<.5?-1:1;
  const meters=(big(k)?8.8:3.75)+rand()*(big(k)?64:58);
  const lat=forestTrailLatitude(lon)+side*meters/R;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
    FOREST_CAMP.clearingRadius+8+(big(k)?2:0))continue;
  if(FOREST_SITE_CLEARINGS.some(p=>forestDistance(lon,lat,p.lon,p.lat)<
    p.radius+7+(big(k)?2:0)))continue;
  if(trees.some(t=>forestDistance(lon,lat,t.lon,t.lat)<
    t.radius+(big(k)?3.4:1.4)))continue;
  add(k,{zone:'forest',lon,lat});
 }
 return Object.freeze(Object.fromEntries(kinds.map(k=>[k,Object.freeze(rows[k])])));
}
// Irregular tiered stone bodies; the perimeter ring is buried below the
// surrounding terrain. Soil strata are flatter, earthen, rocky pockets.
export function g10StoneGeometryData(kind){
 if(!kinds.includes(kind))throw new RangeError('unknown mineral form');
 const n=kind==='boulders'?13:kind==='outcrops'?12:kind==='pebbles'?9:11;
 const rings=kind==='soil'?[[-.18,1],[.025,.80],[.09,.36]]:
  kind==='outcrops'?[[-.25,1],[.13,.88],[.39,.44]]:
  kind==='boulders'?[[-.25,1],[.34,.82],[.83,.42]]:
  [[-.22,1],[.22,.79],[.53,.30]];
 const tiers=rings.map(([h,r],layer)=>Array.from({length:n},(_,i)=>{
  const a=i*TAU/n,w=1+.12*Math.sin(5*a+layer*.47)+.07*Math.cos(3*a-layer*.52);
  return [(Math.cos(a)*w+(kind==='outcrops'?.16*Math.sin(2*a):0))*r,
   h+(layer===0?-.015:.047*Math.sin(3*a+.9)),Math.sin(a)*w*r];
 }));
 const positions=[],colors=[];
 function vertexColor(ring,side){
  const fleck=.5+.5*Math.sin(side*9.13+ring*2.7),crack=.5+.5*Math.cos(side*5.7+ring*.8);
  const moss=kind==='soil'?0:Math.max(0,Math.sin(side*2.9+1.1))*.10;
  const c=kind==='soil'?[.65,.49,.34]:[.75,.73,.67];
  const shade=.70+ring*.115+fleck*.09-crack*.055;
  return [c[0]*shade*(1-moss),c[1]*shade*(1+moss*.35),c[2]*shade*(1-moss*.28)];
 }
 function tri(a,b,c,ring,side){
  positions.push(...a,...b,...c);
  colors.push(...vertexColor(ring,side),...vertexColor(ring+1,side),
   ...vertexColor(ring,side+1));
 }
 for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){
  const j=(i+1)%n;
  tri(tiers[ring][i],tiers[ring][j],tiers[ring+1][i],ring,i);
  tri(tiers[ring][j],tiers[ring+1][j],tiers[ring+1][i],ring,i+1);
 }
 const top=[kind==='outcrops'?.13:0,
  kind==='soil'?.082:kind==='outcrops'?.42:kind==='boulders'?.91:.58,0];
 for(let i=0;i<n;i++)tri(tiers[2][i],tiers[2][(i+1)%n],top,2,i);
 return {positions,colors};
}
export function createG10GroundStones(THREE,{scene,radius=R,heightAt,
 startSegments=[],lakeRadius=()=>Infinity,banditCamp=BANDIT_CAMP.center}){
 const layout=g10StoneLayout({startSegments,lakeRadius,banditCamp});
 const up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),
  align=new THREE.Quaternion(),turn=new THREE.Quaternion(),
  dummy=new THREE.Object3D(),tint=new THREE.Color(),batches=[];
 for(const kind of kinds){
  const data=g10StoneGeometryData(kind),geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
  geo.computeVertexNormals();geo.computeBoundingSphere();
  const rows=layout[kind],mesh=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({
   color:'#ffffff',vertexColors:true,roughness:1,metalness:0,
   flatShading:true,side:THREE.DoubleSide
  }),rows.length);
  mesh.name='G10-'+kind+'-embedded-minerals-no-collision';
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;
  mesh.raycast=()=>{}; // never a pointer target
  for(let i=0;i<rows.length;i++){
   const p=rows[i];
   if(p.zone==='start'){
    const d=Math.hypot(p.x,p.z),angle=d/radius,s=d>1e-9?Math.sin(angle)/d:0;
    normal.set(p.x*s,p.z*s,Math.cos(angle));
   }else normal.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),
     Math.cos(p.lat)*Math.cos(p.lon));
   // The G-06 surfaces sit at +.153m (village) / +.046m (forest).
   // A negative-Y geometry skirt sinks into the visual soil instead of floating.
   const surface=p.zone==='start'?.153:.046;
   dummy.position.copy(normal).multiplyScalar(radius+heightAt(normal)+surface);
   dummy.quaternion.copy(align.setFromUnitVectors(up,normal))
    .multiply(turn.setFromAxisAngle(up,p.yaw));
   const vertical=kind==='soil'?.39:kind==='pebbles'?.53:
    kind==='outcrops'?.45:.66;
   dummy.scale.set(p.size*p.stretch,p.size*vertical*p.heightScale,p.size/p.stretch);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   mesh.setColorAt(i,tint.set(colors[kind][Math.min(3,Math.floor(p.tint*4))]));
  }
  mesh.instanceMatrix.needsUpdate=true;
  scene.add(mesh);batches.push({kind,mesh});
 }
 function setQuality(quality='balanced',preview=false){
  const budgets=g10StoneBudget(quality,preview);
  for(const {kind,mesh} of batches){
   mesh.count=Math.min(mesh.instanceMatrix.count,budgets[kind]);
   mesh.visible=mesh.count>0;
  }
 }
 setQuality();
 return {setQuality,layout,decorativeOnly:true,drawCalls:4};
}
