import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildHearthHouse,LONGHOUSE} from '../hearth-house.js';
import {createRoofTransparency} from '../roof-transparency.js';
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
