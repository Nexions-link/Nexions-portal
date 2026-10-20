import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {advanceCreatureSecondary,applyCreatureSecondary,resetCreatureSecondary,shouldReplayCreatureHurt} from '../creature-secondary.js?v=2';
import {advanceMobImpact} from '../mob-impact.js';
import {advanceCreatureGait} from '../creature-gait.js';
import {transitionPlainstriderAnimation,advancePlainstriderVisual,resetWalkingClip} from '../../plainstrider-model.js';

test('raiders breathe and recover naturally without moving collision or world transforms',()=>{
 const s={},root=new THREE.Group(),pivot=new THREE.Group();root.add(pivot);
 const before=root.position.clone(),orientation=root.quaternion.clone();
 let first=0,seenRaise=false;
 for(let i=0;i<120;i++){
  const pose=advanceCreatureSecondary(s,1/60,{kind:'raider',yaw:0});
  applyCreatureSecondary(pivot,pose);
  if(i===0)first=pose.raise;
  if(Math.abs(pose.raise-first)>.001)seenRaise=true;
 }
 assert.ok(seenRaise,'breathing must be visible and time-dependent');
 assert.equal(root.position.distanceTo(before),0);
 assert.equal(root.quaternion.angleTo(orientation),0);
 resetCreatureSecondary(s,pivot);
 assert.deepEqual(pivot.position.toArray(),[0,0,0]);
 assert.deepEqual(pivot.rotation.toArray().slice(0,3),[0,0,0]);
});
test('longstriders lean into gradual turns but ignore giant position corrections',()=>{
 const s={};
 advanceCreatureSecondary(s,1/60,{yaw:0,kind:'longstrider'});
 const roll=[];
 for(let i=1;i<15;i++){
  roll.push(advanceCreatureSecondary(s,1/60,{yaw:i*.025,walking:true,speed:1}).roll);
 }
 assert.ok(roll.some(x=>x<-.007),'leftward turning should produce a small body lean');
 const teleported=advanceCreatureSecondary(s,1/60,{yaw:Math.PI,walking:true,speed:1});
 assert.ok(Math.abs(teleported.roll)<.065,'teleport may never fling the body');
 for(let i=0;i<60;i++)advanceCreatureSecondary(s,1/60,{yaw:Math.PI});
 const settled=advanceCreatureSecondary(s,1/60,{yaw:Math.PI});
 assert.ok(Math.abs(settled.roll)<.012,'turn lean must decay after stopping');
});
test('wolf and humanoid acting stays finite and bounded under Safari background stutters',()=>{
 for(const kind of ['raider','longstrider']){
  const s={};
  for(const dt of [NaN,-1,0,1/120,1/15,999]){
   for(const yaw of [NaN,0,Math.PI,-Math.PI,999999]){
    const pose=advanceCreatureSecondary(s,dt,{kind,yaw,walking:true,speed:Infinity,
     attacking:true,attackRemaining:.5,hitWeight:Infinity});
    assert.ok(Object.values(pose).every(Number.isFinite));
    assert.ok(Math.abs(pose.pitch)<=.09);
    assert.ok(Math.abs(pose.roll)<=.085);
    assert.ok(Math.abs(pose.raise)<=.025);
    assert.ok(Math.abs(pose.forward)<=.04);
   }
  }
 }
});
test('secondary pose fades independently of GLB walking/striking/mixer state',()=>{
 const s={},gait={},impact={seen:0,wasHit:false};
 let near={};
 for(let i=0;i<15;i++){
  const locomotion=advanceCreatureGait(gait,.016,2.05*.016);
  const strike=advanceMobImpact(impact,.016,{hitRemaining:i<7?.20:0,sequence:i<7?1:1});
  near=advanceCreatureSecondary(s,.016,{kind:'raider',yaw:i*.008,
   walking:locomotion.walking,speed:gait.rate,attacking:i<10,hitWeight:strike.weight});
 }
 for(let i=0;i<80;i++)near=advanceCreatureSecondary(s,.016,{kind:'raider',yaw:.112});
 assert.ok(Math.abs(near.forward)<.006,'hit response and attack lean settle');
 assert.ok(Math.abs(near.roll)<.012);
 assert.ok(Object.values(near).every(Number.isFinite));
});
test('dolgonog GLB transitions prioritize a short, readable Peck then a soft recovery',()=>{
 const events=[];
 const actions=Object.fromEntries(['Idle','Walk','Peck'].map(name=>
  [name,{name,reset(){return this},setLoop(){return this},setEffectiveTimeScale(){return this},
   setEffectiveWeight(){return this},play(){return this},
   fadeIn(t){events.push(['fade',name,t]);return this},
   crossFadeFrom(old,t){events.push(['crossfade',name,old.name,t]);return this}}]));
 const model={actions,mode:null,mixer:{update(){},stopAllAction(){}},
  container:{rotation:{x:0,z:0},position:{z:0}},
  attackRemaining:0,walkGrace:0,lastAttackCd:0,impactPivot:{},secondary:{},spherical:true};
 const THREE_STUB={LoopOnce:1,LoopRepeat:2};
 transitionPlainstriderAnimation(THREE_STUB,model,'Idle');
 transitionPlainstriderAnimation(THREE_STUB,model,'Walk');
 transitionPlainstriderAnimation(THREE_STUB,model,'Peck');
 const attackFade=events.find(x=>x[0]==='crossfade'&&x[1]==='Peck');
 assert.ok(attackFade?.[3]<=.1,'the beak strike must not fade in over most of the clip');
 transitionPlainstriderAnimation(THREE_STUB,model,'Idle');
 assert.ok(events.some(x=>x[0]==='crossfade'&&x[1]==='Idle'&&x[2]==='Peck'));
 const enemy={birdVisual:model,attackCd:0,hit:.2};
 advancePlainstriderVisual(THREE_STUB,enemy,.016,0);
 assert.equal(model.container.position.z,0,'new impact pivot owns recoil; no duplicate offset');
});

