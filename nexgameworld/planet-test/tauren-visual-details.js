import {hornPathPoints,hornRadius} from './tauren-horn-profile.js?v=1';
import {createTaurenFurLockGeometry} from './tauren-hero-sculpt.js?v=2';
// Additional original NexGameWorld adventurer detailing. A cosmetic layer only:
// parent joints, grips, IK, hitboxes, equipment and animation are unchanged.
export function createTaurenVisualDetails(THREE,actor){
 const {head,chest,body,arms}=actor;
 if(!head||!chest||!body||!Array.isArray(arms)||arms.length!==2)
  throw Error('Tauren detail layer needs the existing animation joints');
 const invisibleRaycast=()=>{};
 const batches=[];
 const rootUp=new THREE.Vector3(0,0,1),dummy=new THREE.Object3D();
 const R=THREE.MathUtils;
 function batch(parent,name,geometry,material,rows){
  const mesh=new THREE.InstancedMesh(geometry,material,rows.length);
  mesh.name='nexgameworld-'+name;
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;
  mesh.raycast=invisibleRaycast;
  rows.forEach((row,i)=>{
   dummy.position.set(...row.position);
   dummy.quaternion.copy(row.quaternion||new THREE.Quaternion());
   dummy.scale.set(...(row.scale||[1,1,1]));
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(row.color)mesh.setColorAt(i,new THREE.Color(row.color));
  });
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  parent.add(mesh);
  batches.push(mesh);
  return mesh;
 }
 // Rings follow the curved, tapering horn surface rather than pointing upward
 // like floating jewellery. All transforms are in the animated head's frame.
 const hornCurve=sign=>new THREE.CatmullRomCurve3(hornPathPoints(THREE,sign));
 const ridges=[];
 for(const t of [.12,.24,.37,.52]){
  for(const sign of [-1,1]){
   const curve=hornCurve(sign);
   const tangent=curve.getTangent(t).normalize();
   const position=curve.getPoint(t);
   const radius=hornRadius(t);
   ridges.push({position:position.toArray(),quaternion:new THREE.Quaternion().setFromUnitVectors(rootUp,tangent),
    scale:[radius*.989,radius*.989,radius*.989],color:t<.3?0x82674e:0xa38a67});
  }
 }
 const hornRidges=batch(head,'horn-carved-ridges',
  new THREE.TorusGeometry(1,.024,5,18),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0}),ridges);
 // Two tiny reflected highlights on the eyes preserve facial readability.
 const glints=batch(head,'eye-highlights',new THREE.SphereGeometry(1,6,5),
  new THREE.MeshBasicMaterial({color:0xfff0c9}),[-1,1].map(sign=>({
   // glints must sit above the restored dark pupils (front ≈.536).
   position:[sign*.242,.147,.541],scale:[.015,.014,.009]})));
 // Warm, varied fur locks accent the hump without changing its silhouette or rig.
 const furRows=[];
 for(let row=0;row<5;row++)for(let col=-4;col<=4;col++){
  const edge=Math.abs(col)/4;
  const stagger=(row+col+14)%3;
  const x=col*.168+(row%2? .04:0);
  const y=.47+row*.19-edge*.065;
  const z=-.70+(row%3)*.035+edge*.095;
  const rot=new THREE.Euler(0,0,Math.PI+(col*.035));
  furRows.push({position:[x,y,z],quaternion:new THREE.Quaternion().setFromEuler(rot),
   scale:[.060+(.008*stagger),.22+(.038*(stagger/2)),.057],
   color:stagger===0?0x39281e:stagger===1?0x513526:0x62402d});
 }
 const mane=batch(chest,'mane-layered-fur',createTaurenFurLockGeometry(THREE),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:.96,
   vertexColors:true,side:THREE.FrontSide}),furRows);
 // Small leather and bronze stitches follow the moving belt, not the fixed world.
 const beltRows=[];
 for(let i=0;i<17;i++){
  const x=(i-8)*.052;
  beltRows.push({position:[x,-.052,.574],scale:[.026,i%4===0?.094:.055,.020],
   color:i%4===0?0xe6bf7a:0xa88554});
 }
 const belt=batch(body,'belt-stitching',new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85,metalness:.08}),beltRows);
 // Each existing forearm wrap receives one subtle edge ring attached to the
 // existing elbow joint; never attach decoration to the hand or weapon.
 const cuffs=arms.map((arm,i)=>{
  const rows=[-.665,-.47].map((y,n)=>({
   position:[(i?1:-1)*.02,y,.03],
   quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0)),
   scale:[1,1,1],color:n?0xa98453:0xc5a06b
  }));
  return batch(arm.elbow,'forearm-bronze-binding-'+i,
   new THREE.TorusGeometry(.272,.017,5,12),
   new THREE.MeshStandardMaterial({color:0xffffff,roughness:.68,metalness:.14}),rows);
 });
 function setQuality(value){
  const detail=R.clamp(Number(value)||0,0,1);
  // Eyes and the first simple horn ridge are always visible at low quality.
  hornRidges.count=detail<.4?4:8;
  glints.count=2;
  mane.count=detail<.35?12:detail<.85?30:furRows.length;
  belt.count=detail<.35?5:beltRows.length;
  for(const cuff of cuffs)cuff.visible=detail>=.5;
 }
 setQuality(.68);
 return {setQuality,batches,
  get counts(){return {horn:hornRidges.count,fur:mane.count,belt:belt.count,cuffs:cuffs.filter(x=>x.visible).length};}};
}
