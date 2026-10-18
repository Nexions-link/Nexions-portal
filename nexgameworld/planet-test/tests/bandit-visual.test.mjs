import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBanditVisual} from '../bandit-visual.js';
test('bandit model has an original humanoid silhouette and deterministic walking animation',()=>{
 const bandit=createBanditVisual(THREE);
 assert.equal(bandit.root.name,'dust-trail-raider');
 assert.ok(bandit.root.children.length>=10);
 bandit.animate(1.25,.6,0);
 bandit.root.traverse(x=>{if(x.isMesh){
  assert.ok(Number.isFinite(x.position.x));
  assert.ok(x.material?.isMaterial);
 }});
 bandit.animate(2,0,1);
 assert.ok(Number.isFinite(bandit.root.rotation.z));
});
