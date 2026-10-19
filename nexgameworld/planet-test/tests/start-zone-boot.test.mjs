import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installDom} from './harness.mjs';
import {createStartZone,createTauren} from '../start-zone.js';

// End-to-end boot smoke: previously all character/texture tests passed while
// createStartZone itself crashed on iOS Safari ("Can't find variable: texture").
test('full spherical zone creates world fabric and lake textures on first frame',()=>{
 installDom();
 const scene=new THREE.Scene();
 const zone=createStartZone(THREE,scene,()=>261,()=>0);
 assert.ok(zone&&scene.children.length>0);
 assert.equal(typeof zone.rebuild,'function');
 assert.equal(typeof zone.animate,'function');
 assert.doesNotThrow(()=>zone.animate(.5));
 assert.doesNotThrow(()=>zone.updateInteriorView(0,0,1/60));
 assert.doesNotThrow(()=>zone.setGraphics({
  detail:.68,reeds:.82,shimmer:.30,waterColor:0x64b1b6,shadows:false
 }));
 // A rebuild must not use a deleted canvas factory either.
 assert.doesNotThrow(()=>zone.rebuild());
});
test('world canvas creation coexists with cached player fur maps',()=>{
 installDom();
 const scene=new THREE.Scene();
 createStartZone(THREE,scene,()=>261,()=>0);
 const hero=createTauren(THREE,scene,{player:true});
 const pelt=hero.chest.children.find(o=>o.isMesh&&o.material?.map);
 assert.ok(pelt?.material.map.isCanvasTexture);
 let texturedWorldMeshes=0;
 scene.traverse(o=>{if(o.isMesh&&o.material?.map?.isCanvasTexture&&o!==pelt)texturedWorldMeshes++});
 assert.ok(texturedWorldMeshes>0);
});
