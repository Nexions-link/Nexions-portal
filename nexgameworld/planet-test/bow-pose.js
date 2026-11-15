// One visual timeline for local, remote and creation-preview archers. This
// module has no Three import: callers provide their existing renderer namespace.
import {MELEE_ANIMATION_SECONDS,MELEE_IMPACT_SECONDS} from './combat-timeline.js?v=2';

export const BOW_RELEASE_PROGRESS=MELEE_IMPACT_SECONDS/MELEE_ANIMATION_SECONDS;
export const BOW_REST_NOCK_X=-.15;
export const BOW_PULL=.45;
export const BOW_HANDLE_X=.30;
// The arrow sits above the gripping fist and beside the wooden limb. The
// string knot, drawing palm and release origin share this exact bow-local rest.
export const BOW_NOCK_Y=.27;
export const BOW_NOCK_Z=-.07;
export const BOW_RELEASE_PHASE=BOW_RELEASE_PROGRESS;
export const BOW_DRAW_LENGTH=BOW_PULL;
// Visual retention only: combat authority and ability cooldowns stay unchanged.
export const BOW_COMBAT_HOLD_SECONDS=5;

export const bowStanceAngle=actor=>actor?.root?.userData?.raceId==='orc'?1.1:1.3;
export const bowHeadYaw=actor=>actor?.root?.userData?.raceId==='orc'?0:-.35;

const clamp=value=>Math.max(0,Math.min(1,value));
const ease=(from,to,value)=>{
 const t=clamp((value-from)/(to-from));return t*t*(3-2*t);
};

/** Draw, hold, release and follow-through; never changes combat timers. */
export function bowShotPose(progress=-1){
 const active=Number.isFinite(progress)&&progress>=0&&progress<=1;
 if(!active)return {active:false,phase:'idle',draw:0,armDraw:0,raise:0,
  contact:false,loaded:false,released:false,followThrough:0};
 const released=progress>=BOW_RELEASE_PROGRESS;
 const draw=released?1-ease(BOW_RELEASE_PROGRESS,BOW_RELEASE_PROGRESS+.055,progress):
  ease(.055,.30,progress);
 return {active:true,
  phase:progress<.055?'nock':progress<.30?'draw':!released?'hold':progress<.52?'release':'recover',
  draw,armDraw:released?1-ease(.58,.96,progress):draw,
  raise:ease(0,.08,progress)*(1-ease(.68,1,progress)),
  contact:progress>=.08&&progress<=BOW_RELEASE_PROGRESS,
  loaded:progress>=.08&&!released,released,
  followThrough:released?ease(BOW_RELEASE_PROGRESS,.53,progress)*(1-ease(.60,.86,progress)):0};
}

export function bowNockPosition(THREE,draw=0,target=new THREE.Vector3()){
 return target.set(BOW_REST_NOCK_X-BOW_PULL*clamp(Number.isFinite(draw)?draw:0),BOW_NOCK_Y,BOW_NOCK_Z);
}

