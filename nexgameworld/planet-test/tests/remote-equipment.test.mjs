import test from 'node:test';
import assert from 'node:assert/strict';
import {remoteEquipmentSpec} from '../remote-equipment.js';

test('server-certified ordinary gear uses the same assets and wrist tuning as the local hero',()=>{
 const p={equipment:{weapon:'wornAxe',shieldId:'batteredBuckler'}};
 const weapon=remoteEquipmentSpec(p,'weapon'),shield=remoteEquipmentSpec(p,'shield');
 assert.equal(weapon.url,'../assets/weapons/tauren-axe-v0.1.glb');
 assert.equal(weapon.kind,'axe');
 assert.equal(shield.url,'../assets/shields/nexgame_round_shield_poor.glb');
 assert.equal(shield.kind,'round');
 assert.equal(weapon.tuning.handX,-180);
 assert.equal(shield.tuning.shieldY,-140);
});
test('weapons and quality shields follow the actual equipped catalog item',()=>{
 for(const [itemId,kind,file] of [
  ['feebleSword','sword','plains-sword-v0.1.glb'],
  ['letterOpener','dagger','steppe-dagger-v0.1.glb'],
  ['trailbreakerAxe','axe','tauren-axe-v0.1.glb']
 ]){
  const spec=remoteEquipmentSpec({equipment:{weapon:itemId}},'weapon');
  assert.equal(spec.kind,kind);
  assert.ok(spec.url.endsWith(file));
 }
 for(const id of ['trailwardenShield','infantryBear']){
  const spec=remoteEquipmentSpec({equipment:{shieldId:id}},'shield');
  assert.equal(spec.kind,'kite');
  assert.equal(spec.url,'../assets/shields/nexgame_kite_shield_quality.glb');
 }
});
test('equipment URLs and rarities are never trusted from network packets',()=>{
 const fake={equipment:{weapon:'not-an-item',shieldId:'wornAxe'},
  modelPath:'https://malicious.invalid/weapon.glb',rarity:'epic'};
 assert.equal(remoteEquipmentSpec(fake,'weapon'),null);
 assert.equal(remoteEquipmentSpec(fake,'shield'),null);
 assert.equal(remoteEquipmentSpec({equipment:{weapon:'chainVest'}},'weapon'),null);
 assert.equal(remoteEquipmentSpec({equipment:{shieldId:'no-shield'}},'shield'),null);
 assert.equal(remoteEquipmentSpec({equipment:{weapon:'wornAxe'}},'head'),null);
});
test('unique administrator Battlefury is drawn only with server-certified appearance',()=>{
 const equipment={weapon:'adminBattlefury'};
 assert.equal(remoteEquipmentSpec({equipment},'weapon'),null);
 assert.equal(remoteEquipmentSpec({equipment,battlefury:{itemId:'wornAxe'}},'weapon'),null);
 const gear=remoteEquipmentSpec({equipment,battlefury:{itemId:'adminBattlefury',pose:{}}},'weapon');
 assert.equal(gear.url,'../assets/weapons/admin-battlefury.glb');
 assert.equal(gear.battlefury,true);
});
test('two remote avatars render GLB weapon and shield, switch gear, and unequip without duplicates',async()=>{
 const THREE=await import('three');
 const {createSphericalPresence}=await import('../sphere-online.js');
 const old={WebSocket:globalThis.WebSocket,setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval,document:globalThis.document};
 let socket;
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
 const scene=new THREE.Scene(),actors=[],loads=[];
 const createAvatar=()=>{
  const root=new THREE.Group(),right=new THREE.Group(),left=new THREE.Group();
  root.add(right,left);scene.add(root);
  const actor={root,arms:[{hand:left},{hand:right}],anatomy:null};
  actors.push(actor);return actor;
 };
 const equipmentScene=url=>{
  loads.push(url);
  const model=new THREE.Group();
  const child=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
   new THREE.MeshStandardMaterial({color:0xaaaaaa}));
  child.name=url.includes('shield')?'shield-face':'blade';
  model.add(child);
  return Promise.resolve({scene:model});
 };
 const remote=(id,weapon,shieldId)=>({id,name:id,radius:261,normal:[0,0,1],
  heading:0,moving:false,level:5,equipment:{weapon,shieldId}});
 const emit=value=>socket.onmessage({data:JSON.stringify(value)});
 const flush=()=>new Promise(done=>setImmediate(done));
 let presence;
 try{
  presence=createSphericalPresence({THREE,scene,createAvatar,
   animateAvatar:()=>{},getPosition:()=>({normal:[0,0,1],radius:261,heading:0,moving:false}),
   getRadius:()=>261,heightAt:()=>0,loadEquipmentScene:equipmentScene});
  socket.onopen();
  emit({type:'welcome',protocol:2,world:'nexgameworld',id:'self',radius:261,
   players:[remote('ally1','wornAxe','batteredBuckler'),
    remote('ally2','wornAxe','batteredBuckler')]});
  presence.tick(.016,1);
  await flush();await flush();
  assert.equal(actors.length,2);
  for(const actor of actors){
   assert.ok(actor.arms[1].hand.getObjectByName('gear-axe'),'right hand axe');
   assert.ok(actor.arms[0].hand.getObjectByName('gear-shield'),'left hand shield');
  }
  assert.equal(loads.filter(x=>x.endsWith('tauren-axe-v0.1.glb')).length,1,
   'two players share one decoded weapon asset');
  assert.equal(loads.filter(x=>x.endsWith('nexgame_round_shield_poor.glb')).length,1,
   'two players share one decoded shield asset');
  emit({type:'snapshot',protocol:2,radius:261,players:[
   remote('ally1','feebleSword','trailwardenShield'),
   remote('ally2',null,null)],mobs:[]});
  presence.tick(.016,2);
  await flush();await flush();
  assert.ok(actors[0].arms[1].hand.getObjectByName('gear-sword'),'new sword is shown');
  assert.ok(actors[0].arms[0].hand.getObjectByName('gear-shield'),'quality shield remains shown');
  assert.equal(actors[0].arms[1].hand.getObjectByName('gear-axe'),undefined);
  assert.equal(actors[1].arms[0].hand.getObjectByName('gear-shield'),undefined);
  assert.equal(actors[1].arms[1].hand.getObjectByName('gear-axe'),undefined);
 }finally{
  presence?.close();Object.assign(globalThis,old);
 }
});
