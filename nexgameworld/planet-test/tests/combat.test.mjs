import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ITEM_CATALOG} from '../../items.js';
import {createCombatTimeline,rageForHit,rollMeleeDamage} from '../combat-timeline.js';
import {incomingShieldHit,sphericalMeleeFacing} from '../sphere-combat.js';
import {harness} from './harness.mjs';

for(const [skill,impact,duration] of [['autoAttack',.34,.8],['heavyStrike',.34,.8],['thunderStomp',.36,.75]]){
 test(`${skill}: one impact at native timing, no interrupted or repeated hit`,()=>{
  const t=createCombatTimeline(),enemy={id:1};assert.ok(t.start(skill,enemy));
  assert.equal(t.start('heavyStrike',{}),false);
  assert.equal(t.update(impact-.001),null);
  assert.deepEqual(t.update(.002),{skill,target:enemy});
  assert.equal(t.update(.01),null);assert.equal(t.busy,true);
  t.update(duration);assert.equal(t.busy,false);assert.equal(t.update(1),null);
  t.start(skill,enemy);t.clear();assert.equal(t.update(1),null);
 });
}
test('integer damage uses current weapon stats; original rage awards',()=>{
 assert.equal(rollMeleeDamage({damageMin:2,damageMax:5},8,()=>.5),12);
 assert.deepEqual(['autoAttack','heavyStrike','thunderStomp'].map(rageForHit),[12,8,3]);
});
test('front-only melee and shield block at the pole, equator and antipode',()=>{
 for(const normal of [new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1)]){
  const root=new THREE.Group();root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(root.quaternion);
  for(const sign of [1,-1]){
   const enemy=normal.clone().addScaledVector(forward,sign*.01).normalize();
   assert.equal(sphericalMeleeFacing(THREE,normal,root,enemy),sign===1);
   const hit=incomingShieldHit({THREE,heroNormal:normal,heroRoot:root,enemyNormal:enemy,
    stats:{blockChance:1,blockValue:5,armor:0},raw:9,rng:()=>0});
   assert.equal(hit.blocked,sign===1);assert.equal(hit.damage,sign===1?4:9);
  }
 }
});
test('real RPG: stomp delays damage and rage, includes dummy, locks movement',()=>{
 const h=harness();h.selectDummy();const hp=h.get('targetHp').textContent,rage=h.rpg.state.resource;
 h.rpg.handleSlotKey('2');assert.equal(h.rpg.movementLocked,true);
 assert.equal(h.rpg.state.resource,rage);assert.equal(h.get('targetHp').textContent,hp);
 h.rpg.update(.35);assert.equal(h.rpg.state.resource,rage);
 h.rpg.update(.02);assert.equal(h.rpg.state.resource,rage+3);
 assert.equal(h.get('targetHp').textContent,'99993 / 99999');
 h.rpg.update(.4);assert.equal(h.rpg.movementLocked,false);
 assert.ok(h.writes.every(k=>k==='nexgame-planet-test-offline-rpg-v1'));
});
test('real RPG: auto gives dummy 12 rage; special cannot replace active swing',()=>{
 const h=harness();h.selectDummy();h.rpg.handleSlotKey('1');h.rpg.update(.01);
 const resource=h.rpg.state.resource;
 h.rpg.handleSlotKey('4');assert.equal(h.get('toast').textContent,'Дождитесь окончания удара');
 assert.equal(h.rpg.state.resource,resource);
 h.rpg.update(.33);assert.equal(h.rpg.state.resource,resource);
 h.rpg.update(.02);assert.equal(h.rpg.state.resource,resource+12);
 h.rpg.update(.46);h.rpg.handleSlotKey('4');assert.equal(h.rpg.state.resource,resource+12-20);
 h.rpg.update(.35);assert.equal(h.rpg.state.resource,resource+12-20+8);
});
test('real RPG: step out of native melee range before impact cancels damage and rage',()=>{
 const h=harness();h.selectDummy();h.rpg.handleSlotKey('1');h.rpg.update(.01);
 h.position(-7,11.4);h.rpg.update(.35);
 assert.ok(Math.abs(h.rpg.state.resource-49.95)<1e-9);assert.equal(h.get('targetHp').textContent,'99999 / 99999');
});
test('real RPG: heavy strike approaches without spending rage; casts on arrival',()=>{
 const h=harness({x:-7,z:5});h.selectDummy();h.rpg.handleSlotKey('4');
 assert.equal(h.rpg.state.resource,50);assert.equal(h.rpg.getApproachTarget()?.kind,'dummy');
 h.position(-7,12);h.rpg.update(.01);assert.ok(Math.abs(h.rpg.state.resource-29.95)<1e-9);
 assert.equal(h.rpg.getApproachTarget(),null);
 h.rpg.update(.35);assert.ok(Math.abs(h.rpg.state.resource-37.95)<1e-9);
 assert.equal(h.get('targetHp').textContent.startsWith('99999'),false);
});
test('real RPG: manual input cancels queued special, distant target refuses approach',()=>{
 const h=harness({x:-7,z:5});h.selectDummy();h.rpg.handleSlotKey('4');h.rpg.cancelAutoApproach();
 h.position(-7,12);h.rpg.update(.5);assert.equal(h.rpg.state.resource,47.5);
 h.position(-7,-8);h.rpg.handleSlotKey('4');
 assert.equal(h.rpg.getApproachTarget(),null);assert.equal(h.get('toast').textContent,'Цель слишком далеко');
});
test('real RPG: weapon exchange preserves swing and cooldown; armor is blocked mid-swing',()=>{
 const h=harness({save:{equipment:{weapon:{id:'wornAxe'}}}});h.selectDummy();
 const armorId=Object.keys(ITEM_CATALOG).find(id=>ITEM_CATALOG[id].slot==='chest');
 h.rpg.state.inventory.push({id:armorId,qty:1});
 h.rpg.handleSlotKey('1');h.rpg.update(.01);const rage=h.rpg.state.resource;h.equip(armorId);
 assert.equal(h.rpg.state.equipment.chest,undefined);
 h.equip('wornAxe');assert.ok(h.rpg.getAnimationState().attack>=0);
 h.rpg.update(.35);assert.equal(h.rpg.state.resource,rage+12);
 h.rpg.handleSlotKey('1');h.rpg.handleSlotKey('1');
 h.rpg.update(.5);assert.equal(h.rpg.state.resource,rage+12);
});
test('real RPG: clearing selection does not cancel an area stomp',()=>{
 const h=harness();h.selectDummy();h.rpg.handleSlotKey('2');h.get('targetClear').click();
 assert.equal(h.rpg.movementLocked,true);h.rpg.update(.37);assert.equal(h.rpg.state.resource,53);
});
test('real RPG: death clears combat before respawn and prevents stale damage',()=>{
 const h=harness({x:-9,z:-25,save:{hp:1,resource:0}});
 let respawns=0;h.rpg.onRespawn(()=>{respawns++;h.position(0,9)});
 // Wait for the first mob windup with no retaliatory attacks.
 for(let i=0;i<200&&respawns===0;i++)h.rpg.update(.02);
 assert.equal(respawns,1);assert.equal(h.rpg.state.resource,0);
 assert.equal(h.rpg.getAnimationState().attack,-1);assert.equal(h.rpg.movementLocked,false);
 const health=h.rpg.state.hp;for(let i=0;i<20;i++)h.rpg.update(.02);
 assert.equal(h.rpg.state.hp,health);assert.equal(h.rpg.getApproachTarget(),null);
});
