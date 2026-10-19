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
 assert.equal(model.walls.children.filter(mesh=>mesh.isMesh).length,6);
 assert.equal(roofPlanes.length,2);
 assert.ok(roofPlanes.every(mesh=>model.roof.getObjectById(mesh.id)===mesh));
 assert.ok(model.walls.children.filter(mesh=>mesh.isMesh).every(mesh=>!mesh.material.transparent));
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
  assert.ok(imports.every(row=>row[1]==='6'),name+' requests a stale geometry module');
 }
 for(const [name,dependency,version] of [['planet.js','start-zone.js','33'],['planet.js','offline-rpg.js','99'],['offline-rpg.js','gather-world.js','16'],['offline-rpg.js','camp-actions.js','15']]){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.ok(source.includes(dependency+'?v='+version),name+' must invalidate its geometry dependency');
 }
});

test('tribal exterior adds lightweight art without colliders or blocking the doorway',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 assert.deepEqual(root.children.map(child=>child.name),[
  'hearth-house-solid-floor','hearth-house-solid-walls','hearth-house-exterior-roof'
 ]);
 const details=model.walls.getObjectByName('hearth-house-tribal-exterior');
 assert.ok(details);
 assert.equal(details.getObjectByName('hearth-house-hide-wall-panels').isInstancedMesh,true);
 assert.equal(details.getObjectByName('hearth-house-lashed-timber').isInstancedMesh,true);
 assert.equal(details.getObjectByName('hearth-house-entrance-emblem').isGroup,true);
 assert.equal(model.roof.getObjectByName('hearth-house-bone-finials').isInstancedMesh,true);
 assert.ok(model.roofPlanes.every(panel=>panel.getObjectByName('hearth-house-roof-hide-patches').isInstancedMesh));
 assert.equal(model.floor.children.length,16);
 const front=model.walls.children.filter(mesh=>mesh.isMesh&&
  Math.abs(mesh.position.z-(LONGHOUSE.depth/2-LONGHOUSE.wallThickness/2))<1e-6);
 assert.equal(front.length,3);
 assert.ok(front.filter(mesh=>mesh.position.x!==0).every(mesh=>
  Math.abs(Math.abs(mesh.position.x)-mesh.geometry.parameters.width/2-LONGHOUSE.doorWidth/2)<1e-6
 ));
 // The roof alone can disappear indoors; the decoration has no gameplay hitboxes.
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.floor.visible,true);
 root.traverse(node=>{
  assert.notEqual(node.userData.collidable,true);
  assert.notEqual(node.userData.targetable,true);
 });
});

test('elder longhouse porch remains outside the walkable space',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const porch=model.roof.getObjectByName('hearth-house-ceremonial-porch');
 assert.ok(porch?.isGroup);
 assert.equal(porch.children.filter(node=>node.name==='hearth-house-porch-hide-roof').length,2);
 assert.equal(porch.children.filter(node=>node.name==='hearth-house-porch-pennant').length,2);
 assert.equal(model.roof.getObjectByName('hearth-house-gable-timber').isInstancedMesh,true);
 assert.equal(model.walls.getObjectByName('hearth-house-hide-lacings').isInstancedMesh,true);
 assert.equal(model.walls.getObjectByName('hearth-house-entrance-carvings').isInstancedMesh,true);
 assert.equal(model.walls.children.filter(node=>node.isMesh).length,6);
 assert.equal(model.floor.children.length,16);
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.floor.visible,true);
 for(const x of [-2.8,0,2.8])assert.equal(walk(x,LONGHOUSE.depth/2),true);
 root.traverse(node=>{
  assert.notEqual(node.userData.collidable,true);
  assert.notEqual(node.userData.targetable,true);
 });
});

test('elder architectural facades frame the doorway and retain the original walkable grid',()=>{
 const root=new THREE.Group();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const wing=model.accents.getObjectByName('hearth-house-side-wing');
 const posts=model.accents.getObjectByName('hearth-house-ceremonial-posts');
 const collars=model.accents.getObjectByName('hearth-house-totem-collars');
 const paving=model.accents.getObjectByName('hearth-house-forecourt-edging');
 const threshold=model.accents.getObjectByName('hearth-house-entry-threshold');
 assert.ok(wing && wing.isMesh);
 assert.equal(model.accents.children.filter(x=>x.name==='hearth-house-side-wing').length,6);
 assert.equal(model.accents.children.filter(x=>x.name==='hearth-house-front-pier').length,4);
 assert.ok(posts?.isInstancedMesh);
 assert.equal(posts.count,8);
 assert.equal(collars?.count,6);
 assert.equal(paving?.count,10);
 assert.ok(threshold?.isMesh);
 assert.equal(threshold.geometry.parameters.width,LONGHOUSE.doorWidth-.34);
 assert.ok(model.roof.getObjectByName('hearth-house-eave-details').isInstancedMesh);
 assert.equal(model.walls.children.filter(x=>x.isMesh).length,6);
 assert.equal(root.children.length,3);
 // Freestanding signposts and stone edging must never intrude on the central path.
 assert.ok(paving.geometry && Math.abs(threshold.position.x)<1e-9);
 const span=LONGHOUSE.doorWidth/2;
 model.accents.children.filter(x=>x.name==='hearth-house-ceremonial-totem-pennant').forEach(x=>{
  assert.ok(Math.abs(x.position.x)>span+2);
 });
 for(const x of [-2.8,0,2.8]){
  assert.equal(walk(x,LONGHOUSE.depth/2),true);
  assert.equal(walk(x,LONGHOUSE.depth/2+1),true);
 }
 model.roof.visible=false;
 assert.equal(model.floor.visible,true);
 assert.equal(model.walls.visible,true);
 root.traverse(node=>{
  assert.notEqual(node.userData.collidable,true);
  assert.notEqual(node.userData.targetable,true);
 });
});
