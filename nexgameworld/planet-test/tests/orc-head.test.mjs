import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOrcHead} from '../orc-head.js';

const materials=()=>Object.fromEntries(['skin','skinDark','skinLight','ivory','hair','eye','black','metal','leather']
 .map(key=>[key,new THREE.MeshStandardMaterial()]));

test('original orc head fits the native neck and camera envelope with a coherent sculpted face',()=>{
 const head=createOrcHead(THREE,materials()),bounds=new THREE.Box3().setFromObject(head);
 assert.ok(bounds.min.y>=-.45&&bounds.max.y<=.851,'head remains within the existing neck and overhead label envelope');
 assert.ok(bounds.max.x-bounds.min.x<=1.101,'ears do not balloon beyond the intended head width');
 assert.ok(bounds.max.z>.60,'curved tusks and underbite have a real side silhouette');
 const shell=head.getObjectByName('orc-face-shell');
 assert.equal(shell.geometry.type,'BufferGeometry');
 assert.ok(shell.geometry.attributes.position.count>1000,'skull and jaw are one modeled surface');
 const eye=head.getObjectByName('orc-eye-left-sclera');
 eye.geometry.computeBoundingBox();
 const eyeSize=eye.geometry.boundingBox.getSize(new THREE.Vector3());
 assert.ok(eyeSize.x>eyeSize.y*3&&eyeSize.z<.02,'fierce eyes are narrow recessed lenses rather than eyeballs');
});

test('head instances share immutable finite geometry within the multiplayer triangle budget',()=>{
 const firstMaterials=materials(),first=createOrcHead(THREE,firstMaterials),second=createOrcHead(THREE,materials());
 let triangles=0;
 first.traverse(mesh=>{
  if(!mesh.isMesh)return;
  assert.equal(mesh.geometry.userData.actorShared,true,'preview disposal must retain shared geometry');
  const colors=mesh.geometry.attributes.color;
  assert.equal(colors?.count,mesh.geometry.attributes.position.count,'vertex-colour actor materials must not turn the head black');
  assert.ok([...colors.array].every(value=>value>0&&value<=1));
  for(const attribute of Object.values(mesh.geometry.attributes))
   assert.ok([...attribute.array].every(Number.isFinite),mesh.name+' has finite attributes');
  assert.equal(second.getObjectByName(mesh.name).geometry,mesh.geometry);
  triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
 });
 assert.ok(triangles<20000,'full head stays within the authored budget');
 assert.equal(first.getObjectByName('orc-face-shell').material,firstMaterials.skin,'actor-supplied materials remain owned by the actor');
});