test('consecutive raider damage does not snap GLB hurt clip back to first frame',()=>{
 const make=(time,duration=.7)=>({time,getClip:()=>({duration})});
 assert.equal(shouldReplayCreatureHurt(make(.18),true),false,
  'keep authored pose during first half of hurt');
 assert.equal(shouldReplayCreatureHurt(make(.64),true),true,
  'allow the next hit to replay a nearly completed flinch');
 assert.equal(shouldReplayCreatureHurt(make(.64),false),false);
 assert.equal(shouldReplayCreatureHurt(null,true),false);
 assert.equal(shouldReplayCreatureHurt(make(0,0),true),true);
});

test('mob torso anticipates acceleration then settles without touching physics',()=>{
 for(const kind of ['raider','longstrider']){
  const state={};let settled;
  for(let i=0;i<20;i++)advanceCreatureSecondary(state,1/60,{kind,walking:true,speed:1});
  assert.ok(Math.abs(state.inertia)<1.5,'start impulse decays without abrupt snaps');
  for(let i=0;i<70;i++)settled=advanceCreatureSecondary(state,1/60,{kind,walking:false,speed:0});
  assert.ok(Math.abs(state.inertia)<.02,'settle impulse decays');
  assert.ok(Object.values(settled).every(Number.isFinite));
  assert.ok(Math.abs(settled.pitch)<.045);
  resetCreatureSecondary(state);
  assert.equal(state.inertia,0);
 }
});
test('restarting a Walk clip resumes phase after a strike',()=>{
 const make=()=>({time:.83,reset(){this.time=0;return this},getClip(){return {duration:1.2}}});
 const walk=make();
 resetWalkingClip(walk);
 assert.ok(Math.abs(walk.time-.83)<1e-9);
 walk.time=2.73;
 resetWalkingClip(walk);
 assert.ok(Math.abs(walk.time-.33)<1e-9,'resume time wraps within clip');
 const first=make();first.time=0;resetWalkingClip(first);
 assert.equal(first.time,0,'new walk begins from first frame');
});
