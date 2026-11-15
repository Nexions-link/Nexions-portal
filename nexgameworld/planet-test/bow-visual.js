// One articulated bow for both races, remote avatars and character creation.
// String and limbs belong to this actor because their vertices move each shot.
import {animateBowPose,BOW_REST_NOCK_X,BOW_DRAW_LENGTH,BOW_RELEASE_PHASE,BOW_NOCK_Y,BOW_NOCK_Z} from './bow-pose.js?v=64608';
import {createHunterArrow,HUNTER_ARROW_NOCK_Z} from './hunter-arrow.js?v=64608';
const masters=new WeakMap();
function limbMaster(THREE){
 if(masters.has(THREE))return masters.get(THREE);
 const make=draw=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
  [BOW_REST_NOCK_X-.055*draw,-(.86-.035*draw),0],
  [.22-.022*draw,-(.55-.02*draw),0],[.30,0,0],
  [.22-.022*draw,.55-.02*draw,0],
  [BOW_REST_NOCK_X-.055*draw,.86-.035*draw,0]
 ].map(p=>new THREE.Vector3(...p))),24,.045,7,false);
 const rest=make(0),drawn=make(1);
 rest.computeBoundingSphere();drawn.computeBoundingSphere();
 const grip=new THREE.CylinderGeometry(.065,.065,.24,10);grip.userData.actorShared=true;
 const value={rest,drawn,grip};masters.set(THREE,value);return value;
}
export function attachBowVisual(THREE,actor){
 if(actor.root.userData.hunterBow)return actor.root.userData.hunterBow;
 const master=limbMaster(THREE),bow=new THREE.Group();bow.name='hunter-bow';
 const wood=new THREE.MeshStandardMaterial({color:0x84532c,roughness:.65});
 const metal=new THREE.MeshStandardMaterial({color:0xc4ad6c,metalness:.45,roughness:.4});
 const geometry=master.rest.clone();geometry.userData.bowMutable=true;geometry.userData.actorShared=false;
 geometry.boundingSphere=master.rest.boundingSphere.clone().union(master.drawn.boundingSphere);
 const limb=new THREE.Mesh(geometry,wood);limb.name='bow-limbs';bow.add(limb);
 const stringGeometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:3},()=>new THREE.Vector3()));
 stringGeometry.userData.bowMutable=true;stringGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1.1);
 const string=new THREE.Line(stringGeometry,new THREE.LineBasicMaterial({color:0xe5d7b7}));
 string.name='bow-string';bow.add(string);
 const grip=new THREE.Mesh(master.grip,metal);grip.name='bow-grip';grip.position.x=.30;bow.add(grip);
 const nock=new THREE.Group();nock.name='bow-nock';bow.add(nock);
 const upper=new THREE.Group(),lower=new THREE.Group();
 upper.name='bow-tip-upper';lower.name='bow-tip-lower';bow.add(upper,lower);
 const arrow=createHunterArrow(THREE);arrow.name='bow-nocked-arrow';arrow.rotation.y=Math.PI/2;
 arrow.visible=false;bow.add(arrow);
 bow.rotation.set(Math.PI/2,0,Math.PI);bow.position.set(.30,-.10,.015);bow.visible=false;
 actor.arms[0].hand.add(bow);actor.root.userData.hunterBow=bow;
 const normal=new THREE.Vector3();
 function shape(draw,wobble=0){
  const x=BOW_REST_NOCK_X-.055*draw,y=.86-.035*draw;
  upper.position.set(x,y,0);lower.position.set(x,-y,0);
  nock.position.set(BOW_REST_NOCK_X-BOW_DRAW_LENGTH*draw+wobble,BOW_NOCK_Y,BOW_NOCK_Z);
  const p=stringGeometry.attributes.position;
  p.setXYZ(0,x,y,0);p.setXYZ(1,nock.position.x,BOW_NOCK_Y,BOW_NOCK_Z);p.setXYZ(2,x,-y,0);p.needsUpdate=true;
  const positions=geometry.attributes.position,normals=geometry.attributes.normal;
  const a=master.rest.attributes,b=master.drawn.attributes;
  for(let i=0;i<positions.count;i++){
   positions.setXYZ(i,a.position.getX(i)+(b.position.getX(i)-a.position.getX(i))*draw,
    a.position.getY(i)+(b.position.getY(i)-a.position.getY(i))*draw,
    a.position.getZ(i)+(b.position.getZ(i)-a.position.getZ(i))*draw);
   normal.set(a.normal.getX(i)+(b.normal.getX(i)-a.normal.getX(i))*draw,
    a.normal.getY(i)+(b.normal.getY(i)-a.normal.getY(i))*draw,
    a.normal.getZ(i)+(b.normal.getZ(i)-a.normal.getZ(i))*draw).normalize();
   normals.setXYZ(i,normal.x,normal.y,normal.z);
  }
  positions.needsUpdate=true;normals.needsUpdate=true;
  arrow.position.set(nock.position.x-HUNTER_ARROW_NOCK_Z,BOW_NOCK_Y,BOW_NOCK_Z);
 }
 shape(0);
 bow.clearPose=()=>{shape(0);arrow.visible=false;};
 // Keep closures out of serialized userData, which the character inspector
 // clones. Only a few plain phase fields and local vectors belong there.
 bow.updatePose=options=>{
  const state=animateBowPose(THREE,actor,options);if(!state)return null;
  const age=Math.max(0,(options.attack??-1)-BOW_RELEASE_PHASE);
  const wobble=state.released?.022*Math.sin(age*125)*Math.exp(-age*24):0;
  shape(state.draw,wobble);arrow.visible=state.loaded;
  bow.userData.draw=state.draw;bow.userData.phase=state.phase;
  (bow.userData.releaseOriginLocal??=new THREE.Vector3()).copy(state.releaseOriginLocal);
  (bow.userData.aimDirectionLocal??=new THREE.Vector3()).copy(state.aimDirectionLocal);
  return state;
 };
 return bow;
}
export function getBowReleasePose(THREE,actor){
 const bow=actor?.root?.userData.hunterBow;
 const local=bow?.userData.releaseOriginLocal,direction=bow?.userData.aimDirectionLocal;
 if(!bow?.visible||!local||!direction||!actor.chest)return null;
 actor.root.updateWorldMatrix(true,true);
 return {origin:actor.chest.localToWorld(new THREE.Vector3(local.x,local.y,local.z)),
  direction:new THREE.Vector3(direction.x,direction.y,direction.z).transformDirection(actor.chest.matrixWorld)};
}
