// P2.3.9: deterministic old-growth forest; only visible crowns evolve.
// Rendering is client-only; quest rewards and player movement remain server-controlled.
import {makeForestCrownGeometry} from './forest-crown-geometry.js?v=5';
import {createForestBarkTextures,forestBarkQuality} from './forest-bark-texture.js?v=2';
import {forestFernData} from './forest-botanical-geometry.js?v=1';
const TAU=Math.PI*2;
// Match the blocker exactly to the visible trunk's maximum ground radius.
export const FOREST_TRUNK_BASE_SCALE=.78;
const clamp01=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,n)=>{const t=clamp01((n-a)/(b-a));return t*t*(3-2*t)};
export const FOREST_ENTRANCE_LONGITUDE=.16;
export const FOREST_TRAIL_END=1.46;
export const FOREST_TREE_CAP=400;
export const FOREST_SITE_CLEARINGS=Object.freeze([
 Object.freeze({lon:.98,lat:forestTrailLatitude(.98)+.105,radius:6}),
 Object.freeze({lon:1.115,lat:forestTrailLatitude(1.115)-.094,radius:6}),
 Object.freeze({lon:1.285,lat:forestTrailLatitude(1.285)+.093,radius:6})
]);
export const FOREST_CAMP=Object.freeze({lon:.86,lat:forestTrailLatitude(.86),clearingRadius:22});
export const FOREST_CAMP_PROPS=Object.freeze([
 Object.freeze({kind:'tent',dx:-10,dz:7,r:2.6}),
 Object.freeze({kind:'tent',dx:10,dz:8,r:2.9}),
 Object.freeze({kind:'tent',dx:-11,dz:-7,r:2.4}),
 Object.freeze({kind:'table',dx:9,dz:-7,r:1.6}),
 Object.freeze({kind:'fire',dx:0,dz:6,r:1.05})
]);
export function forestDistance(lon,lat,lon2,lat2,radius=261){
 const a=Math.sin((lat2-lat)/2)**2+
  Math.cos(lat)*Math.cos(lat2)*Math.sin((lon2-lon)/2)**2;
 return 2*radius*Math.asin(Math.min(1,Math.sqrt(a)));
}
// Shared geodesic projection of the actual 3D camp local axes.
 // Camp +X points east, +Z points towards decreasing latitude.
export function forestCampPoint(dx,dz,radius=261){
 const lon=FOREST_CAMP.lon,lat=FOREST_CAMP.lat,d=Math.hypot(dx,dz);
 if(d<1e-8)return {lon,lat};
 const sin=Math.sin(lat),cos=Math.cos(lat),sl=Math.sin(lon),cl=Math.cos(lon);
 const cx=cos*sl,cy=sin,cz=cos*cl;
 const eastX=cl,eastZ=-sl;
 const northX=-sin*sl,northY=cos,northZ=-sin*cl;
 const angle=d/radius,k=Math.sin(angle)/d,c=Math.cos(angle);
 const x=c*cx+k*(dx*eastX-dz*northX);
 const y=c*cy+k*(-dz*northY);
 const z=c*cz+k*(dx*eastZ-dz*northZ);
 return {lon:Math.atan2(x,z),lat:Math.asin(Math.max(-1,Math.min(1,y)))};
}
export function forestLocalPoint(lon,lat,radius=261){
 const nx=Math.cos(lat)*Math.sin(lon),ny=Math.sin(lat),
  nz=Math.cos(lat)*Math.cos(lon),rho=Math.hypot(nx,ny);
 if(rho<1e-9)return {x:0,z:0};
 const d=Math.acos(Math.max(-1,Math.min(1,nz)))*radius/rho;
 return {x:nx*d,z:ny*d};
}

