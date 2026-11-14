import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOrc,equipHunterVisual} from '../orc-avatar.js';
import {orcProfile,orcCurve} from '../orc-geometry.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {installDom} from './harness.mjs';
import {syncForestWolfMount} from '../mount-visual.js';

test('sculpted orc keeps the live animation and equipment joint contract',()=>{
 installDom();const actor=createOrc(THREE,new THREE.Scene());
 for(let i=0;i<2;i++){
  const sign=i?1:-1,arm=actor.arms[i],leg=actor.legs[i];
  for(const [node,expected] of [[arm.shoulder,[sign*.86,.96,0]],
   [arm.elbow,[sign*.13,-.69,.015]],[arm.hand,[sign*.025,-.69,.035]],
   [leg.hip,[sign*.38,1.4,0]],[leg.knee,[0,-.72,0]],[leg.foot,[0,-.68,0]]]){
   assert.deepEqual(node.position.toArray(),expected);
   assert.deepEqual(node.scale.toArray(),[1,1,1]);
  }
  assert.equal(arm.hand.parent,arm.elbow);assert.equal(arm.elbow.parent,arm.shoulder);
  assert.equal(leg.foot.parent,leg.knee);assert.equal(leg.knee.parent,leg.hip);
 }
 for(const weaponKind of ['none','axe','dagger','bow'])for(const attack of [-1,.25,.5,.9]){
  animateSphericalTauren(actor,{weaponKind,attack,walk:.65,phase:2,time:1,dt:.016});
  actor.root.updateMatrixWorld(true);
  actor.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
 }
});

test('orc sculpture shares geometry without sharing disposable materials and bounds its render cost',()=>{
 installDom();const a=createOrc(THREE,new THREE.Scene()),b=createOrc(THREE,new THREE.Scene());
 const meshes=[];a.root.traverse(o=>{if(o.isMesh)meshes.push(o)});
 assert.ok(meshes.length<70,'rigid parts are batched within each animated joint');
 const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);
 assert.ok(triangles<40000,'the model must stay practical for nearby multiplayer avatars');
 for(const mesh of meshes){
  const other=b.root.getObjectByName(mesh.name);
  assert.ok(other?.isMesh,mesh.name);assert.equal(mesh.geometry,other.geometry);
  assert.notEqual(mesh.material,other.material);
  assert.equal(mesh.geometry.userData.actorShared,true);
  for(const attr of Object.values(mesh.geometry.attributes))assert.ok(Array.from(attr.array).every(Number.isFinite));
  for(const index of mesh.geometry.index.array)assert.ok(index<mesh.geometry.attributes.position.count);
 }
});

test('descending limb profiles and curved details have outward-facing surfaces',()=>{
 const profile=orcProfile(THREE,'test-descending',[[1,.2,.2,0],[0,.2,.2,0]],{segments:20,power:1});
 for(let row=0;row<4;row++){
  const n=profile.attributes.normal;
  assert.ok(new THREE.Vector3().fromBufferAttribute(n,row*21)
   .distanceTo(new THREE.Vector3().fromBufferAttribute(n,row*21+20))<1e-7,'the painted front seam stays smoothly lit');
 }
 const curve=orcCurve(THREE,'test-outward-curve',[[0,0,0],[0,1,0]],[.2,.2],{sides:12});
 for(const geometry of [profile,curve]){
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  let checked=0;
  for(let i=0;i<p.count;i++){
   if(Math.abs(n.getY(i))>.5)continue;
   const radial=new THREE.Vector3(p.getX(i),0,p.getZ(i));
   if(radial.length()<.1)continue;
   assert.ok(radial.normalize().dot(new THREE.Vector3().fromBufferAttribute(n,i))>.8);
   checked++;
  }
  assert.ok(checked>10);
 }
});

test('orc mounting preserves the world root, weapon grip and original dismounted leg anchors',()=>{
 installDom();const actor=createOrc(THREE,new THREE.Scene());equipHunterVisual(THREE,actor);
 actor.root.position.set(5,7,-3);actor.root.rotation.set(.2,-.6,.1);
 const position=actor.root.position.clone(),rotation=actor.root.quaternion.clone();
 for(let frame=0;frame<8;frame++){
  animateSphericalTauren(actor,{weaponKind:'bow',walk:.6,phase:frame*.3,time:frame/10});
  syncForestWolfMount(THREE,actor,{riding:true,time:frame/10,travelled:.1,heading:frame*.02});
  actor.root.updateMatrixWorld(true);
  assert.ok(actor.root.position.distanceTo(position)<1e-8);
  assert.ok(actor.root.quaternion.angleTo(rotation)<1e-7);
  const grip=actor.root.userData.hunterBow.getObjectByName('bow-grip');
  assert.ok(grip.getWorldPosition(new THREE.Vector3())
   .distanceTo(actor.arms[0].hand.localToWorld(new THREE.Vector3(0,-.10,.015)))<1e-8);
 }
 syncForestWolfMount(THREE,actor,{riding:false});
 animateSphericalTauren(actor,{weaponKind:'bow'});
 assert.deepEqual(actor.legs.map(leg=>leg.hip.position.x),[-.38,.38]);
 assert.equal(actor.root.userData.ngwMountVisual.root.visible,false);
});
