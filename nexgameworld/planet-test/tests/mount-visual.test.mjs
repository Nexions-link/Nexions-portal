import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FIRST_MOUNT_VISUAL_ID,RIDER_RAISE,WOLF_MOUNT_SCALE,mountRiderOffset,syncForestWolfMount} from '../mount-visual.js';

function actor(){
 const root=new THREE.Group(),body=new THREE.Group();
 body.position.y=1.4;root.add(body);
 const legs=[-1,1].map(sign=>{
  const hip=new THREE.Group(),knee=new THREE.Group(),foot=new THREE.Group();
  hip.position.set(sign*.43,1.4,0);hip.add(knee);knee.add(foot);root.add(hip);
  return {hip,knee,foot};
 });
 const arms=[0,1].map(()=>({shoulder:new THREE.Group(),elbow:new THREE.Group()}));
 return {root,body,legs,arms};
}
test('visuals allocate only when riding and remain hidden on foot',()=>{
 const a=actor();
 syncForestWolfMount(THREE,a,{riding:false});
 assert.equal(a.root.userData.ngwMountVisual,undefined);
 syncForestWolfMount(THREE,a,{riding:true,time:1,travelled:.1});
 const model=a.root.userData.ngwMountVisual;
 assert.ok(model);
 assert.equal(model.root.visible,true);
 assert.equal(model.root.scale.x,WOLF_MOUNT_SCALE);
 assert.ok(model.root.getObjectByName('SaddleAndHarness'));
 assert.ok(model.root.getObjectByName('NexGameWorldForestWolfMount'));
 assert.equal(FIRST_MOUNT_VISUAL_ID,'forest_wolf');
 assert.ok(a.body.position.y>=1.4+RIDER_RAISE-.025);
 assert.equal(a.legs[0].hip.position.x,-.65);
 assert.equal(a.legs[1].hip.position.x,.65);
 syncForestWolfMount(THREE,a,{riding:false});
 assert.equal(model.root.visible,false);
 assert.equal(a.legs[0].hip.position.x,-.43);
 assert.equal(a.legs[1].hip.position.x,.43);
});
test('mounted pose has bounded deterministic bob',()=>{
 assert.equal(mountRiderOffset(0,0),RIDER_RAISE);
 assert.ok(Math.abs(mountRiderOffset(1,.2)-RIDER_RAISE)<=.023);
 assert.ok(Number.isFinite(mountRiderOffset(NaN,Infinity)));
});
