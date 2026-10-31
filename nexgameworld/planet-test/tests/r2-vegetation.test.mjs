import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {deciduousCrownData,coniferCrownData,FOREST_CROWN_GEOMETRY_BUDGET,
 crownDataBounds} from '../forest-crown-geometry.js';
import {meadowGrassBladeData,createSphericalMeadow} from '../sphere-meadow.js';
import {createWhisperingForest,createForestLayout,forestColliders} from '../whispering-forest.js';
import {vegetationGeometryBudget} from '../r2-vegetation.js';

test('R2-02 shapes the existing shared canopy within identical per-tree triangle budgets',()=>{
 for(const [kind,fn] of [['oak',deciduousCrownData],['pine',coniferCrownData]]){
  for(const variant of [0,1,2]){
   const base=fn(variant),enhanced=fn(variant,{r2:true});
   assert.ok(vegetationGeometryBudget(base,enhanced),kind+' changed geometry budget');
   assert.deepEqual(fn(variant),base,'baseline must stay untouched');
   assert.deepEqual(fn(variant,{r2:true}),enhanced,'enhancement must be deterministic');
   assert.notDeepEqual(enhanced.positions,base.positions,'the renderer must change real canopy positions');
   assert.notDeepEqual(enhanced.colors,base.colors,'foliage light/dark contrast must change');
   assert.ok(enhanced.positions.every(Number.isFinite));
   assert.ok(enhanced.colors.every(v=>v>=0&&v<=1));
   const b=crownDataBounds(enhanced);
   assert.ok(b.radialMax<=1.30,'keep foliage within previous safe canopy scale');
  }
 }
 const a=deciduousCrownData(0,{r2:true});
 assert.equal(a.positions.length/3,
  (FOREST_CROWN_GEOMETRY_BUDGET.deciduousSegments+1)*
  (FOREST_CROWN_GEOMETRY_BUDGET.deciduousRings+1));
 const p=coniferCrownData(0,{r2:true});
 assert.equal(p.positions.length/9,
  FOREST_CROWN_GEOMETRY_BUDGET.coniferWhorls*
  FOREST_CROWN_GEOMETRY_BUDGET.coniferBranches*2);
});
test('R2-02 grass looks lower and broader but does not add any triangles',()=>{
 const base=meadowGrassBladeData(),newShape=meadowGrassBladeData({r2:true});
 assert.ok(vegetationGeometryBudget(base,newShape));
 assert.equal(base.bladeCount,6);
 assert.notDeepEqual(base.positions,newShape.positions);
 assert.deepEqual(meadowGrassBladeData(),base);
 const maxHeight=shape=>Math.max(...shape.positions.filter((_,i)=>i%3===1));
 assert.ok(maxHeight(newShape)<maxHeight(base)*.8);
 assert.ok(newShape.positions.every(Number.isFinite));
 assert.ok(newShape.colors.every(x=>x>=0&&x<=1));
});
test('both forest modes reuse exactly 400 coordinates, 12 shared draw batches and zero new colliders',()=>{
 const colliders=forestColliders(),layout=createForestLayout();
 const originals=new THREE.Scene(),newScene=new THREE.Scene();
 const baseline=createWhisperingForest(THREE,{scene:originals,radius:261,heightAt:()=>0});
 const enhanced=createWhisperingForest(THREE,{scene:newScene,radius:261,heightAt:()=>0,r2Vegetation:true});
 assert.equal(baseline.treeCount,400);assert.equal(enhanced.treeCount,400);
 const native=originals.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('forest-'));
 const r2=newScene.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('forest-'));
 assert.equal(native.length,12);assert.equal(r2.length,12);
 for(let k=0;k<native.length;k++){
  const old=native[k],now=r2[k];
  assert.equal(old.name,now.name);assert.equal(old.instanceMatrix.count,now.instanceMatrix.count);
  assert.equal(old.geometry.attributes.position.count,now.geometry.attributes.position.count);
  assert.equal(old.geometry.index?.count||0,now.geometry.index?.count||0);
  assert.deepEqual(Array.from(old.instanceMatrix.array),Array.from(now.instanceMatrix.array));
 }
 const find=(scene,name)=>scene.children.find(m=>m.name===name);
 assert.notDeepEqual(
  Array.from(find(originals,'forest-oak-crown').geometry.attributes.position.array),
  Array.from(find(newScene,'forest-oak-crown').geometry.attributes.position.array));
 assert.notDeepEqual(
  Array.from(find(originals,'forest-pine-lower').geometry.attributes.position.array),
  Array.from(find(newScene,'forest-pine-lower').geometry.attributes.position.array));
 assert.deepEqual(forestColliders(),colliders);
 assert.deepEqual(createForestLayout(),layout);
});
test('same native spherical meadow instances and batch counts across modes',()=>{
 function scene(r2Vegetation){
  const root=new THREE.Scene();
  const result=createSphericalMeadow(THREE,{scene:root,getRadius:()=>261,
   toNormal:(x,z,r)=>new THREE.Vector3(x,z,r).normalize(),heightAt:()=>0,
   accept:()=>true,r2Vegetation});
  return {root,result};
 }
 const before=scene(false),after=scene(true);
 assert.deepEqual(before.result.counts,after.result.counts);
 const a=before.root.children.filter(m=>m.isInstancedMesh);
 const b=after.root.children.filter(m=>m.isInstancedMesh);
 assert.equal(a.length,b.length);
 for(let k=0;k<a.length;k++){
  assert.equal(a[k].instanceMatrix.count,b[k].instanceMatrix.count);
  assert.equal(a[k].geometry.attributes.position.count,b[k].geometry.attributes.position.count);
  assert.deepEqual(Array.from(a[k].instanceMatrix.array),Array.from(b[k].instanceMatrix.array));
 }
 assert.notDeepEqual(Array.from(a[0].geometry.attributes.position.array),
  Array.from(b[0].geometry.attributes.position.array));
});
test('pilot is opt-in and never touches main camera, online movement or animal visuals',()=>{
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const forest=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 assert.match(planet,/get\('r2vegetation'\)==='1'/);
 assert.match(planet,/createWhisperingForest\(THREE,\{scene,radius:R,heightAt,r2Vegetation,artRemaster\}\)/);
 assert.doesNotMatch(forest,/createForestLibraryTree|whispering-forest-tree-pilot/);
});
