import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {soilScatterBudget,soilScatterLayout,soilNeedleGeometryData,
 SOIL_SCATTER_CAPS,createSoilScatter} from '../soil-scatter.js';
import {forestColliders,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,
 forestTrailLatitude} from '../whispering-forest.js';
import {lakeRadius} from '../start-zone.js';

test('soil clues are deterministic and absent from protected game areas',()=>{
 const before=forestColliders(),a=soilScatterLayout(),b=soilScatterLayout();
 assert.deepEqual(a,b);
 for(const kind of ['chips','needles']){
  assert.ok(a[kind].length>=SOIL_SCATTER_CAPS[kind]*.9,kind);
  for(const p of a[kind]){
   assert.ok(p.size>.07&&p.size<.35);
   if(p.coord==='start'){
    assert.ok(lakeRadius(p.x,p.z)>=1.40);
    assert.ok(Math.hypot(p.x+27,p.z+2)>=19);
   }else{
    assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=3.7);
    assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
     FOREST_CAMP.clearingRadius+7);
    assert.ok(FOREST_SITE_CLEARINGS.every(s=>
     forestDistance(p.lon,p.lat,s.lon,s.lat)>=s.radius+3.6));
   }
  }
 }
 assert.deepEqual(forestColliders(),before);
});

test('dry needle slivers have consistent colours and no invalid vertices',()=>{
 const geo=soilNeedleGeometryData();
 assert.equal(geo.positions.length,geo.colors.length);
 assert.equal(geo.positions.length,9*9);
 assert.ok(geo.positions.every(Number.isFinite));
 assert.ok(geo.colors.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
});

test('mobile presets avoid new instanced render passes on economy/preview',()=>{
 assert.deepEqual(soilScatterBudget('economy'),{chips:0,needles:0});
 assert.deepEqual(soilScatterBudget('high',true),{chips:0,needles:0});
 assert.deepEqual(soilScatterBudget('balanced'),{chips:920,needles:1130});
 assert.deepEqual(soilScatterBudget('high'),SOIL_SCATTER_CAPS);
 const scene=new THREE.Scene(),before=forestColliders();
 const art=createSoilScatter(THREE,{scene,radius:261,heightAt:()=>0});
 assert.equal(art.drawCalls,2);
 assert.equal(scene.children.length,2);
 assert.ok(scene.children.every(o=>o.name.endsWith('decorative-no-collision')));
 art.setQuality('economy');
 assert.ok(scene.children.every(o=>o.visible===false));
 art.setQuality('high');
 assert.ok(scene.children.every(o=>o.visible&&o.count>=1000));
 assert.deepEqual(forestColliders(),before);
});
test('heavy material passes are initialized lazily for the selected preset',()=>{
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(world,/artSafety\.register\('microdetail'/);
 assert.match(world,/when:preset=>preset!=='economy'/);
 assert.match(world,/createSoilScatter\(THREE,ART_SCENE_ARGS\)/);
 assert.match(world,/artSafety\.update\(qualityName,isPortalPreview\)/);
});
