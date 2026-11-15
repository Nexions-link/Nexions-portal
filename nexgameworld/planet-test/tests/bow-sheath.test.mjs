import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTauren,initStartZoneMath} from '../start-zone.js';
import {attachBowVisual,getBowReleasePose} from '../bow-visual.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {syncForestWolfMount} from '../mount-visual.js';
import {installDom} from './harness.mjs';

function hunter(raceId){
 installDom();initStartZoneMath(THREE);
 const actor=createTauren(THREE,new THREE.Scene(),{raceId,classId:'hunter',player:true});
 actor.root.position.set(13,260,-9);actor.root.rotation.set(.31,-.72,.19);
 const bow=actor.root.userData.hunterBow;bow.visible=true;
 return {actor,bow,anchor:actor.root.getObjectByName('bow-back-anchor')};
}
function pose(actor,options={}){
 animateSphericalTauren(actor,{weaponKind:'bow',attack:-1,combat:false,
  time:1,dt:1/60,phase:0,walk:0,...options});
 actor.root.updateMatrixWorld(true);
}
const vertices=mesh=>Array.from(mesh.geometry.attributes.position.array);
const near=(a,b,message)=>assert.ok(a.distanceTo(b)<1e-6,message);
function assertGrip(actor,bow){
 near(bow.getObjectByName('bow-grip').getWorldPosition(new THREE.Vector3()),
  actor.arms[0].hand.localToWorld(new THREE.Vector3(0,-.10,.015)),
  'a drawn bow remains gripped by its handle');
}
function assertSameArms(first,second){
 for(let i=0;i<2;i++)for(const joint of ['shoulder','elbow','hand'])
  assert.ok(1-Math.abs(first.arms[i][joint].quaternion.dot(second.arms[i][joint].quaternion))<1e-10,
   'stowed equipment leaves the ordinary '+joint+' pose free');
}

