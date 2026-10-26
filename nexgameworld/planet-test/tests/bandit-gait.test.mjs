import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBanditGaitState,advanceBanditGait} from '../bandit-gait.js';
import {createBanditVisual} from '../bandit-visual.js';

test('raider moves only when actual distance is rendered; knees clear the floor',()=>{
 const state=createBanditGaitState();let maxKnee=0,pose;
 for(let i=0;i<105;i++){
  pose=advanceBanditGait(state,i/60,.028);
  maxKnee=Math.max(maxKnee,...pose.legs.map(leg=>leg.knee));
 }
 assert.ok(pose.weight>.85);
 assert.ok(maxKnee>.35,'shin lifts during recovery');
 assert.ok(pose.legs.every(leg=>Number.isFinite(leg.foot)));
 const phase=pose.phase;
 for(let i=105;i<230;i++)pose=advanceBanditGait(state,i/60,0);
 assert.equal(pose.phase,phase,'no running in place at blocked movement');
 assert.ok(pose.weight<.001,'smooth idle settle');
 assert.ok(pose.legs.every(leg=>Math.abs(leg.hip)<.001));
});
test('turn banking and attack stance are bounded, without moving world transforms',()=>{
 const original=new THREE.Vector3(4,3,2);
 const mob=createBanditVisual(THREE);
 mob.root.position.copy(original);
 assert.equal(mob.legs.length,2);
 assert.ok(mob.legs.every(leg=>leg.foot.parent===leg.knee&&leg.knee.parent===leg.hip));
 let peak=0;
 for(let i=0;i<120;i++){
  const pose=mob.animate(i/60,.032,i>60&&i<82?1:0,.7);
  peak=Math.max(peak,Math.abs(pose.torsoRoll));
  assert.ok(Number.isFinite(mob.legs[0].hip.rotation.x));
 }
 assert.ok(peak>.005,'turn visibly shifts weight');
 assert.deepEqual(mob.root.position.toArray(),original.toArray());
});
test('invalid source values cannot create exploding poses',()=>{
 const state=createBanditGaitState();
 for(const d of [NaN,Infinity,-12,1e9,0]){
  const pose=advanceBanditGait(state,10,d,{turn:Infinity,attacking:true});
  assert.ok(pose.legs.flatMap(x=>Object.values(x)).every(Number.isFinite));
  assert.ok(Number.isFinite(pose.torsoRoll));
 }
});
