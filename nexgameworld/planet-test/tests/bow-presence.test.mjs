import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSphericalPresence} from '../sphere-online.js';
import {createOrc,equipHunterVisual} from '../orc-avatar.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {getBowReleasePose} from '../bow-visual.js';

// Real presence, rig and animation; only the socket, wall clock and text canvas
// are adapters. This checks observer behavior without a WebGL/browser loop.
function fixture(t,{distance=10,players=null}={}){
 const saved=Object.fromEntries(['WebSocket','setInterval','clearInterval','document'].map(key=>
  [key,{owned:Object.hasOwn(globalThis,key),value:globalThis[key]}]));
 const originalNow=Date.now;
 let socket,clock=1000000;
 class FakeSocket{
  static OPEN=1;static CONNECTING=0;
  constructor(){socket=this;this.readyState=1}
  send(){}
  close(){this.readyState=3;this.onclose?.({code:1000})}
 }
 globalThis.WebSocket=FakeSocket;
 globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){},
  createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},fillText(){}})})};
 Date.now=()=>clock;
 const scene=new THREE.Scene(),actors=[],poses=[],releases=[],combat=[];
 const player=(overrides={})=>{
  const metres=overrides.distance??distance;
  const {distance:ignored,...rest}=overrides;
  return {id:'archer',name:'Следопыт',raceId:'orc',classId:'hunter',radius:261,
   normal:[Math.sin(metres/261),0,Math.cos(metres/261)],heading:0,moving:false,
   level:8,hp:120,equipment:{weapon:'wornBow'},...rest};
 };
 const presence=createSphericalPresence({THREE,scene,
  createAvatar:()=>{
   const actor=createOrc(THREE,scene);equipHunterVisual(THREE,actor);
   actors.push(actor);return actor;
  },
  animateAvatar:(actor,pose)=>{
   poses.push({actor,attack:pose.attack,at:clock});animateSphericalTauren(actor,pose);
  },
  getPosition:()=>({normal:[0,0,1],radius:261,heading:0,moving:false}),
  getRadius:()=>261,heightAt:()=>0,
  onCombat:(event,selfId)=>combat.push({event,selfId,at:clock}),
  onBowRelease:(event,pose)=>{
   const actor=actors.at(-1);
   assert.ok(pose.origin.isVector3&&pose.direction.isVector3);
   assert.ok(pose.origin.toArray().every(Number.isFinite));
   assert.ok(pose.direction.toArray().every(Number.isFinite));
   assert.ok(Math.abs(pose.direction.length()-1)<1e-8);
   assert.equal(actor.root.getObjectByName('bow-nocked-arrow').visible,false,
    'the observer no longer holds the fired arrow');
   releases.push({event,pose,origin:pose.origin.clone(),direction:pose.direction.clone(),at:clock});
  },
  loadEquipmentScene:async()=>({scene:new THREE.Group()})
 });
 t.after(()=>{
  presence.close();Date.now=originalNow;
  for(const [key,old] of Object.entries(saved)){
   if(old.owned)globalThis[key]=old.value;else delete globalThis[key];
  }
 });
 const emit=value=>socket.onmessage({data:JSON.stringify(value)});
 const snapshot=rows=>emit({type:'snapshot',protocol:2,radius:261,players:rows,mobs:[]});
 const advance=(milliseconds,dt=Math.min(.1,milliseconds/1000)||1/60)=>{
  clock+=milliseconds;presence.tick(dt,clock/1000);
 };
 const attack=(overrides={})=>emit({type:'combat',fromId:'archer',abilityId:'autoShot',
  mobId:'mob-a',life:1,damage:25,hp:75,maxHp:100,...overrides});
 socket.onopen();
 emit({type:'welcome',protocol:2,world:'nexgameworld',id:'self',radius:261,
  players:players??[player()],mobs:[]});
 advance(distance>40?70:0);
 return {presence,scene,actors,poses,releases,combat,player,emit,snapshot,advance,attack,
  disconnect:()=>socket.close()};
}

