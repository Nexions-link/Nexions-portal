// Deterministic visual-only forest ecology: does not create actual mobs or loot.
import {createWeatheredStoneGeometry} from './stone-surface.js?v=1';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude,forestDistance,
 createForestLayout} from './whispering-forest.js';
const TAU=Math.PI*2;
export function forestEcologyLayout(seed=97431){
 let s=seed>>>0;
 const rand=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
 const trees=createForestLayout().trees,shrubs=[],rocks=[],fungi=[],bracken=[],wildlife=[];
 const free=(lon,lat,margin)=>forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=FOREST_CAMP.clearingRadius+margin&&
  FOREST_SITE_CLEARINGS.every(p=>forestDistance(lon,lat,p.lon,p.lat)>=p.radius+margin);
 function sample(margin,trail=5){
  for(let k=0;k<150;k++){
   const lon=.28+rand()*1.12,lat=forestTrailLatitude(lon)+(rand()-.5)*.73;
   if(Math.abs(lat-forestTrailLatitude(lon))*261<trail+margin||!free(lon,lat,margin))continue;
   return {lon,lat,angle:rand()*TAU,size:.5+rand()*.92,variation:rand()};
  }
  return null;
 }
 // Preserve legacy shrub and wildlife coordinates for existing players.
 for(let i=0;i<500;i++){const p=sample(1.1);if(p)shrubs.push(p)}
 for(let i=0;i<190;i++){const p=sample(.9);if(p)rocks.push(p)}
 for(let i=0;i<145;i++){const p=sample(.25);if(p)fungi.push(p)}
 for(let i=0;i<11;i++){
  let p=null;
  for(let j=0;j<220;j++){
   const maybe=sample(2.4,13);
   if(!maybe||maybe.lon<.53||maybe.lon>1.35)continue;
   if(trees.some(t=>forestDistance(t.lon,t.lat,maybe.lon,maybe.lat)<t.radius+3.2))continue;
   if(wildlife.some(a=>forestDistance(a.lon,a.lat,maybe.lon,maybe.lat)<13))continue;
   p={...maybe,kind:i%3===0?'deer':'boar'};break;
  }
  if(p)wildlife.push(p);
 }
 // Add a separate seed continuation after the established wildlife layout,
 // so additional foliage never re-rolls animals, rocks, or mushrooms.
 for(let i=0;i<480;i++){
  const p=sample(.7,7.4);
  if(p&&p.lon>.42&&p.lon<1.38)bracken.push(p);
 }
 return {shrubs,rocks,fungi,bracken,wildlife};
}
export function createForestEcology(THREE,{scene,radius,heightAt}){
 const layout=forestEcologyLayout(),up=new THREE.Vector3(0,1,0),n=new THREE.Vector3();
 const q=new THREE.Quaternion(),rot=new THREE.Quaternion(),dummy=new THREE.Object3D(),batches=[];
 const surface=p=>n.set(Math.sin(p.lon)*Math.cos(p.lat),Math.sin(p.lat),Math.cos(p.lon)*Math.cos(p.lat));
 const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:1,...options});
 function instance(name,items,geometry,material,scale,shade){
  const mesh=new THREE.InstancedMesh(geometry,material,items.length);
  mesh.name=name;mesh.frustumCulled=false;const color=new THREE.Color();
  items.forEach((p,i)=>{
   const normal=surface(p),t=scale(p);
   dummy.position.copy(normal).multiplyScalar(radius+heightAt(normal)+t.h);
   dummy.quaternion.copy(q.setFromUnitVectors(up,normal)).multiply(rot.setFromAxisAngle(up,p.angle));
   dummy.scale.set(t.x,t.y,t.z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(shade)mesh.setColorAt(i,color.set(shade(p)));
  });
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  batches.push({mesh,size:items.length});
 }
 // Six thin, two-sided leaves per clump; geometry and materials are shared
 // by the entire batch. No transparent textures or alpha-sorting overhead.
 function brackenGeometry(){
  const vertices=[],leafCount=6;
  for(let i=0;i<leafCount;i++){
   const a=i*TAU/leafCount,x=Math.cos(a),z=Math.sin(a),px=-z,pz=x;
   const mid=[x*.45,.58,z*.45],tip=[x*.93,.29,z*.93],width=.15;
   vertices.push(0,.06,0,mid[0]+px*width,mid[1],mid[2]+pz*width,
    tip[0],tip[1],tip[2],
    0,.06,0,tip[0],tip[1],tip[2],
    mid[0]-px*width,mid[1],mid[2]-pz*width);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.computeVertexNormals();return geo;
 }
 function shrubLeafGeometry(){
  // Angular bushes previously resembled stones; layered leaves give them
  // recognisable stems and an open silhouette without extra draw calls.
  const positions=[];
  for(let i=0;i<9;i++){
   const a=i*TAU/9,dx=Math.cos(a),dz=Math.sin(a),px=-dz,pz=dx;
   const h=.54+(i%4)*.10,r=.48+(i%3)*.13,w=.23;
   const mid=[dx*r*.64,h*.72,dz*r*.64];
   const tip=[dx*r,h,dz*r];
   positions.push(0,.06,0,mid[0]+px*w,mid[1],mid[2]+pz*w,...tip,
    0,.06,0,...tip,mid[0]-px*w,mid[1],mid[2]-pz*w);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();return geometry;
 }
 const leaves=mat('#ffffff',{side:THREE.DoubleSide}),stones=mat('#ffffff',{flatShading:true,vertexColors:true});
 instance('forest-shrubs',layout.shrubs,shrubLeafGeometry(),leaves,
  p=>({x:p.size,y:p.size*1.20,z:p.size,h:.045}),
  p=>p.variation>.65?'#526b51':p.variation>.3?'#3d5b46':'#657453');
 instance('forest-deep-bracken',layout.bracken,brackenGeometry(),
  mat('#ffffff',{side:THREE.DoubleSide}),p=>({
   x:p.size*1.12,y:p.size*(.74+.25*p.variation),z:p.size*1.12,h:.035
  }),p=>p.variation>.7?'#31533c':p.variation>.34?'#496745':'#647756');
 instance('forest-stones',layout.rocks,createWeatheredStoneGeometry(THREE,'forest'),stones,
  p=>({x:p.size*.73,y:p.size*.29,z:p.size*.58,h:p.size*.24}),
  p=>p.variation>.65?'#5a6a5c':p.variation>.32?'#72786c':'#606f64');
 instance('forest-mushroom-stems',layout.fungi,new THREE.CylinderGeometry(.31,.39,1,6),
  mat('#ae9c7d'),p=>({x:p.size*.28,y:p.size*.48,z:p.size*.28,h:p.size*.28}));
 instance('forest-mushroom-caps',layout.fungi,new THREE.ConeGeometry(1,.72,7),mat('#ffffff'),
  p=>({x:p.size*.55,y:p.size*.45,z:p.size*.55,h:p.size*.61}),
  p=>p.variation>.48?'#876351':'#705949');
 const fur=mat('#4c423a'),russet=mat('#91755c'),muzzle=mat('#b29a79'),eyes=mat('#22241f');
 const animals=[];
 function mesh(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1){
  const part=new THREE.Mesh(geometry,material);
  part.position.set(x,y,z);part.scale.set(sx,sy,sz);parent.add(part);return part;
 }
 const ellipsoid=new THREE.SphereGeometry(1,10,8),limb=new THREE.CylinderGeometry(.11,.13,1,6);
 for(const p of layout.wildlife){
  const normal=surface(p).clone(),root=new THREE.Group();
  root.position.copy(normal).multiplyScalar(radius+heightAt(normal)+.05);
  root.quaternion.setFromUnitVectors(up,normal);scene.add(root);
  const body=new THREE.Group();body.rotation.y=p.angle;root.add(body);
  const boar=p.kind==='boar',coat=boar?fur:russet,cy=boar?.90:1.35;
  mesh(body,ellipsoid,coat,0,cy,0,boar?.77:.46,boar?.50:.48,boar?.94:.82);
  const head=new THREE.Group();head.position.set(0,cy+.12,boar?.70:.57);body.add(head);
  mesh(head,ellipsoid,coat,0,0,.32,boar?.48:.31,boar?.40:.37,boar?.48:.45);
  if(boar){const snout=mesh(head,new THREE.CylinderGeometry(.22,.31,.26,8),muzzle,0,-.14,.74);snout.rotation.x=Math.PI/2}
  else{
   for(const side of [-1,1]){
    const horn=mesh(head,new THREE.CylinderGeometry(.027,.06,.62,5),muzzle,side*.14,.60,.18);
    horn.rotation.z=side*.29;
   }
  }
  for(const side of [-1,1])mesh(head,new THREE.SphereGeometry(.055,6,5),eyes,side*(boar?.31:.21),.06,boar?.64:.53);
  const legs=[];
  for(const x of [-1,1])for(const z of [-1,1]){
   legs.push(mesh(body,limb,coat,x*(boar?.48:.28),boar?.36:.56,z*(boar?.65:.54),
     boar?1:.69,boar?.7:1.12,boar?1:.69));
  }
  animals.push({root,body,head,legs,phase:p.angle,baseYaw:p.angle});
 }
 function setQuality(preset='balanced',preview=false){
  const ratio=preview?.10:preset==='economy'?.32:preset==='high'?1:.65;
  for(const item of batches){item.mesh.count=Math.floor(item.size*ratio);item.mesh.castShadow=false}
  const count=preview?0:preset==='economy'?3:preset==='high'?animals.length:7;
  animals.forEach((a,i)=>{a.root.visible=i<count});
 }
 function animate(time){
  for(const a of animals){
   if(!a.root.visible)continue;
   a.head.rotation.y=Math.sin(time*.5+a.phase)*.15;
   a.head.rotation.x=Math.sin(time*.8+a.phase)*.055;
   a.body.rotation.y=a.baseYaw+Math.sin(time*.22+a.phase)*.20;
   for(let i=0;i<a.legs.length;i++)a.legs[i].rotation.x=Math.sin(time*1.2+a.phase+i*Math.PI)*.055;
  }
 }
 setQuality();
 return {setQuality,animate,animalCount:animals.length,layout};
}