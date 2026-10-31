import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWhisperingForest,forestColliders} from '../whispering-forest.js';
import {forestLightResponse} from '../forest-lighting.js';
import {GRAPHICS_PRESETS} from '../graphics-quality.js';

test('balanced and high forests cast and receive actual tree shadows without altering colliders',()=>{
 const scene=new THREE.Scene(),before=forestColliders();
 const forest=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0});
 const names=['forest-ancient-trunks','forest-pine-lower','forest-pine-crown',
  'forest-oak-crown','forest-oak-upper-crown'];
 const trees=names.map(name=>scene.getObjectByName(name));
 assert.ok(trees.every(Boolean));
 const counts=trees.map(x=>x.count);
 for(const preset of ['balanced','high']){
  forest.setQuality(preset);
  for(const tree of trees){
   assert.equal(tree.castShadow,true,preset+'/'+tree.name);
   assert.equal(tree.receiveShadow,true,preset+'/'+tree.name);
  }
  assert.deepEqual(trees.map(x=>x.count),counts);
 }
 const contact=scene.getObjectByName('g13-root-contact-shade');
 assert.equal(contact.receiveShadow,false,'transparent contact shade must not double-darken');
 for(const [preset,preview] of [['economy',false],['high',true]]){
  forest.setQuality(preset,preview);
  assert.ok(trees.every(t=>!t.castShadow));
 }
 assert.deepEqual(forestColliders(),before);
});
test('forest keeps readable ambient light while direct light defines volume',()=>{
 for(let shade=0;shade<=1;shade+=.05){
  const light=forestLightResponse(shade,1.14);
  assert.ok(light.hemi>=1.27&&light.fill>.5);
  assert.ok(light.sun/light.hemi>1.6);
  assert.ok(Object.values(light).every(Number.isFinite));
 }
 assert.equal(GRAPHICS_PRESETS.high.shadowSize,2048);
 assert.equal(GRAPHICS_PRESETS.balanced.shadowSize,1024);
 assert.equal(GRAPHICS_PRESETS.economy.shadowSize,0);
});
