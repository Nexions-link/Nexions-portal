import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LONGHOUSE} from '../hearth-house.js';
import {ratCanStand,ratRouteOpen,createRatPatrol,unpackHouseRatMesh} from '../house-rat.js';

test('house rat uses colour-baked geometry from uploaded rat model',async()=>{
 const {positions,colors,indices}=await unpackHouseRatMesh();
 assert.ok(positions.length/3>=200);
 assert.ok(indices.length/3>=400);
 assert.equal(positions.length,colors.length);
 assert.equal(indices.length%3,0);
 assert.ok([...positions,...colors].every(Number.isFinite));
 assert.ok(positions.some((value,i)=>i%3===2&&value<-.3),'tail geometry is present');
 assert.ok(positions.some((value,i)=>i%3===2&&value>.3),'head geometry is present');
 assert.ok(Math.max(...colors)<=1&&Math.min(...colors)>=0);
 assert.ok(Math.max(...indices)<positions.length/3);
});
test('rat patrol respects walls and gives chest free space',()=>{
 assert.equal(ratCanStand(0,0),true);
 assert.equal(ratCanStand(LONGHOUSE.chestLocalX,LONGHOUSE.chestLocalZ),false);
 assert.equal(ratCanStand(0,-7.4),false,'rat must avoid new chest buffer');
 assert.equal(ratCanStand(5.4,-6.2),true,'old chest corner is unobstructed');
 assert.equal(ratCanStand(LONGHOUSE.width/2,0),false);
 assert.equal(ratRouteOpen(-4,-8.6,4,-8.6),false);
 assert.equal(ratRouteOpen(-4,0,2,0),true);
});
test('rat never runs into walls, exits the building or cuts across the chest',()=>{
 const patrol=createRatPatrol(1234);
 let moved=0,stopped=0,last=patrol.position;
 for(let i=0;i<18000;i++){
  const now=patrol.update(1/60);
  assert.ok(ratCanStand(now.x,now.z),'rat entered blocked space at frame '+i);
  assert.ok(ratRouteOpen(last.x,last.z,now.x,now.z),'rat teleported through chest at frame '+i);
  moved+=Math.hypot(now.x-last.x,now.z-last.z);
  if(!now.running)stopped++;
  last={x:now.x,z:now.z};
 }
 assert.ok(moved>60,'rat must explore the house instead of staying still');
 assert.ok(stopped>30,'rat should stop and sniff between runs');
});
