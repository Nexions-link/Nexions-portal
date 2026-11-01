import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestLeafLightTints} from '../forest-art-canopy.js';
import {deciduousCrownData,coniferCrownData} from '../forest-crown-geometry.js';
import {forestContactLightAt} from '../forest-contact-light.js';
import {forestGroundPixel,forestEntranceBlend} from '../forest-ground-texture.js';
import {createForestLayout,forestColliders,createWhisperingForest,
 FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,forestTrailLatitude}
 from '../whispering-forest.js';

test('G-18: warm sunlit tops and cool sheltered foliage use original indexed geometry',()=>{
 const top=forestLeafLightTints(.91,.84);
 const shade=forestLeafLightTints(.13,3.98,{cavity:.91});
 assert.ok(top[0]>shade[0]*1.3,'warm sunlit leaves separate from inside foliage');
 assert.ok(top[2]>shade[2],'upper foliage receives additional light');
 assert.ok(top[0]/top[2]>shade[0]/shade[2],
  'exposed top has a visibly warmer palette than shaded inside');
 assert.throws(()=>forestLeafLightTints(NaN,0),RangeError);
 for(const [species,fn] of [['deciduous',deciduousCrownData],['conifer',coniferCrownData]]){
  const standard=fn(1,{r2:true,art:false}),lit=fn(1,{r2:true,art:true});
  assert.equal(standard.positions.length,lit.positions.length,species);
  assert.equal(standard.colors.length,lit.colors.length,species);
  assert.deepEqual(standard.indices,lit.indices);
  assert.ok(lit.colors.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
  assert.deepEqual(fn(1,{r2:true,art:true}),lit);
 }
});
test('G-18: contact darkness comes from actual trees and protects roads and clearings',()=>{
 const trees=createForestLayout().trees;
 const t=trees.find(p=>p.lon>.66&&p.lon<1.34&&
   forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>FOREST_CAMP.clearingRadius+17&&
   FOREST_SITE_CLEARINGS.every(s=>forestDistance(p.lon,p.lat,s.lon,s.lat)>s.radius+16));
 assert.ok(t);
 const shaded=forestContactLightAt(t.lon,t.lat);
 const protectedRoad=forestContactLightAt(t.lon,t.lat,{roadWear:1});
 assert.ok(shaded.contact>.06);
 assert.ok(shaded.canopy>=0);
 assert.ok(shaded.light<.92&&shaded.light>.60,'no black ground');
 assert.ok(protectedRoad.light>shaded.light,'road stays legible');
 assert.deepEqual(forestContactLightAt(t.lon,t.lat),shaded);
 assert.deepEqual(forestContactLightAt(-1,.3),{contact:0,canopy:0,light:1});
 const inCamp=forestContactLightAt(FOREST_CAMP.lon,FOREST_CAMP.lat);
 assert.equal(inCamp.light,1);
});
test('G-18: forest paint is pre-baked, opaque and leaves meadow entrance soft',()=>{
 const t=createForestLayout().trees.find(p=>p.lon>.9&&p.lon<1.3);
 assert.ok(t);
 assert.ok(forestEntranceBlend(t.lon,t.lat)>.99);
 const pixel=forestGroundPixel(t.lon,t.lat,{art:true,r2:true});
 assert.equal(pixel.length,4);
 assert.ok(pixel.slice(0,3).every(c=>Number.isInteger(c)&&c>=0&&c<=255));
 assert.equal(pixel[3],255);
 const garden=forestGroundPixel(.31,forestTrailLatitude(.31),{art:true});
 assert.equal(garden[3],255);
 const source=readFileSync(new URL('../forest-ground-texture.js',import.meta.url),'utf8');
 assert.match(source,/forestContactLightAt\(lon,lat,\{roadWear:road\.wear\}\)/);
 assert.doesNotMatch(source,/new THREE\.Mesh|ShaderMaterial|transparent:true/);
});
test('G-18 preserves 400 gameplay trees, collisions, 12 draw batches and high/economy quality',()=>{
 const old=forestColliders(),layout=createForestLayout();
 const scene=new THREE.Scene();
 const forest=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0,
  r2Vegetation:true,artRemaster:true});
 const batches=scene.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('forest-'));
 assert.equal(batches.length,12);
 assert.equal(scene.children.find(x=>x.name==='forest-ancient-trunks').count,400);
 assert.equal(forest.treeCount,400);
 assert.deepEqual(forestColliders(),old);
 assert.deepEqual(createForestLayout(),layout);
 forest.setQuality('economy');
 assert.equal(batches.find(x=>x.name==='forest-ancient-trunks').castShadow,false);
 forest.setQuality('high');
 assert.equal(batches.find(x=>x.name==='forest-ancient-trunks').castShadow,true);
});
