import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpherePlayer,greatCircleDistance} from '../sphere-online.js';

test('spherical avatars reject invalid normals, wrong world radius and malformed IDs',()=>{
 const base={id:'hero-1',name:'Странник',radius:261,normal:[0,0,1],heading:0,moving:true};
 assert.equal(validateSpherePlayer(base,261),true);
 assert.equal(validateSpherePlayer({...base,radius:87},261),false);
 assert.equal(validateSpherePlayer({...base,normal:[20,0,0]},261),false);
 assert.equal(validateSpherePlayer({...base,normal:[NaN,0,1]},261),false);
 assert.equal(validateSpherePlayer({...base,moving:'yes'},261),false);
});
test('geodesic peer distance uses arc length instead of flat-world coordinates',()=>{
 assert.equal(greatCircleDistance([0,0,1],[0,0,1],261),0);
 assert.ok(Math.abs(greatCircleDistance([0,0,1],[1,0,0],261)-261*Math.PI/2)<1e-8);
 assert.equal(greatCircleDistance([0,0,1],[2,0,0],261),Infinity);
});

test('chest opening follows the next position packet and closing cancels a queued open',async()=>{
 const THREE=await import('three');
 const {createSphericalPresence}=await import('../sphere-online.js');
 const oldSocket=globalThis.WebSocket,oldInterval=globalThis.setInterval,oldClear=globalThis.clearInterval;
 let socket,interval;
 class FakeSocket{
  static OPEN=1;constructor(){socket=this;this.readyState=1;this.sent=[]}
  send(raw){this.sent.push(JSON.parse(raw))}
  close(){this.readyState=3}
 }
 globalThis.WebSocket=FakeSocket;globalThis.setInterval=fn=>{interval=fn;return 1};globalThis.clearInterval=()=>{};
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene:new THREE.Scene(),getPosition:()=>({normal:[0,0,1],radius:261,heading:20*Math.PI+.4,moving:false}),auth:{sessionToken:'test',characterId:'test'}});
  socket.onopen();socket.onmessage({data:JSON.stringify({type:'welcome',protocol:2,world:'nexgameworld',radius:261,id:'hero',players:[]})});
  socket.sent=[];assert.equal(presence.openChest([]),true);assert.equal(socket.sent.length,0);
  interval();assert.deepEqual(socket.sent.map(row=>row.type),['move','chestOpen']);
  assert.ok(Math.abs(socket.sent[0].heading-.4)<1e-8,'movement yaw is normalized before network send');
  assert.equal('inventory' in socket.sent[1],false);
  socket.sent=[];presence.openChest([]);presence.closeChest();interval();
  assert.deepEqual(socket.sent.map(row=>row.type),['chestClose','move']);
 }finally{presence?.close();globalThis.WebSocket=oldSocket;globalThis.setInterval=oldInterval;globalThis.clearInterval=oldClear;}
});

test('authoritative correction and snapshot convergence update local position',async()=>{
 const THREE=await import('three');
 const {createSphericalPresence}=await import('../sphere-online.js');
 const old=globalThis.WebSocket,oldInterval=globalThis.setInterval,oldClear=globalThis.clearInterval;
 let socket;
 class Socket{static OPEN=1;constructor(){socket=this;this.readyState=1}send(){}close(){this.readyState=3}}
 const corrected=[];let normal=[0,0,1];
 const realNow=Date.now;let fakeNow=10000;Date.now=()=>fakeNow;
 globalThis.WebSocket=Socket;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene:new THREE.Scene(),
   getPosition:()=>({normal,radius:261,heading:0,moving:false}),
   onPositionCorrection:x=>{corrected.push(x);normal=x.normal}});
  socket.onopen();
  socket.onmessage({data:JSON.stringify({type:'welcome',protocol:2,world:'nexgameworld',
   radius:261,id:'self',players:[]})});
  const other=[Math.sin(4/261),0,Math.cos(4/261)];
  socket.onmessage({data:JSON.stringify({type:'positionCorrection',normal:other,heading:1,reason:'collision'})});
  assert.equal(corrected[0].reason,'collision');
  fakeNow+=1000;
  const far=[Math.sin(8/261),0,Math.cos(8/261)];
  socket.onmessage({data:JSON.stringify({type:'snapshot',protocol:2,radius:261,players:[
   {id:'self',normal:far,heading:0,moving:false,radius:261,name:'Hero'}],mobs:[]})});
  assert.equal(corrected.length,2);
  assert.equal(corrected[1].reason,'snapshot');
 }finally{presence?.close();Date.now=realNow;globalThis.WebSocket=old;globalThis.setInterval=oldInterval;globalThis.clearInterval=oldClear}
});
