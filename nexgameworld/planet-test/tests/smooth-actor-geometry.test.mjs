import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSmoothActorForm,getSmoothActorPrimitives} from '../smooth-actor-geometry.js';
import {createTauren} from '../start-zone.js';
import {installDom} from './harness.mjs';

test('refined profiles preserve authored rings, bound interpolation and close the lighting seam',()=>{
 const rings=[[-1,.2,.25,0],[0,.6,.4,.1],[1,.3,.2,0]];
 const g=createSmoothActorForm(THREE,rings,{segments:20});
 assert.strictEqual(g,createSmoothActorForm(THREE,rings,{segments:20}));
 const p=g.attributes.position,n=g.attributes.normal;
 for(let row=0;row<7;row++){
  const first=row*21,last=first+20;
  assert.ok(new THREE.Vector3().fromBufferAttribute(p,first).distanceTo(new THREE.Vector3().fromBufferAttribute(p,last))<1e-6);
  assert.ok(new THREE.Vector3().fromBufferAttribute(n,first).distanceTo(new THREE.Vector3().fromBufferAttribute(n,last))<1e-6);
  for(let i=first;i<=last;i++)assert.ok(Math.abs(p.getX(i))<=.600001);
 }
 for(let j=0;j<3;j++)assert.ok(Math.abs(p.getY(j*3*21)-rings[j][0])<1e-6);
 assert.ok(Array.from(p.array).every(Number.isFinite));
 assert.ok(Array.from(n.array).every(Number.isFinite));
 assert.throws(()=>createSmoothActorForm(THREE,[[0,-1,1],[1,1,1]]),RangeError);
});
test('rounded fittings preserve bounds and all actors share their base geometry',()=>{
 const primitives=getSmoothActorPrimitives(THREE);
 assert.strictEqual(primitives,getSmoothActorPrimitives(THREE));
 primitives.box.computeBoundingBox();
 assert.ok(primitives.box.boundingBox.min.distanceTo(new THREE.Vector3(-.5,-.5,-.5))<1e-6);
 assert.ok(primitives.box.boundingBox.max.distanceTo(new THREE.Vector3(.5,.5,.5))<1e-6);
 installDom();
 const npc=createTauren(THREE,new THREE.Scene());
 const other=createTauren(THREE,new THREE.Scene(),{fur:0x664433});
 assert.equal(npc.root.userData.surfaceRevision,'smooth-actor-1');
 assert.strictEqual(npc.chest.children[1].geometry,other.chest.children[1].geometry);
 assert.equal(npc.anatomy,null,'NPC gains no anatomy overlay draw calls');
 let triangles=0;
 npc.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 assert.ok(triangles<50000,'keep villager refinement bounded');
});
