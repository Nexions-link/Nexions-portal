// NexGameWorld: cosmetic village details for the existing spherical start-zone.
// Purely visual: these meshes have no colliders, navigation changes, or gameplay state.
export const VILLAGE_VISUAL_COUNTS=Object.freeze({roofColumns:12,roofRows:19,tentSeams:9,treeTufts:4});
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export function createVillageVisuals(THREE,{scene,getRadius,toNormal,heightAt}){
 const roofLayers=[],tentLayers=[],treeLocations=[];
 const up=new THREE.Vector3(0,1,0);
 const q=new THREE.Quaternion();
 const dummy=new THREE.Object3D();
 const tileGeometry=new THREE.BoxGeometry(.70,.035,1.03);
 const tileMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:1,flatShading:true,vertexColors:false
 });
 const twineMaterial=new THREE.MeshStandardMaterial({color:0xb9a277,roughness:1});
 const tileColors=[0xa98562,0xb9966d,0xc4a77c,0x987656].map(v=>new THREE.Color(v));

 function addRoof(roof,length,depth,index=0){
  const cols=VILLAGE_VISUAL_COUNTS.roofColumns,rows=VILLAGE_VISUAL_COUNTS.roofRows;
  const layer=new THREE.InstancedMesh(tileGeometry,tileMaterial,cols*rows);
  layer.name='nexgameworld-roof-shingles';
  layer.castShadow=false;layer.receiveShadow=true;layer.frustumCulled=false;
  const dx=(length-.45)/cols,dz=(depth-.48)/rows;
  let n=0;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   // Raised seams follow the roof slope as children of the original plank.
   dummy.position.set(-length/2+.25+(col+.5)*dx, .166,
    -depth/2+.24+(row+.5)*dz);
   dummy.rotation.set(0,0,0);
   dummy.scale.set(Math.min(1.06,dx/.70*.89),1,Math.min(1.18,dz/1.03*.90));
   dummy.updateMatrix();
   layer.setMatrixAt(n,dummy.matrix);
   layer.setColorAt(n,tileColors[(row*7+col*3+index)%tileColors.length]);
   n++;
  }
  layer.instanceMatrix.needsUpdate=true;
  if(layer.instanceColor)layer.instanceColor.needsUpdate=true;
  roof.add(layer);roofLayers.push(layer);
  return layer;
 }
 const seamGeometry=new THREE.CylinderGeometry(.018,.026,1,5);
 function addTent(tent,radius){
  const count=VILLAGE_VISUAL_COUNTS.tentSeams;
  const seams=new THREE.InstancedMesh(seamGeometry,twineMaterial,count);
  seams.name='nexgameworld-tent-stitching';seams.frustumCulled=false;
  const from=new THREE.Vector3(),to=new THREE.Vector3(),dir=new THREE.Vector3();
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count;
   from.set(Math.sin(a)*radius*.957,radius*.08,Math.cos(a)*radius*.957);
   to.set(0,radius*1.445,0);
   dir.subVectors(to,from);
   dummy.position.copy(from).add(to).multiplyScalar(.5);
   dummy.quaternion.setFromUnitVectors(up,dir.clone().normalize());
   dummy.scale.set(1,dir.length(),1);dummy.updateMatrix();
   seams.setMatrixAt(i,dummy.matrix);
  }
  seams.instanceMatrix.needsUpdate=true;
  tent.add(seams);tentLayers.push(seams);
  return seams;
 }
 function addTree(x,z,scale){
  treeLocations.push({x,z,scale});
 }
 // Small branching leaf volumes form natural silhouettes while requiring just
 // one draw call for every tree and all four quality-controlled accent clusters.
 const tuftGeometry=new THREE.IcosahedronGeometry(1,1);
 const tuftMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:1,flatShading:true
 });
 let tufts=null,tuftCapacity=0;
 const accentShapes=[
  {x:-1.1,y:5.35,z:.95,sx:.77,sy:.51,sz:.73},
  {x:1.15,y:5.42,z:-.83,sx:.82,sy:.54,sz:.71},
  {x:.22,y:6.17,z:.37,sx:.98,sy:.60,sz:.88},
  {x:-.36,y:4.54,z:-1.05,sx:.80,sy:.50,sz:.67}
 ];
 function rebuild(){
  const count=treeLocations.length*VILLAGE_VISUAL_COUNTS.treeTufts;
  if(!tufts&&count){
   tufts=new THREE.InstancedMesh(tuftGeometry,tuftMaterial,count);
   tufts.name='nexgameworld-tree-crown-detail';tufts.frustumCulled=false;
   tufts.castShadow=false;tufts.receiveShadow=false;
   scene.add(tufts);tuftCapacity=count;
  }
  if(!tufts)return;
  const base=new THREE.Object3D(),part=new THREE.Object3D(),matrix=new THREE.Matrix4();
  let index=0;
  for(let layer=0;layer<VILLAGE_VISUAL_COUNTS.treeTufts;layer++)
   for(let i=0;i<treeLocations.length;i++){
    const tree=treeLocations[i],accent=accentShapes[layer];
    const normal=toNormal(tree.x,tree.z,getRadius());
    base.position.copy(normal).multiplyScalar(getRadius()+heightAt(normal)+.06);
    base.quaternion.setFromUnitVectors(up,normal);
    base.scale.setScalar(tree.scale);base.updateMatrix();
    part.position.set(accent.x,accent.y,accent.z);
    part.quaternion.identity();
    part.scale.set(accent.sx,accent.sy,accent.sz);part.updateMatrix();
    matrix.multiplyMatrices(base.matrix,part.matrix);
    tufts.setMatrixAt(index,matrix);
    const tint=new THREE.Color().setHSL(.215+(i%4)*.009,.33,.36+layer*.018+(i%3)*.012);
    tufts.setColorAt(index,tint);
    index++;
   }
  tufts.instanceMatrix.needsUpdate=true;
  if(tufts.instanceColor)tufts.instanceColor.needsUpdate=true;
  // Preserve active level after spherical radius changes.
  applyQuality(currentDetail);
 }
 let currentDetail=0,currentInterior=false,externalTreesActive=false;
 function setInterior(inside){
  currentInterior=!!inside;
  for(const roof of roofLayers)roof.visible=currentDetail>=.5&&!currentInterior;
 }
 function applyQuality(value){
  currentDetail=clamp01(value);
  for(const roof of roofLayers)roof.visible=currentDetail>=.5&&!currentInterior;
  for(const tent of tentLayers)tent.visible=currentDetail>=.5;
  if(tufts){
   // The first layer covers all trees; higher settings add more crown volume.
   const fraction=currentDetail<.3?0:currentDetail<.85?.5:1;
   tufts.count=externalTreesActive?0:Math.min(tuftCapacity,Math.floor(tuftCapacity*fraction));
  }
 }
 function setExternalTreesActive(enabled){
  externalTreesActive=!!enabled;
  applyQuality(currentDetail);
 }
 return {addRoof,addTent,addTree,rebuild,applyQuality,setInterior,setExternalTreesActive,
  get counts(){return {roofs:roofLayers.length,tents:tentLayers.length,
   trees:treeLocations.length,tufts:tuftCapacity};}
 };
}
