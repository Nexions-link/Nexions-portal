import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AXE_TUNER_DEFAULTS} from '../../axe-tuner.js';
import {SWORD_TUNER_DEFAULTS} from '../../sword-tuner.js';
import {DAGGER_TUNER_DEFAULTS} from '../../dagger-tuner.js';
import {SHIELD_TUNER_DEFAULTS} from '../../shield-tuner.js';
import {applyEquipmentTransform,equipmentGrip} from '../equipment-grip.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {createTauren} from '../start-zone.js';
import {installDom} from './harness.mjs';
const cases=[
 ['weapon','axe','assets/weapons/tauren-axe-v0.1.glb',AXE_TUNER_DEFAULTS],
 ['weapon','sword','assets/weapons/plains-sword-v0.1.glb',SWORD_TUNER_DEFAULTS],
 ['weapon','dagger','assets/weapons/steppe-dagger-v0.1.glb',DAGGER_TUNER_DEFAULTS],
 ['shield','round','assets/shields/nexgame_round_shield_poor.glb',SHIELD_TUNER_DEFAULTS.round],
 ['shield','kite','assets/shields/nexgame_kite_shield_quality.glb',SHIELD_TUNER_DEFAULTS.kite]
];
for(const [slot,kind,path,tuning] of cases)test(`${kind}: native GLB and approved grip survive attack, block and radial rotation`,async()=>{
 installDom();const scene=new THREE.Scene(),actor=createTauren(THREE,scene);
 const bytes=await readFile(new URL('../../'+path,import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes>0);
 const hand=actor.arms[slot==='shield'?0:1].hand;
 const grip=applyEquipmentTransform(gltf.scene,hand,{slot,kind,tuning,sourceId:slot==='shield'?2210:37});hand.add(gltf.scene);
 // Reference poses taken from animateTauren in main, including native wrist base.
 const expected=new THREE.Quaternion().setFromEuler(new THREE.Euler(
  slot==='shield'?Math.PI:-3*Math.PI/2,
  slot==='shield'?0:-67*Math.PI/180,slot==='shield'?0:-82*Math.PI/180,'XYZ'));
 assert.ok(hand.quaternion.angleTo(expected)<1e-7);
 assert.equal(gltf.scene.scale.x,slot==='shield'?.8:1);
 gltf.scene.updateMatrix();const attachment=gltf.scene.matrix.clone();
 actor.root.userData.equipmentGrip={[slot]:grip};
 for(const normal of [new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1)]){
  actor.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
  animateSphericalTauren(actor,{attack:.425,weaponKind:slot==='weapon'?kind:'none',blockRemaining:.2});
  actor.root.updateMatrixWorld(true);
  gltf.scene.updateMatrix();assert.deepEqual(gltf.scene.matrix.elements,attachment.elements);
  assert.ok(gltf.scene.matrixWorld.elements.every(Number.isFinite));
  animateSphericalTauren(actor,{attack:-1,blockRemaining:0});
  assert.ok(hand.quaternion.angleTo(expected)<1e-7);
 }
});
test('empty hands retain native wrist bases; stomp lifts then plants before recovery',()=>{
 installDom();const actor=createTauren(THREE,new THREE.Scene());
 animateSphericalTauren(actor);assert.equal(actor.arms[1].hand.rotation.x,-Math.PI/2);assert.equal(actor.arms[0].hand.rotation.x,Math.PI);
 assert.deepEqual(equipmentGrip('shield'),{x:Math.PI,y:0,z:0,order:'XYZ'});
 animateSphericalTauren(actor,{stomp:.24});const raised=actor.legs[1].hip.rotation.x;
 animateSphericalTauren(actor,{stomp:.48});const planted=actor.legs[1].hip.rotation.x;
 assert.notEqual(raised,planted);
 animateSphericalTauren(actor,{stomp:-1});assert.ok(Math.abs(actor.body.position.y-1.4)<1e-8);
});