const caches=new WeakMap();
function cacheFor(THREE,actor){
 if(caches.has(actor))return caches.get(actor);
 const vector=()=>new THREE.Vector3(),quaternion=()=>new THREE.Quaternion();
 const tauren=actor.root.userData.raceId!=='orc';
 const cache={
  palm:vector().set(0,-.10,.015),idlePalm:vector().set(-.28,.72,.88),
  loadedPalm:vector().set(-.26,tauren?.75:.86,1),fullPalm:vector().set(-.64,tauren?.80:1.08,1.18),
  idleRight:vector().set(.62,.30,.32),leftPole:vector().set(-1.15,.60,.65),
  rightPole:vector().set(1.15,.92,.90),
  leftBasis:quaternion(),rightBasis:quaternion(),rootWorld:quaternion(),
  chestWorld:quaternion(),chestInverse:quaternion(),leftRotation:quaternion(),rightRotation:quaternion(),
  leftPalm:vector(),rightPalm:vector(),rightIdleWorld:vector(),nock:vector(),handNock:vector(),
  releaseOrigin:vector(),releaseOriginLocal:vector(),aimDirection:vector(),aimDirectionLocal:vector(),
  follow:vector(),matrix:new THREE.Matrix4(),
  ik:{a:vector(),b:vector(),axis:vector(),pole:vector(),elbow:vector(),
   upper:vector(),lower:vector(),wrist:vector(),palmOffset:vector(),front:vector(),
   x:vector(),y:vector(),z:vector(),localX:vector(),localY:vector(),localZ:vector(),
   basis:new THREE.Matrix4(),localBasis:new THREE.Matrix4(),upperRotation:quaternion(),
   elbowRotation:quaternion(),inverse:quaternion(),combined:quaternion()}
 };
 // Right-handed left wrist: X -> -Z, Y -> +X, Z -> -Y. With the existing
 // bow transform this makes the limbs vertical and the string face the archer.
 cache.matrix.makeBasis(vector().set(0,0,-1),vector().set(1,0,0),vector().set(0,-1,0));
 cache.leftBasis.setFromRotationMatrix(cache.matrix);
 // The drawing palm faces back toward the archer, with fingers across nock.
 cache.matrix.makeBasis(vector().set(0,1,0),vector().set(1,0,0),vector().set(0,0,-1));
 cache.rightBasis.setFromRotationMatrix(cache.matrix);
 caches.set(actor,cache);return cache;
}

// Exact two-bone solve in the unchanged chest frame. Only joint rotations are
// assigned: shoulder/elbow/hand translations, scales and the actor root stay put.
function solveArm(THREE,arm,palmTarget,handRotation,poleTarget,palm,work){
 const {a,b,axis,pole,elbow,upper,lower,wrist,palmOffset,front,x,y,z,
  localX,localY,localZ,basis,localBasis,upperRotation,elbowRotation,inverse,combined}=work;
 a.copy(arm.elbow.position);b.copy(arm.hand.position);
 const upperLength=a.length(),lowerLength=b.length();
 palmOffset.copy(palm).applyQuaternion(handRotation);
 wrist.copy(palmTarget).sub(palmOffset);
 axis.copy(wrist).sub(arm.shoulder.position);
 const requestedDistance=axis.length();
 if(requestedDistance<1e-9||upperLength<1e-9||lowerLength<1e-9)return false;
 axis.multiplyScalar(1/requestedDistance);
 const distance=Math.max(Math.abs(upperLength-lowerLength)+1e-6,
  Math.min(upperLength+lowerLength-1e-6,requestedDistance));
 const along=(upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance);
 const height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
 pole.copy(poleTarget).sub(arm.shoulder.position);
 pole.addScaledVector(axis,-pole.dot(axis));
 if(pole.lengthSq()<1e-10){pole.set(0,0,1).addScaledVector(axis,-axis.z);}
 pole.normalize();
 elbow.copy(arm.shoulder.position).addScaledVector(axis,along).addScaledVector(pole,height);
 upper.copy(elbow).sub(arm.shoulder.position).normalize();
 wrist.copy(arm.shoulder.position).addScaledVector(axis,distance);
 lower.copy(wrist).sub(elbow).normalize();

 // Preserve the anatomical elbow's bending plane, rather than applying an
 // arbitrary shortest-arc upper-arm twist which flips bracers and pauldrons.
 localY.copy(a).normalize();localZ.set(0,0,1).addScaledVector(localY,-localY.z).normalize();
 localX.crossVectors(localY,localZ).normalize();localZ.crossVectors(localX,localY).normalize();
 y.copy(upper);z.copy(lower).addScaledVector(y,-lower.dot(y));
 if(z.lengthSq()<1e-10)z.copy(pole).addScaledVector(y,-pole.dot(y));
 z.normalize();x.crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
 localBasis.makeBasis(localX,localY,localZ);basis.makeBasis(x,y,z);
 inverse.setFromRotationMatrix(localBasis).invert();
 upperRotation.setFromRotationMatrix(basis).multiply(inverse).normalize();
 arm.shoulder.quaternion.copy(upperRotation);
 front.copy(lower).applyQuaternion(inverse.copy(upperRotation).invert());
 elbowRotation.setFromUnitVectors(b.normalize(),front).normalize();
 arm.elbow.quaternion.copy(elbowRotation);
 combined.copy(upperRotation).multiply(elbowRotation).invert();
 arm.hand.quaternion.copy(combined.multiply(handRotation)).normalize();
 return requestedDistance<=upperLength+lowerLength+1e-6;
}

