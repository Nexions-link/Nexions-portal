import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {harness} from './harness.mjs';
import {creatureByIndex} from '../creature-registry.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {HUNTER_ARROW_NOCK_Z} from '../hunter-arrow.js?v=64608';

function onlineHunter(){
 const spec=creatureByIndex(0);
 const profile={classId:'hunter',raceId:'orc',level:8,resource:100,health:120,
  inventory:[],equipment:{weapon:{id:'wornBow'}},
  actionBar:[{kind:'ability',id:'arcaneShot'}]};
 const h=harness({x:spec.x,z:spec.z-12,authenticatedProfile:profile});
 const attacks=[],transport={connected:true,requestChestStatus:()=>true,
  sendAttack:(...args)=>{attacks.push(args);return true;}};
 h.rpg.setMultiplayer(transport);
 const snapshot=(overrides={})=>({index:spec.index,id:spec.id,x:spec.x,z:spec.z,
  hp:500,life:1,phase:'alive',...overrides});
 h.rpg.onMobSnapshot([snapshot()]);h.rpg.targetNearest();
 assert.equal(h.get('targetName').textContent,spec.name);
 const flights=()=>h.scene.children.filter(node=>node.name==='hunter-arrow'&&node.visible);
 const event={fromId:'remote-hunter',abilityId:'arcaneShot',mobId:spec.id,life:1};
 const pose={origin:h.hero.root.position.clone()
  .addScaledVector(h.hero.root.position.clone().normalize(),2)};
 let time=0;
 const step=dt=>{
  time+=dt;h.rpg.update(dt);
  animateSphericalTauren(h.hero,{dt,time,...h.rpg.getAnimationState()});
  return h.rpg.flushBowReleases();
 };
 return {...h,spec,event,pose,snapshot,transport,attacks,flights,step};
}

test('remote release waits for post-update flush and starts at a cloned nock position',()=>{
 const h=onlineHunter(),origin=h.pose.origin.clone();
 const hp=h.get('targetHp').textContent;
 assert.equal(h.rpg.onBowRelease(h.event,h.pose),true);
 h.pose.origin.set(-700,4,300); // The presence renderer reuses its scratch vectors.
 assert.equal(h.flights().length,0);
 h.rpg.update(.05);
 assert.equal(h.flights().length,0,'projectile update must not advance a newly queued remote shot');
 assert.equal(h.rpg.flushBowReleases(),true);
 assert.equal(h.flights().length,1);
 const arrow=h.flights()[0];arrow.updateMatrixWorld(true);
 const tail=arrow.localToWorld(new THREE.Vector3(0,0,HUNTER_ARROW_NOCK_Z));
 assert.ok(tail.distanceTo(origin)<1e-6,'the first visible tail is exactly at the supplied release nock');
 const first=arrow.position.clone();
 assert.equal(h.rpg.flushBowReleases(),false,'a second render flush cannot launch the same queued shot twice');
 assert.equal(h.flights().length,1);
 h.rpg.update(.05);
 assert.equal(h.flights().length,1);
 assert.ok(arrow.position.distanceTo(first)>.1,'the arrow begins flying on its next simulation frame');
 assert.equal(h.attacks.length,0,'an observed cosmetic release never sends a local attack');
 assert.equal(h.get('targetHp').textContent,hp,'observed flight does not predict target damage');
});

test('disconnect drops queued remote releases permanently instead of replaying them after reconnect',()=>{
 const h=onlineHunter();
 assert.equal(h.rpg.onBowRelease(h.event,h.pose),true);
 h.transport.connected=false;h.rpg.onNetworkDisconnect();
 h.rpg.update(.05);
 assert.equal(h.rpg.flushBowReleases(),false);assert.equal(h.flights().length,0);
 h.transport.connected=true;h.rpg.onMobSnapshot([h.snapshot()]);
 assert.equal(h.rpg.flushBowReleases(),false,'a live target returning cannot resurrect an old queued release');
 assert.equal(h.flights().length,0);
});

for(const change of ['new life','hidden target']){
 test('queued remote shot is discarded when its target becomes '+change,()=>{
  const h=onlineHunter();
  assert.equal(h.rpg.onBowRelease(h.event,h.pose),true);
  h.rpg.onMobSnapshot([h.snapshot(change==='new life'?{life:2}:{phase:'hidden'})]);
  h.rpg.update(.05);
  assert.equal(h.rpg.flushBowReleases(),false);
  assert.equal(h.flights().length,0,'a stale target must not receive a cosmetic arrow from an earlier life');
  assert.equal(h.attacks.length,0);
 });
}

test('rejection of a different hunter ability preserves the current local bow draw',()=>{
 const h=onlineHunter();h.rpg.handleSlotKey('1');h.step(.20);
 assert.equal(h.flights().length,0);assert.equal(h.attacks.length,0);
 h.rpg.onChargeRejected({abilityId:'concussiveShot',reason:'Способность восстанавливается'});
 assert.equal(h.step(.141),true,'an unrelated delayed rejection cannot cancel the Arcane Shot being drawn');
 assert.deepEqual(h.attacks,[['arcaneShot',h.spec.id]]);
 assert.equal(h.flights().length,1);
});

test('rejection of the current hunter ability cancels its pending local release',()=>{
 const h=onlineHunter();h.rpg.handleSlotKey('1');h.step(.20);
 h.rpg.onChargeRejected({abilityId:'arcaneShot',reason:'Цель недоступна'});
 assert.equal(h.step(.141),false);
 assert.equal(h.flights().length,0);assert.equal(h.attacks.length,0);
});
