import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTauren,initStartZoneMath} from '../start-zone.js';
import {attachBowVisual,getBowReleasePose} from '../bow-visual.js';
import {BOW_RELEASE_PHASE} from '../bow-pose.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {installDom} from './harness.mjs';

function actorFor(raceId){
 installDom();initStartZoneMath(THREE);
 const actor=createTauren(THREE,new THREE.Scene(),{raceId,classId:'hunter',player:true});
 actor.root.position.set(7,260,-11);actor.root.rotation.set(.27,-.61,.18);
 actor.root.userData.hunterBow.visible=true;return actor;
}
const pointWorld=node=>node.getWorldPosition(new THREE.Vector3());
const near=(actual,expected,message)=>assert.ok(actual.distanceTo(expected)<1e-6,message);
const positions=mesh=>Array.from(mesh.geometry.attributes.position.array);
function pose(actor,attack){
 animateSphericalTauren(actor,{weaponKind:'bow',attack,walk:0,time:1,dt:.016});
 actor.root.updateMatrixWorld(true);
}

test('both bows visibly bend and pull a V string while the handle stays in the holding palm',()=>{
 for(const raceId of ['orc','hornfolk']){
  const actor=actorFor(raceId),bow=actor.root.userData.hunterBow;
  const limb=bow.getObjectByName('bow-limbs'),string=bow.getObjectByName('bow-string');
  const grip=bow.getObjectByName('bow-grip'),nock=bow.getObjectByName('bow-nock');
  const handlePosition=grip.position.clone(),handleQuaternion=grip.quaternion.clone();
  const handleVertices=positions(grip);
  pose(actor,-1);const relaxed=positions(limb);
  pose(actor,BOW_RELEASE_PHASE-.01);const drawn=positions(limb);
  const largestBend=Math.max(...drawn.map((value,i)=>Math.abs(value-relaxed[i])));
  assert.ok(largestBend>.02,raceId+' flexes the actual bow limbs during the draw');
  const p=string.geometry.attributes.position;
  assert.equal(p.count,3,'the string has two tips and a movable middle nock');
  const upper=string.localToWorld(new THREE.Vector3().fromBufferAttribute(p,0));
  const middle=string.localToWorld(new THREE.Vector3().fromBufferAttribute(p,1));
  const lower=string.localToWorld(new THREE.Vector3().fromBufferAttribute(p,2));
  near(upper,pointWorld(bow.getObjectByName('bow-tip-upper')),'upper string end stays on the upper limb');
  near(lower,pointWorld(bow.getObjectByName('bow-tip-lower')),'lower string end stays on the lower limb');
  near(middle,pointWorld(nock),'the visible string middle is the actual nock anchor');
  const chord=new THREE.Line3(upper,lower);
  assert.ok(chord.closestPointToPoint(middle,true,new THREE.Vector3()).distanceTo(middle)>.25,
   raceId+' forms a clearly drawn V instead of translating a straight string');
  near(grip.position,handlePosition,'drawing does not slide the handle within the bow');
  assert.ok(1-Math.abs(grip.quaternion.dot(handleQuaternion))<1e-12);
  assert.deepEqual(positions(grip),handleVertices,'the rigid handle does not deform with the limbs');
  near(pointWorld(grip),actor.arms[0].hand.localToWorld(new THREE.Vector3(0,-.10,.015)),
   raceId+' keeps its palm on the real handle during full draw');
 }
});

