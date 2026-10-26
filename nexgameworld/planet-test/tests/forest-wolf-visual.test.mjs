import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForestWolfVisual} from '../forest-wolf-visual.js';

test('stationary wolf breathes and listens without moving its authoritative origin',()=>{
 const visual=createForestWolfVisual(THREE,2);
 const body=visual.root.children[0],head=body.children.find(child=>child.isGroup);
 assert.ok(head,'wolf head must be attached to the body');
 visual.animate(0,0,0);
 const before=[body.scale.y,head.rotation.y];
 visual.animate(1.8,0,0);
 assert.notDeepEqual([body.scale.y,head.rotation.y],before);
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
});

test('running and attacking keep the head oriented and the stride active',()=>{
 const visual=createForestWolfVisual(THREE,1);
 const body=visual.root.children[0],head=body.children.find(child=>child.isGroup);
 visual.animate(1,1,1);
 assert.equal(head.rotation.x,-.20);
 assert.equal(head.rotation.y,0);
 assert.ok(Math.abs(body.position.y)>0);
 assert.equal(body.scale.y,1,'running animation must not stretch the hit silhouette');
});


test('server telegraph braces and bares teeth before a confirmed bite',()=>{
 const visual=createForestWolfVisual(THREE,3);
 const body=visual.root.children[0],head=body.children.find(node=>node.isGroup);
 const jaw=head.children.find(node=>node.isGroup);
 assert.ok(jaw,'a hinged jaw must be present');
 visual.animate(1,0,1,0,0,{cueSequence:1,hitSequence:0,windupDuration:.4});
 visual.animate(1.21,0,1,0,0,{cueSequence:1,hitSequence:0,windupDuration:.4});
 assert.ok(body.position.z<0,'wolf pulls back to brace');
 assert.ok(body.rotation.x>0,'wolf lowers its shoulders into a crouch');
 assert.ok(jaw.rotation.x>.35,'snarl opens the jaw');
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
});

test('confirmed server hit drives one lunge, then recovers without phantom repeats',()=>{
 const visual=createForestWolfVisual(THREE,0);
 const body=visual.root.children[0],head=body.children.find(node=>node.isGroup);
 const jaw=head.children.find(node=>node.isGroup);
 const events={cueSequence:1,hitSequence:0,windupDuration:.4};
 visual.animate(1,0,1,0,0,events);
 visual.animate(1.2,0,1,0,0,events);
 events.hitSequence=1;
 visual.animate(1.4,0,0,0,0,events);
 visual.animate(1.46,0,0,0,0,events);
 assert.ok(body.position.z>.20,'bite visibly lunges toward the player');
 assert.ok(jaw.rotation.x>.5,'jaw opens wider on impact');
 assert.equal(head.rotation.y,0,'wolf keeps eyes forward during the bite');
 visual.animate(1.8,0,0,0,0,events);
 assert.ok(body.position.z<0,'wolf visibly recoils after its bite');
 visual.animate(2.1,0,0,0,0,events);
 assert.equal(body.position.z,0,'stance fully recovers');
 assert.equal(jaw.rotation.x,.05,'mouth relaxes after the attack');
 visual.animate(4,0,0,0,0,events);
 assert.equal(body.position.z,0,'old hit sequence does not replay');
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
});

test('respawn resets procedural wolf attack pose without changing its hitbox root',()=>{
 const visual=createForestWolfVisual(THREE,1);
 const body=visual.root.children[0];
 visual.animate(2,0,1,0,0,{cueSequence:2,hitSequence:0});
 visual.animate(2.3,0,1,0,0,{cueSequence:2,hitSequence:0});
 assert.notEqual(body.position.z,0);
 visual.resetAttack();
 visual.animate(3,0,0,0,0,{cueSequence:0,hitSequence:0});
 assert.equal(body.position.z,0);
 assert.equal(body.rotation.x,0);
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
});

