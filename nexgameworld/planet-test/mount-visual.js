// NGW M1.2 — first original ground mount, using the active procedural wolf rig.
// Visual-only: authoritative position, heading, hitboxes and equipment stay unchanged.
import {createForestWolfVisual} from './forest-wolf-visual.js?v=7';
export const FIRST_MOUNT_VISUAL_ID='forest_wolf';
export const RIDER_RAISE=1.04;
export const WOLF_MOUNT_SCALE=1.3;
export function mountRiderOffset(time=0,travelled=0,gaitPose=null){
 // During riding, follow the actual wolf's spine suspension, not a separate
 // timer: the saddle and passenger must rise and settle on the same stride.
 if(Number.isFinite(gaitPose?.bounce))
  return RIDER_RAISE+gaitPose.bounce*WOLF_MOUNT_SCALE*.88;
 const motion=Math.min(1,Math.max(0,Number.isFinite(travelled)?travelled/.13:0));
 return RIDER_RAISE+Math.sin((Number.isFinite(time)?time:0)*9)*.023*motion;
}
function createVisual(THREE,actor){
 const wolf=createForestWolfVisual(THREE,0);
 wolf.root.scale.setScalar(WOLF_MOUNT_SCALE);
 wolf.root.name='NexGameWorldForestWolfMount';
 actor.root.add(wolf.root);
 const brown=new THREE.MeshStandardMaterial({color:0x4a3223,roughness:.89}),
  trim=new THREE.MeshStandardMaterial({color:0xb39158,metalness:.12,roughness:.6}),
  dark=new THREE.MeshStandardMaterial({color:0x2b261e,roughness:1});
 const block=(parent,w,h,d,x,y,z,mat)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  parent.add(mesh);return mesh;
 };
 // Saddle follows the wolf's back without changing its combat rig.
 const tack=new THREE.Group();tack.name='SaddleAndHarness';wolf.body.add(tack);
 block(tack,1.06,.17,1.07,0,1.74,-.18,brown);
 block(tack,1.15,.065,.20,0,1.85,.30,trim);
 block(tack,1.18,.065,.18,0,1.85,-.65,trim);
 for(const side of [-1,1]){
  block(tack,.11,.56,.20,side*.59,1.45,-.13,dark);
  block(tack,.28,.055,.24,side*.64,1.16,-.13,trim);
  block(tack,.085,.30,.55,side*.49,1.39,.13,brown);
 }
 // A separate mount body only; never reparent the original player's model.
 const originalHipX=actor.legs.map(leg=>leg.hip.position.x);
 return {wolf,originalHipX,wasRiding:false,root:wolf.root};
}
export function syncForestWolfMount(THREE,actor,{riding=false,time=0,travelled=0}={}){
 if(!actor?.root||!actor?.body||!Array.isArray(actor.legs))return;
 let visual=actor.root.userData.ngwMountVisual;
 if(!riding){
  if(visual){
   visual.root.visible=false;
   if(visual.wasRiding){
    for(let i=0;i<actor.legs.length;i++)
     {actor.legs[i].hip.position.x=visual.originalHipX[i];
      actor.legs[i].hip.rotation.z=0;}
   }
   visual.wasRiding=false;
  }
  return;
 }
 if(!visual){
  visual=createVisual(THREE,actor);
  actor.root.userData.ngwMountVisual=visual;
 }
 visual.root.visible=true;
 visual.wasRiding=true;
 // Call after animateSphericalTauren: override only mounted joint poses.
 const gaitPose=visual.wolf.animate(time,travelled,0,0,0,{}, {mounted:true});
 const offset=mountRiderOffset(time,travelled,gaitPose);
 actor.body.position.y+=offset;
 for(let i=0;i<actor.legs.length;i++){
  const leg=actor.legs[i],sign=i===0?-1:1;
  leg.hip.position.y+=offset;
  leg.hip.position.x=visual.originalHipX[i]+sign*.22;
  leg.hip.rotation.x=.63;
  leg.hip.rotation.z=sign*.19;
  leg.knee.rotation.x=1.18;
  leg.foot.rotation.x=-1.12;
  leg.foot.rotation.z=0;
 }
 // The seated silhouette tilts forward into the saddle while the wolf runs.
 actor.body.rotation.x+=.075+(gaitPose?.pitch||0)*.40;
 actor.body.rotation.z+=(gaitPose?.roll||0)*.48;
 for(const arm of actor.arms||[]){
  arm.shoulder.rotation.x-=.30;
  arm.elbow.rotation.x-=.17;
 }
}
