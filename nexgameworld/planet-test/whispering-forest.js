// P2.3.9: deterministic old-growth forest; only visible crowns evolve.
// Rendering is client-only; quest rewards and player movement remain server-controlled.
import {makeForestCrownGeometry} from './forest-crown-geometry.js?v=1';
import {createForestBarkTextures,forestBarkQuality} from './forest-bark-texture.js?v=1';
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
 const vertices=[];
 // Six upward-curving fronds per fern; no alpha textures or sorting.
 for(let i=0;i<6;i++){
  const a=i*TAU/6,dx=Math.cos(a),dz=Math.sin(a),px=-dz,pz=dx;
  const mid=[dx*.56,.57,dz*.56],end=[dx*1.15,.39,dz*1.15],w=.18;
  vertices.push(0,.08,0,mid[0]+px*w,mid[1],mid[2]+pz*w,end[0],end[1],end[2],
   0,.08,0,end[0],end[1],end[2],mid[0]-px*w,mid[1],mid[2]-pz*w);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.computeVertexNormals();
 return geo;
}
export function createWhisperingForest(THREE,{scene,radius,heightAt}){
 const layout=createForestLayout(),canopy=forestCanopyDetailLayout(layout),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
 const object=new THREE.Object3D(),twist=new THREE.Quaternion(),align=new THREE.Quaternion();
 const batches=[];
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
   if(shade)mesh.setColorAt(i,color.set(shade(p)));
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false;
  scene.add(mesh);
  batches.push({mesh,kind});
  return mesh;
 }
 // Fine, inward-only fluting: the ground ring remains exactly the collision radius.
 // Vertical fissures are carved inward; no visible bark can extend outside
 // the existing trunk collider. Vertex colours create mossy bases and scar lines.
 const trunks=new THREE.CylinderGeometry(.52,FOREST_TRUNK_BASE_SCALE,1,20,18);
 const barkVertices=trunks.getAttribute('position'),barkColors=[];
 for(let i=0;i<barkVertices.count;i++){
  const x=barkVertices.getX(i),z=barkVertices.getZ(i),y=barkVertices.getY(i);
  const angle=Math.atan2(z,x);
  const grain=Math.sin(angle*13.2+Math.sin(y*12.4)*.22);
  const knot=Math.sin(angle*5.3-y*22)*Math.sin(y*5.6+angle*9);
  const crease=Math.pow(.5+.5*grain,5)*(.75+.25*Math.sin(y*28));
  const carve=(.026+.085*crease)*(.57+.43*Math.min(1,(y+.5)*5));
  barkVertices.setXYZ(i,x*(1-carve),y,z*(1-carve));
  const shade=Math.max(.48,Math.min(1,.84-.30*crease+.075*knot));
  const baseMoss=Math.max(0,1-Math.max(0,y+.5)*8);
  barkColors.push(shade*(1-.20*baseMoss),
   shade*(.92+.11*baseMoss),
   shade*(.83-.13*baseMoss));
 }
 trunks.setAttribute('color',new THREE.Float32BufferAttribute(barkColors,3));
 barkVertices.needsUpdate=true;trunks.computeVertexNormals();
 // Irregular branch whorls and individually lobed crowns replace the old
 // perfect cones and spheres, but keep exactly the same tree locations.
 const leafGeo=makeForestCrownGeometry(THREE,'deciduous',0);
 const upperLeafGeo=makeForestCrownGeometry(THREE,'deciduous',1);
 const outerTuftGeo=makeForestCrownGeometry(THREE,'deciduous',2);
 const pineGeo=makeForestCrownGeometry(THREE,'conifer',0);
 const pineUpperGeo=makeForestCrownGeometry(THREE,'conifer',1);
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
  const a=j*TAU/ribCount;
  const point=(r,y,angle)=>[Math.cos(angle)*r,y,Math.sin(angle)*r];
  const summit=point(.51,1,a),left=point(.70,.025,a-.24);
  const tip=point(.72,.03,a),right=point(.70,.025,a+.24);
  ribs.push(...summit,...left,...tip,...summit,...tip,...right);
 }
 const rootGeo=new THREE.BufferGeometry();
 rootGeo.setAttribute('position',new THREE.Float32BufferAttribute(ribs,3));
 rootGeo.computeVertexNormals();
 add('forest-buttress-roots',layout.trees,rootGeo,
  new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide,roughness:1}),
  p=>({y:.01,sx:p.radius,sy:2.3+p.radius*.36,sz:p.radius}),
  p=>p.tint>.52?'#483d35':'#5b4c3d');
 add('forest-ancient-trunks',layout.trees,trunks,detailedBark,p=>({y:p.height*.5,sx:p.radius,sy:p.height,sz:p.radius}),darkBark);
 add('forest-pine-lower',ever,pineGeo,pine,p=>({y:p.height*.69,sx:p.radius*3.2*(.93+.14*p.tint),sy:p.height*.48,sz:p.radius*3.2*(1.07-.14*p.tint)}),p=>p.tint>.5?'#3c5a48':'#344d41');
 add('forest-pine-crown',ever,pineUpperGeo,pine,p=>({y:p.height*.84,sx:p.radius*2.55,sy:p.height*.37,sz:p.radius*2.55}),p=>p.tint>.5?'#526d55':'#3d5f50');
 add('forest-oak-crown',broad,leafGeo,leaves,p=>({y:p.height*.79,sx:p.radius*3.9*(.94+.13*p.tint),sy:p.height*.21,sz:p.radius*3.8*(1.05-.12*p.tint)}),p=>p.tint>.52?'#42624b':'#526a4b');
 add('forest-oak-upper-crown',broad,upperLeafGeo,leaves,p=>({y:p.height*.94,sx:p.radius*3.1,sy:p.height*.17,sz:p.radius*3.2}),p=>p.tint>.52?'#547557':'#42634d');
 // Instanced elevated boughs and small outer foliage masses make the crowns
 // feel multi-layered without hundreds of independent draw calls.
 const limbGeo=new THREE.CylinderGeometry(.43,.72,1,7,2);
 add('forest-high-boughs',canopy.limbs,limbGeo,bark,p=>({
  y:p.branchHeight,sx:p.radius*.24,sy:p.length,sz:p.radius*.24,
  rotationZ:p.tilt,offsetAlongAxis:p.length*.46
 }),darkBark,'detail');
 add('forest-crown-silhouettes',canopy.tufts,outerTuftGeo,leaves,p=>({
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
 add('forest-ferns',layout.ground,fernGeometry(THREE),under,p=>({y:.05,sx:p.size,sy:p.size,sz:p.size}),p=>p.tint>.5?'#466b4b':'#6b8052','ground');
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
 const campWood=new THREE.MeshStandardMaterial({color:'#604932',roughness:1});
 const campWoodLight=new THREE.MeshStandardMaterial({color:'#8d714b',roughness:1});
 const campHide=new THREE.MeshStandardMaterial({color:'#b5a080',roughness:1,side:THREE.DoubleSide});
 const campSeams=new THREE.MeshStandardMaterial({color:'#554436',roughness:1});
 const campStone=new THREE.MeshStandardMaterial({color:'#6f7469',roughness:1});
 const campFlame=new THREE.MeshStandardMaterial({color:'#ffb75e',emissive:'#f07825',emissiveIntensity:1.1});
 function mesh(geo,mat,x,y,z){
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);campRoot.add(m);return m;
 }
 function pole(x,y,z,rad,length){return mesh(new THREE.CylinderGeometry(rad*.85,rad,length,6),campWood,x,y,z)}
 for(const p of FOREST_CAMP_PROPS){
  if(p.kind==='tent'){
   const {dx:x,dz:z,r}=p;
   const short=mesh(new THREE.CylinderGeometry(r,r*.98,.65,9),campSeams,x,.34,z);
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
   smoke[i].position.y=1.8+stage*4.1;
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
