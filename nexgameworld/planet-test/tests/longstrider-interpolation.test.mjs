import test from 'node:test';
import assert from 'node:assert/strict';
import {queueLongstriderSnapshot,sampleLongstriderSnapshot,resetLongstriderSnapshot} from '../longstrider-interpolation.js';

test('5Hz snapshots produce consistent visual speed instead of accelerating/braking',()=>{
 const mob={x:0,z:0,yaw:0,renderX:0,renderZ:0,renderYaw:0};
 assert.equal(queueLongstriderSnapshot(mob,{x:.4,z:0,yaw:0},10),true);
 const steps=[];
 for(let i=0;i<12;i++){
  const old=mob.renderX;
  sampleLongstriderSnapshot(mob,1/60);
  steps.push(mob.renderX-old);
 }
 assert.ok(Math.max(...steps)-Math.min(...steps)<1e-7,'linear between 5Hz packets');
 assert.ok(Math.abs(mob.renderX-.4)<1e-7);
 mob.x=.4;
 queueLongstriderSnapshot(mob,{x:.8,z:0,yaw:0},10.2);
 sampleLongstriderSnapshot(mob,1/60);
 assert.ok(mob.renderX>.4&&mob.renderX<.8);
});
test('snapshot movement and heading wrap at PI without changing authoritative coordinates',()=>{
 const mob={x:12,z:-5,yaw:3.1,renderX:12,renderZ:-5,renderYaw:3.1};
 queueLongstriderSnapshot(mob,{x:12.3,z:-4.9,yaw:-3.1},10);
 sampleLongstriderSnapshot(mob,.1);
 assert.ok(Math.abs(mob.renderYaw-3.14)<.06);
 assert.deepEqual([mob.x,mob.z,mob.yaw],[12,-5,3.1]);
});
test('teleport/respawn snaps without hundreds of invented metres of footfalls',()=>{
 const mob={x:0,z:0,yaw:0,renderX:0,renderZ:0,renderYaw:0};
 queueLongstriderSnapshot(mob,{x:150,z:80,yaw:1},0);
 assert.deepEqual([mob.renderX,mob.renderZ,mob.renderYaw],[150,80,1]);
 assert.equal(sampleLongstriderSnapshot(mob,.016),false);
 resetLongstriderSnapshot(mob);
 assert.equal(mob.longstriderSegment,null);
});
test('repeated stale packets and malformed coordinates never cause NaN or runaway animation',()=>{
 const mob={x:1,z:2,yaw:0,renderX:1,renderZ:2,renderYaw:0};
 assert.equal(queueLongstriderSnapshot(mob,{x:Infinity,z:2,yaw:0},1),false);
 assert.equal(queueLongstriderSnapshot(mob,{x:1,z:2,yaw:0},1),true);
 for(const dt of [NaN,-1,Infinity,2,.016]){
  sampleLongstriderSnapshot(mob,dt);
  assert.ok([mob.renderX,mob.renderZ,mob.renderYaw].every(Number.isFinite));
 }
});