for(const raceId of ['orc','hornfolk']){
 test(`${raceId}: idle and travel carry one visible bow on the back with ordinary free arms`,()=>{
  const h=hunter(raceId),bare=hunter(raceId);
  for(const walk of [0,1]){
   pose(h.actor,{walk,phase:1.2});pose(bare.actor,{weaponKind:'none',walk,phase:1.2});
   assert.equal(h.bow.visible,true);
   assert.equal(h.bow.userData.carry,'back');
   assert.equal(h.anchor.parent,h.actor.chest);
   assert.equal(h.bow.parent,h.anchor);
   assert.ok(h.anchor.position.z<0,'the carrying attachment belongs behind the torso');
   assert.equal(h.actor.root.userData.poseBowDrawn,false);
   assert.equal(h.bow.getObjectByName('bow-nocked-arrow').visible,false);
   assert.equal(getBowReleasePose(THREE,h.actor),null,'a visible back bow is not a firing muzzle');
   assertSameArms(h.actor,bare.actor);
  }
  assert.equal(attachBowVisual(THREE,h.actor),h.bow);
  const bows=[];h.actor.root.traverse(object=>{if(object.name==='hunter-bow')bows.push(object)});
  assert.deepEqual(bows,[h.bow],'carrying does not allocate a second equipment model');
 });

 test(`${raceId}: combat, real shots and recovery draw the bow; explicit visual combat controls sheathing`,()=>{
  const {actor,bow,anchor}=hunter(raceId);
  pose(actor,{combat:false,bowCombat:true});
  assert.equal(bow.parent,actor.arms[0].hand);
  assert.equal(actor.root.userData.poseBowDrawn,true);assertGrip(actor,bow);
  pose(actor,{combat:false,bowCombat:false,attack:.30});
  assert.equal(bow.parent,actor.arms[0].hand,'an actual shot draws before combat metadata arrives');
  assert.equal(bow.getObjectByName('bow-nocked-arrow').visible,true);
  assertGrip(actor,bow);
  near(actor.arms[1].hand.localToWorld(new THREE.Vector3(0,-.10,.015)),
   bow.getObjectByName('bow-nock').getWorldPosition(new THREE.Vector3()),
   'the drawing hand still reaches the string after taking the bow from the back');
  pose(actor,{combat:false,bowCombat:false,attack:.75});
  assert.equal(bow.parent,actor.arms[0].hand,'follow-through finishes before sheathing');
  assert.equal(bow.getObjectByName('bow-nocked-arrow').visible,false);
  pose(actor,{combat:false,bowCombat:true});
  assert.equal(bow.parent,actor.arms[0].hand,'a retained combat stance keeps the bow ready between shots');
  pose(actor,{combat:true,bowCombat:false});
  assert.equal(bow.parent,anchor,'visual combat is independent of generic combat bookkeeping');
  assert.equal(getBowReleasePose(THREE,actor),null);
 });

 test(`${raceId}: returning to the back clears draw deformation and losing equipment hides it`,()=>{
  const {actor,bow,anchor}=hunter(raceId),limb=bow.getObjectByName('bow-limbs');
  pose(actor);const relaxed=vertices(limb);
  pose(actor,{combat:true,attack:.30});
  assert.ok(getBowReleasePose(THREE,actor));
  assert.notDeepEqual(vertices(limb),relaxed);
  pose(actor);
  assert.equal(bow.parent,anchor);assert.equal(bow.userData.draw,0);
  assert.deepEqual(vertices(limb),relaxed,'the back never retains a drawn or recoiling string');
  assert.equal(bow.getObjectByName('bow-nocked-arrow').visible,false);
  assert.equal(getBowReleasePose(THREE,actor),null,'a previous draw leaves no usable stale release');
  pose(actor,{combat:true,attack:.30});
  pose(actor,{weaponKind:'none',combat:true});
  assert.equal(bow.visible,false,'unequipping does not leave the carrying model visible');
  assert.equal(bow.userData.carry,'back');
  assert.equal(getBowReleasePose(THREE,actor),null);
  bow.visible=true;pose(actor);
  assert.equal(attachBowVisual(THREE,actor),bow,'re-equipping reuses the same single bow');
  assert.equal(bow.parent,anchor);
 });

 test(`${raceId}: mounted travel uses free-hand riding while mounted combat preserves string contact`,()=>{
  const h=hunter(raceId),bare=hunter(raceId);
  const riding={riding:true,time:1,travelled:.04,heading:.3};
  pose(h.actor,{walk:.5,phase:1.2});pose(bare.actor,{weaponKind:'none',walk:.5,phase:1.2});
  syncForestWolfMount(THREE,h.actor,riding);syncForestWolfMount(THREE,bare.actor,riding);
  assertSameArms(h.actor,bare.actor);
  assert.equal(h.bow.parent,h.anchor);assert.equal(getBowReleasePose(THREE,h.actor),null);
  pose(h.actor,{combat:true,attack:.30});
  syncForestWolfMount(THREE,h.actor,{...riding,time:1.1});h.actor.root.updateMatrixWorld(true);
  assertGrip(h.actor,h.bow);
  near(h.actor.arms[1].hand.localToWorld(new THREE.Vector3(0,-.10,.015)),
   h.bow.getObjectByName('bow-nock').getWorldPosition(new THREE.Vector3()),
   'the rider pose cannot pull the drawing hand off the nock');
  pose(h.actor);syncForestWolfMount(THREE,h.actor,{riding:false});
  assert.equal(h.bow.parent,h.anchor);assert.equal(h.actor.root.userData.poseBowDrawn,false);
  assert.equal(getBowReleasePose(THREE,h.actor),null);
 });

 test(`${raceId}: the back bow stays clear of the saddle throughout mounted idle and gait`,()=>{
  const {actor,bow}=hunter(raceId),wood=bow.getObjectByName('bow-limbs');
  const point=new THREE.Vector3(),local=new THREE.Vector3();
  for(const [time,travelled] of [[0,0],[.35,.10],[.75,.10]]){
   pose(actor,{time});
   syncForestWolfMount(THREE,actor,{riding:true,time,travelled,heading:.3});
   actor.root.updateMatrixWorld(true);
   const tack=actor.root.getObjectByName('SaddleAndHarness'),boxes=[];
   tack.traverse(object=>{
    if(object.isMesh&&object.geometry.type==='BoxGeometry'){
     object.geometry.computeBoundingBox();
     boxes.push({bounds:object.geometry.boundingBox,inverse:object.matrixWorld.clone().invert()});
    }
   });
   assert.ok(boxes.length>0,'the actual saddle and harness blocks are checked');
   const positions=wood.geometry.attributes.position;
   let intersections=0;
   for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(wood.matrixWorld);
    for(const {bounds,inverse} of boxes){
     local.copy(point).applyMatrix4(inverse);
     if(['x','y','z'].every(axis=>local[axis]>bounds.min[axis]+1e-6&&
      local[axis]<bounds.max[axis]-1e-6))intersections++;
    }
   }
   assert.equal(intersections,0,'the wooden bow must not penetrate saddle boxes at '+time+' seconds');
  }
 });

 test(`${raceId}: repeated back/hand switches do not drift transforms or duplicate anchors`,()=>{
  const {actor,bow,anchor}=hunter(raceId);
  pose(actor);
  const backPosition=bow.position.clone(),backQuaternion=bow.quaternion.clone();
  const rootPosition=actor.root.position.clone(),rootQuaternion=actor.root.quaternion.clone();
  const armAnchors=actor.arms.map(arm=>Object.fromEntries(['shoulder','elbow','hand'].map(name=>
   [name,{position:arm[name].position.clone(),scale:arm[name].scale.clone()}])));
  for(let cycle=0;cycle<16;cycle++){
   pose(actor,{combat:true,attack:.30});assertGrip(actor,bow);
   pose(actor,{combat:true,attack:.75});pose(actor);
   near(bow.position,backPosition,'the back transform is assigned, not accumulated');
   assert.ok(1-Math.abs(bow.quaternion.dot(backQuaternion))<1e-12);
   assert.deepEqual(bow.scale.toArray(),[1,1,1]);
  }
  near(actor.root.position,rootPosition,'equipment never changes server-owned position');
  assert.ok(1-Math.abs(actor.root.quaternion.dot(rootQuaternion))<1e-12);
  for(let i=0;i<2;i++)for(const name of ['shoulder','elbow','hand']){
   near(actor.arms[i][name].position,armAnchors[i][name].position,'the authored rig anchor stays fixed');
   near(actor.arms[i][name].scale,armAnchors[i][name].scale,'the authored rig scale stays fixed');
  }
  let count=0;actor.root.traverse(object=>{if(object.name==='bow-back-anchor')count++});
  assert.equal(count,1);assert.equal(bow.parent,anchor);
 });
}
