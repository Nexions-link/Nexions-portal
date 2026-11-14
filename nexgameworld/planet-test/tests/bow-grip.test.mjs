import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTauren,initStartZoneMath} from '../start-zone.js';
import {equipBowVisual} from '../orc-avatar.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {installDom} from './harness.mjs';

test('both hunter rigs hold the handle with the string clear and facing the drawing hand',()=>{
 installDom();initStartZoneMath(THREE);
 for(const raceId of ['orc','hornfolk']){
  const actor=createTauren(THREE,new THREE.Scene(),{raceId,classId:'hunter',player:true});
  const bow=actor.root.userData.hunterBow,hand=actor.arms[0].hand;
  const grip=bow.getObjectByName('bow-grip'),string=bow.getObjectByName('bow-string');
  assert.equal(equipBowVisual(THREE,actor),bow,'reusing equipment preserves its grip');
  actor.root.position.set(13,5,-8);
  actor.root.rotation.set(.4,-.8,.2);
  for(const pose of [{attack:-1,walk:0},{attack:.5,walk:0},{attack:-1,walk:1}]){
   animateSphericalTauren(actor,{weaponKind:'bow',dt:.016,time:1,...pose});
   actor.root.updateMatrixWorld(true);
   const palm=hand.localToWorld(new THREE.Vector3(0,-.10,.015));
   assert.ok(grip.getWorldPosition(new THREE.Vector3()).distanceTo(palm)<1e-8,
    raceId+' handle must sit inside the palm throughout idle, drawing and movement');
   const points=string.geometry.attributes.position;
   const line=new THREE.Line3(
    string.localToWorld(new THREE.Vector3().fromBufferAttribute(points,0)),
    string.localToWorld(new THREE.Vector3().fromBufferAttribute(points,1)));
   const distance=line.closestPointToPoint(palm,true,new THREE.Vector3()).distanceTo(palm);
   assert.ok(distance>.42,raceId+' string must remain outside both the palm and opposed thumb');
   const stringDirection=line.getCenter(new THREE.Vector3()).sub(palm).normalize();
   const drawingDirection=actor.arms[1].hand.localToWorld(new THREE.Vector3(0,-.10,.015))
    .sub(palm).normalize();
   assert.ok(stringDirection.dot(drawingDirection)>.75,
    raceId+' string must face the second hand, not the outside of the bow-holding arm');
  }
 }
});