test('pack members display distinct noncombat scent, watch and resting gestures',()=>{
 const first=createForestWolfVisual(THREE,0),second=createForestWolfVisual(THREE,1);
 const pose=(visual,time)=>{
  visual.animate(time,0,0,0,0);
  const body=visual.root.children[0],head=body.children.find(o=>o.isGroup);
  return [head.position.y,head.rotation.x,head.rotation.y,body.rotation.x];
 };
 const poses=[pose(first,0),pose(first,9.6),pose(first,19.1),pose(second,9.6)];
 assert.ok(new Set(poses.map(p=>p.map(x=>x.toFixed(3)).join(','))).size>=3);
 assert.deepEqual(first.root.position.toArray(),[0,0,0]);
 assert.deepEqual(second.root.position.toArray(),[0,0,0]);
});
test('scent animation is suppressed by server-driven combat and howl',()=>{
 const visual=createForestWolfVisual(THREE,1);
 const head=visual.root.children[0].children.find(o=>o.isGroup);
 visual.animate(9.6,0,1,0,0);
 assert.equal(head.rotation.x,-.20);
 visual.animate(9.6,0,0,1,0);
 assert.equal(head.rotation.x,-.62);
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
});

test('walking cycle accumulates rendered distance and smooths leg transitions',()=>{
 const visual=createForestWolfVisual(THREE,0);
 const legs=visual.legs;
 assert.equal(legs.length,4);
 assert.ok(legs.every(leg=>leg.hip.isGroup&&leg.hock.isGroup&&leg.paw.isGroup));
 visual.animate(1,0,0);
 const pose0=legs.map(x=>x.hip.rotation.x);
 visual.animate(1.016,.038,0);
 const pose1=legs.map(x=>x.hip.rotation.x);
 visual.animate(1.032,.038,0);
 const pose2=legs.map(x=>x.hip.rotation.x);
 assert.ok(pose1.some((v,i)=>Math.abs(v-pose0[i])>0));
 assert.ok(pose2.every((v,i)=>Math.abs(v-pose1[i])<.3));
 visual.animate(1.048,0,0);
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
 visual.resetAttack();
 assert.ok(legs.every(x=>x.hip.rotation.x===0&&x.hock.rotation.x===0&&x.paw.rotation.x===0));
});

test('articulated wolf walk and mounted gallop bend knees without root drift',()=>{
 const visual=createForestWolfVisual(THREE,0);
 let idle=visual.animate(0,0);
 assert.equal(idle.moving,0);
 for(let i=1;i<=70;i++)visual.animate(i/60,.035);
 const walk=visual.animate(71/60,.035);
 assert.ok(walk.moving>.5);
 assert.ok(walk.gallop<.15,'walking should not use gallop gait');
 assert.ok(visual.legs.some(leg=>Math.abs(leg.hock.rotation.x)>.02));
 let gallop=null;
 for(let i=72;i<=148;i++)gallop=visual.animate(i/60,.13,0,0,0,{}, {mounted:true});
 assert.ok(gallop.gallop>.7,'mount travel speed should select gallop');
 assert.ok(gallop.legs.some(leg=>leg.hock>.20),'paws clear ground during recovery');
 assert.ok(Math.abs(gallop.bounce)<.1,'suspension stays bounded');
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
});
test('blocked movement settles smoothly and does not animate in place',()=>{
 const visual=createForestWolfVisual(THREE,0);
 for(let i=0;i<65;i++)visual.animate(i/60,.06);
 const moving=visual.animate(66/60,.06);
 const phaseAtStop=moving.phase;
 for(let i=67;i<170;i++)visual.animate(i/60,0);
 const stopped=visual.animate(170/60,0);
 assert.ok(stopped.moving<.01);
 assert.equal(stopped.phase,phaseAtStop,'no phantom footsteps after stopping');
 assert.ok(visual.legs.every(leg=>Math.abs(leg.hip.rotation.x)<.03));
 assert.deepEqual(visual.root.position.toArray(),[0,0,0]);
});
