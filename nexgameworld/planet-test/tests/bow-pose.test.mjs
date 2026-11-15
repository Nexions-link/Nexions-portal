import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTauren,initStartZoneMath} from '../start-zone.js';
import {bowShotPose,bowNockPosition,bowStanceAngle,bowHeadYaw,BOW_RELEASE_PHASE,BOW_NOCK_Y,BOW_NOCK_Z} from '../bow-pose.js';
import {HUNTER_ARROW_NOCK_Z,HUNTER_ARROW_TIP_Z} from '../hunter-arrow.js';
import {getBowReleasePose} from '../bow-visual.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {syncForestWolfMount} from '../mount-visual.js';
import {installDom} from './harness.mjs';

test('bow draw holds through the authoritative impact phase and then releases quickly',()=>{
 assert.equal(BOW_RELEASE_PHASE,.425);
 for(const invalid of [-1,NaN,Infinity,2])assert.equal(bowShotPose(invalid).active,false);
 assert.equal(bowShotPose(0).draw,0);
 assert.equal(bowShotPose(.04).loaded,false,'arrow appears after both hands reach the shooting plane');
 assert.equal(bowShotPose(.08).loaded,true);
 assert.ok(bowShotPose(.15).draw>0&&bowShotPose(.15).draw<1);
 for(const progress of [.30,.37,.424]){
  const state=bowShotPose(progress);
  assert.equal(state.draw,1);assert.equal(state.loaded,true);assert.equal(state.released,false);
 }
 const release=bowShotPose(.425);
 assert.equal(release.released,true);assert.equal(release.loaded,false);
 assert.equal(release.draw,1,'release starts at impact, without dropping the draw early');
 assert.equal(bowShotPose(.49).draw,0);
 assert.equal(bowShotPose(1).raise,0);
});

test('nock and arrow rest stay above the gripping fist and beside the wood throughout draw',()=>{
 for(const draw of [0,.25,.5,1]){
  const nock=bowNockPosition(THREE,draw);
  assert.equal(nock.y,BOW_NOCK_Y);assert.equal(nock.z,BOW_NOCK_Z);
  assert.ok(nock.y>.25,'shaft clears the top of the gripping palm');
  assert.ok(Math.abs(nock.z)>.045,'shaft stays beside the wooden tube');
 }
});

function actorFor(raceId){
 installDom();initStartZoneMath(THREE);
 const actor=createTauren(THREE,new THREE.Scene(),{raceId,classId:'hunter',player:true});
 actor.root.position.set(13,7,-19);actor.root.rotation.set(.4,-.8,.2);
 actor.root.userData.hunterBow.visible=true;return actor;
}

function pose(actor,attack){
 const phase=bowShotPose(attack);
 // The ordinary animator supplies this visual quarter stance before arm IK.
 actor.chest.rotation.set(.03,bowStanceAngle(actor)*phase.raise,.015);actor.chest.scale.y=1.005;
 return actor.root.userData.hunterBow.updatePose({attack});
}

test('both races keep the drawing palm on the actual nock and hold the bow vertically',()=>{
 for(const raceId of ['orc','hornfolk']){
  const actor=actorFor(raceId),bow=actor.root.userData.hunterBow;
  const nodes=[actor.root,actor.body,actor.neck,actor.head,...actor.arms.flatMap(a=>[a.shoulder,a.elbow,a.hand])];
  const anchors=nodes.map(node=>({node,position:node.position.clone(),scale:node.scale.clone()}));
  const rootRotation=actor.root.quaternion.clone();
  let contacts=0;
  for(let frame=0;frame<=100;frame++){
   const progress=frame/100,state=pose(actor,progress);
   assert.equal(state.leftReachable,true,raceId+' left arm can reach at '+progress);
   assert.equal(state.rightReachable,true,raceId+' right arm can reach at '+progress);
   actor.root.updateWorldMatrix(true,true);
   const palm=actor.arms[0].hand.localToWorld(new THREE.Vector3(0,-.10,.015));
   assert.ok(palm.distanceTo(bow.getObjectByName('bow-grip').getWorldPosition(new THREE.Vector3()))<1e-7);
   const upper=bow.getObjectByName('bow-tip-upper').getWorldPosition(new THREE.Vector3());
   const lower=bow.getObjectByName('bow-tip-lower').getWorldPosition(new THREE.Vector3());
   const up=new THREE.Vector3(0,1,0).applyQuaternion(rootRotation);
   assert.ok(upper.sub(lower).normalize().dot(up)>.999,'bow limbs stay vertical in the radial actor frame');
   if(state.contact){
    const hand=actor.arms[1].hand.localToWorld(new THREE.Vector3(0,-.10,.015));
    const nock=bow.getObjectByName('bow-nock').getWorldPosition(new THREE.Vector3());
    assert.ok(hand.distanceTo(nock)<1e-6,raceId+' draws the real string at '+progress);
    contacts++;
   }
  }
  assert.ok(contacts>30);
  for(const {node,position,scale} of anchors){
   assert.ok(node.position.distanceTo(position)<1e-9,node.name+' attachment never drifts');
   assert.ok(node.scale.distanceTo(scale)<1e-9,node.name+' scale never stretches');
  }
  assert.ok(actor.root.quaternion.angleTo(rootRotation)<1e-7);
 }
});

