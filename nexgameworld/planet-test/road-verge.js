// NGW-ART-REMASTER-001 G-09: planted, non-colliding verges at the ACTUAL
// G-08 painted edge of existing spherical paths; no route/physics changes.
import {paintedTrailProfile} from './trail-art.js?v=1';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude,
 forestDistance,createForestLayout} from './whispering-forest.js?v=22';
import {WORLD_ART_PALETTE as ART} from './world-art-style.js?v=1';
import {BANDIT_CAMP} from './bandit-camp-data.js?v=2';
const R=261,TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
export const ROAD_VERGE_CAPS=Object.freeze({grass:2200,moss:480,leaves:660,roots:260});
export const ROAD_VERGE_VERSION='R1-G09-1';
const createRandom=seed=>{let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)};
export function roadVergeBudget(preset='balanced',preview=false){
 const k=preview?0:preset==='high'?1:preset==='economy'?.20:.66;
 return Object.fromEntries(Object.entries(ROAD_VERGE_CAPS).map(([key,value])=>[key,Math.floor(value*k)]));
}
const dist2=(x,z,xx,zz)=>(x-xx)**2+(z-zz)**2;
const closeToForestSite=(lon,lat,size)=>forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
 FOREST_CAMP.clearingRadius+size+5||
 FOREST_SITE_CLEARINGS.some(p=>forestDistance(lon,lat,p.lon,p.lat)<p.radius+size+4);

