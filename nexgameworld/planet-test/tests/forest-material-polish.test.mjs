import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {installDom} from './harness.mjs';
import {weatheredStoneVertex,createWeatheredStoneGeometry}
 from '../stone-surface.js';
import {meadowGrassBladeData,meadowShrubLeafData}
 from '../sphere-meadow.js';
import {forestCurvedGrassData} from '../forest-ground-life.js';
import {createStartZone} from '../start-zone.js';
import {forestColliders} from '../whispering-forest.js';
import {forestUnderstoryGeometryData} from '../forest-understory.js';

test('weathered rock has real chipped silhouette and lichen-colored facets',()=>{
 const bare=weatheredStoneVertex(.37,.42,.67,'trail');
 const moss=weatheredStoneVertex(.37,.42,.67,'forest');
 assert.ok(bare.radius>.75&&bare.radius<1.1);
 assert.ok(moss.lichen>bare.lichen);
 assert.notDeepEqual(moss.color,bare.color);
 for(const kind of ['forest','trail','meadow']){
  const geo=createWeatheredStoneGeometry(THREE,kind),pos=geo.getAttribute('position'),
   col=geo.getAttribute('color');
  assert.equal(col.count,pos.count);
  assert.ok(pos.count>=60);
  const radii=new Set();
  const colors=new Set();
  for(let i=0;i<pos.count;i++){
   const r=Math.hypot(pos.getX(i),pos.getY(i),pos.getZ(i));
   assert.ok(Number.isFinite(r)&&r>.70&&r<1.14);
   radii.add(Math.round(r*100));
   const v=[col.getX(i),col.getY(i),col.getZ(i)];
   assert.ok(v.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
   colors.add(v.map(c=>Math.round(c*100)).join(':'));
  }
  assert.ok(radii.size>6);
  assert.ok(colors.size>7);
  geo.dispose();
 }
});
test('meadow and forest blades curve and shade gradually without transparent cards',()=>{
 for(const data of [meadowGrassBladeData(),forestCurvedGrassData()]){
  assert.ok(data.bladeCount>=6);
  assert.equal(data.positions.length,data.colors.length);
  assert.ok(data.positions.every(Number.isFinite));
  assert.ok(data.colors.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
  assert.ok(data.positions.length/9>=data.bladeCount*3);
  assert.ok(new Set(data.colors.map(c=>Math.round(c*100))).size>=4);
 }
 const shrub=meadowShrubLeafData();
 assert.ok(shrub.positions.length/9>25);
 assert.equal(shrub.colors.length,shrub.positions.length);
 assert.ok(shrub.positions.every(Number.isFinite));
 assert.ok(forestUnderstoryGeometryData('leaves').triangles>=55);
});
test('start terrain shares the existing baked diffuse texture for bump on richer presets',()=>{
 installDom();
 const scene=new THREE.Scene();
 const zone=createStartZone(THREE,scene,()=>261,()=>0);
 const ground=scene.children.find(c=>c.isMesh&&c.material?.map?.name?.
  includes('natural mineral meadow'));
 assert.ok(ground,'the painted terrain should still be a native mesh');
 assert.equal(ground.material.bumpMap,null);
 zone.setGraphics({detail:1,shadows:false});
 assert.equal(ground.material.bumpMap,ground.material.map);
 assert.ok(ground.material.bumpScale<=.06);
 zone.setGraphics({detail:.15,shadows:false});
 assert.equal(ground.material.bumpMap,null);
 zone.setGraphics({detail:1,shadows:false,portal:true});
 assert.equal(ground.material.bumpMap,null);
});
test('no new colliders or custom ground shader, only standard Three materials',()=>{
 const before=forestColliders();
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const shrubs=readFileSync(new URL('../sphere-meadow.js',import.meta.url),'utf8');
 const forest=readFileSync(new URL('../forest-ecology.js',import.meta.url),'utf8');
 const roadside=readFileSync(new URL('../roadside-details.js',import.meta.url),'utf8');
 assert.match(planet,/groundMaterial.bumpMap=relief/);
 assert.match(planet,/!isPortalPreview&&qualityName!=='economy'/);
 assert.match(shrubs,/shrubGeometry\(THREE\)/);
 assert.match(forest,/createWeatheredStoneGeometry\(THREE,'forest'\)/);
 assert.match(roadside,/createWeatheredStoneGeometry\(THREE,'trail'\)/);
 assert.doesNotMatch(planet,/installForestGroundShader\(/);
 assert.deepEqual(forestColliders(),before);
});