test('release origin remains at full draw across skipped phases and a later mount transform',()=>{
 for(const raceId of ['orc','hornfolk']){
  const actor=actorFor(raceId),bow=actor.root.userData.hunterBow;
  const held=pose(actor,.425);
  actor.root.updateWorldMatrix(true,true);
  const fullNock=bow.getObjectByName('bow-nock').getWorldPosition(new THREE.Vector3());
  assert.ok(held.releaseOrigin.distanceTo(fullNock)<1e-6);
  const localRelease=held.releaseOriginLocal.clone();
  const after=pose(actor,.52);
  assert.equal(after.draw,0,'the string has already snapped back');
  actor.chest.rotation.x+=.17;actor.body.position.y+=.12;
  actor.root.updateWorldMatrix(true,true);
  const expected=actor.chest.localToWorld(localRelease);
  const release=getBowReleasePose(THREE,actor);
  assert.ok(release.origin.distanceTo(expected)<1e-6,'mounted release uses the current chest world matrix');
  const snappedNock=bow.getObjectByName('bow-nock').getWorldPosition(new THREE.Vector3());
  assert.ok(release.origin.distanceTo(snappedNock)>.40,'a skipped release frame never emits from the snapped resting string');
  assert.ok(Number.isFinite(release.direction.length())&&Math.abs(release.direction.length()-1)<1e-6);
 }
});

test('native pose evaluation and mounted follow-through preserve real nock contact for both races',()=>{
 for(const raceId of ['orc','hornfolk'])for(const mounted of [false,true]){
  const actor=actorFor(raceId),bow=actor.root.userData.hunterBow;
  actor.root.userData.weaponKind='bow';
  const phases=[...Array.from({length:51},(_,index)=>index/50),.425];
  for(const [frame,attack] of phases.entries()){
   animateSphericalTauren(actor,{weaponKind:'bow',attack,walk:.7,time:frame*.016,phase:frame*.12});
   if(mounted)syncForestWolfMount(THREE,actor,{riding:true,time:frame*.016,travelled:.03,heading:.01});
   actor.root.updateWorldMatrix(true,true);
   const cycle=bowShotPose(attack);
   if(!cycle.contact)continue;
   const palm=actor.arms[1].hand.localToWorld(new THREE.Vector3(0,-.10,.015));
   const nock=bow.getObjectByName('bow-nock').getWorldPosition(new THREE.Vector3());
   assert.ok(palm.distanceTo(nock)<1e-6,raceId+' '+(mounted?'mounted':'on foot')+' maintains contact at '+attack);
   if(cycle.draw===1){
    const release=getBowReleasePose(THREE,actor);
    assert.ok(release.origin.distanceTo(nock)<1e-6,'release anchor follows the current mounted/full-draw nock');
   }
  }
 }
});

test('the loaded shaft and its release path clear both native head meshes',()=>{
 for(const raceId of ['orc','hornfolk']){
  const actor=actorFor(raceId),bow=actor.root.userData.hunterBow;
  const materials=new Map();
  actor.head.traverse(node=>{
   for(const material of node.material?[node.material].flat():[]){
    if(!materials.has(material))materials.set(material,material.side);
    material.side=THREE.DoubleSide;
   }
  });
  try{
   assert.equal(bowStanceAngle(actor),raceId==='orc'?1.1:1.3);
   assert.equal(bowHeadYaw(actor),raceId==='orc'?0:-.35);
   for(const progress of [...Array.from({length:35},(_,index)=>(index+8)/100),.425]){
    animateSphericalTauren(actor,{weaponKind:'bow',attack:progress,combat:true,time:1,dt:1/60});
    actor.root.updateWorldMatrix(true,true);
    const arrow=bow.getObjectByName('bow-nocked-arrow');
    const nock=arrow.localToWorld(new THREE.Vector3(0,0,HUNTER_ARROW_NOCK_Z));
    const tip=arrow.localToWorld(new THREE.Vector3(0,0,HUNTER_ARROW_TIP_Z));
    const ray=new THREE.Raycaster(nock,tip.clone().sub(nock).normalize(),.0001,nock.distanceTo(tip));
    assert.equal(ray.intersectObject(actor.head,true).length,0,
     raceId+' shaft must stay outside the face, ears and horns at '+progress);
   }
  }finally{for(const [material,side] of materials)material.side=side;}
 }
});
