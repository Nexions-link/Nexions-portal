// PT 0.6: original NexGame warrior poses, evaluated in the character's
// local radial-up frame. Equipment grip tuners remain the source of truth.
import {weaponSwingProfile,daggerThrustPose} from '../weapon-visuals.js?v=0.3.7.1';
import {shieldBlockPose} from '../shield-block.js?v=0.3.7.1';
import {combatPose} from './combat-pose.js?v=1';
import {advancePlayerMotion} from './player-motion.js?v=1';
import {weaponActionDetail} from './weapon-action-detail.js?v=1';
import {footStrideZ,hoofSwingLift,hoofToeFlex} from './foot-placement.js?v=2';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x)};
const smooth=x=>x*x*(3-2*x);
export function animateSphericalTauren(actor,{
 dt=1/60,time=0,walk=0,phase=0,turn=0,gather=false,combat=false,
 attack=-1,stomp=-1,blockRemaining=0,weaponKind='none',terrainFeet=null
}={}){
 const seconds=clamp(Number.isFinite(dt)?dt:0,0,.1),user=actor.root.userData;
 const motion=advancePlayerMotion(user,seconds,{
  walk,turn,gather,combat,attack,blockRemaining
 });
 const w=motion.walk,pivot=motion.turn,bend=smooth(motion.gather),
  guard=motion.guard,turnLag=motion.turnLag,turnFeet=motion.turnFeet,
  acceleration=motion.inertia,stride=Math.sin(phase),beat=Math.cos(phase*2);
 // All secondary motion stays on existing torso and limb joints.
 // World-space heading, hitboxes and equipment grips remain authoritative.
 const breath=Math.sin(time*1.7),profile=weaponSwingProfile(weaponKind);
 // Cosmetic impulse generated only by an actual successful shield block.
 user.blockRecoil=Math.max(0,(user.blockRecoil||0)-seconds*2.8);
 const recoil=Math.sin(user.blockRecoil*Math.PI)*user.blockRecoil;
 const idle=1-w;
 // Native weapon-specific phases. Progress 0..1 runs for precisely 0.8 s;
 // physical damage is triggered separately at progress 0.425.
 const playing=attack>=0&&attack<=1;
 const stabbing=playing&&weaponKind==='dagger'?daggerThrustPose(attack):null;
 const windup=playing&&!stabbing?ease(0,.32,attack)*(1-ease(.38,.65,attack)):0;
 const swing=playing&&!stabbing?ease(.32,.58,attack)*(1-ease(.64,1,attack)):0;
 const block=shieldBlockPose(blockRemaining);
 const posture=combatPose({attack,weaponKind,blockRemaining,recoil,walk:w});
 const detail=weaponActionDetail({weaponKind,attack,walk:w,guard,
  blocking:block.power>0});
 // Support-side weight shift, slight forward drive and turn banking remain in
 // the already animated torso; foot IK and all equipment attachment joints stay.
 actor.body.position.set(stride*.047*w+.013*pivot+detail.shiftX,
  1.4+.012*breath*idle+.034*(1-beat)*w-.47*bend-.025*recoil-.012*guard,0);
 actor.body.rotation.set(.012*w+.010*acceleration+posture.brace+.010*guard,
  .022*stride*w+.020*pivot-.018*turnLag-posture.anticipation*.045+
   detail.torsoYaw*.35,
  -.036*pivot-.024*stride*w+posture.impact*.027+detail.torsoRoll);
 actor.chest.rotation.set(.035*w+.20*bend+block.chestX+.013*acceleration+posture.brace*.6+.033*guard+
   detail.torsoPitch,
  Math.sin(phase)*.065*w+block.chestY+.095*pivot+.065*turnLag-.022*guard+
   detail.torsoYaw,
  -stride*.025*w+.038*pivot+posture.impact*.035-detail.torsoRoll);
 actor.chest.scale.y=1+breath*.005;
 actor.neck.rotation.set(-.018*breath+.10*bend-.009*guard,-actor.chest.rotation.y*.65,stride*.015*w);
 // Head remains parented to the original neck joint, including both horns.
 actor.head.rotation.set(.024*Math.sin(time*.85)*idle-.035*stride*w+.060*bend+detail.headPitch,
  .034*Math.sin(time*.57)*idle+.016*Math.sin(phase)*w+.065*pivot+.025*turnLag,
  .012*Math.sin(time*.73)*idle+.018*pivot);
 actor.chest.rotation.z+=.018*Math.sin(time*1.1)*idle+.026*recoil;
 if(stabbing){
  actor.chest.rotation.y+=.06*stabbing.draw-.07*stabbing.extend;
  actor.chest.rotation.x+=.10*stabbing.extend;
  actor.body.position.z=.16*stabbing.extend;
 }else{
  actor.chest.rotation.y+=-profile.torsoWindup*windup+profile.torsoSwing*swing;
  actor.chest.rotation.x+=.12*swing;
  actor.body.position.z=0;
 }
 actor.body.position.z-=.045*recoil;
 actor.body.position.z+=posture.lunge;
 const stomping=stomp>=0,stompPower=clamp(stomp,0,1);
 if(stomping)actor.body.position.y-=.14*Math.sin(Math.min(stompPower/.55,1)*Math.PI);
 // Two-segment IK for each leg. Independent terrain samples are smoothed
 // per hoof to prevent single-frame jumps while walking over rocky slopes.
 // Everything is in the actor's radial-up local frame, not global world Y.
 const feet=user.terrainFeet??(user.terrainFeet=[{height:0,pitch:0,roll:0},{height:0,pitch:0,roll:0}]);
 const footBlend=1-Math.exp(-seconds*11);
 for(let i=0;i<2;i++){
  const leg=actor.legs[i];
  let z=footStrideZ(phase,i)*w;
  let lift=hoofSwingLift(phase,i)*.22*w*(1-bend);
  // Heel shift during an on-the-spot turn; root stays planted, foot IK
  // remains in the local radial-up frame.
  const support=i===(pivot>=0?0:1);
  lift+=turnFeet*(support?.010:.030);
  z+=turnFeet*(support?-.018:.022);
  z+=i===0?detail.leftFootZ:detail.rightFootZ;
  lift+=i===0?detail.leftFootLift:detail.rightFootLift;
  if(stomping&&i===1){lift+=.42*Math.sin(Math.min(stompPower/.48,1)*Math.PI);z+=.17*Math.sin(stompPower*Math.PI);}
  const sample=terrainFeet?.[i],foot=feet[i];
  for(const axis of ['height','pitch','roll']){
   const limit=axis==='height'?0.31:axis==='pitch'?0.28:0.23;
   const desired=clamp(Number.isFinite(sample?.[axis])?sample[axis]:0,-limit,limit);
   foot[axis]+=(desired-foot[axis])*footBlend;
  }
  // The swing lifts the hoof above the sampled ground, while the stance
  // follows that ground and the hoof rotates to match its local slope.
  const y=.205+foot.height+lift-actor.body.position.y;
  const distance=clamp(Math.hypot(y,z),.15,1.397),
   knee=Math.acos(clamp((distance*distance-.72*.72-.68*.68)/(2*.72*.68),-1,1));
  leg.hip.position.y=actor.body.position.y;
  leg.hip.rotation.x=Math.atan2(-z,-y)-Math.atan2(.68*Math.sin(knee),.72+.68*Math.cos(knee));
  leg.knee.rotation.x=knee;
  const planted=1-clamp(lift/.22,0,1)*.65;
  leg.foot.rotation.x=-leg.hip.rotation.x-knee+foot.pitch*planted
   +hoofToeFlex(phase,i)*w*(1-bend);
  leg.foot.rotation.y=((i===0?-1:1)*.048*pivot+
   .018*pivot*turnFeet)*planted;
  leg.foot.rotation.z=foot.roll*planted;
 }
 for(let i=0;i<2;i++){
  const arm=actor.arms[i],sign=i?1:-1;
  arm.shoulder.rotation.x=sign*stride*.31*w+sign*.045*pivot
   -(i?profile.shoulderWindup*windup-profile.shoulderSwing*swing:0)
   -(i?.18:.105)*guard+
   (i?detail.mainShoulderX:detail.offShoulderX);
  arm.shoulder.rotation.z=-sign*(.12+.025*breath)+(i?profile.shoulderSlash*swing:0)
   +(i?-.09:.055)*posture.stance+(i?-.020:.022)*guard+
   (i?detail.mainShoulderZ:0);
  arm.shoulder.rotation.y=i?detail.mainShoulderY:detail.offShoulderY;
  arm.elbow.rotation.x=-.14-Math.abs(stride)*.11*w-(i?profile.elbowWindup*windup:0)
   -(i?.14:.08)*posture.stance-(i?.11:.08)*guard+
   (i?detail.mainElbowX:detail.offElbowX)+
   sign*Math.cos(phase)*detail.gaitElbow;
  arm.shoulder.rotation.x-=bend*(i?.95:1.12);
  arm.elbow.rotation.x-=.45*bend;
  if(stomping)arm.shoulder.rotation.z-=sign*.17*Math.sin(stompPower*Math.PI);
  if(i===0){
   arm.shoulder.rotation.x+=block.shoulderX-.11*recoil;
   arm.shoulder.rotation.z+=block.shoulderZ;
   arm.elbow.rotation.x+=block.elbowX-.045*recoil;
  }else if(stabbing){
   arm.shoulder.rotation.x+=.24*stabbing.draw-1.16*stabbing.extend;
   arm.shoulder.rotation.z-=.07*stabbing.extend;
   arm.elbow.rotation.x+=-.72*stabbing.draw+.11*stabbing.extend;
  }
  // Dynamically rotate the *wrist joint*, not the GLB model: unchanged approved
  // sword/axe/dagger/shield tuning angles remain in userData.equipmentGrip.
  const grip=user.equipmentGrip?.[i===0?'shield':'weapon']||{x:i?-Math.PI/2:Math.PI,y:0,z:0};
  if(arm.hand&&grip){
   const wrist=i===0?block.wristX:
     stabbing?.12*stabbing.draw-.08*stabbing.extend:
     -profile.wristWindup*windup+profile.wristSwing*swing;
   arm.hand.rotation.set(grip.x+wrist,grip.y,grip.z,grip.order||'XYZ');
  }
 }
 if(actor.tail){actor.tail.rotation.x=.06+Math.sin(time*1.35)*.075+w*.08+.025*acceleration;
  actor.tail.rotation.y=.06*Math.sin(time*1.1)+.045*stride*w-.085*pivot+
   detail.tailYaw;}
 if(actor.braids)actor.braids.forEach((b,i)=>{
  b.rotation.x=.045*Math.sin(time*1.7+i*.8)+.08*stride*w+.025*bend+.012*acceleration;
  b.rotation.z=(i?-.018:.018)*Math.sin(time*1.23+i);
 });
 return {crouch:bend,block:block.power,attack:playing?swing:0,dagger:stabbing?.extend||0};
}
