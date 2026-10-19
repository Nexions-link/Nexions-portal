import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTauren} from '../start-zone.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {installDom} from './harness.mjs';

const spawn=options=>{
 installDom();
 const scene=new THREE.Scene(),actor=createTauren(THREE,scene,options);
 return {scene,actor};
};
function joints(actor){
 return [actor.root,actor.body,actor.chest,actor.neck,actor.head,actor.tail,
  ...actor.arms.flatMap(a=>[a.shoulder,a.elbow,a.hand]),
  ...actor.legs.flatMap(l=>[l.hip,l.knee,l.foot])];
}
test('hero anatomy v2 retains original animation skeleton, weapon and shield anchors',()=>{
 const baseline=spawn({fur:0x836144}).actor;
 const hero=spawn({fur:0x836144,player:true}).actor;
 assert.equal(hero.root.userData.characterModel,'ngw-tauren-anatomy-v2');
 assert.equal(hero.anatomy.revision,2);
 assert.equal(joints(hero).length,joints(baseline).length);
 for(let i=0;i<joints(hero).length;i++){
  assert.ok(joints(hero)[i].position.distanceTo(joints(baseline)[i].position)<1e-9);
  assert.ok(joints(hero)[i].quaternion.angleTo(joints(baseline)[i].quaternion)<1e-9);
 }
 const weapon=new THREE.Group(),shield=new THREE.Group();
 hero.arms[1].hand.add(weapon);
 hero.arms[0].hand.add(shield);
 hero.root.userData.equipmentGrip={
  weapon:{x:-1.17,y:.23,z:.15},shield:{x:1.91,y:0,z:-.13}
 };
 const oldRoot=hero.root.position.clone();
 for(let i=0;i<24;i++)animateSphericalTauren(hero,{
  dt:1/60,time:i/60,walk:.7,phase:i*.15,attack:i/23,weaponKind:'axe',
  blockRemaining:.4
 });
 assert.equal(hero.arms[1].hand.rotation.x,-1.17);
 assert.equal(hero.arms[0].hand.rotation.x,1.91);
 assert.equal(weapon.parent,hero.arms[1].hand);
 assert.equal(shield.parent,hero.arms[0].hand);
 assert.ok(hero.root.position.distanceTo(oldRoot)<1e-9);
});
test('anatomy v2 has smooth affordable geometry and no targetable surfaces',()=>{
 const {actor}=spawn({player:true});
 const anatomy=actor.anatomy;
 anatomy.setQuality(1);
 assert.ok(anatomy.visibleBatches>=14);
 assert.ok(anatomy.triangles>5000&&anatomy.triangles<=18000,
  'model detail fits the dedicated 18k-triangle hero sculpt budget');
 const meshes=anatomy.meshes;
 assert.ok(meshes.every(m=>m.isInstancedMesh&&m.name.startsWith('ngw-anatomy-v2-')));
 assert.ok(meshes.every(m=>m.userData.cosmeticOnly&&m.castShadow===false&&m.receiveShadow===false));
 for(const m of meshes){
  const hits=[];
  m.raycast(new THREE.Raycaster(),hits);
  assert.equal(hits.length,0,'cosmetic geometry must not intercept NPC/player target rays');
 }
 let faces=0;
 for(const m of meshes){
  const buffer=m.geometry.attributes.position;
  assert.ok(buffer&&m.geometry.index?.count>0);
  assert.ok(Array.from(buffer.array).every(Number.isFinite));
  faces+=m.geometry.index.count;
 }
 assert.ok(faces>500);
 const before=anatomy.triangles;
 actor.visualDetails.setQuality(.15);
 assert.equal(anatomy.quality,.15);
 assert.ok(anatomy.triangles<before);
 actor.visualDetails.setQuality(1);
 assert.equal(anatomy.triangles,before);
});
test('remote player gets the new silhouette with distance LOD; ordinary NPC stays light',()=>{
 const npc=spawn({fur:0x836144}).actor;
 assert.equal(npc.anatomy,null);
 const remote=spawn({fur:0x967055,remotePlayer:true}).actor;
 assert.equal(remote.root.userData.characterModel,'ngw-tauren-anatomy-v2');
 assert.equal(remote.visualDetails,null);
 assert.ok(remote.anatomy.visibleBatches>0);
 remote.anatomy.setQuality(0);
 assert.equal(remote.anatomy.visibleBatches,0,'far away player adds zero sculpt draw calls');
 remote.anatomy.setQuality(.34);
 const near=remote.anatomy.visibleBatches;
 assert.ok(near>0);
 remote.anatomy.setQuality(.68);
 assert.ok(remote.anatomy.visibleBatches>near);
});
