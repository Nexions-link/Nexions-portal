// Original low-poly fantasy raider for NexGameWorld, no borrowed character assets.
import {createBanditGaitState,advanceBanditGait} from './bandit-gait.js?v=1';
// Units: ground at y=0, facing +Z; arm/leg joints animate with the shared PvE pose.
export function createBanditVisual(THREE){
 const root=new THREE.Group();root.name='dust-trail-raider';
 const material=(color,metalness=0)=>new THREE.MeshStandardMaterial({
  color,roughness:metalness?.75:.95,metalness
 });
 const leather=material(0x654b35),dark=material(0x272e27),skin=material(0x94785b),
  hood=material(0x4b5440),linen=material(0x9d8867),iron=material(0xa2a8a0,.45),
  brass=material(0xd0ad69,.65),red=material(0x8d5141);
 const shape=(geometry,mat,parent,x,y,z,sx=1,sy=1,sz=1)=>{
  const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);
  mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=false;
  parent.add(mesh);return mesh;
 };
 const sphere=(parent,mat,x,y,z,sx,sy,sz,segments=12)=>
  shape(new THREE.SphereGeometry(1,segments,9),mat,parent,x,y,z,sx,sy,sz);
 const cylinder=(parent,mat,x,y,z,top,bottom,h,segments=10)=>
  shape(new THREE.CylinderGeometry(top,bottom,h,segments),mat,parent,x,y,z);
 // Armor silhouette: padded tunic, asymmetric pauldrons, scarf, hood.
 sphere(root,dark,0,1.05,0,.38,.50,.27);
 sphere(root,leather,0,1.64,0,.51,.71,.36);
 const coat=cylinder(root,leather,0,.96,0,.4,.52,.85);
 coat.rotation.z=.018;
 sphere(root,linen,0,1.62,.32,.25,.44,.055);
 sphere(root,hood,0,2.45,-.02,.34,.43,.35);
 sphere(root,skin,0,2.36,.275,.23,.24,.15);
 sphere(root,dark,0,2.35,.395,.25,.105,.055);
 sphere(root,linen,0,2.0,.38,.38,.16,.10);
 sphere(root,red,0,1.85,.39,.25,.17,.10);
 for(const side of [-1,1]){
  sphere(root,leather,side*.44,1.95,0,.22,.2,.35);
  sphere(root,brass,side*.45,1.95,.28,.07,.065,.035);
 }
 cylinder(root,dark,0,1.27,.015,.395,.4,.17);
 const buckle=shape(new THREE.BoxGeometry(.19,.13,.07),brass,root,0,1.30,.395);
 const legs=[],arms=[];
 for(const sign of [-1,1]){
  const hip=new THREE.Group();hip.position.set(sign*.20,1.10,0);root.add(hip);
  sphere(hip,dark,0,-.25,0,.21,.30,.23);
  const knee=new THREE.Group();knee.position.set(0,-.53,0);hip.add(knee);
  sphere(knee,dark,0,-.23,.02,.19,.29,.21);
  const foot=new THREE.Group();foot.position.set(0,-.42,.08);knee.add(foot);
  sphere(foot,leather,0,-.01,.14,.23,.15,.34);
  legs.push({hip,knee,foot});
  const arm=new THREE.Group();arm.position.set(sign*.52,1.98,0);root.add(arm);
  sphere(arm,hood,sign*.11,-.32,0,.19,.40,.21);
  sphere(arm,skin,sign*.14,-.68,.02,.18,.18,.17);
  arms.push(arm);
 }
 // Rusted knife in right fist, without copied weapon geometry.
 const sword=new THREE.Group();sword.position.set(.67,1.28,.05);root.add(sword);
 cylinder(sword,dark,0,-.10,0,.06,.065,.32,7);
 const blade=shape(new THREE.ConeGeometry(.115,.72,5),iron,sword,0,-.54,0);
 blade.rotation.z=Math.PI;
 shape(new THREE.BoxGeometry(.35,.06,.10),brass,sword,0,-.24,0);
 // Light cape rolls during stride and makes the silhouette readable from afar.
 const cape=shape(new THREE.ConeGeometry(.49,1.25,9,1,true),hood,root,0,1.55,-.23);
 cape.rotation.x=.12;
 root.userData.banditMaterials={leather,iron,hood};
 const gait=createBanditGaitState();
 function animate(clock,step=0,attack=0,turn=0){
  const pose=advanceBanditGait(gait,clock,step,{attacking:attack>0,turn});
  const strength=1-Math.exp(-pose.dt*17);
  for(let i=0;i<2;i++){
   const leg=legs[i],target=pose.legs[i];
   leg.hip.rotation.x+=(target.hip-leg.hip.rotation.x)*strength;
   leg.knee.rotation.x+=(target.knee-leg.knee.rotation.x)*strength;
   leg.foot.rotation.x+=(target.foot-leg.foot.rotation.x)*strength;
  }
  const wave=(pose.legs[0].hip-pose.legs[1].hip)*.32;
  arms[0].rotation.x+=( -wave*.68-arms[0].rotation.x)*strength;
  arms[1].rotation.x+=( wave*.68-attack*.65-arms[1].rotation.x)*strength;
  root.rotation.z=pose.torsoRoll;
  root.rotation.x=pose.torsoPitch;
  cape.rotation.x=pose.cape+.025*Math.sin(clock*1.7);
  return pose;
 }
 return {root,legs,animate};
}
