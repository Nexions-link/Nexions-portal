// P2.3.2-A: deterministic tall forest on the existing spherical world.
// Rendering is client-only; quest rewards and player movement remain server-controlled.
const TAU=Math.PI*2;
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
export function forestCampPoint(dx,dz,radius=261){
 return {lon:FOREST_CAMP.lon+dx/(radius*Math.cos(FOREST_CAMP.lat)),
  lat:FOREST_CAMP.lat+dz/radius};
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
 return -.035+.015*Math.sin(d*4)+.012*Math.sin(Math.max(0,lon-.51)*8.5)+.011*Math.exp(-Math.pow((lon-.40)/.072,2));
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
  add(point.x,point.z,tree.radius*.72,tree.height);
 }
 for(const p of FOREST_CAMP_PROPS){
  const pos=forestCampPoint(p.dx,p.dz,radius),point=forestLocalPoint(pos.lon,pos.lat,radius);
  add(point.x,point.z,p.r,p.kind==='fire'?1.1:p.kind==='table'?1.8:4.6);
 }
 const index={cellSize,cells};
 collisionCache.set(key,index);return index;
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
 const layout=createForestLayout(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3();
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
 const trunks=new THREE.CylinderGeometry(.52,.78,1,9,5);
 const leafGeo=new THREE.IcosahedronGeometry(1,1),pineGeo=new THREE.ConeGeometry(1,1,9,2);
 const bark=new THREE.MeshStandardMaterial({color:'#a6a09b',roughness:1});
 const leaves=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1});
 const pine=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1});
 const darkBark=p=>p.tint>.52?'#62544a':'#493f38';
 const broad=layout.trees.filter(t=>!t.evergreen),ever=layout.trees.filter(t=>t.evergreen);
 add('forest-ancient-trunks',layout.trees,trunks,bark,p=>({y:p.height*.5,sx:p.radius,sy:p.height,sz:p.radius}),darkBark);
 add('forest-pine-lower',ever,pineGeo,pine,p=>({y:p.height*.69,sx:p.radius*3.2,sy:p.height*.48,sz:p.radius*3.2}),p=>p.tint>.5?'#3c5a48':'#344d41');
 add('forest-pine-crown',ever,pineGeo,pine,p=>({y:p.height*.84,sx:p.radius*2.55,sy:p.height*.37,sz:p.radius*2.55}),p=>p.tint>.5?'#526d55':'#3d5f50');
 add('forest-oak-crown',broad,leafGeo,leaves,p=>({y:p.height*.79,sx:p.radius*3.9,sy:p.height*.21,sz:p.radius*3.8}),p=>p.tint>.52?'#42624b':'#526a4b');
 add('forest-oak-upper-crown',broad,leafGeo,leaves,p=>({y:p.height*.94,sx:p.radius*3.1,sy:p.height*.17,sz:p.radius*3.2}),p=>p.tint>.52?'#547557':'#42634d');
 const under=new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide,roughness:1});
 add('forest-ferns',layout.ground,fernGeometry(THREE),under,p=>({y:.05,sx:p.size,sy:p.size,sz:p.size}),p=>p.tint>.5?'#466b4b':'#6b8052','ground');
 const fallen=new THREE.CylinderGeometry(.7,.8,1,7);
 add('forest-fallen-timber',layout.logs,fallen,bark,p=>({y:p.width*.85,sx:p.width,sy:p.length,sz:p.width,rotationZ:Math.PI/2}),()=> '#514337','ground');
 // Thin curved path mesh follows terrain instead of creating another map.
 const vertices=[],indices=[],colors=[];
 const dirt=new THREE.Color('#77684a'),moss=new THREE.Color('#53624c'),segments=108;
 for(let i=0;i<=segments;i++){
  const lon=.145+(FOREST_TRAIL_END-.145)*i/segments,center=forestTrailLatitude(lon);
  const width=(1-smooth(.2,.65,lon))*2.65+smooth(.2,.65,lon)*2.1;
  for(const side of [-1,1]){
   const lat=center+side*width/radius,n=normalAt(lon,lat),point=radius+heightAt(n)+.10;
   vertices.push(n.x*point,n.y*point,n.z*point);
   const c=dirt.clone().lerp(moss,((i*11)%17)/57);
   colors.push(c.r,c.g,c.b);
  }
  if(i<segments){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
 }
 const roadGeometry=new THREE.BufferGeometry();
 roadGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 roadGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 roadGeometry.setIndex(indices);roadGeometry.computeVertexNormals();
 const road=new THREE.Mesh(roadGeometry,new THREE.MeshStandardMaterial({
  vertexColors:true,side:THREE.DoubleSide,roughness:1,
  polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
 }));
 road.name='forest-expedition-trail';scene.add(road);

 // A survey camp with tall trees around the clearing; purely visual, not yet a quest hub.
 const campRoot=new THREE.Group();campRoot.name='forest-expedition-camp';
 scene.add(campRoot);
 const campNormal=normalAt(FOREST_CAMP.lon,FOREST_CAMP.lat).clone();
 campRoot.position.copy(campNormal).multiplyScalar(radius+heightAt(campNormal)+.08);
 campRoot.quaternion.setFromUnitVectors(up,campNormal);
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
  // Keep tree/canopy identities paired at all presets; only reduce ground detail.
  const groundFraction=portal?.13:q==='economy'?.28:q==='high'?1:.60;
  for(const {mesh,kind} of batches){
   if(kind==='ground')mesh.count=Math.floor(mesh.instanceMatrix.count*groundFraction);
   mesh.castShadow=!portal&&q==='high'&&kind==='tree';
  }
  campLight.visible=!portal&&q==='high';
  for(const item of smoke)item.visible=!portal&&q!=='economy';
 }
 setQuality('balanced');
 return {setQuality,animate,treeCount:layout.trees.length,
  campLocation:{lon:FOREST_CAMP.lon,lat:FOREST_CAMP.lat},
  trailStart:FOREST_ENTRANCE_LONGITUDE};

}