test('observer applies combat immediately, then replays the complete draw before one release',t=>{
 const h=fixture(t),packet={abilityId:'arcaneShot',hp:50,damage:50};
 h.attack(packet);
 assert.equal(h.combat.length,1,'authoritative combat is forwarded synchronously');
 assert.equal(h.combat[0].event.hp,50);
 assert.equal(h.releases.length,0,'the ACK must not launch an arrow before the draw');
 h.advance(0);
 assert.equal(h.poses.at(-1).attack,0,'the remote draw begins at phase zero');
 h.advance(200);
 assert.ok(h.poses.at(-1).attack>0&&h.poses.at(-1).attack<.425);
 h.advance(139);assert.equal(h.releases.length,0,'no release before .34 seconds');
 h.advance(2);assert.equal(h.releases.length,1);
 assert.equal(h.releases[0].event.abilityId,'arcaneShot');
 const released=h.releases[0];
 const current=getBowReleasePose(THREE,h.actors.at(-1));
 assert.ok(current&&released.pose.origin.distanceTo(current.origin)<1e-7,
  'the original release uses the rig after its current animation pass');
 h.advance(200);h.advance(200);h.advance(300);
 assert.equal(h.releases.length,1,'follow-through and later frames never fire twice');
 assert.deepEqual(released.pose.origin.toArray(),released.origin.toArray(),
  'later animation cannot mutate an already supplied release point');
});

test('a far observer releases once when animation LOD skips across the release frame',t=>{
 const h=fixture(t,{distance:65});h.attack();h.advance(0);
 h.advance(320);assert.equal(h.releases.length,0);
 h.advance(80,.016); // not enough accumulated animation time for the far pose
 h.advance(150,.1); // next pose is .55/.8: it crossed .425 rather than landing on it
 assert.equal(h.releases.length,1,'the skipped exact frame must not swallow the arrow');
 h.advance(100);h.advance(100);
 assert.equal(h.releases.length,1);
});

test('Multi Shot target packets share one draw and release at most three distinct arrows',t=>{
 const h=fixture(t);
 h.attack({abilityId:'multiShot',mobId:'mob-a'});h.advance(80);
 h.attack({abilityId:'multiShot',mobId:'mob-b'});
 h.attack({abilityId:'multiShot',mobId:'mob-b'});
 h.attack({abilityId:'multiShot',mobId:'mob-c'});
 h.attack({abilityId:'multiShot',mobId:'mob-d'});
 assert.equal(h.combat.length,5,'all authoritative target packets remain immediately observable');
 h.advance(259);assert.equal(h.releases.length,0);
 h.advance(2);
 assert.deepEqual(h.releases.map(row=>row.event.mobId),['mob-a','mob-b','mob-c'],
  'secondary packets neither restart the draw nor duplicate a target');
 h.advance(300);assert.equal(h.releases.length,3);
});

test('delayed Multi Shot targets keep the original cycle and reuse its released pose',t=>{
 const h=fixture(t);
 h.attack({abilityId:'multiShot',mobId:'mob-a'});h.advance(200);
 h.attack({abilityId:'multiShot',mobId:'mob-b'});h.advance(0);
 assert.ok(Math.abs(h.poses.at(-1).attack-.25)<1e-8,
  'a secondary packet at 200 ms must not restart the original draw');
 h.advance(141);
 assert.deepEqual(h.releases.map(row=>row.event.mobId),['mob-a','mob-b']);
 const original=h.releases[0];
 h.advance(259);
 assert.ok(Math.abs(h.poses.at(-1).attack-.75)<1e-8);
 h.attack({abilityId:'multiShot',mobId:'mob-c'});
 assert.equal(h.releases.length,3,'a target arriving at 600 ms releases without another draw');
 const late=h.releases[2];
 assert.equal(late.at-original.at,259);
 assert.ok(late.pose.origin.distanceTo(original.origin)<1e-8,
  'a late target shares the original volley origin, not the follow-through pose');
 assert.ok(late.pose.direction.distanceTo(original.direction)<1e-8);
 h.attack({abilityId:'multiShot',mobId:'mob-c'});
 h.attack({abilityId:'multiShot',mobId:'mob-d'});
 h.advance(0);
 assert.ok(Math.abs(h.poses.at(-1).attack-.75)<1e-8,
  'late targets, duplicates and excess targets never restart the animation');
 h.advance(300);
 assert.deepEqual(h.releases.map(row=>row.event.mobId),['mob-a','mob-b','mob-c']);
});

