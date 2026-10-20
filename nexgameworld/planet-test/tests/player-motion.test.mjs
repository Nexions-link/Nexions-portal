import test from 'node:test';
import assert from 'node:assert/strict';
import {advancePlayerMotion,resetPlayerMotion} from '../player-motion.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {harness} from './harness.mjs';

test('player seamlessly enters and exits a standing combat guard',()=>{
 const {hero}=harness(),root=hero.root;
 const position=root.position.clone(),facing=root.quaternion.clone();
 let pose;
 for(let i=0;i<36;i++){
  pose=advancePlayerMotion(root.userData,1/60,{combat:true,walk:0});
 }
 assert.ok(pose.guard>.99,'combat stance settles without needing an attack');
 for(let i=0;i<60;i++)pose=advancePlayerMotion(root.userData,1/60,{combat:false});
 assert.ok(pose.guard<.004,'ready pose releases outside combat');
 assert.ok(root.position.distanceTo(position)<1e-12);
 assert.ok(root.quaternion.angleTo(facing)<1e-12);
 resetPlayerMotion(root.userData);
 assert.equal(root.userData.combatBlend,0);
});

test('player turning on the spot shifts hooves without moving the real actor',()=>{
 const {hero}=harness();
 const pos=hero.root.position.clone(),face=hero.root.quaternion.clone();
 for(let i=0;i<24;i++)animateSphericalTauren(hero,{
  dt:1/60,time:i/60,walk:0,turn:1,phase:0,weaponKind:'axe'
 });
 assert.ok(Math.abs(hero.body.rotation.z)>.018);
 assert.ok(Math.abs(hero.chest.rotation.y)>.035);
 assert.ok(Math.abs(hero.legs[0].foot.rotation.y)>.018);
 assert.ok(Math.abs(hero.legs[1].foot.rotation.y)>.018);
 assert.equal(hero.root.position.distanceTo(pos),0);
 assert.equal(hero.root.quaternion.angleTo(face),0);
 for(let i=0;i<75;i++)animateSphericalTauren(hero,{
  dt:1/60,time:1+i/60,turn:0,walk:0,phase:0
 });
 assert.ok(Math.abs(hero.legs[0].foot.rotation.y)<.001);
 assert.ok(Math.abs(hero.body.rotation.z)<.001);
});

test('guard fades with movement and never replaces the authored weapon grip',()=>{
 const {hero}=harness();
 const grip={x:-1.25,y:.2,z:.12};
 hero.root.userData.equipmentGrip={weapon:{...grip},shield:{x:1.8,y:0,z:0}};
 for(let i=0;i<40;i++)animateSphericalTauren(hero,{
  dt:1/60,time:i/60,combat:true,walk:0,weaponKind:'axe'
 });
 const idleShoulder=hero.arms[1].shoulder.rotation.x;
 const guard=hero.root.userData.combatBlend;
 assert.ok(guard>.98);
 assert.ok(idleShoulder<-.13,'weapon shoulder is visibly prepared');
 for(let i=0;i<40;i++)animateSphericalTauren(hero,{
  dt:1/60,time:1+i/60,combat:true,walk:1,phase:i*.17,weaponKind:'axe'
 });
 assert.ok(hero.root.userData.combatBlend>.98);
 assert.deepEqual(hero.root.userData.equipmentGrip.weapon,grip);
 assert.ok(Math.abs(hero.arms[1].hand.rotation.x-grip.x)<1e-9);
});

test('stutters, invalid inputs and rapid direction changes stay bounded',()=>{
 const state={};let last;
 for(const dt of [NaN,Infinity,-1,0,.005,.017,.06,999]){
  for(const turn of [NaN,Infinity,-Infinity,-1,0,1,999]){
   last=advancePlayerMotion(state,dt,{walk:NaN,turn,combat:true,blockRemaining:Infinity});
   assert.ok(Object.values(last).every(Number.isFinite));
   assert.ok(last.walk>=0&&last.walk<=1);
   assert.ok(Math.abs(last.turn)<=1);
   assert.ok(last.turnFeet>=0&&last.turnFeet<=1);
   assert.ok(last.guard>=0&&last.guard<=1);
  }
 }
 for(let i=0;i<120;i++){
  last=advancePlayerMotion(state,1/60,{walk:i%2,turn:i%2?1:-1,combat:false});
  assert.ok(Object.values(last).every(Number.isFinite));
 }
 for(let i=0;i<90;i++)last=advancePlayerMotion(state,1/60,{walk:0,turn:0});
 assert.ok(Math.abs(last.inertia)<.002);
 assert.ok(Math.abs(last.turn)<.002);
});
