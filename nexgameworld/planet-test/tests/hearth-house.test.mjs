import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LONGHOUSE,HOUSE_CHEST,toHouseCoordinates,fromHouseCoordinates,insideHouse,buildHearthHouse} from '../hearth-house.js';
import {canWalkCamp,isInLonghouse} from '../sphere-physics.js';
import {createChestMotion} from '../../bestiary/chest-preview-motion.js';
import {readFileSync} from 'node:fs';

test('house transforms, door and chest stay in sync',()=>{
 assert.deepEqual(toHouseCoordinates(HOUSE_CHEST.x,HOUSE_CHEST.z),
  {x:LONGHOUSE.chestLocalX,z:LONGHOUSE.chestLocalZ});
 assert.deepEqual(fromHouseCoordinates(0,0),{x:-27,z:-2});
 assert.equal(insideHouse(HOUSE_CHEST.x,HOUSE_CHEST.z),true);
 assert.equal(isInLonghouse(HOUSE_CHEST.x,HOUSE_CHEST.z),true);
 // Chest is no longer placed inside the bed at local (-5.2,-5).
 assert.ok(Math.hypot(LONGHOUSE.chestLocalX+5.2,LONGHOUSE.chestLocalZ+5)>6);
 assert.equal(canWalkCamp(...Object.values(fromHouseCoordinates(0,8))),true);
 assert.equal(canWalkCamp(...Object.values(fromHouseCoordinates(0,10.4))),true);
 assert.equal(canWalkCamp(...Object.values(fromHouseCoordinates(7,10.4))),false);
 // The solid chest must block walking through it, without blocking approach.
 const nearChest=fromHouseCoordinates(LONGHOUSE.chestLocalX,4.9);
 assert.equal(canWalkCamp(nearChest.x,nearChest.z),true);
 assert.equal(canWalkCamp(HOUSE_CHEST.x,HOUSE_CHEST.z),false);
});

test('replacement house roofs are an opaque hideable layer',()=>{
 const root=new THREE.Group(),roofs=[];
 const model=buildHearthHouse(THREE,{root,villageVisuals:{
  addRoof(mesh){roofs.push(mesh);}
 }});
 assert.equal(roofs.length,2);
 assert.equal(model.roofPlanes.length,2);
 assert.ok(roofs.every(m=>model.roof.getObjectById(m.id)===m));
 assert.ok(model.walls.children.every(mesh=>!mesh.material.transparent&&mesh.material.opacity===1));
 assert.ok(model.roof.children.every(mesh=>!mesh.material.transparent&&mesh.material.opacity===1));
 assert.ok(!model.furnishings.children.some(mesh=>mesh.material.transparent));
 model.roof.visible=false;
 assert.equal(model.walls.visible,true);
 assert.equal(model.furnishings.visible,true);
});

test('approved Atlas chest GLB has a matching hinge and Open/Close clips',()=>{
 const glb=readFileSync(new URL('../../bestiary/models/village-chest-v0.1.glb',import.meta.url));
 assert.equal(glb.toString('utf8',0,4),'glTF');
 const jsonLength=glb.readUInt32LE(12);
 const json=JSON.parse(glb.toString('utf8',20,20+jsonLength));
 const clips=(json.animations||[]).map(clip=>clip.name);
 assert.ok(clips.includes('Open')&&clips.includes('Close'));
 assert.ok(json.nodes.some(node=>node.name==='Lid_Hinge'));
});

test('opening, mid-flight closing and reopening never snap the lid',()=>{
 const hinge=new THREE.Group(),motion=createChestMotion(hinge);
 motion.select('Open');motion.update(.4);const halfway=hinge.rotation.x;
 assert.ok(halfway<0&&halfway>-1.65);
 motion.select('Close');assert.equal(hinge.rotation.x,halfway);
 motion.update(.12);assert.ok(hinge.rotation.x>halfway);
 motion.select('Open');const reversal=hinge.rotation.x;
 assert.ok(reversal<=0&&reversal>halfway);
 motion.update(3);assert.ok(Math.abs(hinge.rotation.x+1.65)<1e-6);
 motion.select('Close');motion.update(3);assert.ok(Math.abs(hinge.rotation.x)<1e-6);
});