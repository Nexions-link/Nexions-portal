import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestGrassCarpetProfile} from '../forest-grass-carpet.js';
import {forestCurvedGrassData,forestGroundLifeLayout,createForestGroundLife,
 forestGroundLifeBudget} from '../forest-ground-life.js';
import {forestGroundPixel} from '../forest-ground-texture.js';
import {forestColliders,createForestLayout,FOREST_CAMP,forestTrailLatitude}
 from '../whispering-forest.js';

test('G-19 three separated grass islands are a small organic carpet with the original triangle count',()=>{
 const grass=forestCurvedGrassData();
 assert.equal(grass.bladeCount,7);
 assert.equal(grass.positions.length,7*3*3*3,'21 triangles per grass instance');
 assert.equal(grass.colors.length,grass.positions.length);
 assert.ok(grass.positions.every(Number.isFinite));
 assert.ok(grass.colors.every(c=>c>=0&&c<=1&&Number.isFinite(c)));
 const xs=grass.positions.filter((_,i)=>i%3===0);
 const ys=grass.positions.filter((_,i)=>i%3===1);
 const zs=grass.positions.filter((_,i)=>i%3===2);
 assert.ok(Math.max(...xs)-Math.min(...xs)>1.05,'grass spreads across a small patch');
 assert.ok(Math.max(...zs)-Math.min(...zs)>1.05);
 assert.ok(Math.min(...ys)>.01&&Math.max(...ys)<.75);
 assert.ok(new Set(ys.map(v=>v.toFixed(2))).size>9,'staggered blade heights');
});
test('G-19 forest carpet is coherent, protects the track and clears quest gathering places',()=>{
 const checks=[];
 for(let lon=.38;lon<1.37;lon+=.04){
  for(const metres of [8,11,15,20,29,42]){
   for(const side of [-1,1]){
    const point=forestGrassCarpetProfile(lon,forestTrailLatitude(lon)+side*metres/261);
    assert.ok(point.density>=0&&point.density<=1);
    assert.ok(point.paint>=0&&point.paint<=1);
    checks.push(point.density);
   }
  }
 }
 assert.ok(checks.some(x=>x>.3),'visible small grassy islands exist');
 assert.ok(checks.some(x=>x<.05),'coherent openings remain');
 assert.deepEqual(forestGrassCarpetProfile(FOREST_CAMP.lon,FOREST_CAMP.lat),
  {density:0,paint:0,trailDistance:0});
 const centre=forestGrassCarpetProfile(.91,forestTrailLatitude(.91));
 assert.equal(centre.density,0,'road axis stays clear');
 assert.equal(forestGrassCarpetProfile(-1,.2).density,0);
});
test('G-19 original 2100 instances are regrouped near both trail banks, not placed on the track',()=>{
 const old=forestColliders(),oldTrees=createForestLayout();
 const a=forestGroundLifeLayout(),b=forestGroundLifeLayout();
 assert.deepEqual(a,b);
 assert.equal(a.grass.length,2100);
 assert.ok(a.grass.filter(p=>Math.abs(p.lat-forestTrailLatitude(p.lon))*261<38).length>1200,
  'most of the grass should be visible on the walk along the road');
 assert.ok(a.grass.some(p=>p.lat>forestTrailLatitude(p.lon)+8/261));
 assert.ok(a.grass.some(p=>p.lat<forestTrailLatitude(p.lon)-8/261));
 for(const g of a.grass){
  assert.ok(Math.abs(g.lat-forestTrailLatitude(g.lon))*261>=4.6+g.size);
 }
 assert.deepEqual(forestColliders(),old);
 assert.deepEqual(createForestLayout(),oldTrees);
});
test('G-19 quality stays in existing three instanced batches; economy and portal preserve budgets',()=>{
 assert.deepEqual(forestGroundLifeBudget('economy'),
  {grass:430,saplings:55,deadwood:65});
 assert.deepEqual(forestGroundLifeBudget('balanced'),
  {grass:1450,saplings:195,deadwood:195});
 assert.deepEqual(forestGroundLifeBudget('high'),
  {grass:2100,saplings:360,deadwood:310});
 const scene=new THREE.Scene();
 const life=createForestGroundLife(THREE,{scene,radius:261,heightAt:()=>0});
 const batches=scene.children.filter(x=>x.isInstancedMesh);
 assert.equal(batches.length,3);
 assert.equal(life.drawCalls,3);
 const grass=batches.find(x=>x.name==='forest-grass-decorative-no-collision');
 assert.ok(grass);
 assert.equal(grass.count,1450);
 assert.equal(grass.geometry.attributes.position.count,63);
 assert.equal(grass.castShadow,false);
 life.setQuality('high');
 assert.equal(grass.count,2100);
 life.setQuality('economy');
 assert.equal(grass.count,430);
 life.setQuality('balanced',true);
 assert.equal(grass.count,0);
});
test('G-19 small turf texture uses same surface, no new canvas / shading pass',()=>{
 const lon=.75,lat=forestTrailLatitude(lon)+.045;
 const pixel=forestGroundPixel(lon,lat,{art:true,r2:true});
 assert.equal(pixel.length,4);
 assert.ok(pixel.slice(0,3).every(c=>Number.isInteger(c)&&c>=0&&c<=255));
 assert.equal(pixel[3],255);
 const src=readFileSync(new URL('../forest-ground-texture.js',import.meta.url),'utf8');
 assert.match(src,/forestGrassCarpetProfile\(lon,lat\)/);
 assert.match(src,/carpetSoil/);
 assert.doesNotMatch(src,/new THREE\.ShaderMaterial|onBeforeCompile/);
});
