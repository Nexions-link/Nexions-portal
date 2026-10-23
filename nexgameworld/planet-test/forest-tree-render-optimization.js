// NexGameWorld T3.1: visual-preserving runtime rendering safeguards.
// Master mesh fidelity is unchanged. Only GPU visibility, material passes and
// depth-only shadow representation differ from the art gallery.
import {mergeBarkParts} from './terrain-art-asset-polish.js';

export function enableTreeInstanceCulling(group){
 let count=0;
 group.traverse(o=>{
  if(!o.isInstancedMesh)return;
  // Default Three.js bounding sphere is local to the mesh and includes all
  // instance transforms. Compute AFTER setMatrixAt, before first render.
  o.computeBoundingSphere();
  o.frustumCulled=true;count++;
 });
 return count;
}
export function simplifyForestBarkShading(group){
 const materials=new Set();
 group.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh)return;
  const list=Array.isArray(o.material)?o.material:[o.material];
  for(const m of list){
   // Combining bump AND tangent-space normal from the very same PBR height
   // field doubles per-fragment derivative work for almost no extra detail.
   // Keep actual geometry, albedo, tangent-space normal and roughness intact.
   if(m?.isMeshStandardMaterial&&m.normalMap&&m.bumpMap){
    m.bumpMap=null;m.needsUpdate=true;materials.add(m);
   }
  }
 });
 return materials.size;
}
export function createForestShadowSilhouette(THREE,{id,height}={}){
 if(!Number.isFinite(height)||height<=0)throw new RangeError('Invalid shadow height');
 const parts=[];
 const material=new THREE.MeshBasicMaterial({
  color:'#ffffff',colorWrite:false,depthWrite:false,depthTest:false,
  side:THREE.DoubleSide
 });
 const piece=(geometry,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0])=>{
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(...pos);mesh.scale.set(...scale);mesh.rotation.set(...rot);
  parts.push(mesh);
 };
 // This solid shadow-caster follows the characteristic trunk/crown outline;
 // it is never shown in the beauty pass, never given a physics collider.
 piece(new THREE.CylinderGeometry(.12,1.33,height,12,9),[0,height*.5,0]);
 if(id==='tree_pine_ancient'){
  for(let i=0;i<3;i++)piece(new THREE.ConeGeometry(1,1,12,3),
   [0,height*(.60+i*.123),0],[5.2-i*.69,7.6-i*.65,5.2-i*.69]);
 }else if(id==='tree_dead_sentinel'){
  for(let i=0;i<7;i++){
   const angle=i*Math.PI*2/7;
   piece(new THREE.CylinderGeometry(.09,.28,1,7,2),
    [Math.cos(angle)*2.2,height*(.54+i*.048),Math.sin(angle)*2.2],
    [1,8.3-i*.37,1],[Math.sin(angle)*.72,0,Math.cos(angle)*.75]);
  }
 }else{
  for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3;
   piece(new THREE.IcosahedronGeometry(1,1),
    [Math.cos(a)*2.3,height*(.71+i*.045),Math.sin(a)*2.3],
    [5.4,3.9,5.4]);
  }
 }
 const geometry=mergeBarkParts(THREE,parts);
 for(const p of parts)p.geometry.dispose();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='NGW cosmetic shadow silhouette '+id;
 mesh.castShadow=true;mesh.receiveShadow=false;
 mesh.frustumCulled=true;
 mesh.userData.cosmeticShadow=true;mesh.userData.collider=false;
 mesh.userData.triangleCount=geometry.getAttribute('position').count/3;
 return mesh;
}
export function configurePilotTreeRender(group,{quality='balanced',portal=false}={}){
 let renderMeshes=0,shadowMeshes=0;
 group.traverse(o=>{
  if(!o.isMesh)return;
  if(o.userData.cosmeticShadow){
   o.visible=!portal&&quality==='high';
   o.castShadow=o.visible;
   shadowMeshes++;return;
  }
  // Master geometry is always rendered with its original detail. The shadows
  // are represented by the cheap silhouette only (not 100k-vertex boughs).
  o.castShadow=false;
  renderMeshes++;
 });
 return {renderMeshes,shadowMeshes};
}
