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
 assert.ok(Math.abs(hero.arms[1].hand.rotation.x-(-1.17))<.5,
  'attack pose rotates wrist temporarily around fixed weapon grip');
 assert.ok(Math.abs(hero.arms[0].hand.rotation.x-1.91)<.3,
  'shield block rotates wrist temporarily around fixed shield grip');
 assert.deepEqual(hero.root.userData.equipmentGrip.weapon,{x:-1.17,y:.23,z:.15});
 assert.deepEqual(hero.root.userData.equipmentGrip.shield,{x:1.91,y:0,z:-.13});
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

test('eyes are not buried by any new facial geometry in economy, balanced or high detail',()=>{
 // Regression: anatomy v2 previously placed brow ellipsoids directly in
 // front of both pupils, rendering the player effectively eyeless.
 for(const player of [true,false]){
  const {actor}=spawn(player?{player:true}:{remotePlayer:true});
  const pupils=actor.head.children.filter(m=>m.isMesh&&
   m.material?.color?.getHex()===0x231f19&&
   Math.abs(m.position.y-.134)<.002&&m.position.z>.5);
  assert.equal(pupils.length,2,'both dark pupils must project beyond the snout');
  for(const quality of [.15,.68,1]){
   actor.anatomy.setQuality(quality);
   actor.root.updateWorldMatrix(true,true);
   for(const sign of [-1,1]){
    // Eye front is +Z in the head's local frame, regardless of spherical
    // radial-up pose. Actual instanced raycast is called directly because
    // cosmetic meshes correctly ignore gameplay target-selection raycasts.
    const pupil=pupils.find(m=>Math.sign(m.position.x)===sign);
    assert.ok(pupil,'missing eye on side '+sign);
    const front=pupil.position.z+pupil.scale.z+.002;
    const origin=actor.head.localToWorld(new THREE.Vector3(sign*.247,.134,front));
    const direction=new THREE.Vector3(0,0,1).transformDirection(actor.head.matrixWorld);
    const ray=new THREE.Raycaster(origin,direction,.001,2);
    const occluders=[];
    for(const mesh of actor.anatomy.meshes.filter(m=>m.visible&&m.parent===actor.head)){
     const hits=[];THREE.InstancedMesh.prototype.raycast.call(mesh,ray,hits);
     if(hits.length)occluders.push(mesh.name);
    }
    assert.deepEqual(occluders,[],`eye ${sign} is obscured by sculpt at quality ${quality}`);
   }
  }
 }
});
test('animated eye glints remain outside iris and match the newly positioned pupils',()=>{
 const {actor}=spawn({player:true});
 const glints=actor.visualDetails.batches.find(m=>m.name==='nexgameworld-eye-highlights');
 assert.ok(glints&&glints.count===2);
 for(let i=0;i<2;i++){
  const row=new THREE.Matrix4();glints.getMatrixAt(i,row);
  const point=new THREE.Vector3().setFromMatrixPosition(row);
  assert.ok(point.z>.538,'glint must not be hidden behind the dark pupil');
 }
});

test('refined original face has symmetric cheek, nasal and muzzle silhouette below eyes',()=>{
 const {actor}=spawn({player:true});
 const names=actor.anatomy.meshes.map(m=>m.name);
 for(const part of ['nasal-bridge','cheek-and-jowl','cheek-fur-ridges','muzzle-folds']){
  assert.ok(names.includes('ngw-anatomy-v2-'+part),part+' should be present');
 }
 const headMeshes=actor.anatomy.meshes.filter(m=>m.parent===actor.head);
 const eyeY=.134;
 for(const mesh of headMeshes.filter(m=>/nasal-bridge|cheek-and-jowl|cheek-fur-ridges|muzzle-folds/.test(m.name))){
  for(let i=0;i<mesh.count;i++){
   const transform=new THREE.Matrix4();
   mesh.getMatrixAt(i,transform);
   const position=new THREE.Vector3().setFromMatrixPosition(transform);
   assert.ok(position.y<eyeY-.15,
    mesh.name+' must not cover the eye line');
  }
 }
 actor.anatomy.setQuality(1);
 assert.ok(actor.anatomy.triangles<=18000,'keep iPhone high quality below the 18k triangle budget');
});
test('both eyes stay visible from front and three-quarter camera angles',()=>{
 const {actor}=spawn({player:true});
 actor.root.updateWorldMatrix(true,true);
 for(const quality of [.15,.68,1]){
  actor.anatomy.setQuality(quality);
  for(const sign of [-1,1]){
   const pupil=new THREE.Vector3(sign*.247,.134,.538);
   for(const offset of [0,sign*.19,sign*.31]){
    const eye=new THREE.Vector3(pupil.x+offset,.14,1.60);
    const direction=pupil.clone().sub(eye);
    const distance=direction.length();
    const ray=new THREE.Raycaster(
     actor.head.localToWorld(eye),
     direction.normalize().transformDirection(actor.head.matrixWorld),
     .001,distance-.015);
    for(const mesh of actor.anatomy.meshes.filter(m=>m.visible&&m.parent===actor.head)){
     const hits=[];THREE.InstancedMesh.prototype.raycast.call(mesh,ray,hits);
     assert.equal(hits.length,0,
      mesh.name+' obscures eye '+sign+' at quality '+quality+' offset '+offset);
    }
   }
  }
 }
});
