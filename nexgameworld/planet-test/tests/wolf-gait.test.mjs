import test from 'node:test';
import assert from 'node:assert/strict';
import {createWolfGaitState,advanceWolfGait} from '../wolf-gait.js';

function simulate(step,{mounted=false,frames=110}={}){
 const gait=createWolfGaitState(1);
 let pose;
 for(let i=0;i<frames;i++)pose=advanceWolfGait(gait,i/60,step,{mounted});
 return {pose,gait};
}
test('idle keeps paws stable and authority-root motion absent',()=>{
 const {pose,gait}=simulate(0);
 assert.equal(pose.moving,0);
 assert.equal(pose.phase,gait.phase);
 assert.equal(pose.bounce,0);
 assert.ok(pose.legs.every(leg=>leg.hip===0&&leg.hock===0&&leg.ankle===0));
});
test('walk, trot and mounted gallop are distinct smooth speed-dependent poses',()=>{
 const walk=simulate(.035,{mounted:true}).pose;
 const trot=simulate(.072,{mounted:true}).pose;
 const gallop=simulate(.13,{mounted:true}).pose;
 assert.ok(walk.trot<.05&&walk.gallop===0);
 assert.ok(trot.trot>.95&&trot.gallop<.1);
 assert.ok(gallop.gallop>.95);
 const cycle=createWolfGaitState(1);
 let lifted=false;
 for(let i=0;i<145;i++){
  const frame=advanceWolfGait(cycle,i/60,.13,{mounted:true});
  if(frame.gallop>.95&&frame.legs.some(leg=>leg.hock>.25))lifted=true;
 }
 assert.ok(lifted,'at least one paw must clear the ground during a full gallop cycle');
 assert.ok(gallop.legs.every(leg=>Number.isFinite(leg.hip)&&Number.isFinite(leg.ankle)));
 assert.ok(Math.abs(gallop.bounce)<.1);
 assert.ok(Math.abs(gallop.pitch)<.09);
});
test('phase never advances through a wall, while velocity and paws settle',()=>{
 const gait=createWolfGaitState();
 let pose;
 for(let i=0;i<72;i++)pose=advanceWolfGait(gait,i/60,.075);
 const stoppedPhase=pose.phase;
 for(let i=72;i<175;i++)pose=advanceWolfGait(gait,i/60,0);
 assert.equal(pose.phase,stoppedPhase);
 assert.ok(pose.moving<.01);
 assert.ok(pose.legs.every(leg=>Math.abs(leg.hip)<.03));
});
test('gait is deterministic, bounded and ignores malformed travel input',()=>{
 const a=createWolfGaitState(1),b=createWolfGaitState(1);
 for(let i=0;i<100;i++){
  const left=advanceWolfGait(a,i/60,.075,{mounted:i>40});
  const right=advanceWolfGait(b,i/60,.075,{mounted:i>40});
  assert.deepEqual(left,right);
 }
 const pose=advanceWolfGait(a,2,NaN,{mounted:true});
 assert.ok(Number.isFinite(pose.phase));
 assert.ok(Number.isFinite(pose.bounce));
 const next=advanceWolfGait(a,2.02,-10,{mounted:true});
 assert.equal(next.phase,pose.phase);
});
test('walk cadence differs across animals without adding meshes at rest',()=>{
 const a=simulate(.04,{frames:70}).pose;
 const b=createWolfGaitState(9);
 let pose;
 for(let i=0;i<70;i++)pose=advanceWolfGait(b,i/60,.04);
 assert.notEqual(a.phase,pose.phase);
 assert.equal(a.legs.length,4);
});
