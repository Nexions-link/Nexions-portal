import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createMobDeath,MOB_DEATH_SECONDS} from '../mob-death.js';
import {nearbyInteractable} from '../interaction-targeting.js';
import {harness} from './harness.mjs';
const buffer=await readFile(new URL('../../bestiary/models/dolgonog-v0.1.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
function setup({normal=new THREE.Vector3(0,1,0),scale=1,clip='Walk',slope=false}={}){
 const root=new THREE.Group(),bird=asset.scene.clone(true),visual=new THREE.Group(),scene=new THREE.Scene();
 scene.add(root);root.add(visual);visual.add(bird);visual.scale.setScalar(.6);root.scale.setScalar(scale);
 root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
 const east=new THREE.Vector3(1,0,0).applyQuaternion(root.quaternion),north=new THREE.Vector3(0,0,1).applyQuaternion(root.quaternion);
 const heightAt=n=>slope?2+.18*261*n.dot(east)+.08*261*n.dot(north):0;
 root.position.copy(normal).multiplyScalar(261+heightAt(normal)+.09);
 const shadow=new THREE.Object3D();shadow.position.y=.06;root.add(shadow);
 const mixer=new THREE.AnimationMixer(bird),entity={root,index:1,contactShadow:shadow};
 const death=createMobDeath({THREE,entity,visual,getRadius:()=>261,heightAt,mixer});
 mixer.clipAction(asset.animations.find(c=>c.name===clip)).play();mixer.update(.31);
 visual.rotation.x=-.03;visual.position.z=.07;
 return {root,bird,visual,mixer,entity,death,heightAt};
}
function vertices(h){
 h.root.updateWorldMatrix(true,true);const points=[];
 h.bird.traverse(mesh=>{if(mesh.isMesh){
  const attr=mesh.geometry.attributes.position;
  for(let i=0;i<attr.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld));
 }});return points;
}
function gap(h){return Math.min(...vertices(h).map(v=>v.length()-261-h.heightAt(v.clone().normalize())))}
for(const clip of ['Walk','Peck'])test(`${clip}: death captures the live pose, with no bind-pose snap`,()=>{
 const h=setup({clip}),before=vertices(h),rootRotation=h.root.quaternion.clone();
 assert.ok(h.death.begin());const after=vertices(h);
 assert.equal(h.mixer.timeScale,0);assert.ok(after.every((v,i)=>v.distanceTo(before[i])<1e-10));
 h.death.update(1/120);const next=vertices(h);
 assert.ok(next.every((v,i)=>v.distanceTo(before[i])<.03));
 assert.ok(h.root.quaternion.angleTo(rootRotation)<1e-8);
});
test('full death progresses at 30/60/120 FPS to the same settled pose and holds still',()=>{
 const poses=[];
 for(const fps of [30,60,120]){
  const h=setup();h.death.begin();
  let previous=vertices(h),maxStep=0;
  for(let i=0;i<Math.ceil(MOB_DEATH_SECONDS*fps)+2;i++){
   h.death.update(1/fps);const current=vertices(h);
   maxStep=Math.max(maxStep,...current.map((v,j)=>v.distanceTo(previous[j])));previous=current;
  }
  assert.ok(maxStep<.34,`Unnatural jump ${maxStep} at ${fps} FPS`);
  assert.equal(h.death.finished,true);assert.equal(h.entity.dying,false);
  const pose=vertices(h);h.death.update(10);assert.deepEqual(vertices(h),pose);poses.push(pose);
 }
 for(const pose of poses.slice(1))assert.ok(pose.every((v,i)=>v.distanceTo(poses[0][i])<1e-8));
});
for(const [name,normal] of [['pole',new THREE.Vector3(0,1,0)],['equator',new THREE.Vector3(1,0,0)],['antipode',new THREE.Vector3(0,0,-1)]]){
 for(const scale of [1,1.8])test(`terrain contact: ${name}, scale ${scale}, sloping sphere`,()=>{
  const h=setup({normal,scale,slope:true});h.death.begin();
  for(let i=0;i<35;i++){
   h.death.update(.05);assert.ok(gap(h)>-.015,`Clipped ground by ${gap(h)} at ${h.death.elapsed}`);
  }
  assert.ok(gap(h)<.065,`Corpse floats: ${gap(h)}`);
  const body=h.bird.getObjectByName('Body').getWorldPosition(new THREE.Vector3());
  assert.ok(body.length()-261-h.heightAt(body.normalize())<1.1*scale);
 });
}
test('respawn restores the bind rig, mixer speed and initial visual transform',()=>{
 const h=setup();h.death.begin();h.death.update(1);h.death.reset();
 assert.equal(h.death.active,false);assert.equal(h.death.finished,false);assert.equal(h.entity.dying,false);
 assert.equal(h.mixer.timeScale,1);assert.deepEqual(h.visual.position.toArray(),[0,0,0]);
 assert.ok(h.visual.quaternion.angleTo(new THREE.Quaternion())<1e-8);
 assert.deepEqual(h.bird.getObjectByName('Body').position.toArray(),[0,2.25,0]);
 h.mixer.update(.1);assert.ok(h.bird.getObjectByName('Leg_L').quaternion.toArray().every(Number.isFinite));
 assert.ok(h.death.begin());assert.equal(h.death.elapsed,0);
});
test('corpse interaction is available during falling animation only if loot exists',()=>{
 const entity={kind:'mob',root:{visible:true},corpse:true,dying:true,loot:[{id:'feather',qty:1}]};
 assert.equal(nearbyInteractable([entity],()=>1,()=>true),entity);
 entity.loot=[];assert.equal(nearbyInteractable([entity],()=>1,()=>true),null);
 entity.loot=[{id:'feather',qty:1}];entity.root.visible=false;
 assert.equal(nearbyInteractable([entity],()=>1,()=>true),null);
});
test('real offline RPG advances fallback death each frame, then exposes loot',t=>{
 t.mock.method(Math,'random',()=>.5); // The shared drop table yields one feather.
 const h=harness({x:-9,z:-25});h.rpg.state.level=60;h.rpg.state.resource=100;
 h.rpg.targetNearest();h.rpg.handleSlotKey('4');h.rpg.update(.35);
 const visual=h.scene.getObjectsByProperty('name','dolgonog-fallback')[0];
 const initial=visual.quaternion.clone();assert.ok(Math.abs(visual.rotation.z)<.3);
 assert.equal(h.get('interact').hidden,false,'corpse is lootable immediately after fatal strike');
 for(let i=0;i<100;i++)h.rpg.update(.02);
 assert.ok(visual.quaternion.angleTo(initial)>1);assert.equal(h.get('interact').textContent,'Обыскать');
 assert.equal(h.get('interact').hidden,false);h.get('interact').click();
 assert.equal(h.get('modal').dataset.kind,'loot');
});

test('contact shadow follows the torso and returns to spawn position on reset',()=>{
 const h=setup();h.death.begin();h.death.update(MOB_DEATH_SECONDS);
 assert.ok(Math.abs(h.entity.contactShadow.position.x)>.5);
 const p=h.entity.contactShadow.getWorldPosition(new THREE.Vector3());
 assert.ok(Math.abs(p.length()-261-.06)<1e-7);
 h.death.reset();assert.deepEqual(h.entity.contactShadow.position.toArray(),[0,.06,0]);
});
