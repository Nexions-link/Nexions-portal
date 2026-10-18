import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LONGHOUSE,HOUSE_CHEST,toHouseCoordinates,fromHouseCoordinates,insideHouse,buildHearthHouse} from '../hearth-house.js';
import {canWalkCamp,isInLonghouse} from '../sphere-physics.js';
import {CHEST_X,CHEST_Z,CHEST_RANGE} from '../../server/chest.js';
import {OFFLINE_CHEST} from '../gather-world.js';
import {createChestMotion} from '../../bestiary/chest-preview-motion.js';
import {readFileSync} from 'node:fs';
const at=(x,z)=>fromHouseCoordinates(x,z);
function walk(x,z,bodyRadius){const p=at(x,z);return canWalkCamp(p.x,p.z,bodyRadius)}
test('shared storage is at the former cabinet, in the far right corner',()=>{
 assert.equal(LONGHOUSE.chestLocalX,5.4);
 assert.equal(LONGHOUSE.chestLocalZ,-6.2);
 const local=toHouseCoordinates(HOUSE_CHEST.x,HOUSE_CHEST.z);
 assert.ok(Math.abs(local.x-5.4)<1e-9);
 assert.ok(Math.abs(local.z+6.2)<1e-9);
 assert.deepEqual(HOUSE_CHEST,{x:-33.2,z:-7.4,range:3.25});
 assert.equal(CHEST_X,HOUSE_CHEST.x);
 assert.equal(CHEST_Z,HOUSE_CHEST.z);
 assert.equal(CHEST_RANGE,HOUSE_CHEST.range);
 assert.equal(OFFLINE_CHEST.x,CHEST_X);
 assert.equal(OFFLINE_CHEST.z,CHEST_Z);
 assert.equal(OFFLINE_CHEST.slots,18);
 assert.equal(isInLonghouse(CHEST_X,CHEST_Z),true);
});
test('an interior grid is entirely free apart from the actual GLB chest',()=>{
 let checked=0;
 for(let x=-8.2;x<=8.2;x+=.35)for(let z=-9;z<=9;z+=.35){
  const blocked=Math.abs(x-LONGHOUSE.chestLocalX)<1.155+.42&&
   Math.abs(z-LONGHOUSE.chestLocalZ)<.725+.42;
  assert.equal(walk(x,z),!blocked,'Unexpected obstacle at local '+x+','+z);
  checked++;
 }
 assert.ok(checked>1800);
 for(const [x,z] of [[-5.2,-5],[3,-1],[4.49,.08],[-5.6,3],[0,0],[7,-8],[-7,8]]){
  assert.equal(walk(x,z),true,'Legacy obstacle at '+x+','+z);
 }
 assert.equal(walk(5.4,-6.2),false);
 assert.equal(walk(5.4,-4.35),true);
 assert.equal(insideHouse(CHEST_X,CHEST_Z),true);
});
test('structural walls are solid and entrance remains open',()=>{
 const hd=LONGHOUSE.depth/2,hw=LONGHOUSE.width/2;
 for(const x of [-7,-5,-3,3,5,7])assert.equal(walk(x,hd),false);
 for(const x of [-2.8,0,2.8]){
  assert.equal(walk(x,hd),true);
  assert.equal(walk(x,hd+1),true);
 }
 for(const z of [-8,0,8]){
  assert.equal(walk(hw,z),false);
  assert.equal(walk(-hw,z),false);
 }
 assert.equal(walk(0,-hd),false);
});
test('house graph contains only floor, walls and roof, no props',()=>{
 const root=new THREE.Group(),roofPlanes=[];
 const model=buildHearthHouse(THREE,{root,villageVisuals:{
  addRoof(mesh){roofPlanes.push(mesh)}
 }});
 assert.equal(root.children.length,3);
 assert.deepEqual(root.children.map(child=>child.name),[
  'hearth-house-solid-floor','hearth-house-solid-walls','hearth-house-exterior-roof'
 ]);
 assert.equal(model.walls.children.length,6);
 assert.equal(roofPlanes.length,2);
 assert.ok(roofPlanes.every(mesh=>model.roof.getObjectById(mesh.id)===mesh));
 assert.ok(model.walls.children.every(mesh=>!mesh.material.transparent));
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.floor.visible,true);
});
test('Atlas GLB remains intact with Open and Close animations',()=>{
 const glb=readFileSync(new URL('../../bestiary/models/village-chest-v0.1.glb',import.meta.url));
 assert.equal(glb.toString('utf8',0,4),'glTF');
 const n=glb.readUInt32LE(12);
 const json=JSON.parse(glb.toString('utf8',20,20+n));
 const clips=(json.animations||[]).map(x=>x.name);
 assert.ok(clips.includes('Open')&&clips.includes('Close'));
 assert.ok(json.nodes.some(x=>x.name==='Lid_Hinge'));
 const hinge=new THREE.Group(),motion=createChestMotion(hinge);
 motion.select('Open');motion.update(.4);
 const half=hinge.rotation.x;
 motion.select('Close');assert.equal(hinge.rotation.x,half);
 motion.update(3);assert.ok(Math.abs(hinge.rotation.x)<1e-6);
});

test('every active browser geometry consumer uses the current shared module URL',()=>{
 // A warm Safari cache must not mix the old chest anchor with the new server.
 const consumers=['gather-world.js','start-zone.js','sphere-physics.js','interaction-targeting.js'];
 for(const name of consumers){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  const imports=[...source.matchAll(/hearth-house\.js\?v=([^'"\s]+)/g)];
  assert.ok(imports.length>0,name);
  assert.ok(imports.every(row=>row[1]==='3'),name+' requests a stale geometry module');
 }
 for(const [name,dependency,version] of [['planet.js','start-zone.js','25'],['planet.js','offline-rpg.js','72'],['offline-rpg.js','gather-world.js','13'],['offline-rpg.js','camp-actions.js','12']]){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.ok(source.includes(dependency+'?v='+version),name+' must invalidate its geometry dependency');
 }
});
