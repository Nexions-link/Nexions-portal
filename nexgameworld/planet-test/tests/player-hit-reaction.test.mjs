import test from 'node:test';
import assert from 'node:assert/strict';
import {beginPlayerHitReaction,advancePlayerHitReaction,resetPlayerHitReaction} from '../player-hit-reaction.js';
import {advanceCreatureSecondary,applyCreatureSecondary} from '../creature-secondary.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {harness} from './harness.mjs';

test('server-confirmed hit animates, retriggers and fully settles',()=>{
 const u={};assert.equal(beginPlayerHitReaction(u,{damage:18}),true);
 const samples=[];
 for(let i=0;i<5;i++)samples.push(advancePlayerHitReaction(u,1/60));
 assert.ok(samples.some(p=>p.pitch<-.045&&p.headPitch>.045));
 const side=u.incomingCombatHit.side;
 beginPlayerHitReaction(u,{damage:12});
 assert.equal(u.incomingCombatHit.age,0);
 assert.equal(u.incomingCombatHit.side,-side);
 for(let i=0;i<55;i++)advancePlayerHitReaction(u,1/60);
 assert.equal(u.incomingCombatHit,null);
 assert.equal(advancePlayerHitReaction(u,.016).active,false);
});
test('shield block braces shield arm with less torso stagger than a direct hit',()=>{
 const a={},b={};
 beginPlayerHitReaction(a,{damage:18});
 beginPlayerHitReaction(b,{damage:3,blocked:true,absorbed:16});
 for(let i=0;i<5;i++){advancePlayerHitReaction(a,1/60);advancePlayerHitReaction(b,1/60);}
 const direct=advancePlayerHitReaction(a,0),block=advancePlayerHitReaction(b,0);
 assert.ok(Math.abs(direct.pitch)>Math.abs(block.pitch));
 assert.ok(block.shieldBrace>direct.shieldBrace+.05);
 assert.ok(direct.weaponBrace>block.weaponBrace);
});
test('malformed hits and frame spikes cannot create bad poses',()=>{
 const u={};
 for(const damage of [NaN,Infinity,-1])assert.equal(beginPlayerHitReaction(u,{damage}),false);
 assert.equal(beginPlayerHitReaction(u,{damage:0}),false);
 beginPlayerHitReaction(u,{damage:20});
 for(const dt of [NaN,Infinity,-5,9,.016]){
  const pose=advancePlayerHitReaction(u,dt);
  for(const v of Object.values(pose))if(typeof v==='number')
   assert.ok(Number.isFinite(v)&&Math.abs(v)<.4);
 }
 resetPlayerHitReaction(u);assert.equal(u.incomingCombatHit,null);
});
test('live hit changes Tauren bones, never root transform or saved grip',()=>{
 const {hero,rpg}=harness(),root=hero.root,position=root.position.clone(),quaternion=root.quaternion.clone();
 root.userData.equipmentGrip={weapon:{x:-1.2,y:.1,z:.25},shield:{x:1.8,y:0,z:0}};
 animateSphericalTauren(hero,{dt:1/60,time:0,attack:-1,weaponKind:'axe'});
 const base=hero.body.rotation.x;
 rpg.setMultiplayer({connected:true});
 rpg.onMobAttack({mobId:'dolgonog-0',hp:60,damage:18,blocked:false,absorbed:0});
 for(let i=0;i<5;i++)animateSphericalTauren(hero,{dt:1/60,time:0,attack:-1,weaponKind:'axe'});
 assert.ok(hero.body.rotation.x<base-.045);
 assert.equal(root.position.distanceTo(position),0);
 assert.equal(root.quaternion.angleTo(quaternion),0);
 assert.deepEqual(root.userData.equipmentGrip.weapon,{x:-1.2,y:.1,z:.25});
 for(let i=0;i<60;i++)animateSphericalTauren(hero,{dt:1/60,time:0,attack:-1,weaponKind:'axe'});
 assert.ok(Math.abs(hero.body.rotation.x-base)<.002);
 rpg.onNetworkRespawn({hp:100});assert.equal(root.userData.incomingCombatHit,null);
});
test('raider and longstrider flinch sideways without changing root',()=>{
 const {hero}=harness(),position=hero.root.position.clone();
 for(const kind of ['raider','longstrider']){
  const s={},left=advanceCreatureSecondary(s,.016,{kind,hitWeight:1,hitSide:-1});
  applyCreatureSecondary(hero.chest,left);
  const right=advanceCreatureSecondary(s,.016,{kind,hitWeight:1,hitSide:1});
  assert.ok(right.roll-left.roll>.022);
  assert.equal(hero.root.position.distanceTo(position),0);
  assert.ok(Object.values(right).every(Number.isFinite));
 }
});
