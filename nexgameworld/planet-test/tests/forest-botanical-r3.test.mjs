import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestFernData} from '../forest-botanical-geometry.js';
import {forestUnderstoryGeometryData,forestUnderstoryBudget,createForestUnderstory}
 from '../forest-understory.js';
import {forestCurvedGrassData,forestSaplingLeafData,createForestGroundLife,
 forestGroundLifeBudget} from '../forest-ground-life.js';
import {createForestLayout,forestColliders} from '../whispering-forest.js';

test('R3-03 sculptural fern pinnules preserve all old shared triangle budgets',()=>{
 const large=forestFernData({fronds:7,segments:6});
 assert.equal(large.triangles,84);
 assert.equal(large.positions.length,84*9);
 assert.equal(large.positions.length,large.colors.length);
 assert.deepEqual(forestUnderstoryGeometryData('ferns'),{
  positions:large.positions,colors:large.colors,triangles:84
 });
 const small=forestFernData({fronds:6,segments:1});
 assert.equal(small.triangles,12,'ecology bracken and forest ferns cannot grow GPU budget');
 assert.equal(small.positions.length,108);
 assert.deepEqual(forestFernData({fronds:6,segments:1}),small);
 assert.ok(Math.max(...large.positions.filter((_,i)=>i%3===1))>.55);
 assert.ok(Math.min(...large.positions.filter((_,i)=>i%3===1))<.22);
 assert.ok(new Set(large.colors.filter((_,i)=>i%3===1).map(x=>x.toFixed(2))).size>8);
 assert.throws(()=>forestFernData({segments:0}),RangeError);
});
test('forest grass and saplings change leaf silhouettes but preserve geometry budgets',()=>{
 const grass=forestCurvedGrassData(),sapling=forestSaplingLeafData();
 assert.equal(grass.positions.length,7*3*9);
 assert.equal(grass.colors.length,grass.positions.length);
 assert.equal(sapling.triangles,14);
 assert.equal(sapling.positions.length,sapling.colors.length);
 assert.ok(sapling.colors.every(v=>v>=0&&v<=1));
 assert.deepEqual(forestSaplingLeafData(),sapling);
 assert.deepEqual(forestGroundLifeBudget('balanced'),
  {grass:1210,saplings:195,deadwood:195});
 assert.deepEqual(forestUnderstoryBudget('balanced'),
  {ferns:335,leaves:620,boulders:105,ivy:190});
});
test('scene keeps undergrowth positions, four+three batches, instancing and no physics',()=>{
 const previous=forestColliders(),layout=createForestLayout();
 const scene=new THREE.Scene();
 const heightAt=()=>0;
 const understory=createForestUnderstory(THREE,{scene,radius:261,heightAt});
 const groundLife=createForestGroundLife(THREE,{scene,radius:261,heightAt});
 assert.equal(understory.drawCalls,4);
 assert.equal(groundLife.drawCalls,3);
 const ferns=scene.getObjectByName('forest-cinematic-ferns-no-collision');
 const grass=scene.getObjectByName('forest-grass-decorative-no-collision');
 const saplings=scene.getObjectByName('forest-saplings-decorative-no-collision');
 assert.ok(ferns?.isInstancedMesh&&grass?.isInstancedMesh&&saplings?.isInstancedMesh);
 assert.equal(ferns.geometry.attributes.position.count,84*3);
 assert.equal(saplings.geometry.attributes.position.count,14*3);
 assert.ok([ferns,grass,saplings].every(x=>x.castShadow===false));
 assert.deepEqual(forestColliders(),previous);
 assert.deepEqual(createForestLayout(),layout);
});
test('botanical details are active in main scene without UI or settings',()=>{
 const p=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const ecology=readFileSync(new URL('../forest-ecology.js',import.meta.url),'utf8');
 const forest=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 assert.match(ecology,/forestFernData\(\{fronds:6,segments:1\}\)/);
 assert.match(forest,/forestFernData\(\{fronds:6,segments:1\}\)/);
 assert.match(p,/createForestGroundLife\(THREE,\{scene,radius:R,heightAt\}\)/);
 assert.match(p,/createForestUnderstory\(THREE,\{scene,radius:R,heightAt\}\)/);
 assert.doesNotMatch(p,/r3UnderstoryToggle|botanicalEditor/);
});
