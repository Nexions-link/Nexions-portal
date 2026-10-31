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
  socket.onopen();socket.onmessage({data:JSON.stringify({type:'welcome',protocol:2,world:'nexgameworld',radius:261,id:'hero',authenticated:true,progress:{revision:1,level:1,positionNormal:[0,0,1],heading:0},players:[]})});
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


test('authenticated websocket does not unlock inventory or combat before verified Neon welcome',async()=>{
 const THREE=await import('three');
 const {createSphericalPresence}=await import('../sphere-online.js');
 const old={WebSocket:globalThis.WebSocket,setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval};
 const sockets=[],states=[];
 class FakeSocket{
  static OPEN=1;static CONNECTING=0;static CLOSING=2;
  constructor(){this.readyState=1;this.sent=[];sockets.push(this)}
  send(raw){this.sent.push(JSON.parse(raw))}
  close(code=1000){this.readyState=3;this.onclose?.({code})}
 }
 globalThis.WebSocket=FakeSocket;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene:new THREE.Scene(),
   getPosition:()=>({normal:[0,0,1],radius:261,heading:0,moving:false}),
   auth:{sessionToken:'session',characterId:'hero'},
   onStatus:state=>states.push(state)});
  const ws=sockets[0];ws.onopen();
  assert.equal(ws.sent[0].type,'authJoin');
  assert.equal(presence.connected,false);
  assert.equal(presence.economy('merchantBuy',{itemId:'wornAxe'}),false);
  assert.equal(presence.sendAttack('autoAttack','dolgonog-0'),false);
  assert.equal(presence.openChest([]),false);
  assert.deepEqual(ws.sent.map(msg=>msg.type),['authJoin']);
  ws.onmessage({data:JSON.stringify({type:'welcome',world:'nexgameworld',
   protocol:2,radius:261,id:'hero',authenticated:false,players:[]})});
  assert.equal(presence.connected,false);
  assert.equal(states.includes('online'),false);
  assert.equal(states.at(-1),'auth_required');
 }finally{
  presence?.close();Object.assign(globalThis,old);
 }
});

test('trusted reconnect reloads server progress and prevents replaying disconnected actions',async()=>{
 const THREE=await import('three');
 const {createSphericalPresence}=await import('../sphere-online.js');
 const old={WebSocket:globalThis.WebSocket,setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval,setTimeout:globalThis.setTimeout,
  clearTimeout:globalThis.clearTimeout};
 const sockets=[],timers=[],states=[],revisions=[],corrections=[];
 class FakeSocket{
  static OPEN=1;static CONNECTING=0;static CLOSING=2;
  constructor(){this.readyState=1;this.sent=[];sockets.push(this)}
  send(raw){this.sent.push(JSON.parse(raw))}
  close(code=1000){this.readyState=3;this.onclose?.({code})}
 }
 globalThis.WebSocket=FakeSocket;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
 globalThis.setTimeout=fn=>{const timer={fn,cancelled:false};timers.push(timer);return timer};
 globalThis.clearTimeout=timer=>{if(timer)timer.cancelled=true};
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene:new THREE.Scene(),
   getPosition:()=>({normal:[0,0,1],radius:261,heading:0,moving:false}),
   auth:{sessionToken:'session',characterId:'hero'},
   onStatus:state=>states.push(state),
   onVerifiedProgress:progress=>{
    assert.equal(presence.connected,false,'writes locked during resync');
    revisions.push(progress.revision);
   },
   onPositionCorrection:msg=>corrections.push(msg)});
  const first=sockets[0];first.onopen();
  const welcome=revision=>({type:'welcome',world:'nexgameworld',
   protocol:2,radius:261,id:'hero',authenticated:true,
   progress:{revision,level:2,positionNormal:[0,0,1],heading:0},players:[]});
  first.onmessage({data:JSON.stringify(welcome(5))});
  assert.equal(presence.connected,true);
  assert.equal(presence.economy('merchantBuy',{itemId:'wornAxe',requestId:'one'}),true);
  assert.equal(first.sent.filter(msg=>msg.type==='economyAction').length,1);
  first.close(1011);
  assert.equal(presence.connected,false);
  assert.equal(states.at(-1),'reconnecting');
  assert.equal(presence.economy('merchantBuy',{itemId:'wornAxe',requestId:'two'}),false);
  assert.equal(presence.moveChest('deposit',0,'two'),false);
  assert.equal(timers.filter(t=>!t.cancelled).length,1);
  timers.find(t=>!t.cancelled).fn(); // Reconnect timer.
  const second=sockets[1];second.onopen();
  assert.equal(presence.connected,false);
  assert.equal(second.sent.filter(msg=>msg.type==='economyAction').length,0);
  second.onmessage({data:JSON.stringify(welcome(6))});
  assert.equal(presence.connected,true);
  assert.deepEqual(revisions,[5,6]);
  assert.deepEqual(corrections.map(x=>x.reason),['resync','resync']);
  assert.equal(second.sent.some(msg=>msg.requestId==='two'),false);
  assert.equal(states.at(-1),'online');
 }finally{
  presence?.close();Object.assign(globalThis,old);
 }
});

