import {hitReaction} from './combat-feedback.js';
// Original Dolgonog v0.1 asset adapter shared by the game and regression tests.
// Deliberately no reference to the old experimental models.
export const PLAINSTRIDER_GLB='./bestiary/models/dolgonog-v0.1.glb?v=0.3.5.43';
export const PLAINSTRIDER_VISUAL_SCALE=.6;
export const PLAINSTRIDER_REQUIRED_CLIPS=Object.freeze(['Idle','Walk','Peck']);
export const PLAINSTRIDER_REQUIRED_PARTS=Object.freeze(['Body','Head','Neck','Leg_L','Leg_R','Body_mesh','Head_mesh']);
export function validatePlainstriderGltf(gltf){
 if(!gltf?.scene||!Array.isArray(gltf.animations))return false;
 const clips=new Set(gltf.animations.map(a=>a.name));
 if(!PLAINSTRIDER_REQUIRED_CLIPS.every(c=>clips.has(c)))return false;
 return PLAINSTRIDER_REQUIRED_PARTS.every(n=>!!gltf.scene.getObjectByName(n));
}
// Explicitly separate motion classification from visual transition smoothing.
// An animated GLB must not restart Walk on every tiny network pause.
export function plainstriderMotion({dead=false,attackCd=0,boss=false,moved=0,dt=1/60,walkGrace=0,attackRemaining=0}={}){
 if(dead)return 'corpse';
 if(attackRemaining>0||attackCd>(boss?1.2:.95))return 'Peck';
 if(walkGrace>0||moved>Math.max(.0002,dt*.08))return 'Walk';
 return 'Idle';
}
export const PLAINSTRIDER_WALK_GRACE=.32;
export const PLAINSTRIDER_BLEND_TIME=.24;
export function transitionPlainstriderAnimation(THREE,visual,next){
 if(visual.mode===next)return false;
 const previous=visual.mode&&visual.actions[visual.mode];
 visual.mode=next;
 if(next==='corpse'){
  visual.mixer.stopAllAction();
  return true;
 }
 const action=visual.actions[next];
 action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
 if(next==='Peck'){
  action.setLoop(THREE.LoopOnce,1);
  action.clampWhenFinished=true;
 }else{
  action.setLoop(THREE.LoopRepeat,Infinity);
  action.clampWhenFinished=false;
 }
 action.play();
 // A fast approach keeps the authored beak impact legible. Long crossfades
 // used to hide about a third of this short attack in the idle/walk clip.
 const fade=visual.spherical?(next==='Peck'?.085:previous===visual.actions.Peck?.18:PLAINSTRIDER_BLEND_TIME):PLAINSTRIDER_BLEND_TIME;
 if(previous&&previous!==action)action.crossFadeFrom(previous,fade,false);
 else action.fadeIn(visual.spherical&&next==='Peck'?.085:.16);
 return true;
}
export function attachPlainstriderGltf(THREE,enemy,gltf){
 if(!validatePlainstriderGltf(gltf))throw Error('Original dolgonog GLB: rig or animation clips missing');
 const bird=gltf.scene.clone(true); // Geometry/material data are shared across all instances.
 const container=new THREE.Group();
 container.name='dolgonog-original-v0.1';
 container.scale.setScalar(PLAINSTRIDER_VISUAL_SCALE);
 container.add(bird);
 enemy.root.add(container);
 bird.traverse(o=>{
  if(o.isMesh){
   o.castShadow=/^(Body|Head|Neck|Wing)/.test(o.name);
   o.receiveShadow=false;
  }
 });
 // Hide all the old shapes, but retain gameplay/body/leg bookkeeping until
 // the complete wildlife physics system is decoupled from legacy poses.
 enemy.body.visible=false;
 for(const leg of enemy.legs)leg.visible=false;
 const mixer=new THREE.AnimationMixer(bird);
 const actions=Object.fromEntries(PLAINSTRIDER_REQUIRED_CLIPS.map(name=>[name,mixer.clipAction(gltf.animations.find(c=>c.name===name))]));
 enemy.birdVisual={
  container,bird,mixer,actions,mode:null,walkGrace:0,
  attackRemaining:0,lastAttackCd:enemy.attackCd||0
 };
 return enemy.birdVisual;
}
export function advancePlainstriderVisual(THREE,enemy,dt,moved=0,dead=false){
 const visual=enemy.birdVisual;if(!visual)return;
 const step=Math.min(Math.max(0,dt),.1);
 const speed=Number.isFinite(moved)?Math.max(0,moved)/Math.max(step,.016):0;
 // Network snapshots arrive intermittently. Hold WALK through tiny motion
 // pauses instead of snapping the GLB legs to their bind pose every frame.
 if(speed>.12)visual.walkGrace=PLAINSTRIDER_WALK_GRACE;
 else visual.walkGrace=Math.max(0,visual.walkGrace-step);
 // Attack action starts on a NEW cooldown cycle and plays its full clip.
 // Avoid truncating a .8-second Peck halfway through the combat cooldown.
 const cd=enemy.attackCd||0,prior=visual.lastAttackCd;
 // In spherical online/local gameplay a new telegraph, not a cooldown
 // refill/reset/respawn, owns the attack. Cooldown-based Pecks on an ordinary
 // reset looked like phantom attacks with no actual damage event.
 // Keep the legacy adaptor for non-spherical preview users.
 if(!visual.spherical&&!dead&&cd>.7&&cd>prior+.32)
  visual.attackRemaining=.8;
 visual.lastAttackCd=cd;
 // Brief visible recoil of the actual GLB, independently of Walk/Peck clips.
 // This moves only the asset container, never the authoritative world entity.
 const recoil=dead||visual.impactPivot?0:hitReaction(enemy.hit);
 // The authored Peck clip is paired with a tiny forward lunge.
 // The mesh returns to its original position after the attack, never the physics root.
 const strike=dead?0:visual.attackRemaining>0?
  Math.sin(Math.PI*(1-visual.attackRemaining/.8))*(visual.spherical?.19:.27):0;
 visual.container.rotation.x=strike>0||recoil>0?-.14*strike-.24*recoil:0;
 visual.container.rotation.z=.10*recoil;
 visual.container.position.z=strike-(recoil? .19*recoil:0);
 const isAttacking=visual.attackRemaining>0;
 const desired=dead?'corpse':isAttacking?'Peck':visual.walkGrace>0?'Walk':'Idle';
 transitionPlainstriderAnimation(THREE,visual,desired);
 if(desired!=='corpse'){
  visual.mixer.update(step);
  visual.attackRemaining=Math.max(0,visual.attackRemaining-step);
 }
}
export function resetPlainstriderVisual(enemy){
 const visual=enemy.birdVisual;if(!visual)return;
 visual.mixer.stopAllAction();
 visual.mode=null;
 visual.walkGrace=0;
 visual.attackRemaining=0;
 visual.lastAttackCd=visual.spherical&&Number.isFinite(enemy.attackCd)?enemy.attackCd:0;
 visual.container.rotation.x=0;
 visual.container.rotation.z=0;
 visual.container.position.z=0;
}
