// Run with: node --test planet-test/tauren-visual-details.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTaurenVisualDetails} from './tauren-visual-details.js';

function makeActor(){
 const root=new THREE.Group();
 const body=new THREE.Group(),chest=new THREE.Group(),neck=new THREE.Group(),head=new THREE.Group();
 root.add(body);body.add(chest);chest.add(neck);neck.add(head);
 const arms=[new THREE.Group(),new THREE.Group()].map(elbow=>({elbow}));
 for(const arm of arms)chest.add(arm.elbow);
 const actor={root,body,chest,neck,head,arms};
 const originals={body:body.position.clone(),head:head.quaternion.clone(),
  elbows:arms.map(a=>a.elbow.rotation.clone())};
 return {actor,originals};
}

test('character details attach to existing joint groups without replacing the rig',()=>{
 const {actor,originals}=makeActor();
 const details=createTaurenVisualDetails(THREE,actor);
 assert.equal(details.batches.length,6);
 assert.equal(details.batches[0].parent,actor.head);
 assert.equal(details.batches[1].parent,actor.head);
 assert.equal(details.batches[2].parent,actor.chest);
 assert.equal(details.batches[3].parent,actor.body);
 assert.equal(details.batches[4].parent,actor.arms[0].elbow);
 assert.equal(details.batches[5].parent,actor.arms[1].elbow);
 assert.ok(actor.body.position.equals(originals.body));
 assert.ok(actor.head.quaternion.equals(originals.head));
 for(let i=0;i<2;i++)assert.deepEqual(actor.arms[i].elbow.rotation.toArray(),originals.elbows[i].toArray());
 assert.ok(details.batches.every(mesh=>mesh.isInstancedMesh&&mesh.castShadow===false));
});

test('every quality profile scales the protagonist details and keeps both horns symmetrical',()=>{
 const {actor}=makeActor(),details=createTaurenVisualDetails(THREE,actor);
 details.setQuality(.15);
 assert.deepEqual(details.counts,{horn:4,fur:12,belt:5,cuffs:0});
 details.setQuality(.68);
 assert.deepEqual(details.counts,{horn:8,fur:30,belt:17,cuffs:2});
 details.setQuality(1);
 assert.deepEqual(details.counts,{horn:8,fur:45,belt:17,cuffs:2});
});

test('new details have finite matrices and never intercept game picking',()=>{
 const {actor}=makeActor(),details=createTaurenVisualDetails(THREE,actor);
 const matrix=new THREE.Matrix4();
 for(const mesh of details.batches){
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);
   assert.ok(matrix.elements.every(Number.isFinite),mesh.name+' instance '+i);
  }
  const hits=[];
  mesh.raycast({},hits);
  assert.equal(hits.length,0);
 }
});

test('existing equipment grips and arm joint references stay untouched',()=>{
 const {actor}=makeActor();
 const leftHand=new THREE.Group(),rightHand=new THREE.Group();
 actor.arms[0].hand=leftHand;
 actor.arms[1].hand=rightHand;
 const grips={weapon:{x:-Math.PI/2,y:0,z:0},shield:{x:Math.PI,y:0,z:0}};
 actor.root.userData.equipmentGrip=grips;
 createTaurenVisualDetails(THREE,actor);
 assert.equal(actor.arms[0].hand,leftHand);
 assert.equal(actor.arms[1].hand,rightHand);
 assert.equal(actor.root.userData.equipmentGrip,grips);
});