/**
 * Run after the ordinary torso/gait pose. Returns visual state plus world and
 * chest-local release anchors; the latter survive a subsequent mount pose.
 * Scratch vectors are private to this actor and reused until its next call.
 */
export function animateBowPose(THREE,actor,{attack=-1,walk=0,time=0}={}){
 const bow=actor.root.userData.hunterBow;
 if(!bow||!actor.arms?.[0]?.hand||!actor.arms?.[1]?.hand)return null;
 const cache=cacheFor(THREE,actor),state=bowShotPose(attack),chest=actor.chest;
 const {leftPalm,rightPalm,nock,handNock,rootWorld,chestWorld,chestInverse,
  leftRotation,rightRotation,releaseOrigin,releaseOriginLocal,aimDirection,aimDirectionLocal}=cache;
 actor.root.updateWorldMatrix(true,true);
 actor.root.getWorldQuaternion(rootWorld);chest.getWorldQuaternion(chestWorld);
 chestInverse.copy(chestWorld).invert();
 leftRotation.copy(chestInverse).multiply(rootWorld).multiply(cache.leftBasis).normalize();
 rightRotation.copy(chestInverse).multiply(rootWorld).multiply(cache.rightBasis).normalize();
 leftPalm.copy(cache.loadedPalm).lerp(cache.fullPalm,state.armDraw);
 leftPalm.lerpVectors(cache.idlePalm,leftPalm,state.raise);
 // Subtle breathing belongs to the whole holding pose, not the nock contact.
 if(!state.active)leftPalm.y+=Math.sin(Number.isFinite(time)?time*1.7:0)*.006*(1-clamp(Number.isFinite(walk)?walk:0));
 const leftReachable=solveArm(THREE,actor.arms[0],leftPalm,leftRotation,cache.leftPole,cache.palm,cache.ik);
 actor.root.updateWorldMatrix(true,true);
 bowNockPosition(THREE,state.draw,nock);bow.localToWorld(nock);
 bowNockPosition(THREE,state.armDraw,handNock);bow.localToWorld(handNock);
 cache.follow.set(.035,.020,-.10).applyQuaternion(rootWorld).multiplyScalar(state.followThrough);
 handNock.add(cache.follow);
 cache.rightIdleWorld.copy(cache.idleRight);chest.localToWorld(cache.rightIdleWorld);
 const handContactWeight=state.raise*(1-ease(.60,.88,Number.isFinite(attack)?attack:0));
 rightPalm.lerpVectors(cache.rightIdleWorld,handNock,handContactWeight);
 chest.worldToLocal(rightPalm);
 const rightReachable=solveArm(THREE,actor.arms[1],rightPalm,rightRotation,cache.rightPole,cache.palm,cache.ik);

 // This is the FULL-DRAW origin even when a frame skips past the release.
 // Use chest-local vectors so mount/body follow-through cannot stale the shot.
 releaseOriginLocal.copy(cache.fullPalm).add(cache.follow.set(
  BOW_HANDLE_X-BOW_REST_NOCK_X+BOW_PULL,-BOW_NOCK_Z,-BOW_NOCK_Y).applyQuaternion(leftRotation));
 releaseOrigin.copy(releaseOriginLocal);chest.localToWorld(releaseOrigin);
 aimDirectionLocal.set(-1,0,0).applyQuaternion(leftRotation).normalize();
 aimDirection.copy(aimDirectionLocal).transformDirection(chest.matrixWorld);
 actor.root.updateWorldMatrix(true,true);
 return {...state,leftReachable,rightReachable,nockWorld:nock,releaseOrigin,
  releaseOriginLocal,aimDirection,aimDirectionLocal};
}