test('a repeated authoritative packet cannot restart or duplicate an already released shot',t=>{
 const h=fixture(t),packet={abilityId:'arcaneShot',mobId:'mob-a',life:1,hp:50,damage:50};
 h.attack(packet);h.advance(341);assert.equal(h.releases.length,1);
 h.attack(packet);h.advance(341);h.advance(100);
 assert.equal(h.releases.length,1,'an identical ACK is one cosmetic shot');
});

test('self and unknown senders do not queue observer shots or replay when an actor appears later',t=>{
 const h=fixture(t,{players:[]});
 h.attack({fromId:'unknown'});h.attack({fromId:'self'});
 assert.equal(h.combat.length,2,'visual filtering does not delay authoritative consumers');
 h.snapshot([h.player({id:'unknown'})]);h.advance(400);
 assert.equal(h.releases.length,0);
});

test('a known player outside the visible scene does not carry a shot into a newly created actor',t=>{
 const h=fixture(t,{distance:100});h.attack();h.advance(100);
 assert.equal(h.actors.length,0);
 h.snapshot([h.player({distance:10})]);h.advance(300);
 assert.equal(h.releases.length,0,'an unseen release cannot become a shot after entering the scene');
});

test('mounted observers supply the release point after the rider pose moves the body',t=>{
 const h=fixture(t);
 h.snapshot([h.player({mountState:'riding',mountId:'forest_wolf'})]);
 h.advance(0);h.attack();h.advance(341);
 assert.equal(h.releases.length,1);
 const current=getBowReleasePose(THREE,h.actors.at(-1));
 assert.ok(h.releases[0].pose.origin.distanceTo(current.origin)<1e-7,
  'the rider offset must not leave the projectile at its earlier unmounted height');
});

for(const cause of ['leave','snapshot removal','weapon loss','death','visibility range loss']){
 test(`a pending observer draw is discarded after ${cause}`,t=>{
  const h=fixture(t);h.attack();h.advance(100);
  if(cause==='leave')h.emit({type:'leave',id:'archer'});
  if(cause==='snapshot removal')h.snapshot([]);
  if(cause==='weapon loss')h.snapshot([h.player({equipment:{}})]);
  if(cause==='death')h.snapshot([h.player({hp:0})]);
  if(cause==='visibility range loss')h.snapshot([h.player({distance:100})]);
  h.advance(100);
  h.snapshot([h.player()]);h.advance(200);
  assert.equal(h.releases.length,0,'restoring the actor must not resurrect its old release');
 });
}

test('disconnect removes the observer actor and its pending shot',t=>{
 const h=fixture(t);h.attack();h.advance(100);h.disconnect();h.advance(500);
 assert.equal(h.releases.length,0);
 assert.equal(h.actors[0].root.parent,null);
});

for(const pause of [850,2000]){
 test(`an expired draw is not replayed after a ${pause} ms gap`,t=>{
  const h=fixture(t);h.attack();h.advance(0);h.advance(pause);
  assert.equal(h.releases.length,0,'an expired animation must not launch from its idle pose');
  assert.equal(h.poses.at(-1).attack,-1);
  h.attack({hp:25});h.advance(341);
  assert.equal(h.releases.length,1,'discarding the stale cycle does not block the next real shot');
 });
}
