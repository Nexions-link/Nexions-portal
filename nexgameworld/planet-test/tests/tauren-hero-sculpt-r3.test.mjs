import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {taurenFurLockData,createTaurenFurLockGeometry,carveTaurenHornRadius,
 TAUREN_FUR_LOCK_BUDGET} from '../tauren-hero-sculpt.js?v=2';
import {createTauren} from '../start-zone.js';
import {animateSphericalTauren} from '../tauren-animation.js';
import {installDom} from './harness.mjs';

const spawn=opts=>{installDom();return createTauren(THREE,new THREE.Scene(),opts);};
const joints=a=>[a.root,a.body,a.chest,a.neck,a.head,a.tail,
 ...a.arms.flatMap(x=>[x.shoulder,x.elbow,x.hand]),
 ...a.legs.flatMap(x=>[x.hip,x.knee,x.foot])];
test('R3-05 curved mane is original bounded sculpture, indexed and cached for all avatars',()=>{
 const data=taurenFurLockData();
 assert.equal(data.indices.length/3,TAUREN_FUR_LOCK_BUDGET.triangles);
 assert.equal(data.positions.length,data.colors.length);
 assert.equal(data.uv.length/2,data.positions.length/3);
 assert.ok(data.positions.every(Number.isFinite));
 assert.ok(data.colors.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
 assert.deepEqual(taurenFurLockData(),data);
 const g=createTaurenFurLockGeometry(THREE);
 assert.strictEqual(g,createTaurenFurLockGeometry(THREE));
 assert.equal(g.index.count,63*3);
 assert.equal(g.name,'NGW carved tapered mane master');
 assert.ok(g.boundingSphere.radius<1.5);
});
test('horns gain actual relief with preserved curve/radius tolerance',()=>{
 for(const t of [0,.1,.25,.5,.73,1])for(let a=0;a<Math.PI*2;a+=Math.PI/5){
  const rad=carveTaurenHornRadius(t,a,.22);
  assert.ok(rad>=.22*.93&&rad<=.22*1.07);
  assert.equal(rad,carveTaurenHornRadius(t,a,.22));
 }
 assert.throws(()=>carveTaurenHornRadius(NaN,0,.2),RangeError);
});
test('R3-05 gives local and remote players new shared mane, NPC still uses light legacy geometry',()=>{
 const player=spawn({player:true,fur:0x836144});
 const remote=spawn({remotePlayer:true,fur:0x937252});
 const npc=spawn({fur:0x836144});
 const ref=createTaurenFurLockGeometry(THREE);
 const mane=player.visualDetails.batches.find(m=>m.name==='nexgameworld-mane-layered-fur');
 assert.ok(mane&&mane.isInstancedMesh);
 assert.strictEqual(mane.geometry,ref);
 assert.ok(mane.material.vertexColors);
 const countLocks=actor=>{
  let found=0;
  actor.root.traverse(obj=>{if(obj.isMesh&&!obj.isInstancedMesh&&obj.geometry===ref)found++;});
  return found;
 };
 assert.ok(countLocks(player)>=20);
 assert.equal(countLocks(player),countLocks(remote));
 assert.equal(countLocks(npc),0,'do not increase geometry for old NPC population');
 const remoteMain=remote.chest.children.find(o=>o.isMesh&&o.geometry===ref);
 assert.ok(remoteMain&&remoteMain.material.vertexColors);
 assert.strictEqual(remoteMain.geometry,ref);
});
test('original rig, hands, animation, dimensions and inspector preview remain compatible',()=>{
 const a=spawn({player:true}),baseline=spawn({});
 assert.equal(joints(a).length,joints(baseline).length);
 for(const [index,joint] of joints(a).entries()){
  assert.ok(joint.position.distanceTo(joints(baseline)[index].position)<1e-9);
  assert.ok(joint.quaternion.angleTo(joints(baseline)[index].quaternion)<1e-9);
 }
 const weapon=new THREE.Group(),shield=new THREE.Group();
 a.arms[1].hand.add(weapon);a.arms[0].hand.add(shield);
 a.root.userData.equipmentGrip={
  weapon:{x:-1.17,y:.2,z:.1},shield:{x:1.9,y:0,z:-.13}
 };
 for(let i=0;i<30;i++)animateSphericalTauren(a,{
  dt:1/60,time:i/60,walk:.8,phase:i*.2,weaponKind:'axe',
  attack:i/29,blockRemaining:.3
 });
 assert.strictEqual(weapon.parent,a.arms[1].hand);
 assert.strictEqual(shield.parent,a.arms[0].hand);
 assert.equal(a.root.userData.equipmentGrip.weapon.x,-1.17);
 const clone=a.root.clone(true),ref=createTaurenFurLockGeometry(THREE);
 assert.ok(clone.getObjectByName('nexgameworld-mane-layered-fur'));
 assert.strictEqual(clone.getObjectByName('nexgameworld-mane-layered-fur').geometry,ref);
 const hide=a.chest.children.find(o=>o.isMesh&&o.material.map);
 const pectorals=a.chest.getObjectByName('ngw-anatomy-v2-sternum-and-pectoral');
 assert.ok(hide&&pectorals.material.map);
 assert.strictEqual(pectorals.material.map,hide.material.map);
});
test('no model replacements or camera/equipment/network mutations',()=>{
 const source=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(source,/heroSculpt:player\|\|remotePlayer/);
 assert.match(source,/createTaurenFurLockGeometry\(THREE\)/);
 assert.match(source,/taurenHorn\(head,s,heroSculpt\)/);
 assert.match(world,/createTauren\(THREE,scene,\{player:true\}\)/);
 assert.doesNotMatch(source,/Skinning|GLTFLoader|addCollider/);
});
