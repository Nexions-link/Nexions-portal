import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {r2LightingProfile,r2AtmosphereBudget} from '../r2-lighting.js';
import {forestAtmosphereBudget,createForestAtmosphere} from '../forest-atmosphere.js';
import {createForestLightPools} from '../forest-lighting.js';
import {forestColliders,createForestLayout} from '../whispering-forest.js';

test('R2-03 smoothly shapes forest daylight while keeping player and quest legible',()=>{
 const day=r2LightingProfile();
 const deep=r2LightingProfile({shade:1,forest:1,exposure:1.14,fogNear:105,fogFar:290});
 const halfway=r2LightingProfile({shade:.5,forest:.5,fogNear:105,fogFar:290});
 assert.ok(deep.sun<day.sun&&deep.sun>=1.85,'canopy should shade, never blacken player');
 assert.ok(deep.hemi>1.5&&deep.fill>.64,'the fighter stays legible in shadow');
 assert.ok(deep.exposure>1.07&&deep.exposure<day.exposure);
 assert.ok(deep.fogNear<halfway.fogNear&&halfway.fogNear<day.fogNear);
 assert.ok(deep.fogFar<halfway.fogFar&&halfway.fogFar<day.fogFar);
 assert.ok(deep.fogNear>=19&&deep.fogFar>=deep.fogNear+54);
 assert.ok(deep.skyBlend>halfway.skyBlend&&deep.skyBlend<=1);
 assert.ok(deep.sunWarmth>day.sunWarmth&&deep.fillCoolness>day.fillCoolness);
 assert.deepEqual(r2LightingProfile({shade:Infinity,forest:NaN}),day);
 assert.ok(r2LightingProfile({shade:2,forest:2}).fogNear>0);
});
test('R2-03 never increases translucent forest geometry budgets in any preset',()=>{
 for(const quality of ['economy','balanced','high']){
  const old=forestAtmosphereBudget(quality),next=r2AtmosphereBudget(quality);
  for(const key of ['haze','beams','motes']){
   assert.ok(next[key]<=old[key],quality+' '+key+' must not grow');
   assert.ok(Number.isInteger(next[key])&&next[key]>=0);
  }
 }
 assert.deepEqual(r2AtmosphereBudget('high',true),{haze:0,beams:0,motes:0});
});
test('existing haze, rays, motes and sunspots reuse exact same rendering objects and geometry',()=>{
 const originalColliders=forestColliders(),originalLayout=createForestLayout();
 const mock=mode=>{
  const scene=new THREE.Scene(),heightAt=()=>0;
  const light=createForestLightPools(THREE,{scene,radius:261,heightAt,r2Lighting:mode});
  const atmosphere=createForestAtmosphere(THREE,{scene,radius:261,heightAt,r2Lighting:mode});
  const inst=scene.children.filter(x=>x.isInstancedMesh);
  const counts=inst.map(x=>({name:x.name,length:x.instanceMatrix.count,
   vertices:x.geometry.attributes.position.count,
   index:x.geometry.index?.count||0}));
  light.setQuality('high');
  atmosphere.setQuality('high');
  return {scene,light,atmosphere,counts};
 };
 const before=mock(false),after=mock(true);
 assert.deepEqual(before.counts,after.counts,'no new meshes, instances or triangles');
 assert.equal(before.scene.children.length,after.scene.children.length);
 assert.equal(after.atmosphere.decorativeOnly,true);
 assert.equal(after.light.spotCount,before.light.spotCount);
 for(let i=0;i<before.scene.children.length;i++){
  const a=before.scene.children[i],b=after.scene.children[i];
  if(a.isInstancedMesh&&b.isInstancedMesh)assert.ok(b.count<=a.count);
  if(a.isPoints&&b.isPoints)assert.ok(b.geometry.drawRange.count<=a.geometry.drawRange.count);
 }
 assert.deepEqual(forestColliders(),originalColliders);
 assert.deepEqual(createForestLayout(),originalLayout);
});
test('atmospheric art remains opt-in, original camera and shadow refresh budget untouched',()=>{
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const budget=readFileSync(new URL('../render-budget.js',import.meta.url),'utf8');
 assert.match(planet,/get\('r2lighting'\)==='1'/);
 assert.match(planet,/r2Lighting\?r2LightingProfile/);
 assert.match(planet,/createForestAtmosphere\(THREE,\{scene,radius:R,heightAt,r2Lighting\}\)/);
 assert.match(planet,/createForestLightPools\(THREE,\{scene,radius:R,heightAt,r2Lighting\}\)/);
 assert.match(planet,/const r2LightingToggle=\$\('r2LightingToggle'\)/);
 assert.match(budget,/BALANCED_SHADOW_HZ=30/);
 assert.doesNotMatch(planet,/EffectComposer|SSAOPass|UnrealBloomPass|CSM\(/);
});
