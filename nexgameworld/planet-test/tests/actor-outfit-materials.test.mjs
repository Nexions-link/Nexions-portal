import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCanvas} from '@napi-rs/canvas';
import {getActorOutfitMaps,paintActorOutfit} from '../actor-outfit-materials.js?v=1';
import {createTauren} from '../start-zone.js';
import {installDom} from './harness.mjs';

test('woven cloth and leather are reproducible opaque original surfaces',()=>{
 const paint=leather=>{const c=createCanvas(128,128);paintActorOutfit(c.getContext('2d'),128,{leather});return c.getContext('2d').getImageData(0,0,128,128).data;};
 const cloth=paint(false),leather=paint(true);
 assert.deepEqual(cloth,paint(false));assert.notDeepEqual(cloth,leather);
 for(const data of [cloth,leather]){
  const tones=new Set();
  for(let i=0;i<data.length;i+=4){assert.equal(data[i+3],255);tones.add(data[i]);}
  assert.ok(tones.size>15);
 }
});
test('NPC and player garments share small maps and retain individual colors',()=>{
 installDom();const scene=new THREE.Scene();
 const a=createTauren(THREE,scene,{player:true});
 const b=createTauren(THREE,scene,{clothColor:0x427b70});
 const maps=getActorOutfitMaps(THREE);
 assert.strictEqual(maps,getActorOutfitMaps(THREE));
 for(const texture of Object.values(maps)){
  assert.equal(texture.image.width,128);assert.equal(texture.image.height,128);
  assert.equal(texture.userData.actorShared,true);
 }
 const materials=actor=>{const result=[];actor.root.traverse(o=>{if(o.isMesh&&o.material.map===maps.cloth)result.push(o.material)});return result;};
 assert.equal(materials(a).length,2);assert.equal(materials(b).length,2);
 assert.equal(materials(a)[0].color.getHex(),0x9a4931);
 assert.equal(materials(b)[0].color.getHex(),0x427b70);
 assert.ok(a.body.children.some(o=>o.isMesh&&o.material.map===maps.leather));
});
