// P2.3.2-A: deterministic tall forest on the existing spherical world.
// Rendering is client-only; quest rewards and player movement remain server-controlled.
const TAU=Math.PI*2;
const clamp01=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,n)=>{const t=clamp01((n-a)/(b-a));return t*t*(3-2*t)};
export const FOREST_ENTRANCE_LONGITUDE=.16;
export const FOREST_TRAIL_END=1.46;
export const FOREST_TREE_CAP=400;
export function forestTrailLatitude(lon){
 const d=lon-.145;
 // Through the gap between existing sandstone mesas east of the village.
 return -.035+.015*Math.sin(d*4)+.012*Math.sin(Math.max(0,lon-.51)*8.5);
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
  if(trees.some(t=>Math.hypot((t.lon-lon)*261,(t.lat-lat)*261)<t.radius+radius+3.1))continue;
  trees.push({lon,lat,height,radius,yaw:rand()*TAU,evergreen:rand()<.59,tint:rand()});
 }
 for(let i=0;i<920;i++){
  const lon=.20+rand()*1.27,lat=forestTrailLatitude(lon)+(rand()-.5)*.82;
  if(Math.abs(lat-forestTrailLatitude(lon))*261<2.9)continue;
  ground.push({lon,lat,size:.44+rand()*.92,yaw:rand()*TAU,tint:rand()});
 }
 for(let i=0;i<34;i++){
  const lon=.27+rand()*1.17,lat=forestTrailLatitude(lon)+(rand()-.5)*.7;
  if(Math.abs(lat-forestTrailLatitude(lon))*261<6)continue;
  logs.push({lon,lat,length:3+rand()*5,width:.35+rand()*.32,yaw:rand()*TAU});
 }
 return {trees,ground,logs};
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
 function setQuality(q,portal=false){
  // Keep tree/canopy identities paired at all presets; only reduce ground detail.
  const groundFraction=portal?.13:q==='economy'?.28:q==='high'?1:.60;
  for(const {mesh,kind} of batches){
   if(kind==='ground')mesh.count=Math.floor(mesh.instanceMatrix.count*groundFraction);
   mesh.castShadow=!portal&&q==='high'&&kind==='tree';
  }
 }
 setQuality('balanced');
 return {setQuality,treeCount:layout.trees.length,trailStart:FOREST_ENTRANCE_LONGITUDE};
}
