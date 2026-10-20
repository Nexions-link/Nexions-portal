import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installDom} from './harness.mjs';
import {createSphericalPresence} from '../sphere-online.js';
import {BATTLEFURY_TUNER_DEFAULTS} from '../battlefury-tuner.js';

test('owner sends local cosmetic pose; other clients render and update exact remote model',{timeout:6000},async()=>{
 installDom();
 const previous=globalThis.WebSocket,oldInterval=globalThis.setInterval,
  oldClear=globalThis.clearInterval;
 let socket,loop,loads=0,localScale=2;
 const actors=[],scene=new THREE.Scene();
 class FakeSocket{
  static OPEN=1;
  constructor(){socket=this;this.readyState=1;this.sent=[]}
  send(data){this.sent.push(JSON.parse(data))}
  close(){this.readyState=3}
 }
 const createAvatar=()=>{
  const root=new THREE.Group(),right=new THREE.Group(),left=new THREE.Group();
  root.add(right,left);scene.add(root);
  const actor={root,arms:[{hand:left},{hand:right}]};
  actors.push(actor);return actor;
 };
 globalThis.WebSocket=FakeSocket;
 globalThis.setInterval=fn=>{loop=fn;return 1};
 globalThis.clearInterval=()=>{};
 let presence;
 try{
  presence=createSphericalPresence({
   THREE,scene,createAvatar,animateAvatar:()=>{},
   getPosition:()=>({normal:[0,0,1],heading:0,radius:261,moving:false}),
   getBattlefuryPose:()=>({...BATTLEFURY_TUNER_DEFAULTS,scale:localScale}),
   getRadius:()=>261,heightAt:()=>0,
   auth:{sessionToken:'test-session',characterId:'local-character'},
   loadBattlefuryScene:async()=>{
    loads++;
    const root=new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(.6,2.2,.7),new THREE.MeshStandardMaterial()));
    return root;
   }
  });
  socket.onopen();
  const peer={id:'remote-id',name:'Nexions',normal:[0,0,1],heading:0,
   radius:261,moving:false,
   battlefury:{itemId:'adminBattlefury',pose:{...BATTLEFURY_TUNER_DEFAULTS,scale:1.85}}};
  socket.onmessage({data:JSON.stringify({type:'welcome',protocol:2,world:'nexgameworld',
   radius:261,id:'myself',authenticated:true,progress:{revision:1,level:1,positionNormal:[0,0,1],heading:0},players:[peer]})});
  loop();
  const transmitted=socket.sent.find(message=>message.type==='move');
  assert.ok(transmitted,'authenticated movement is sent');
  assert.equal(transmitted.battlefuryPose.scale,2);
  presence.tick(.05,1);
  await new Promise(ok=>setImmediate(ok));
  assert.equal(actors.length,1);
  assert.equal(loads,1);
  const right=actors[0].arms[1].hand;
  const mesh=right.getObjectByName('gear-axe');
  assert.ok(mesh,'the remote axe is attached to the right hand');
  assert.equal(mesh.scale.x,1.85);
  assert.equal(actors[0].root.userData.weaponKind,'axe');
  assert.ok(actors[0].root.userData.equipmentGrip.weapon);
  socket.onmessage({data:JSON.stringify({type:'snapshot',protocol:2,radius:261,players:[
   {...peer,battlefury:{...peer.battlefury,pose:{...BATTLEFURY_TUNER_DEFAULTS,scale:.8,posX:.175}}}
  ],mobs:[]})});
  presence.tick(.05,1.2);
  assert.equal(mesh.scale.x,.8);
  assert.equal(mesh.position.x,.175);
  assert.equal(loads,1,'snapshot only transforms the loaded model, never duplicates it');
  socket.onmessage({data:JSON.stringify({type:'snapshot',protocol:2,radius:261,players:[
   {...peer,battlefury:undefined}
  ],mobs:[]})});
  presence.tick(.05,1.3);
  assert.equal(right.getObjectByName('gear-axe'),undefined,'unequipping removes only the remote visual');
  assert.equal(actors[0].root.userData.weaponKind,'none');
  assert.equal(actors[0].root.parent,scene);
 }finally{
  presence?.close();
  globalThis.WebSocket=previous;globalThis.setInterval=oldInterval;globalThis.clearInterval=oldClear;
 }
});
