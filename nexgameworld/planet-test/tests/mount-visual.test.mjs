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

test('saddle follows spine, and rider shares mounted gait suspension',()=>{
 const a=actor();
 syncForestWolfMount(THREE,a,{riding:true,time:1,travelled:0});
 const visual=a.root.userData.ngwMountVisual;
 const saddle=visual.root.getObjectByName('SaddleAndHarness');
 assert.equal(saddle.parent,visual.wolf.body,'saddle follows the animated back, not a fixed root');
 const idleY=a.body.position.y;
 a.body.position.y=1.4;
 syncForestWolfMount(THREE,a,{riding:true,time:1+1/60,travelled:.13});
 assert.ok(Number.isFinite(a.body.position.y));
 assert.ok(Math.abs(a.body.position.y-idleY)<.2,'rider height changes with controlled suspension');
 assert.equal(visual.root.visible,true);
 const bob=mountRiderOffset(1,.13,{bounce:.06,pitch:.05});
 assert.ok(Math.abs(bob-(RIDER_RAISE+.06*WOLF_MOUNT_SCALE*.88))<1e-10);
 assert.ok(Math.abs(mountRiderOffset(1,.13,{bounce:0})-RIDER_RAISE)<1e-10);
});


test('riding turns use actual heading changes and never move the root or camera',()=>{
 const a=actor();
 a.root.position.set(4,8,12);
 syncForestWolfMount(THREE,a,{riding:true,time:1,travelled:.06,heading:0});
 const m=a.root.userData.ngwMountVisual;
 let lean=0;
 for(let i=1;i<60;i++){
  syncForestWolfMount(THREE,a,{riding:true,time:1+i/60,travelled:.06,heading:i*.015});
  lean=Math.max(lean,Math.abs(m.wolf.body.rotation.z));
 }
 assert.ok(lean>.005,'wolf subtly banks into the turn');
 assert.deepEqual(a.root.position.toArray(),[4,8,12],'visuals never move player root');
 syncForestWolfMount(THREE,a,{riding:false});
 syncForestWolfMount(THREE,a,{riding:true,time:3,travelled:0,heading:2.5});
 assert.ok(Math.abs(m.wolf.body.rotation.z)<.04,'remount heading starts without a snap');
});
