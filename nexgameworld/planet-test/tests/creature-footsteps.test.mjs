import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {advanceCreatureGait} from '../creature-gait.js?v=2';
import {advanceCreatureSecondary,applyCreatureSecondary,resetCreatureSecondary} from '../creature-secondary.js?v=4';
import {advancePlainstriderVisual} from '../../plainstrider-model.js';

test('real travel advances alternating footfall, stopping holds phase and fades weight',()=>{
 const gait={};const values=[];
 for(let i=0;i<45;i++){
  const result=advanceCreatureGait(gait,1/60,1.7/60,{strideLength:1.7});
  values.push(result);
 }
 assert.ok(values.at(-1).stepWeight>.9);
 assert.ok(values.at(-1).stridePhase>0);
 assert.ok(values.some(p=>p.stridePhase>Math.PI));
 const stopped=gait.stridePhase;
 let last;
 for(let i=0;i<70;i++)last=advanceCreatureGait(gait,1/60,0,{strideLength:1.7});
 assert.equal(gait.stridePhase,stopped,'standing feet do not cycle');
 assert.ok(last.stepWeight<.003,'gait gracefully settles to stillness');
 assert.equal(last.walking,false);
});
test('large network correction does not run feet through many fake steps',()=>{
 const gait={};
 for(let i=0;i<18;i++)advanceCreatureGait(gait,1/60,2.05/60);
 const before=gait.stridePhase;
 const result=advanceCreatureGait(gait,.12,35);
 assert.equal(result.stridePhase,before);
 assert.ok(result.clipRate<=1.35);
 assert.ok(result.stepWeight>=0&&result.stepWeight<=1);
});
test('wildlife and raiders each have bounded footfall-synchronous weight shift',()=>{
 for(const kind of ['raider','longstrider']){
  const gltf=new THREE.Group(),pivot=new THREE.Group();gltf.add(pivot);
  const oldPosition=gltf.position.clone(),oldRotation=gltf.quaternion.clone();
  const walk={},secondary={};const rolls=[],raises=[];
  for(let i=0;i<70;i++){
   const gait=advanceCreatureGait(walk,1/60,1.9/60,{
    strideLength:kind==='raider'?1.48:1.72
   });
   const stance=advanceCreatureSecondary(secondary,1/60,{
    kind,yaw:.03,walking:gait.walking,speed:walk.rate,
    stridePhase:gait.stridePhase,stepWeight:gait.stepWeight
   });
   applyCreatureSecondary(pivot,stance);
   rolls.push(stance.roll);raises.push(stance.raise);
  }
  assert.ok(Math.max(...rolls)-Math.min(...rolls)>.009,'alternating step weight is visible');
  assert.ok(Math.max(...raises)-Math.min(...raises)>.007,'body weight transfers gently');
  assert.ok(raises.every(x=>x>=-.025&&x<=.035));
  assert.equal(gltf.position.distanceTo(oldPosition),0,'visual only: no world displacement');
  assert.equal(gltf.quaternion.angleTo(oldRotation),0);
  resetCreatureSecondary(secondary,pivot);
  assert.deepEqual(pivot.position.toArray(),[0,0,0]);
 }
});
test('Safaris frame drops and malformed timestamps keep movement pose finite',()=>{
 const walk={},secondary={};
 for(const dt of [NaN,-1,0,.008,1/60,.12,Infinity,999]){
  for(const metres of [NaN,-1,0,.07,2,Infinity,1e9]){
   const gait=advanceCreatureGait(walk,dt,metres);
   const pose=advanceCreatureSecondary(secondary,dt,{
    kind:'longstrider',walking:gait.walking,speed:walk.rate,
    stridePhase:gait.stridePhase,stepWeight:gait.stepWeight
   });
   assert.ok(Object.values(pose).every(Number.isFinite));
   assert.ok(Math.abs(pose.roll)<=.065&&Math.abs(pose.raise)<=.03);
  }
 }
});
test('spherical longstrider cooldown reset never invents a Peck attack',()=>{
 const makeAction=name=>({name,time:0,reset(){this.time=0;return this},
  getClip(){return {duration:.8}},setEffectiveTimeScale(){return this},
  setEffectiveWeight(){return this},setLoop(){return this},
  fadeIn(){return this},crossFadeFrom(){return this},play(){return this}});
 const actions=Object.fromEntries(['Idle','Walk','Peck'].map(name=>[name,makeAction(name)]));
 const visual={spherical:true,container:new THREE.Group(),actions,
  mixer:{update(){}},mode:null,lastAttackCd:0,walkGrace:0,attackRemaining:0};
 const enemy={birdVisual:visual,attackCd:1.5,hit:0};
 const THREE_STUB={LoopOnce:1,LoopRepeat:2};
 advancePlainstriderVisual(THREE_STUB,enemy,1/60);
 assert.equal(visual.mode,'Idle','resetting combat cooldown cannot look like a successful strike');
 assert.equal(visual.attackRemaining,0);
 // A real authoritative warning schedules the full authored beak motion.
 visual.attackRemaining=.8;
 advancePlainstriderVisual(THREE_STUB,enemy,1/60);
 assert.equal(visual.mode,'Peck');
 for(let i=0;i<75;i++)advancePlainstriderVisual(THREE_STUB,enemy,1/60);
 assert.equal(visual.mode,'Idle');
});
test('only legitimate telegraphs start spherical Peck, in both local and online paths',()=>{
 const source=readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 assert.match(source,/visualStrikeCue=\(mob\.visualStrikeCue\|\|0\)\+1/);
 assert.match(source,/if\(mob\.birdVisual\)mob\.birdVisual\.attackRemaining=Math\.max\(/);
 assert.match(source,/stridePhase:gait\.stridePhase,stepWeight:gait\.stepWeight/g);
});
