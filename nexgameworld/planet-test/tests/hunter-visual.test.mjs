import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOrc,equipBowVisual,equipHunterVisual} from '../orc-avatar.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {remoteEquipmentSpec,remoteWeaponKind} from '../remote-equipment.js';
import {createSphericalPresence} from '../sphere-online.js';

test('bow is equipment, not a permanent class pose or a change of class',()=>{
 const actor=createOrc(THREE,new THREE.Scene());
 actor.root.userData.classId='warrior';
 const bow=equipBowVisual(THREE,actor);
 assert.equal(bow.parent,actor.arms[0].hand);
 assert.equal(bow.visible,false,'wait for actual equipment before showing bow');
 assert.equal(equipBowVisual(THREE,actor),bow,'reuse the same bow');
 assert.equal(actor.root.userData.classId,'warrior');
 equipHunterVisual(THREE,actor);
 const quiver=actor.root.userData.hunterQuiver;
 equipHunterVisual(THREE,actor);
 assert.equal(actor.root.userData.hunterQuiver,quiver);
 animateSphericalTauren(actor,{weaponKind:'bow',attack:.5});
 assert.equal(actor.arms[0].shoulder.rotation.x,-1.3);
 for(const weaponKind of ['none','axe','sword','dagger']){
  animateSphericalTauren(actor,{weaponKind});
  assert.ok(Math.abs(actor.arms[0].shoulder.rotation.x)<.1,
   'hunter lowers bow arm when '+weaponKind+' is equipped');
 }
});

test('remote catalog lookup hides a legacy shield with bow and retains certified old Battlefury',()=>{
 const legacy={equipment:{weapon:'wornBow',shieldId:'batteredBuckler'}};
 assert.equal(remoteEquipmentSpec(legacy,'shield'),null);
 assert.equal(remoteWeaponKind(legacy),'bow');
 assert.equal(remoteWeaponKind({equipment:{weapon:'chainVest'}}),'none');
 assert.equal(remoteWeaponKind({equipment:{weapon:'adminBattlefury'}}),'none');
 assert.equal(remoteWeaponKind({battlefury:{itemId:'adminBattlefury'}}),'axe');
});

test('remote equipment switches to bow atomically, cancels pending shields and animates all shots',async()=>{
 const old={WebSocket:globalThis.WebSocket,setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval,document:globalThis.document};
 const now=Date.now;
 let socket,resolveShield,clock=1000000;
 class FakeSocket{
  static OPEN=1;
  constructor(){socket=this;this.readyState=1}
  send(){}
  close(){this.readyState=3}
 }
 globalThis.WebSocket=FakeSocket;
 globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){},
  createElement:()=>({width:0,height:0,getContext:()=>({
   clearRect(){},fillText(){},fillStyle:'',textAlign:'',font:'',shadowColor:'',shadowBlur:0})})};
 Date.now=()=>clock;
 const scene=new THREE.Scene(),actors=[],poses=[];
 const avatar=options=>{
  const actor=createOrc(THREE,scene);
  actor.root.userData.classId=options.classId;
  if(options.classId==='hunter')equipHunterVisual(THREE,actor);
  actors.push(actor);return actor;
 };
 const loadEquipmentScene=url=>{
  const model=new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));
  const gltf={scene:model};
  return url.includes('kite_shield')?new Promise(resolve=>{resolveShield=()=>resolve(gltf)}):Promise.resolve(gltf);
 };
 const remote=(id,classId,weapon,shieldId)=>({id,name:id,radius:261,normal:[0,0,1],
  classId,raceId:'orc',heading:0,moving:false,level:5,equipment:{weapon,shieldId}});
 const emit=value=>socket.onmessage({data:JSON.stringify(value)});
 const snapshot=(weapon,shieldId)=>emit({type:'snapshot',protocol:2,radius:261,
  players:[remote('hunter','hunter',weapon,shieldId),remote('warrior','warrior','wornBow',null)],mobs:[]});
 const flush=()=>new Promise(done=>setImmediate(done));
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene,createAvatar:avatar,
   animateAvatar:(actor,pose)=>{poses.push({actor,...pose});animateSphericalTauren(actor,pose)},
   getPosition:()=>({normal:[0,0,1],radius:261,heading:0,moving:false}),
   getRadius:()=>261,heightAt:()=>0,loadEquipmentScene});
  socket.onopen();
  emit({type:'welcome',protocol:2,world:'nexgameworld',id:'self',radius:261,
   players:[remote('hunter','hunter','wornAxe','batteredBuckler'),remote('warrior','warrior',null,null)]});
  presence.tick(.016,1);await flush();await flush();
  assert.ok(actors[0].arms[0].hand.getObjectByName('gear-shield'));
  assert.equal(actors[0].root.userData.hunterBow.visible,false);
  snapshot('wornBow','batteredBuckler');presence.tick(.016,2);
  for(const actor of actors){
   assert.equal(actor.root.userData.hunterBow.visible,true);
   assert.equal(actor.root.userData.weaponKind,'bow');
   assert.equal(actor.arms[0].hand.getObjectByName('gear-shield'),undefined);
   assert.equal(actor.arms[1].hand.getObjectByName('gear-axe'),undefined);
  }
  assert.equal(actors[1].root.userData.classId,'warrior');
  snapshot('feebleSword','trailwardenShield');presence.tick(.016,3);
  assert.equal(actors[0].root.userData.hunterBow.visible,false);
  await flush();
  assert.equal(typeof resolveShield,'function');
  snapshot('wornBow','trailwardenShield');presence.tick(.016,4);
  resolveShield();await flush();await flush();
  assert.equal(actors[0].arms[0].hand.getObjectByName('gear-shield'),undefined,
   'a shield finishing its old async request must not reappear over the bow');
  assert.equal(actors[0].arms[1].hand.getObjectByName('gear-sword'),undefined);
  for(const abilityId of ['autoShot','arcaneShot','concussiveShot','multiShot','aimedShot']){
   emit({type:'combat',fromId:'hunter',abilityId});clock+=200;
   presence.tick(.016,5);
   const pose=poses.filter(p=>p.actor===actors[0]).at(-1);
   assert.equal(pose.weaponKind,'bow');
   assert.ok(pose.attack>0&&pose.attack<1,abilityId+' animates the remote bow draw');
  }
 }finally{
  presence?.close();Date.now=now;Object.assign(globalThis,old);
 }
});