test('the held arrow follows the real nock and disappears at release for both races',()=>{
 for(const raceId of ['orc','hornfolk']){
  const actor=actorFor(raceId),bow=actor.root.userData.hunterBow;
  const arrow=bow.getObjectByName('bow-nocked-arrow'),nock=bow.getObjectByName('bow-nock');
  const nockZ=arrow.userData.hunterArrow.nockZ;
  pose(actor,-1);assert.equal(arrow.visible,false,'an idle archer has no floating loaded arrow');
  for(const progress of [.08,.13,.28,BOW_RELEASE_PHASE-.00001]){
   pose(actor,progress);assert.equal(arrow.visible,true,raceId+' carries a real arrow before release');
   near(arrow.localToWorld(new THREE.Vector3(0,0,nockZ)),pointWorld(nock),
    raceId+' keeps the split arrow tail attached to the middle of the string at '+progress);
  }
  for(const progress of [BOW_RELEASE_PHASE,.47,.68,.99,-1]){
   pose(actor,progress);assert.equal(arrow.visible,false,'the fired arrow is not duplicated on the bow');
  }
  assert.equal(bow.getObjectByName('bow-nocked-arrow'),arrow,'shots reuse the same held arrow');
 }
});

test('deforming one bow cannot alter another avatar or its cached rigid artwork',()=>{
 const a=actorFor('orc'),b=actorFor('hornfolk');
 const first=a.root.userData.hunterBow,second=b.root.userData.hunterBow;
 assert.equal(attachBowVisual(THREE,a),first,'attaching equipment twice preserves the bow');
 const firstLimb=first.getObjectByName('bow-limbs'),secondLimb=second.getObjectByName('bow-limbs');
 const firstString=first.getObjectByName('bow-string'),secondString=second.getObjectByName('bow-string');
 assert.notStrictEqual(firstLimb.geometry,secondLimb.geometry);
 assert.notStrictEqual(firstString.geometry,secondString.geometry);
 assert.notStrictEqual(firstLimb.material,secondLimb.material);
 assert.notStrictEqual(firstString.material,secondString.material);
 assert.notEqual(firstLimb.geometry.userData.actorShared,true,'moving vertices are owned by one avatar');
 const rigidA=first.getObjectByName('bow-grip'),rigidB=second.getObjectByName('bow-grip');
 assert.strictEqual(rigidA.geometry,rigidB.geometry,'immutable handles can share their cached geometry');
 assert.equal(rigidA.geometry.userData.actorShared,true);
 pose(a,-1);pose(b,-1);
 const untouchedLimb=positions(secondLimb),untouchedString=positions(secondString);
 pose(a,BOW_RELEASE_PHASE-.01);
 assert.deepEqual(positions(secondLimb),untouchedLimb,'a remote archer retains its own resting bow');
 assert.deepEqual(positions(secondString),untouchedString,'a different archer never pulls this string');
 for(const mesh of [firstLimb,secondLimb,firstString,secondString]){
  assert.ok(positions(mesh).every(Number.isFinite));
  assert.ok(mesh.geometry.boundingSphere&&Number.isFinite(mesh.geometry.boundingSphere.radius));
 }
});

test('the full-draw release anchor follows later actor and mount-style chest transforms',()=>{
 for(const raceId of ['orc','hornfolk']){
  const actor=actorFor(raceId),bow=actor.root.userData.hunterBow;
  const nock=bow.getObjectByName('bow-nock');
  pose(actor,BOW_RELEASE_PHASE-.01);
  const held=pointWorld(nock),local=actor.chest.worldToLocal(held.clone());
  near(getBowReleasePose(THREE,actor).origin,held,'full draw releases from the actual loaded arrow tail');
  // Mount/body follow-through runs after the archery solve in the real loop.
  // The remembered chest-local anchor must be evaluated in its new frame.
  actor.body.position.y+=.61;actor.chest.rotation.x+=.24;
  actor.root.position.add(new THREE.Vector3(-4,2,7));
  actor.root.rotateY(.8);actor.root.updateMatrixWorld(true);
  const release=getBowReleasePose(THREE,actor);
  near(release.origin,actor.chest.localToWorld(local.clone()),
   raceId+' emits from its current mounted frame, not its previous world coordinates');
  assert.ok(release.origin.distanceTo(held)>.1);
  assert.ok(Math.abs(release.direction.length()-1)<1e-8);
  bow.visible=false;assert.equal(getBowReleasePose(THREE,actor),null,'unequipped bows do not emit arrows');
 }
});
