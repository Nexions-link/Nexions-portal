import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildHearthHouse,LONGHOUSE} from '../hearth-house.js';
import {createRoofTransparency,createSurfaceTransparency} from '../roof-transparency.js';
import {readFileSync} from 'node:fs';

test('translucent roof fades smoothly without changing original walls or shadow casters',()=>{
 const root=new THREE.Group();
 const sharedShingle=new THREE.MeshStandardMaterial();
 const model=buildHearthHouse(THREE,{root,villageVisuals:{
  addRoof(panel){
   const tile=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),sharedShingle);
   tile.name='test-shingle';panel.add(tile);
  }
 }});
 const walls=model.walls.children.find(x=>x.isMesh).material;
 const outside=model.roofPlanes[0].material;
 model.roofPlanes.forEach(x=>{x.castShadow=true;});
 const fade=createRoofTransparency(model.roof,{indoorOpacity:.12,fadeSpeed:9});
 assert.ok(fade.materialCount>3);
 assert.notEqual(model.roofPlanes[0].material,outside);
 assert.notEqual(model.roofPlanes[0].getObjectByName('test-shingle').material,sharedShingle);
 assert.equal(model.walls.children.find(x=>x.isMesh).material,walls);
 fade.update(true,.07);
 assert.ok(fade.opacity<1&&fade.opacity>.12);
 for(let i=0;i<24;i++)fade.update(true,.07);
 assert.equal(model.roof.visible,true);
 assert.ok(fade.opacity>=.12&&fade.opacity<.13);
 assert.equal(model.roofPlanes[0].material.transparent,true);
 assert.equal(model.roofPlanes[0].material.depthWrite,false);
 assert.ok(model.roofPlanes.every(x=>x.castShadow));
 assert.equal(sharedShingle.opacity,1);
 assert.equal(walls.opacity,1);
 for(let i=0;i<24;i++)fade.update(false,.07);
 assert.equal(fade.opacity,1);
 assert.equal(model.roofPlanes[0].material.opacity,1);
 assert.equal(model.roofPlanes[0].material.transparent,false);
 assert.equal(model.roofPlanes[0].material.depthWrite,true);
 assert.ok(model.roofPlanes.every(x=>x.castShadow));
 assert.equal(LONGHOUSE.doorWidth,6.8);
});

test('game calls opacity animation every frame, never changes house shadows on entry',()=>{
 const start=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const body=start.split('function updateInteriorView(')[1]?.split('return {rebuild,')[0];
 assert.ok(body);
 assert.match(body,/roofTransparency.update\(inside,dt\)/);
 assert.doesNotMatch(body,/roof.visible|castShadow|setInterior\(/);
 assert.match(start,/caster.castShadow=shadowsEnabled;/);
 assert.match(planet,/startZone.updateInteriorView\(cameraPlayerLocal.x,cameraPlayerLocal.z,dt\)/);
 assert.match(planet,/keyboard-movement.js\?v=1/);
});

test('facade at 20 percent and roof at 12 percent fade together without altering floor or entrance',()=>{
 const root=new THREE.Group();
 const house=buildHearthHouse(THREE,{root,villageVisuals:{addRoof(){}}});
 const wall=house.walls.children.find(x=>x.isMesh);
 const originalWallMat=wall.material;
 const stone=house.accents.getObjectByName('hearth-house-forecourt-edging');
 const threshold=house.accents.getObjectByName('hearth-house-entry-threshold');
 const post=house.accents.getObjectByName('hearth-house-ceremonial-posts');
 const originalStone=stone.material,originalThreshold=threshold.material;
 const originalPost=post.material,originalFloor=house.floor.children[0].material;
 const excludes=new Set([
  'hearth-house-ceremonial-posts','hearth-house-totem-collars',
  'hearth-house-totem-finial','hearth-house-ceremonial-totem-pennant',
  'hearth-house-bone-wind-charms','hearth-house-forecourt-edging',
  'hearth-house-forecourt-stepping-stones','hearth-house-entry-threshold'
 ]);
 const roof=createRoofTransparency(house.roof,{indoorOpacity:.12,fadeSpeed:9});
 const walls=createSurfaceTransparency(house.walls,{
  indoorOpacity:.20,fadeSpeed:9,shouldFade:mesh=>!excludes.has(mesh.name)
 });
 assert.equal(root.children.length,3);
 assert.equal(house.walls.children.filter(x=>x.isMesh).length,6);
 assert.ok(walls.meshCount>20);
 assert.notEqual(wall.material,originalWallMat);
 roof.update(true,1/60);walls.update(true,1/60);
 assert.ok(roof.opacity<1&&roof.opacity>.12);
 assert.ok(walls.opacity<1&&walls.opacity>.20);
 for(let i=0;i<28;i++){roof.update(true,.07);walls.update(true,.07);}
 assert.equal(roof.opacity,.12);
 assert.equal(walls.opacity,.20);
 assert.equal(wall.material.opacity,.20);
 assert.equal(wall.material.transparent,true);
 assert.equal(wall.material.depthWrite,false);
 assert.equal(house.roof.visible,true);
 assert.equal(house.walls.visible,true);
 assert.equal(house.floor.visible,true);
 assert.equal(stone.material,originalStone);
 assert.equal(threshold.material,originalThreshold);
 assert.equal(post.material,originalPost);
 assert.equal(house.floor.children[0].material,originalFloor);
 assert.equal(originalFloor.opacity,1);
 assert.equal(originalWallMat.opacity,1);
 for(let i=0;i<28;i++){roof.update(false,.07);walls.update(false,.07);}
 assert.equal(roof.opacity,1);
 assert.equal(walls.opacity,1);
 assert.equal(wall.material.opacity,1);
 assert.equal(wall.material.transparent,false);
 assert.equal(wall.material.depthWrite,true);
 assert.equal(house.walls.visible,true);
});

test('live code applies wall fade without switching sunlight, shadows or PC controls',()=>{
 const start=readFileSync(new URL('../start-zone.js',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const updater=start.split('function updateInteriorView(')[1]?.split('return {rebuild,')[0];
 assert.ok(updater);
 assert.ok(updater.includes('roofTransparency.update(inside,dt)'));
 assert.ok(updater.includes('wallTransparency.update(inside,dt)'));
 assert.doesNotMatch(updater,/castShadow|roof.visible|walls.visible|setInterior/);
 assert.ok(start.includes('caster.castShadow=shadowsEnabled;'));
 assert.ok(planet.includes('keyboard-movement.js?v=1'));
 assert.ok(planet.includes('updateInteriorView(cameraPlayerLocal.x,cameraPlayerLocal.z,dt)'));
});
