import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {longstriderWalkPhase,advanceLongstriderHead,createLongstriderHeadRig,clearLongstriderHeadPose,applyLongstriderHeadPose,resetLongstriderHeadRig} from '../longstrider-motion.js';
import {advanceCreatureSecondary,applyCreatureSecondary} from '../creature-secondary.js';

test('head and neck counterbalance follow native GLB leg clip phase',()=>{
 const action={time:.375,getClip:()=>({duration:1.5})};
 assert.ok(Math.abs(longstriderWalkPhase(action)-Math.PI/2)<1e-8);
 assert.equal(longstriderWalkPhase(null,1.4),1.4);
 const state={};let maxHead=0;
 for(let i=0;i<120;i++){
  const p=advanceLongstriderHead(state,1/60,{phase:i/120*4*Math.PI,stepWeight:1,motion:1});
  maxHead=Math.max(maxHead,Math.abs(p.headX));
 }
 assert.ok(maxHead>.04,'head compensation should be noticeable while walking');
 for(let i=0;i<90;i++)advanceLongstriderHead(state,1/60,{stepWeight:0,motion:0});
 assert.ok(state.walk<.001,'head motion fades after stopping');
});
test('240 GLB frames do not accumulate any rotation or move the world root',()=>{
 const root=new THREE.Group(),neck=new THREE.Group(),head=new THREE.Group();
 neck.name='Neck';head.name='Head';root.add(neck);neck.add(head);
 const rig=createLongstriderHeadRig(root);
 root.position.set(1,2,3);
 const pose={neckX:.05,neckY:.01,headX:-.07,headY:-.03,headZ:.018};
 for(let i=0;i<240;i++){
  clearLongstriderHeadPose(rig);
  applyLongstriderHeadPose(rig,pose);
 }
 assert.ok(Math.abs(head.rotation.x-pose.headX)<1e-6);
 assert.ok(Math.abs(neck.rotation.x-pose.neckX)<1e-6);
 resetLongstriderHeadRig(rig);
 assert.ok(Math.abs(head.rotation.x)<1e-6);
 assert.ok(Math.abs(neck.rotation.y)<1e-6);
 assert.deepEqual(root.position.toArray(),[1,2,3]);
});
test('weight shifts from foot to foot while hitbox root stays unchanged',()=>{
 const root=new THREE.Group(),pivot=new THREE.Group();root.add(pivot);
 const state={};
 for(let i=0;i<80;i++)advanceCreatureSecondary(state,1/60,{
  kind:'longstrider',yaw:0,walking:true,speed:1,stepWeight:1,stridePhase:Math.PI/2
 });
 const left=advanceCreatureSecondary(state,1/60,{
  kind:'longstrider',yaw:0,walking:true,speed:1,stepWeight:1,stridePhase:Math.PI/2
 });
 const right=advanceCreatureSecondary(state,1/60,{
  kind:'longstrider',yaw:0,walking:true,speed:1,stepWeight:1,stridePhase:Math.PI*1.5
 });
 assert.ok(left.lateral>.025&&right.lateral<-.025);
 applyCreatureSecondary(pivot,right);
 assert.ok(pivot.position.x<0);
 assert.equal(root.position.length(),0);
 assert.equal(root.quaternion.angleTo(new THREE.Quaternion()),0);
});
test('peck dampens head wobble; malformed dt never generates NaN',()=>{
 const state={};for(let i=0;i<60;i++)
  advanceLongstriderHead(state,1/60,{phase:1,stepWeight:1,motion:1});
 let pose;for(let i=0;i<50;i++)
  pose=advanceLongstriderHead(state,1/60,{phase:1,stepWeight:1,motion:1,attacking:true});
 assert.ok(Math.abs(pose.headX)<.03);
 for(const dt of [NaN,Infinity,-5,100]){
  const bad=advanceLongstriderHead(state,dt,{
   phase:Infinity,turn:NaN,motion:Infinity,stepWeight:Infinity});
  assert.ok(Object.values(bad).every(Number.isFinite));
 }
});
