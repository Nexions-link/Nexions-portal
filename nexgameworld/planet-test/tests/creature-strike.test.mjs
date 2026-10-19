import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {advanceCreatureStrike,resetCreatureStrike} from '../creature-strike.js';
import {advanceCreatureSecondary,applyCreatureSecondary} from '../creature-secondary.js?v=3';

const init=()=>({cueSeen:0,hitSeen:0,phase:'idle'});
test('server cue creates visible anticipation without predicting damage',()=>{
 const s=init();
 const first=advanceCreatureStrike(s,1/60,{cueSequence:1,windupRemaining:.43});
 assert.equal(first.newCue,true);
 assert.equal(first.newHit,false);
 assert.equal(first.impact,0,'damage not yet confirmed by server');
 let windup=first;
 for(let i=0;i<15;i++){
  windup=advanceCreatureStrike(s,1/60,{cueSequence:1,windupRemaining:.43-i/60});
  assert.equal(windup.newCue,false,'one telegraph only starts one attack');
  assert.equal(windup.impact,0);
 }
 assert.ok(windup.prepare>.95,'windup posture becomes legible');
});
test('confirmed server damage peaks after hit event then fully recovers',()=>{
 const s=init();
 for(let i=0;i<16;i++)advanceCreatureStrike(s,1/60,{cueSequence:1,windupRemaining:.4-i/60});
 const first=advanceCreatureStrike(s,1/60,{cueSequence:1,hitSequence:1,windupRemaining:0});
 assert.equal(first.newHit,true);
 const weights=[first.impact];
 let last=first;
 for(let i=0;i<65;i++){
  last=advanceCreatureStrike(s,1/60,{cueSequence:1,hitSequence:1});
  assert.equal(last.newHit,false);
  weights.push(last.impact);
 }
 assert.ok(Math.max(...weights)>.95,'strike accent peaks near confirmed contact');
 assert.ok(weights[0]<.3,'first contact frame does not snap into maximum lunge');
 assert.deepEqual([last.prepare,last.impact,last.recover],[0,0,0]);
 assert.equal(last.active,false);
});
test('canceled attacks settle without a fake visual impact',()=>{
 const s=init();
 advanceCreatureStrike(s,.016,{cueSequence:1,windupRemaining:.25});
 const samples=[];
 for(let i=0;i<70;i++)samples.push(advanceCreatureStrike(s,.016,{cueSequence:1,windupRemaining:0}));
 assert.ok(samples.every(p=>p.impact===0&&p.newHit===false));
 assert.equal(samples.at(-1).active,false);
});
test('offline positive windup edge animates once and local confirmed blow lands',()=>{
 const s=init();
 const a=advanceCreatureStrike(s,.016,{windupRemaining:.4});
 const b=advanceCreatureStrike(s,.016,{windupRemaining:.35});
 const hit=advanceCreatureStrike(s,.016,{hitSequence:1});
 assert.equal(a.newCue,true);
 assert.equal(b.newCue,false);
 assert.equal(hit.newHit,true);
 for(let i=0;i<50;i++)advanceCreatureStrike(s,.016,{hitSequence:1});
 assert.equal(advanceCreatureStrike(s,.016,{hitSequence:1}).active,false);
});
test('death cancels windup and prevents attack bleeding into new life',()=>{
 const s=init();
 advanceCreatureStrike(s,.016,{cueSequence:1,windupRemaining:.4});
 const death=advanceCreatureStrike(s,.016,{cueSequence:1,hitSequence:1,dead:true});
 assert.equal(death.active,false);assert.equal(death.impact,0);
 resetCreatureStrike(s);
 const neutral=advanceCreatureStrike(s,.016,{cueSequence:0,hitSequence:0});
 assert.equal(neutral.active,false);
 assert.equal(advanceCreatureStrike(s,.016,{cueSequence:1,windupRemaining:.35}).newCue,true);
});
test('cosmetic impact visibly moves a GLB parent pivot, never its world root',()=>{
 for(const kind of ['raider','longstrider']){
  const root=new THREE.Group(),pivot=new THREE.Group();root.add(pivot);
  const initial=root.position.clone(),rotation=root.quaternion.clone();
  const s={},strike=init();
  let baseline=advanceCreatureSecondary(s,.016,{kind});
  advanceCreatureStrike(strike,.016,{cueSequence:1,windupRemaining:.4});
  for(let i=0;i<8;i++)advanceCreatureStrike(strike,.016,{cueSequence:1,windupRemaining:.25});
  const hit=advanceCreatureStrike(strike,.11,{cueSequence:1,hitSequence:1});
  const accent=advanceCreatureSecondary(s,.016,{kind,strikePrepare:hit.prepare,strikeImpact:hit.impact,strikeRecover:hit.recover});
  applyCreatureSecondary(pivot,accent);
  assert.ok(accent.forward>baseline.forward+.025,'visually noticeable impact');
  assert.ok(accent.pitch<baseline.pitch-.03,'small natural lunge');
  assert.equal(root.position.distanceTo(initial),0);
  assert.equal(root.quaternion.angleTo(rotation),0);
 }
});
test('time jumps, malformed packets, duplicate hits and delayed queues stay safe',()=>{
 const s=init();
 for(const dt of [NaN,Infinity,-.3,120,0,.016]){
  const result=advanceCreatureStrike(s,dt,{cueSequence:9,hitSequence:10,windupRemaining:Infinity,windupDuration:Infinity});
  assert.ok(Object.values(result).every(x=>typeof x==='boolean'||Number.isFinite(x)));
  for(const x of ['prepare','impact','recover'])assert.ok(result[x]>=0&&result[x]<=1);
 }
 const next=advanceCreatureStrike(s,.016,{cueSequence:9,hitSequence:10});
 assert.equal(next.newHit,false,'replayed server packet cannot retrigger attack');
});
test('both server and local attack paths wire visual confirmation without changing HP logic',()=>{
 const source=readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 assert.match(source,/function onMobTelegraph\(event\)/);
 assert.match(source,/mob\.visualStrikeCue=\(mob\.visualStrikeCue\|\|0\)\+1/);
 assert.match(source,/attacker\.visualStrikeHitSequence=\(attacker\.visualStrikeHitSequence\|\|0\)\+1/);
 assert.match(source,/mob\.visualStrikeHitSequence=\(mob\.visualStrikeHitSequence\|\|0\)\+1/);
 assert.match(source,/resetCreatureStrike\(bird\.strike\)/);
 assert.match(source,/resetCreatureStrike\(gltf\.strike\)/);
});