export function roadVergeLayout({startSegments=[],lakeRadius=()=>Infinity,
 banditCamp=BANDIT_CAMP.center,seed=973151}={}){
 const random=createRandom(seed);
 const groups=Object.fromEntries(Object.keys(ROAD_VERGE_CAPS).map(key=>[key,[]]));
 const trees=createForestLayout().trees;
 const typeList=['grass','grass','grass','moss','leaves','leaves','roots'];
 function add(kind,point,profile){
  if(groups[kind].length>=ROAD_VERGE_CAPS[kind])return;
  groups[kind].push(Object.freeze({...point,
   size:kind==='grass'?.31+random()*.49:kind==='moss'?.28+random()*.42:
    kind==='roots'?.22+random()*.30:.20+random()*.44,
   variation:random(),yaw:random()*TAU,edgeStrength:profile.verge}));
 }
 const choose=()=>typeList[Math.floor(random()*typeList.length)];
 function acceptStart(x,z,profile,kind){
  if(Math.hypot(x,z)>78||Math.hypot(x,z)<18)return false;
  // Start house, chest, herb/NPC interaction zone and bandit camp remain clear.
  if(dist2(x,z,-27,-2)<19**2)return false;
  if(banditCamp&&dist2(x,z,banditCamp.x,banditCamp.z)<13**2)return false;
  if(lakeRadius(x,z)<1.36)return false;
  if(profile.distance<2.75||profile.core>.08)return false;
  return random()<Math.min(.98,.19+profile.verge*.66+(kind==='leaves'?.12:0));
 }
 function acceptForest(lon,lat,p,kind){
  if(lon<.18||lon>1.44||Math.abs(lat-forestTrailLatitude(lon))*R<3.1)
   return false;
  if(closeToForestSite(lon,lat,.8))return false;
  if(trees.some(t=>forestDistance(lon,lat,t.lon,t.lat)<t.radius*.8+.75))
   return false;
  if(p.core>.08)return false;
  return random()<Math.min(.97,.24+p.verge*.61+(kind==='leaves'?.12:0));
 }
 // World-space village path segments are already Catmull-Rom smoothed by
 // start-zone.js. Sample centerlines, then scatter on both *painted* edges.
 for(const seg of startSegments){
  const dx=seg.bx-seg.ax,dz=seg.bz-seg.az,len=Math.hypot(dx,dz);
  if(len<.2)continue;
  const nx=-dz/len,nz=dx/len;
  const steps=Math.max(1,Math.ceil(len/1.55));
  for(let i=0;i<steps;i++)for(const side of [-1,1]){
   const t=(i+.2+random()*.6)/steps;
   const cx=seg.ax+dx*t,cz=seg.az+dz*t;
   const off=side*(2.80+random()*3.0),x=cx+nx*off,z=cz+nz*off;
   const profile=paintedTrailProfile(x,z,off,seg.width);
   if(profile.verge<.05&&profile.wear<.02)continue;
   const kind=choose();
   if(acceptStart(x,z,profile,kind))add(kind,{zone:'start',x,z},profile);
  }
 }
 // Forest road retains its original GPS/geodesic centre. Samples near the
 // band of grass at the painted verge, with an open 3m walking corridor.
 for(let lon=.19;lon<=1.43;lon+=.0034){
  for(const side of [-1,1]){
   const atLon=lon+(random()-.5)*.0024;
   const offset=side*(3.05+random()*3.25);
   const lat=forestTrailLatitude(atLon)+offset/R;
   const x=R*atLon*Math.cos(lat),z=R*lat;
   const profile=paintedTrailProfile(x,z,offset,3.65);
   if(profile.verge<.045&&profile.wear<.025)continue;
   const kind=choose();
   if(acceptForest(atLon,lat,profile,kind))
    add(kind,{zone:'forest',lon:atLon,lat},profile);
  }
 }
 return Object.freeze(Object.fromEntries(Object.entries(groups).map(([key,arr])=>
  [key,Object.freeze(arr)])));
}
function meshData(kind){
 const position=[],colors=[];
 const add=(a,b,c,ca,cb=ca,cc=ca)=>{
  position.push(...a,...b,...c);colors.push(...ca,...cb,...cc);
 };
 const low=[.28,.43,.24],hi=[.65,.80,.45],wood=[.41,.32,.23],gold=[.72,.53,.30];
 if(kind==='grass'){
  for(let i=0;i<8;i++){
   const a=i*TAU/8,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
   const length=.25+.06*(i%3),h=.29+.09*(i%4);
   add([tx*.045,.015,tz*.045],[dx*length,h,dz*length],
    [-tx*.045,.015,-tz*.045],low,hi,low);
  }
 }else if(kind==='moss'){
  // Soft domed 3D hummocks, not a floating rectangular decal.
  for(let i=0;i<11;i++){
   const a=i*TAU/11,b=(i+1)*TAU/11,ra=.26+.03*(i%3);
   add([0,.07,0],[Math.cos(a)*ra,.018,Math.sin(a)*ra],
    [Math.cos(b)*ra,.017,Math.sin(b)*ra],hi,low,low);
  }
 }else if(kind==='leaves'){
  for(let i=0;i<6;i++){
   const a=i*TAU/6,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
   const r=.15+.04*(i%3);
   add([dx*r*.2,.04,dz*r*.2],[dx*r+tx*.06,.10,dz*r+tz*.06],
    [dx*r-tx*.055,.025,dz*r-tz*.055],wood,gold,wood);
  }
 }else if(kind==='roots'){
  // Thin exposed root fragments on the verge, non-blocking and low.
  for(let i=0;i<4;i++){
   const a=i*TAU/4,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
   add([0,.07,0],[dx*.47+tx*.06,.035,dz*.47+tz*.06],
    [dx*.47-tx*.06,.026,dz*.47-tz*.06],wood,wood,low);
  }
 }else throw new RangeError('Unknown verge form '+kind);
 return {positions:position,colors};
}
export const roadVergeGeometryData=meshData;
export function createRoadVerge(THREE,{scene,radius,heightAt,startSegments,lakeRadius,banditCamp}){
 const layout=roadVergeLayout({startSegments,lakeRadius,banditCamp});
 const up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 const q=new THREE.Quaternion(),yq=new THREE.Quaternion(),
  dummy=new THREE.Object3D(),tint=new THREE.Color(),batches=[];
 const palette={
  grass:ART.canopy.meadowGrass,moss:['#3b6241','#597b49','#759158','#466e48'],
  leaves:['#9f7948','#8d663f','#c09d5d','#6e563a'],
  roots:['#584638','#716047','#514135','#817255']
 };
 for(const kind of Object.keys(ROAD_VERGE_CAPS)){
  const data=meshData(kind),geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
  geo.computeVertexNormals();
  const rows=layout[kind];
  const mesh=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({
   color:'#ffffff',vertexColors:true,roughness:1,metalness:0,
   side:THREE.DoubleSide
  }),rows.length);
  mesh.name='G09-'+kind+'-road-verge-no-collision';
  mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  for(let i=0;i<rows.length;i++){
   const p=rows[i];
   if(p.zone==='start'){
    const d=Math.hypot(p.x,p.z),angle=d/radius,k=d?Math.sin(angle)/d:0;
    normal.set(p.x*k,p.z*k,Math.cos(angle));
   }else{
    normal.set(Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),
     Math.cos(p.lat)*Math.cos(p.lon));
   }
   const surfaceOffset=kind==='moss'?.035:.045;
   dummy.position.copy(normal).multiplyScalar(radius+heightAt(normal)+surfaceOffset);
   dummy.quaternion.copy(q.setFromUnitVectors(up,normal))
    .multiply(yq.setFromAxisAngle(up,p.yaw));
   dummy.scale.setScalar(p.size);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   mesh.setColorAt(i,tint.set(palette[kind][Math.min(3,Math.floor(p.variation*4))]));
  }
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  batches.push({kind,mesh});
 }
 function setQuality(quality='balanced',preview=false){
  const budget=roadVergeBudget(quality,preview);
  for(const {kind,mesh} of batches){
   mesh.count=Math.min(mesh.instanceMatrix.count,budget[kind]);
   mesh.visible=mesh.count>0;
  }
 }
 setQuality();
 return {setQuality,layout,decorativeOnly:true,drawCalls:batches.length};
}
