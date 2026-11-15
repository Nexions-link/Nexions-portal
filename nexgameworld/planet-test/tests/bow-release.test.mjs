import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {harness} from './harness.mjs';
import {animateSphericalTauren} from '../tauren-animation.js';
import {getBowReleasePose} from '../bow-visual.js';
import {HUNTER_ARROW_NOCK_Z} from '../hunter-arrow.js';
import {TRAINING_DUMMY} from '../../training.js';
import {creatureByIndex} from '../creature-registry.js';

function hunter({ability='arcaneShot',mob=false}={}){
 const spec=creatureByIndex(0),target=mob?spec:TRAINING_DUMMY;
 const profile={classId:'hunter',raceId:'orc',level:8,resource:100,health:120,
  inventory:[],equipment:{weapon:{id:'wornBow'}},actionBar:[{kind:'ability',id:ability}]};
 const h=harness({x:target.x,z:target.z-12,authenticatedProfile:profile});
 const attacks=[],transport={connected:true,sendAttack:(...args)=>{attacks.push(args);return true;}};
 h.rpg.setMultiplayer(transport);
 const snapshot=(overrides={})=>({index:0,id:spec.id,x:spec.x,z:spec.z,hp:500,life:1,phase:'alive',...overrides});
 if(mob)h.rpg.onMobSnapshot([snapshot()]);
 h.rpg.targetNearest();
 assert.equal(h.get('targetName').textContent,mob?spec.name:TRAINING_DUMMY.name);
 let time=0;
 const step=dt=>{
  time+=dt;h.rpg.update(dt);
  animateSphericalTauren(h.hero,{dt,time,...h.rpg.getAnimationState()});
  return h.rpg.flushBowReleases();
 };
 const flights=()=>h.scene.children.filter(child=>child.name==='hunter-arrow'&&child.visible);
 const hp=()=>Number(h.get('targetHp').textContent.split(' / ')[0]);
 const begin=()=>{h.rpg.handleSlotKey('1');if(ability==='autoShot')step(0);};
 return {...h,profile,spec,snapshot,transport,attacks,step,flights,hp,begin};
}

test('actual RPG draws a nocked arrow and launches once at the native .34 second impact',()=>{
 const h=hunter();h.begin();
 const before=h.hp(),held=h.hero.root.getObjectByName('bow-nocked-arrow');
 h.step(.20);
 assert.equal(held.visible,true,'arrow remains on the string during draw');
 assert.equal(h.flights().length,0);
 assert.equal(h.hp(),before,'draw does not deal early training damage');
 h.step(.139);
 assert.equal(h.flights().length,0);assert.equal(h.hp(),before);
 assert.equal(h.step(.002),true,'post-pose flush releases at .341 seconds');
 assert.equal(held.visible,false,'released arrow is removed from the bow');
 assert.equal(h.flights().length,1);
 assert.ok(h.hp()<before,'training damage retains the existing .34 second impact');
 const flight=h.flights()[0],pose=getBowReleasePose(THREE,h.hero);
 const tail=flight.localToWorld(new THREE.Vector3(0,0,HUNTER_ARROW_NOCK_Z));
 assert.ok(tail.distanceTo(pose.origin)<1e-6,'flight starts with its tail at the current posed string nock');
 assert.equal(h.rpg.flushBowReleases(),false,'a second flush cannot duplicate the release');
 h.step(.02);assert.equal(h.flights().length,1);
});

test('authoritative primary ACK never adds a second local arrow or predicted mob damage',()=>{
 const h=hunter({mob:true});h.begin();const before=h.hp();
 h.step(.20);assert.equal(h.attacks.length,0);assert.equal(h.hp(),before);
 h.step(.141);
 assert.deepEqual(h.attacks,[['arcaneShot',h.spec.id]]);
 assert.equal(h.hp(),before,'remote mob health awaits authority');
 assert.equal(h.flights().length,1);
 h.rpg.onCombatEvent({fromId:'self',mobId:h.spec.id,life:1,abilityId:'arcaneShot',hp:450,damage:50},'self');
 assert.equal(h.hp(),450);assert.equal(h.flights().length,1);
 h.rpg.onCombatEvent({fromId:'self',mobId:h.spec.id,life:1,abilityId:'arcaneShot',hp:450,damage:50},'self');
 assert.equal(h.flights().length,1,'duplicate packet does not duplicate cosmetic flight');
});

test('Multi Shot releases its primary once and at most two distinct secondary ACK arrows',()=>{
 const h=hunter({ability:'multiShot',mob:true});
 const second=creatureByIndex(1),third=creatureByIndex(2),fourth=creatureByIndex(3);
 h.rpg.onMobSnapshot([second,third,fourth].map((spec,index)=>({index:spec.index,id:spec.id,
  x:h.spec.x+3+index,z:h.spec.z,hp:500,life:1,phase:'alive'})));
 h.begin();h.step(.341);assert.equal(h.flights().length,1);
 const ack=spec=>h.rpg.onCombatEvent({fromId:'self',mobId:spec.id,life:1,abilityId:'multiShot',hp:450,damage:50},'self');
 ack(h.spec);assert.equal(h.flights().length,1);
 ack(second);ack(second);assert.equal(h.flights().length,2);
 ack(third);ack(fourth);assert.equal(h.flights().length,3,'volley is capped at three distinct targets');
});

for(const change of ['weapon loss','death','disconnect','respawn','new target life','hidden target','range loss','facing loss']){
 test(`pending bow draw cannot launch or send an attack after ${change}`,()=>{
  const h=hunter({mob:true});h.begin();h.step(.20);
  if(change==='weapon loss')h.rpg.applyServerProgress({...h.profile,equipment:{}},'checkpoint');
  if(change==='death')h.rpg.onVitals({hp:0});
  if(change==='disconnect'){h.transport.connected=false;h.rpg.onNetworkDisconnect();}
  if(change==='respawn')h.rpg.onNetworkRespawn({hp:120});
  if(change==='new target life')h.rpg.onMobSnapshot([h.snapshot({life:2})]);
  if(change==='hidden target')h.rpg.onMobSnapshot([h.snapshot({phase:'hidden'})]);
  if(change==='range loss')h.position(h.spec.x,h.spec.z-40,h.spec);
  if(change==='facing loss')h.position(h.spec.x,h.spec.z-12,{x:h.spec.x,z:h.spec.z-30});
  assert.equal(h.step(.15),false);
  assert.equal(h.flights().length,0);assert.equal(h.attacks.length,0);
 });
}

for(const ability of ['autoShot','aimedShot']){
 test(`${ability} does not release if movement begins during draw`,()=>{
  const h=hunter({ability,mob:true});h.begin();h.step(.20);
  h.hero.root.userData.walkBlend=1;h.step(.15);
  assert.equal(h.flights().length,0);assert.equal(h.attacks.length,0);
 });
}

test('disconnect clears a released cosmetic arrow and cancels queued flushes',()=>{
 const h=hunter({mob:true});h.begin();h.step(.341);assert.equal(h.flights().length,1);
 h.transport.connected=false;h.rpg.onNetworkDisconnect();
 assert.equal(h.flights().length,0);assert.equal(h.rpg.flushBowReleases(),false);
});