test('a lost account session is not retried indefinitely',async()=>{
 const THREE=await import('three');
 const {createSphericalPresence}=await import('../sphere-online.js');
 const old={WebSocket:globalThis.WebSocket,setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval,setTimeout:globalThis.setTimeout};
 let socket,timers=0;
 class FakeSocket{
  static OPEN=1;static CONNECTING=0;static CLOSING=2;
  constructor(){socket=this;this.readyState=1}
  send(){}
  close(code=1000){this.readyState=3;this.onclose?.({code})}
 }
 globalThis.WebSocket=FakeSocket;globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
 globalThis.setTimeout=()=>{timers++;return timers};
 let presence;
 try{
  const states=[];
  presence=createSphericalPresence({THREE,scene:new THREE.Scene(),
   getPosition:()=>({normal:[0,0,1],radius:261,heading:0,moving:false}),
   auth:{sessionToken:'session',characterId:'hero'},onStatus:x=>states.push(x)});
  socket.onopen();socket.close(1008);
  assert.equal(presence.connected,false);
  assert.equal(states.at(-1),'auth_required');
  assert.equal(timers,0);
 }finally{
  presence?.close();Object.assign(globalThis,old);
 }
});

test('acknowledged snapshots do not rewind locally predicted iPhone movement',async()=>{
 const THREE=await import('three');
 const {createSphericalPresence,greatCircleDistance}=await import('../sphere-online.js');
 const old={WebSocket:globalThis.WebSocket,setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval};
 let ws,sendTick;
 class Socket{static OPEN=1;constructor(){ws=this;this.readyState=1;this.sent=[]}
  send(raw){this.sent.push(JSON.parse(raw))}close(){this.readyState=3}}
 globalThis.WebSocket=Socket;globalThis.setInterval=fn=>{sendTick=fn;return 1};
 globalThis.clearInterval=()=>{};
 let normal=[0,0,1];const corrections=[];
 const at=metres=>[Math.sin(metres/261),0,Math.cos(metres/261)];
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene:new THREE.Scene(),
   getPosition:()=>({normal,radius:261,heading:0,moving:true}),
   onPositionCorrection:x=>corrections.push(x)});
  ws.onopen();
  ws.onmessage({data:JSON.stringify({type:'welcome',protocol:2,
   world:'nexgameworld',radius:261,id:'self',players:[]})});
  normal=at(1);sendTick();
  const seq=ws.sent.find(x=>x.type==='move').moveSeq;
  normal=at(3);
  const own=confirmed=>({id:'self',name:'Hero',normal:confirmed,
   heading:0,moving:true,radius:261,moveSeq:seq});
  const snapshot=confirmed=>ws.onmessage({data:JSON.stringify({
   type:'snapshot',protocol:2,radius:261,players:[own(confirmed)],mobs:[]})});
  snapshot(at(1));
  assert.equal(corrections.length,0,'a matching old ACK cannot pull the client backwards');
  snapshot(at(-1.5));
  assert.equal(corrections.length,1,'server-confirmed divergence must be reconciled');
  assert.equal(corrections[0].reason,'snapshot');
  assert.ok(greatCircleDistance(corrections[0].normal,at(.5),261)<.02,
   'confirmed position includes the 2 m travelled after ACK');
 }finally{presence?.close();Object.assign(globalThis,old)}
});
