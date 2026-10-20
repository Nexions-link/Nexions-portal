import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponActionDetail} from '../weapon-action-detail.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {harness} from './harness.mjs';

const input=(weaponKind,attack,rest={})=>
 weaponActionDetail({weaponKind,attack,...rest});
test('distinct axe / sword / dagger follow-throughs keep server hit time unchanged',()=>{
 const axe=input('axe',.425),sword=input('sword',.425),dagger=input('dagger',.425);
 for(const result of [axe,sword,dagger]){
  assert.ok(result.drive>.99,'cosmetic impact peaks at existing .425 progress');
  assert.ok(result.prepare>=0&&result.prepare<=1);
 }
 assert.ok(axe.mainShoulderX>sword.mainShoulderX,'axe has heavier drive');
 assert.ok(sword.mainShoulderY>axe.mainShoulderY+.03,'sword slashes laterally');
 assert.ok(dagger.mainShoulderX<0,'dagger thrusts forward');
 assert.ok(dagger.rightFootZ>sword.rightFootZ,'dagger lunges further');
 assert.equal(input('axe',-1).drive,0);
 assert.equal(input('sword',1).drive,0);
});
test('combat footwork follows phases, fades out, and never invents movement',()=>{
 const neutral=input('axe',-1);
 assert.equal(neutral.leftFootLift,0);
 assert.equal(neutral.rightFootLift,0);
 const wind=input('axe',.25,{guard:.9});
 const contact=input('axe',.425,{guard:.9});
 assert.ok(wind.leftFootZ>neutral.leftFootZ);
 assert.ok(contact.rightFootLift>wind.rightFootLift);
 const running=input('axe',.425,{walk:1});
 assert.ok(Math.abs(running.rightFootZ)<Math.abs(contact.rightFootZ));
 assert.equal(input('axe',1).rightFootLift,0);
});
test('holding a shield suppresses offhand counter-swing without stopping axe animation',()=>{
 const free=input('axe',.30);
 const blocked=input('axe',.30,{blocking:true});
 assert.ok(Math.abs(blocked.offShoulderX)<Math.abs(free.offShoulderX)*.3);
 assert.equal(blocked.mainShoulderX,free.mainShoulderX);
});
test('real Tauren arm, feet and chest key poses differ across weapons',()=>{
 const {hero}=harness(),root=hero.root;
 root.userData.equipmentGrip={weapon:{x:-1.25,y:.2,z:.12},shield:{x:1.8,y:0,z:0}};
 const pos=root.position.clone(),orientation=root.quaternion.clone();
 const poses={};
 for(const weaponKind of ['axe','sword','dagger']){
  for(let i=0;i<7;i++)animateSphericalTauren(hero,{
   dt:1/60,time:i/60,walk:0,phase:0,attack:.425,weaponKind
  });
  poses[weaponKind]={
   yaw:hero.arms[1].shoulder.rotation.y,
   shoulderZ:hero.arms[1].shoulder.rotation.z,
   footZ:hero.legs[1].foot.rotation.x,
   elbow:hero.arms[1].elbow.rotation.x
  };
  assert.ok(Math.abs(hero.arms[1].hand.rotation.x-(-1.25))<.8);
  assert.deepEqual(root.userData.equipmentGrip.weapon,{x:-1.25,y:.2,z:.12});
  assert.deepEqual(root.userData.equipmentGrip.shield,{x:1.8,y:0,z:0});
  assert.equal(pos.distanceTo(root.position),0);
  assert.equal(orientation.angleTo(root.quaternion),0);
 }
 assert.ok(poses.sword.yaw>poses.axe.yaw+.03);
 assert.ok(poses.sword.shoulderZ<poses.dagger.shoulderZ-.1);
 assert.notEqual(poses.axe.elbow,poses.dagger.elbow);
 for(let i=0;i<90;i++)animateSphericalTauren(hero,{
  dt:1/60,time:2+i/60,attack:-1,walk:0,phase:0,weaponKind:'none'
 });
 assert.ok(Math.abs(hero.arms[1].shoulder.rotation.y)<.001);
});
test('mobile frame spikes and malformed progress never make the detail layer unsafe',()=>{
 for(const kind of ['axe','sword','dagger','none','garbage']){
  for(const attack of [NaN,Infinity,-Infinity,-10,-1,0,.1,.425,.7,1,10]){
   for(const walk of [NaN,Infinity,-7,0,.5,1,80]){
    const pose=input(kind,attack,{walk,guard:Infinity,blocking:true});
    assert.ok(Object.values(pose).every(Number.isFinite));
    assert.ok(Math.abs(pose.shiftX)<=.05);
    assert.ok(Math.abs(pose.rightFootZ)<=.16);
    assert.ok(Math.abs(pose.mainShoulderY)<=.3);
   }
  }
 }
 const {hero}=harness();
 for(const dt of [NaN,-1,0,.016,.1,Infinity]){
  animateSphericalTauren(hero,{dt,time:1,walk:1,phase:Math.PI/3,attack:.425,
   weaponKind:'dagger',terrainFeet:[{height:.22,pitch:-.18,roll:.17},
    {height:-.21,pitch:.16,roll:-.19}]});
  for(const leg of hero.legs)assert.ok([
   leg.hip.rotation.x,leg.knee.rotation.x,leg.foot.rotation.x,
   leg.foot.rotation.y,leg.foot.rotation.z].every(Number.isFinite));
 }
});
