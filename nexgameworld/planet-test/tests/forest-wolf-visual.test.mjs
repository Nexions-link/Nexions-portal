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
