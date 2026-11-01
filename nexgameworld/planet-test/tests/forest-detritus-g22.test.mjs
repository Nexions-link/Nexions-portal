import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestMushroomCapData,FOREST_FUNGUS_CENTRES}
 from '../forest-art-ecology.js';
import {forestEcologyLayout,createForestEcology}
 from '../forest-ecology.js';
import {forestRottingWoodData,createForestGroundLife,forestGroundLifeLayout,
 forestGroundLifeBudget} from '../forest-ground-life.js';
import {forestContactLightAt} from '../forest-contact-light.js';
import {forestGroundPixel,forestEntranceBlend}
 from '../forest-ground-texture.js';
import {createForestLayout,forestColliders,forestTrailLatitude,FOREST_CAMP,
 FOREST_SITE_CLEARINGS,forestDistance} from '../whispering-forest.js';

test('G-22 forest fungi form three tiny distinctive caps per old decorative instance',()=>{
 assert.equal(FOREST_FUNGUS_CENTRES.length,3);
 assert.deepEqual(FOREST_FUNGUS_CENTRES.map(p=>p.scale),[.67,.44,.38]);
 const g=forestMushroomCapData();
 assert.equal(g.triangles,108);
 assert.equal(g.positions.length,108*9);
 assert.equal(g.colors.length,g.positions.length);
 assert.ok(g.positions.every(Number.isFinite));
 assert.ok(g.colors.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 assert.ok(Math.max(...g.positions.filter((_,i)=>i%3===1))<.35);
 assert.ok(Math.min(...g.positions.filter((_,i)=>i%3===1))<-.4);
 assert.deepEqual(forestMushroomCapData(),g);
});

test('G-22 natural deadwood holds twigs, rotting stump, cones and needles with no new material',()=>{
 const g=forestRottingWoodData();
 assert.equal(g.triangles,32);
 assert.equal(g.positions.length,32*9);
 assert.equal(g.colors.length,g.positions.length);
 assert.ok(g.positions.every(Number.isFinite));
 assert.ok(g.colors.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
 const y=g.positions.filter((_,i)=>i%3===1);
 assert.ok(Math.max(...y)>.16&&Math.max(...y)<.28);
 assert.ok(Math.min(...y)>.025);
 assert.ok(new Set(g.colors.map(x=>x.toFixed(2))).size>=15);
 assert.deepEqual(forestRottingWoodData(),g);
});

test('G-22 tree-root moss and needle patches are baked into old opaque soil and avoid entry paths',()=>{
 const trees=createForestLayout().trees.filter(t=>t.lon>.68&&t.lon<1.3);
 assert.ok(trees.length>30);
 const tree=trees.find(t=>forestContactLightAt(t.lon,t.lat).contact>.05);
 assert.ok(tree);
 const inShade=forestGroundPixel(tree.lon,tree.lat,{r2:true,art:true});
 assert.equal(inShade.length,4);assert.equal(inShade[3],255);
 const deep=forestEntranceBlend(tree.lon,tree.lat);
 assert.ok(deep>.98);
 const onRoad=forestGroundPixel(.91,forestTrailLatitude(.91),{r2:true,art:true});
 assert.equal(onRoad[3],255);
 const source=readFileSync(new URL('../forest-ground-texture.js',import.meta.url),'utf8');
 assert.match(source,/const rootMoss=art\?/);
 assert.match(source,/light\?\.contact/);
 assert.match(source,/const needlePatch=art\?/);
 assert.match(source,/forestDetritus/);
 assert.doesNotMatch(source,/ShaderMaterial|onBeforeCompile|transparent:true/);
});

test('G-22 old mushroom and wood positions, quest clearings and tree blockers stay fixed',()=>{
 const tree=forestColliders(),world=createForestLayout();
 const ec=forestEcologyLayout(),woods=forestGroundLifeLayout();
 assert.equal(ec.fungi.length,145);
 assert.equal(woods.deadwood.length,310);
 for(const p of ec.fungi){
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=5.25);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
   FOREST_CAMP.clearingRadius+.25);
  for(const site of FOREST_SITE_CLEARINGS)
   assert.ok(forestDistance(p.lon,p.lat,site.lon,site.lat)>=site.radius+.25);
 }
 const scene=new THREE.Scene(),leafScene=new THREE.Scene();
 const ecology=createForestEcology(THREE,{scene,radius:261,heightAt:()=>0});
 const life=createForestGroundLife(THREE,{scene:leafScene,radius:261,heightAt:()=>0});
 const bundles=scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 assert.equal(bundles.length,7,'G-23 keeps the five original ecological types while splitting shrubs into three botanical silhouettes');
 const caps=scene.getObjectByName('forest-mushroom-caps');
 const stems=scene.getObjectByName('forest-mushroom-stems');
 assert.equal(caps.count,Math.floor(145*.65));
 assert.equal(stems.count,Math.floor(145*.65));
 assert.equal(caps.geometry.attributes.position.count,324);
 assert.equal(stems.geometry.attributes.position.count,36);
 assert.deepEqual(ecology.layout,ec);
 const decor=leafScene.children.filter(x=>x.isInstancedMesh);
 assert.equal(decor.length,3);
 const dead=leafScene.getObjectByName('forest-deadwood-decorative-no-collision');
 assert.ok(dead?.material.vertexColors);
 assert.equal(dead.geometry.attributes.position.count,96);
 assert.equal(dead.count,195);
 assert.equal(dead.castShadow,false);
 assert.equal(life.drawCalls,3);
 life.setQuality('high');assert.equal(dead.count,310);
 life.setQuality('economy');assert.equal(dead.count,65);
 assert.deepEqual(forestGroundLifeBudget('balanced'),{grass:1450,saplings:195,deadwood:195});
 assert.deepEqual(forestColliders(),tree);
 assert.deepEqual(createForestLayout(),world);
 assert.deepEqual(forestGroundLifeLayout(),woods);
});

test('G-22 live client retains existing draw batches and no gameplay pickup handlers',()=>{
 const files=['forest-ecology.js','forest-ground-life.js','forest-ground-texture.js']
  .map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'));
 assert.match(files[0],/FOREST_FUNGUS_CENTRES/);
 assert.match(files[1],/forestRottingWoodData/);
 for(const s of files)assert.doesNotMatch(s,/registerPickup|addCollider|new THREE\.ShaderMaterial|onBeforeCompile/);
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(planet,/createForestEcology\(THREE,\{scene,radius:R,heightAt\}\)/);
 assert.match(planet,/createForestGroundLife\(THREE,\{scene,radius:R,heightAt\}\)/);
});