export function forestTrailLatitude(lon){
 const d=lon-.145;
 // Through the gap between existing sandstone mesas east of the village.
 return -.035+.015*Math.sin(d*4)+.012*Math.sin(Math.max(0,lon-.51)*8.5)+.011*Math.exp(-Math.pow((lon-.40)/.072,2))
  +0; // A clear straight route; the legacy tree was moved visibly off the path.
}
export function forestMoodAt(lon,lat){
 return smooth(.15,.62,lon)*(1-smooth(1.45,1.75,lon))*
  (1-smooth(.27,.52,Math.abs(lat-forestTrailLatitude(lon))));
}
// Existing tree coordinates form three visual layers around the trail.
export function forestDepthBand(lon,lat){
 const distance=Math.abs(lat-forestTrailLatitude(lon))*261;
 return distance<26?'near':distance<61?'middle':'far';
}
// G-17: spatially correlated tree crowns form groves instead of 400
// unrelated silhouettes. All gameplay tree coordinates remain immutable.
export function forestGroveComposition(tree){
 const road=forestTrailLatitude(tree.lon);
 const side=tree.lat>=road?1:-1;
 const distance=Math.abs(tree.lat-road)*261;
 const wave=.52+.26*Math.sin(tree.lon*19.3+side*1.8)
  +.18*Math.sin(tree.lon*39.1-side*2.3)
  +.04*Math.cos(tree.lon*9.4+side*4.1);
 const grove=clamp01(wave);
 const roadside=1-smooth(13,32,distance);
 return {
  side,distance,grove,roadside,
  crownWidth:Math.max(.73,Math.min(1.18,.90+.24*grove-.18*roadside)),
  crownHeight:.94+.13*grove
 };
}
// Only a small number of high canopy lobes are added to EXISTING old-growth
// trees. These lightweight pieces reuse the existing leaf batch and material,
// never create trunks, collider circles, navigation nodes or new draw calls.
export function forestGroveFoliageLayout(layout=createForestLayout()){
 const tufts=[];
 for(const tree of layout.trees){
  if(tree.evergreen)continue;
  const plan=forestGroveComposition(tree);
  if(tree.lon<.31||tree.lon>1.4||plan.distance<13||plan.distance>54
    ||plan.grove<.5)continue;
  if(forestDistance(tree.lon,tree.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<
     FOREST_CAMP.clearingRadius+12)continue;
  if(FOREST_SITE_CLEARINGS.some(c=>
   forestDistance(tree.lon,tree.lat,c.lon,c.lat)<c.radius+10))continue;
  const margin=1.25+.65*plan.grove;
  const lon=tree.lon+Math.sin(tree.yaw*1.7)*.7/261;
  const lat=tree.lat+plan.side*margin/261;
  // Height and size stay inside the parent tree's upper foliage envelope.
  const branchHeight=tree.height*(.72+.06*plan.grove);
  tufts.push({...tree,lon,lat,anchorLon:tree.lon,anchorLat:tree.lat,
   yaw:tree.yaw+.38*plan.side,branchHeight,
   spread:tree.radius*(1.15+.24*plan.grove),
   bulge:tree.radius*(.83+.28*plan.grove),
   groveDetail:true});
 }
 return tufts;
}
export function createForestLayout(seed=451921){
 let state=seed>>>0;
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const trees=[],ground=[],logs=[];
 for(let tries=0;tries<6500&&trees.length<FOREST_TREE_CAP;tries++){
  const lon=.185+rand()*1.29,lat=forestTrailLatitude(lon)+(rand()-.5)*.83;
  const edge=smooth(.17,.55,lon)*(1-smooth(1.38,1.53,lon));
  if(rand()>.19+edge*.81)continue;
  const height=(23+26*rand())*(.61+.39*smooth(.21,.67,lon));
  const radius=1.15+rand()*1.12+.65*smooth(.40,1.0,lon);
  // No large trunks in the walking corridor.
  if(Math.abs(lat-forestTrailLatitude(lon))*261<7.2+radius)continue;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<FOREST_CAMP.clearingRadius+radius)continue;
  if(FOREST_SITE_CLEARINGS.some(s=>forestDistance(lon,lat,s.lon,s.lat)<s.radius+radius))continue;
  if(trees.some(t=>Math.hypot((t.lon-lon)*261,(t.lat-lat)*261)<t.radius+radius+3.1))continue;
  trees.push({lon,lat,height,radius,yaw:rand()*TAU,evergreen:rand()<.59,tint:rand()});
 }
 for(let i=0;i<920;i++){
  const lon=.20+rand()*1.27,lat=forestTrailLatitude(lon)+(rand()-.5)*.82;
  if(Math.abs(lat-forestTrailLatitude(lon))*261<2.9)continue;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<FOREST_CAMP.clearingRadius-2)continue;
  ground.push({lon,lat,size:.44+rand()*.92,yaw:rand()*TAU,tint:rand()});
 }
 for(let i=0;i<100&&logs.length<34;i++){
  const lon=.27+rand()*1.17,lat=forestTrailLatitude(lon)+(rand()-.5)*.7;
  if(Math.abs(lat-forestTrailLatitude(lon))*261<6)continue;
  if(forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<FOREST_CAMP.clearingRadius+4)continue;
  logs.push({lon,lat,length:3+rand()*5,width:.35+rand()*.32,yaw:rand()*TAU});
 }
 return {trees,ground,logs};
}
// Upper-canopy silhouettes are cosmetic. Keeping these meshes well above head
// height means no new invisible blockers or changes to server movement.
export function forestCanopyDetailLayout(layout=createForestLayout()){
 const limbs=[],tufts=[];
 for(const tree of layout.trees){
  if(tree.evergreen)continue;
  for(let i=0;i<3;i++){
   const yaw=tree.yaw+i*TAU/3+(tree.tint-.5)*.34;
   const length=tree.radius*(2.8+.35*((i+1)%3));
   const height=tree.height*(.62+.052*i);
   limbs.push({...tree,yaw,length,branchHeight:height,tilt:-1.29+.07*i});
   tufts.push({...tree,yaw,branchHeight:height+.22*length,
    spread:length*.88,bulge:tree.radius*(1.22+.18*i)});
  }
 }
 return {limbs,tufts};
}
// A single shared sculpted trunk (same 20 radial x 18 vertical segments).
// All details are precomputed once: 400 instances and collider circles are
// unchanged. This shape NEVER exceeds the .78 canonical ground radius.
export function proceduralForestTrunkSurface(y,angle){
 if(!Number.isFinite(y)||!Number.isFinite(angle))throw new RangeError('Invalid trunk coordinates');
 const t=clamp01(y+.5);
 const rootGrowth=Math.exp(-Math.pow(t/.17,2));
 // Buttresses are continuous growth ridges, NOT extra draw calls or root meshes.
 const azimuth=angle+.08*Math.sin(t*8.3+angle*2.2);
 const buttress=Math.pow(.5+.5*Math.cos(5*azimuth+.27*Math.sin(t*9)),7);
 const spiral=Math.sin(7*azimuth+4.1*t+.25*Math.cos(t*11.6));
 const vascular=.50*Math.sin(3*angle-2.6*t)+
  .31*Math.sin(7*azimuth+3.5*t)+.19*Math.cos(9*angle+6.4*t);
 const gnarl=.5+.5*Math.sin(4*angle+5.6*t+Math.sin(7*angle)*.2);
 const cracked=Math.pow(Math.max(0,.5+.5*Math.sin(7*azimuth+3.6*t)),6);
 const knot=Math.exp(-Math.pow((t-.38)/.10,2))*
  Math.exp(-Math.pow(Math.atan2(Math.sin(angle-1.28),Math.cos(angle-1.28))/.34,2));
 const bump=.018*vascular+.024*spiral+.050*buttress*rootGrowth-
  .060*cracked*(.50+.50*gnarl)-.033*knot;
 const radial=clamp01(Math.max(.73,Math.min(.998,.932+bump)));
 const moss=Math.max(0,1-t*9.5)*(.55+.45*gnarl);
 const shade=clamp01(Math.max(.38,Math.min(.99,
  .80-.27*cracked+.09*vascular-.14*knot-.14*moss)));
 return {radial,shade,moss,cracked,knot};
}
// A shared, sculpted old-growth outline. It retains the existing 20x18
// cylinder topology and one InstancedMesh for every tree. The root flare has
// five local ridges aligned with the five existing buttress fins. The maximum
// ground radius never exceeds FOREST_TRUNK_BASE_SCALE (.78): no new blockers.
export function proceduralForestTrunkOutline(y,angle){
 if(!Number.isFinite(y)||!Number.isFinite(angle))
  throw new RangeError('Invalid trunk silhouette coordinates');
 const t=clamp01(y+.5);
 const relief=proceduralForestTrunkSurface(y,angle);
 // Nonlinear taper makes the lower bole massive while the high stem is thin.
 // Units are relative to each original tree.radius, not world metres.
 // A thick load-bearing bole persists well above the roots, then tapers
 // strongly into the canopy. Three smooth, connected growth stages avoid
 // the linear cone silhouette; no added triangles or separate root meshes.
 const smoothstep=x=>{const v=clamp01(x);return v*v*(3-2*v);};
 const lower=smoothstep(t/.32),upper=smoothstep((t-.32)/.68);
 const bole=(.735-.16*lower)-.335*upper;
 // Deep radial root valleys below 12% of tree height reveal five toes.
 // Root direction matches the existing five instanced buttress fins.
 const twist=angle+.035*Math.sin(t*8.8)+.008*Math.sin(3*angle);
 const ridges=Math.pow(.5+.5*Math.cos(5*twist+.16),2);
 const flare=Math.exp(-Math.pow(t/.115,1.45));
 const rib=.145*ridges*flare;
 const valley=-.17*Math.pow(1-ridges,6)*flare;
 const bottomMass=.052*Math.exp(-Math.pow(t/.035,2));
 // Strong but irregular cambium swelling: shared vertices, no extra geometry.
 const wood=.955+.045*relief.radial;
 const ageRidge=.020*Math.sin(3*angle-4*t)+.009*Math.sin(8*angle+9*t);
 const lowGrowth=Math.exp(-Math.pow(t/.28,2));
 const radius=Math.min(FOREST_TRUNK_BASE_SCALE*.985,
  Math.max(.12,bole*wood+rib+valley+bottomMass+
   ageRidge*lowGrowth));
 // A centreline curve makes the trunk slightly wind-swept without changing
 // any vertex count or altering the original base/collision position.
 const curveX=.062*t*t*Math.sin(t*4.5+.50)+.012*t*Math.sin(t*9.2);
 const curveZ=.053*t*t*Math.sin(t*4.0+2.20)-.015*t*Math.sin(t*7.3);
 return {radius,curveX,curveZ,rootFlare:ridges*flare,
  shade:relief.shade,moss:relief.moss};
}
// Used by browser movement, camera and the authoritative server without THREE.
const collisionCache=new Map();
function forestCollisionIndex(radius=261){
 const key=Number(radius);
 if(collisionCache.has(key))return collisionCache.get(key);
 const cellSize=12,cells=new Map();
 const add=(x,z,r,h)=>{
  const id=Math.floor(x/cellSize)+':'+Math.floor(z/cellSize);
  if(!cells.has(id))cells.set(id,[]);
  cells.get(id).push({x,z,r,h});
 };
 for(const tree of createForestLayout().trees){
  const point=forestLocalPoint(tree.lon,tree.lat,radius);
  add(point.x,point.z,tree.radius*FOREST_TRUNK_BASE_SCALE,tree.height);
 }
 for(const p of FOREST_CAMP_PROPS){
  const pos=forestCampPoint(p.dx,p.dz,radius),point=forestLocalPoint(pos.lon,pos.lat,radius);
  add(point.x,point.z,p.r,p.kind==='fire'?1.1:p.kind==='table'?1.8:4.6);
 }
 const index={cellSize,cells};
 collisionCache.set(key,index);return index;
}
// All blocking forest geometry comes exclusively from visible tree trunk and
// visible camp props. Decorative rocks, ferns, fungi, animals and logs are passable.
export function forestColliders(radius=261){
 const {cells}=forestCollisionIndex(radius);
 return [...cells.values()].flat().map(row=>({...row}));
}
export function blocksForestAtLocal(x,z,actorRadius=.42,radius=261,height=0){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<1)return false;
 const {cellSize,cells}=forestCollisionIndex(radius);
 const cx=Math.floor(x/cellSize),cz=Math.floor(z/cellSize);
 for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
  const bucket=cells.get((cx+a)+':'+(cz+b));if(!bucket)continue;
  for(const c of bucket){
   if(height>=c.h||height<-.5)continue;
   const dx=x-c.x,dz=z-c.z,limit=c.r+actorRadius;
   if(dx*dx+dz*dz<limit*limit)return true;
  }
 }
 return false;
}
function fernGeometry(THREE){
 // The six legacy forest fern blades now share the bent-pinnule sculpt.
 // Twelve triangles per plant, exactly as before.
 const fern=forestFernData({fronds:6,segments:1});
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(fern.positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(fern.colors,3));
 geo.computeVertexNormals();
 return geo;
}
export function createWhisperingForest(THREE,{scene,radius,heightAt,r2Vegetation=false,artRemaster=false}){
 const layout=createForestLayout(),canopy=forestCanopyDetailLayout(layout),
  groveTufts=artRemaster?forestGroveFoliageLayout(layout):[],
  up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 const object=new THREE.Object3D(),twist=new THREE.Quaternion(),align=new THREE.Quaternion();
 const batches=[];
 const farFoliageTint=new THREE.Color('#75908a');
 const normalAt=(lon,lat)=>normal.set(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
 function add(name,rows,geometry,material,options,shade,kind='tree'){
  if(!rows.length)return null;
  const mesh=new THREE.InstancedMesh(geometry,material,rows.length);
  mesh.name=name;
  const color=new THREE.Color();
  rows.forEach((p,i)=>{
   const n=normalAt(p.lon,p.lat),pointHeight=radius+heightAt(n),g=options(p);
   object.position.copy(n).multiplyScalar(pointHeight+g.y);
   align.setFromUnitVectors(up,n);
   object.quaternion.copy(align).multiply(twist.setFromAxisAngle(up,p.yaw));
   if(g.rotationZ)object.rotateZ(g.rotationZ);
   if(g.offsetAlongAxis)object.translateY(g.offsetAlongAxis);
   if(g.offsetX)object.translateX(g.offsetX);
   object.scale.set(g.sx,g.sy,g.sz);
   object.updateMatrix();
   mesh.setMatrixAt(i,object.matrix);
   if(shade){
    color.set(shade(p));
    // G-16: grade the original instance colour once, not on every frame.
    if(artRemaster&&/^forest-(?:oak|pine|crown-)/.test(name)){
     const band=forestDepthBand(p.lon,p.lat);
     if(band==='middle')color.lerp(farFoliageTint,.12);
     else if(band==='far')color.lerp(farFoliageTint,.31).multiplyScalar(.91);
    }
    mesh.setColorAt(i,color);
   }
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false;
  scene.add(mesh);
  batches.push({mesh,kind});
  return mesh;
 }
 // The existing 20x18 instanced trunk is re-sculpted ONCE.
 // Same vertex/index count, same one forest trunk draw call, no added GPU mesh.
 // Lower buttresses remain inside the current server-authoritative collider.
 const trunks=new THREE.CylinderGeometry(.52,FOREST_TRUNK_BASE_SCALE,1,20,18);
 const barkVertices=trunks.getAttribute('position'),barkColors=[];
 for(let i=0;i<barkVertices.count;i++){
  const x=barkVertices.getX(i),z=barkVertices.getZ(i),y=barkVertices.getY(i);
  const angle=Math.atan2(z,x),outline=proceduralForestTrunkOutline(y,angle);
  // The source CylinderGeometry is only the indexed ring topology. Radius,
  // roots and centreline are calculated once, before 400-way instancing.
  barkVertices.setXYZ(i,Math.cos(angle)*outline.radius+outline.curveX,
   y,Math.sin(angle)*outline.radius+outline.curveZ);
  const lit=artRemaster?Math.min(1,.20+outline.shade*.87):outline.shade;
  barkColors.push(lit*(1-.19*outline.moss),
   lit*(.91+.15*outline.moss),
   lit*(.83-.11*outline.moss));
 }
 trunks.setAttribute('color',new THREE.Float32BufferAttribute(barkColors,3));
 barkVertices.needsUpdate=true;trunks.computeVertexNormals();
 trunks.computeBoundingSphere();
 // Irregular branch whorls and individually lobed crowns replace the old
 // perfect cones and spheres, but keep exactly the same tree locations.
 const leafGeo=makeForestCrownGeometry(THREE,'deciduous',0,{r2:r2Vegetation,art:artRemaster});
 const upperLeafGeo=makeForestCrownGeometry(THREE,'deciduous',1,{r2:r2Vegetation,art:artRemaster});
 const outerTuftGeo=makeForestCrownGeometry(THREE,'deciduous',2,{r2:r2Vegetation,art:artRemaster});
 const pineGeo=makeForestCrownGeometry(THREE,'conifer',0,{r2:r2Vegetation,art:artRemaster});
 const pineUpperGeo=makeForestCrownGeometry(THREE,'conifer',1,{r2:r2Vegetation,art:artRemaster});
 // The same tiny tiled bark atlas gives all ancient trunks, branches and
 // fallen timber visible fissures, grain and relief without extra draw calls.
 // A failed texture allocation always falls back to the old opaque materials.
 const barkTextures=createForestBarkTextures(THREE);
 const bark=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,
  map:barkTextures?.map||null,bumpMap:barkTextures?.bumpMap||null,bumpScale:.043});
 const detailedBark=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,
  vertexColors:true,map:barkTextures?.map||null,
  bumpMap:barkTextures?.bumpMap||null,bumpScale:.043});
 const leaves=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,
  vertexColors:true,side:THREE.DoubleSide});
 const pine=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,
  vertexColors:true,side:THREE.DoubleSide});
 const darkBark=p=>p.tint>.52?'#998779':'#806f61';
 const broad=layout.trees.filter(t=>!t.evergreen),ever=layout.trees.filter(t=>t.evergreen);
 // Buttress ribs are inside the existing trunk collision footprint (max .72
 // of trunk radius vs .78 collision), so they cannot create invisible walls.
 const ribs=[],ribColors=[],ribCount=5;
 for(let j=0;j<ribCount;j++){
  const a=j*TAU/ribCount,gnarl=.05*Math.sin(j*4.7);
  const point=(r,y,angle)=>[Math.cos(angle)*r,y,Math.sin(angle)*r];
  // Twisted, tapering buttresses grow from the same trunk silhouette.
  // The widest rendered solid remains below radius .78.
  const summit=point(.50,.94+gnarl,a+.04);
  // The same original ten buttress triangles now reach the trunk's broad
  // lower bole and sink outward into the forest ground. No extra draw pass.
  const left=point(.54,.085,a-.27-gnarl);
  const tip=point(.765,.004,a+.035+gnarl);
  const right=point(.53,.085,a+.25+gnarl);
  ribs.push(...summit,...left,...tip,...summit,...tip,...right);
  // Warm cracked wood fades to real moss colour on the buried root toes.
  // Reuses the SAME six vertices / two root triangles per buttress.
  for(const [shade,damp] of [[.98,.03],[.83,.31],[.68,.92],
   [.98,.03],[.68,.92],[.88,.23]]){
   const moss=artRemaster?damp:0;
   ribColors.push(shade*(.86-.47*moss),
    shade*(.69+.19*moss),shade*(.55-.19*moss));
  }
 }
 const rootGeo=new THREE.BufferGeometry();
 rootGeo.setAttribute('position',new THREE.Float32BufferAttribute(ribs,3));
 if(artRemaster)rootGeo.setAttribute('color',new THREE.Float32BufferAttribute(ribColors,3));
 rootGeo.computeVertexNormals();
 add('forest-buttress-roots',layout.trees,rootGeo,
  new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide,roughness:1,vertexColors:artRemaster}),
  p=>({y:.01,sx:p.radius,sy:2.3+p.radius*.36,sz:p.radius}),
  p=>artRemaster?(p.tint>.52?'#898674':'#807e70'):
   (p.tint>.52?'#483d35':'#5b4c3d'));
 add('forest-ancient-trunks',layout.trees,trunks,detailedBark,p=>({y:p.height*.5,sx:p.radius,sy:p.height,sz:p.radius}),darkBark);
 add('forest-pine-lower',ever,pineGeo,pine,p=>{
  const c=artRemaster?forestGroveComposition(p):null;
  return {
  y:p.height*.69,sx:p.radius*(artRemaster?3.42:3.2)*(.93+.14*p.tint)*(c?.crownWidth||1),
  sy:p.height*(artRemaster?.52:.48)*(c?.crownHeight||1),
  sz:p.radius*(artRemaster?3.42:3.2)*(1.07-.14*p.tint)*(c?.crownWidth||1)
  };
 },p=>artRemaster?(p.tint>.68?'#365b46':p.tint>.35?'#2c5143':'#47684c'):
  (p.tint>.5?'#3c5a48':'#344d41'));
 add('forest-pine-crown',ever,pineUpperGeo,pine,p=>{
  const c=artRemaster?forestGroveComposition(p):null;
  return {
  y:p.height*.84,sx:p.radius*(artRemaster?2.72:2.55)*(c?.crownWidth||1),
  sy:p.height*(artRemaster?.40:.37)*(c?.crownHeight||1),
  sz:p.radius*(artRemaster?2.72:2.55)*(c?.crownWidth||1)
  };
 },p=>artRemaster?(p.tint>.68?'#567d50':p.tint>.35?'#426c52':'#678357'):
  (p.tint>.5?'#526d55':'#3d5f50'));
 add('forest-oak-crown',broad,leafGeo,leaves,p=>{
  const c=artRemaster?forestGroveComposition(p):null;
  return {
  y:p.height*.79,sx:p.radius*(artRemaster?4.10:3.9)*(.94+.13*p.tint)*(c?.crownWidth||1),
  sy:p.height*(artRemaster?.257:.21)*(c?.crownHeight||1),
  sz:p.radius*(artRemaster?4.04:3.8)*(1.05-.12*p.tint)*(c?.crownWidth||1)
  };
 },p=>artRemaster?(p.tint>.7?'#3f6347':p.tint>.34?'#4f764a':'#597b50'):
  (p.tint>.52?'#42624b':'#526a4b'));
 add('forest-oak-upper-crown',broad,upperLeafGeo,leaves,p=>{
  const c=artRemaster?forestGroveComposition(p):null;
  return {
  y:p.height*.94,sx:p.radius*(artRemaster?3.30:3.1)*(c?.crownWidth||1),
  sy:p.height*(artRemaster?.205:.17)*(c?.crownHeight||1),
  sz:p.radius*(artRemaster?3.38:3.2)*(c?.crownWidth||1)
  };
 },p=>artRemaster?(p.tint>.68?'#5b8655':p.tint>.32?'#4a7852':'#68885c'):
  (p.tint>.52?'#547557':'#42634d'));
 // Instanced elevated boughs and small outer foliage masses make the crowns
 // feel multi-layered without hundreds of independent draw calls.
 const limbGeo=new THREE.CylinderGeometry(.43,.72,1,7,2);
 if(artRemaster){
  const bough=limbGeo.getAttribute('position');
  for(let i=0;i<bough.count;i++){
   const x=bough.getX(i),y=bough.getY(i),z=bough.getZ(i);
   const angle=Math.atan2(z,x);
   const rough=1+.095*Math.sin(5*angle+7*y)+.045*Math.cos(8*angle-4*y);
   // G-16: arched, tapering bough within the same original geometry.
   const arch=.17*Math.sin(Math.PI*(y+.5));
   const taper=1-.15*(y+.5);
   bough.setXYZ(i,x*rough*taper+.075*y*y+arch*.65,
    y,z*rough*taper+.042*y+arch*.32);
  }
  bough.needsUpdate=true;limbGeo.computeVertexNormals();limbGeo.computeBoundingSphere();
 }
 add('forest-high-boughs',canopy.limbs,limbGeo,bark,p=>({
  y:p.branchHeight,sx:p.radius*.24,sy:p.length,sz:p.radius*.24,
  rotationZ:p.tilt,offsetAlongAxis:p.length*.46
 }),darkBark,'detail');
 // G-17: decorative lobes share this original draw batch; placing them
 // first also keeps some visible on the balanced/economy detail budgets.
 add('forest-crown-silhouettes',[...groveTufts,...canopy.tufts],outerTuftGeo,leaves,p=>({
  y:p.branchHeight,sx:p.bulge*1.35,sy:p.bulge*.58,sz:p.bulge*1.16,
  offsetX:p.spread
 }),p=>p.tint>.5?'#416047':'#587150','detail');
 // Hanging moss reinforces the enormous vertical scale, entirely visual.
 const mossGeo=new THREE.BufferGeometry(),mossVerts=[];
 for(let k=0;k<5;k++){
  const angle=k*TAU/5,r=.59+.14*(k%3);
  const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
  const tip=.53+.085*(k%3);
  mossVerts.push(x-.055,0,z,x+.055,0,z,x+.026,-tip,z+.12,
   x-.04,0,z,x+.026,-tip,z+.12,x-.015,-tip*.91,z+.075);
 }
 mossGeo.setAttribute('position',new THREE.Float32BufferAttribute(mossVerts,3));
 mossGeo.computeVertexNormals();
 add('forest-hanging-moss',broad.filter((_,i)=>i%2===0),mossGeo,
  new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide,roughness:1}),
  p=>({y:p.height*.76,sx:p.radius*2.6,sy:p.height*.24,sz:p.radius*2.6}),
  p=>p.tint>.5?'#587157':'#6b815b','detail');
 const under=new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide,roughness:1});
 const fernMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide,roughness:1,vertexColors:true});
 add('forest-ferns',layout.ground,fernGeometry(THREE),fernMaterial,p=>({y:.05,sx:p.size,sy:p.size,sz:p.size}),p=>p.tint>.5?'#4c8359':'#71885b','ground');
 // Dry leaf and needle mats at the edges of the trail: no solid collider.
 const litterGeo=new THREE.CircleGeometry(1,7);
 litterGeo.rotateX(-Math.PI/2);
 add('forest-leaf-litter',layout.ground.filter((_,i)=>i%3===0),litterGeo,under,
  p=>({y:.07,sx:p.size*.95,sy:1,sz:p.size*.56}),
  p=>p.tint>.68?'#736046':p.tint>.34?'#514934':'#66573d','ground');
 const fallen=new THREE.CylinderGeometry(.7,.8,1,7);
 add('forest-fallen-timber',layout.logs,fallen,bark,p=>({y:p.width*.85,sx:p.width,sy:p.length,sz:p.width,rotationZ:Math.PI/2}),()=> '#514337','ground');
 // The earlier opaque road ribbon has been retired. The forest path is now
 // baked into the one opaque planetary ground texture; this removes the
 // obvious raised strip, edge seams, z-fighting and extra overdraw entirely.
 // Layout, quest targets and server-authoritative collisions are unchanged.
 // A survey camp with tall trees around the clearing; purely visual, not yet a quest hub.
 const campRoot=new THREE.Group();campRoot.name='forest-expedition-camp';
 scene.add(campRoot);
 const campNormal=normalAt(FOREST_CAMP.lon,FOREST_CAMP.lat).clone();
 campRoot.position.copy(campNormal).multiplyScalar(radius+heightAt(campNormal)+.08);
 // The renderer and the server's forestCampPoint use the same east/up/south axes.
 const campEast=new THREE.Vector3(Math.cos(FOREST_CAMP.lon),0,-Math.sin(FOREST_CAMP.lon));
 const campSouth=new THREE.Vector3(
  Math.sin(FOREST_CAMP.lat)*Math.sin(FOREST_CAMP.lon),
  -Math.cos(FOREST_CAMP.lat),
  Math.sin(FOREST_CAMP.lat)*Math.cos(FOREST_CAMP.lon));
 const campFrame=new THREE.Matrix4().makeBasis(campEast,campNormal,campSouth);
 campRoot.quaternion.setFromRotationMatrix(campFrame);
 // Tangent-space camp spans tens of metres on an uneven spherical planet.
 // A single centre height makes outer tents float above the terrain.
 // Sample the EXACT terrain surface at each existing camp-prop position.
 const campOrigin=campRoot.position.clone();
 const sampleNormal=new THREE.Vector3(),sampleWorld=new THREE.Vector3();
 function campGroundOffset(dx,dz){
  const at=forestCampPoint(dx,dz,radius);
  sampleNormal.set(Math.cos(at.lat)*Math.sin(at.lon),
   Math.sin(at.lat),Math.cos(at.lat)*Math.cos(at.lon));
  sampleWorld.copy(sampleNormal).multiplyScalar(radius+heightAt(sampleNormal));
  return sampleWorld.sub(campOrigin).dot(campNormal);
 }

 const campWood=new THREE.MeshStandardMaterial({color:'#604932',roughness:1});
 const campWoodLight=new THREE.MeshStandardMaterial({color:'#8d714b',roughness:1});
 const campHide=new THREE.MeshStandardMaterial({color:'#b5a080',roughness:1,side:THREE.DoubleSide});
 const campSeams=new THREE.MeshStandardMaterial({color:'#554436',roughness:1});
 const campStone=new THREE.MeshStandardMaterial({color:'#6f7469',roughness:1});
 const campFlame=new THREE.MeshStandardMaterial({color:'#ffb75e',emissive:'#f07825',emissiveIntensity:1.1});
 function mesh(geo,mat,x,y,z){
  const m=new THREE.Mesh(geo,mat);
  m.position.set(x,y+campGroundOffset(x,z),z);
  campRoot.add(m);return m;
 }
 function pole(x,y,z,rad,length){return mesh(new THREE.CylinderGeometry(rad*.85,rad,length,6),campWood,x,y,z)}
 for(const p of FOREST_CAMP_PROPS){
  if(p.kind==='tent'){
   const {dx:x,dz:z,r}=p;
   // Recess the skirt into the ground: small local slopes cannot expose air
   // beneath the shelter, while its roof stays at the original eye-line.
   const short=mesh(new THREE.CylinderGeometry(r,r*.98,1.13,9),campSeams,x,.19,z);
   const roof=mesh(new THREE.ConeGeometry(r,r*1.67,9),campHide,x,r*.835+.65,z);
   short.rotation.y=roof.rotation.y=.26;
   pole(x,r*.82,z,.14,r*1.92);
   mesh(new THREE.BoxGeometry(r*.57,.95,.08),campSeams,x,.59,z+r*.92);
  }
  if(p.kind==='table'){
   const {dx:x,dz:z}=p;
   mesh(new THREE.BoxGeometry(3.4,.17,2),campWoodLight,x,1.24,z);
   for(const ix of [-1.25,1.25])for(const iz of [-.69,.69])
    pole(x+ix,.58,z+iz,.095,1.16);
   mesh(new THREE.BoxGeometry(2.25,.035,1.27),
    new THREE.MeshStandardMaterial({color:'#c2b18b',roughness:1}),x,1.34,z);
  }
 }
 for(let i=0;i<10;i++){
  const a=i*TAU/10;
  mesh(new THREE.DodecahedronGeometry(.29,0),campStone,
   Math.cos(a)*1.03,.19,6+Math.sin(a)*1.03);
 }
 for(const angle of [0,Math.PI/3,2*Math.PI/3]){
  const log=mesh(new THREE.CylinderGeometry(.13,.19,1.65,7),campWood,0,.29,6);
  log.rotation.z=Math.PI/2;log.rotation.y=angle;
 }
 const flame=mesh(new THREE.ConeGeometry(.48,1.32,7),campFlame,0,.91,6);
 const campLight=new THREE.PointLight('#e9a45c',.65,20,2);
 campLight.position.set(0,2.4,6);campRoot.add(campLight);
 const smoke=[0,1,2].map(i=>mesh(new THREE.IcosahedronGeometry(.62,0),
  new THREE.MeshBasicMaterial({color:'#9ea7a1',transparent:true,opacity:.13,depthWrite:false}),
  Math.sin(i)*.2,1.8+i*.92,6+Math.cos(i)*.12));
 pole(16,2.35,2,.13,4.7);
 const flag=mesh(new THREE.PlaneGeometry(2.45,1.25),
  new THREE.MeshStandardMaterial({color:'#6b7f67',side:THREE.DoubleSide}),17.17,3.9,2);
 flag.rotation.y=.2;
 function animate(time){
  flame.scale.y=.84+.16*Math.sin(time*8.7);flame.rotation.y=time*.5;
  for(let i=0;i<smoke.length;i++){
   const stage=(time*.17+i/3)%1;
   smoke[i].position.y=campGroundOffset(smoke[i].position.x,smoke[i].position.z)+1.8+stage*4.1;
   smoke[i].position.x=Math.sin(stage*5+time*.5)*.45;
   smoke[i].scale.setScalar(.45+stage*.85);
   smoke[i].material.opacity=.12*(1-stage);
  }
 }
 function setQuality(q,portal=false){
  const barkProfile=forestBarkQuality(q,portal);
  for(const material of [bark,detailedBark]){
   const relief=barkProfile.bump?barkTextures?.bumpMap||null:null;
   if(material.bumpMap!==relief){material.bumpMap=relief;material.needsUpdate=true;}
   material.bumpScale=barkProfile.bumpScale;
  }
  // Keep tree/canopy identities paired at all presets; only reduce ground detail.
  const groundFraction=portal?.13:q==='economy'?.28:q==='high'?1:.60;
  for(const {mesh,kind} of batches){
   if(kind==='ground')mesh.count=Math.floor(mesh.instanceMatrix.count*groundFraction);
   if(kind==='detail')mesh.count=Math.floor(mesh.instanceMatrix.count*
    (portal?.12:q==='economy'?.35:q==='high'?1:.72));
   mesh.castShadow=!portal&&q==='high'&&kind==='tree';
  }
  campLight.visible=!portal&&q==='high';
  for(const item of smoke)item.visible=!portal&&q!=='economy';
 }
 setQuality('balanced');
 return {setQuality,animate,treeCount:layout.trees.length,
  pilotTreeCount:0,pilotSites:[],
  campLocation:{lon:FOREST_CAMP.lon,lat:FOREST_CAMP.lat},
  trailStart:FOREST_ENTRANCE_LONGITUDE};

}
