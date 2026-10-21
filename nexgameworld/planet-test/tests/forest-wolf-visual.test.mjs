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
