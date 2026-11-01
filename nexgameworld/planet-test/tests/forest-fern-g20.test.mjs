import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestFernData,forestFernAgeProfile} from '../forest-botanical-geometry.js';
import {forestUnderstoryLayout,forestUnderstoryGeometryData,createForestUnderstory,
 forestUnderstoryBudget} from '../forest-understory.js';
import {createForestLayout,forestColliders,createWhisperingForest}
 from '../whispering-forest.js';
import {createForestEcology,forestEcologyLayout} from '../forest-ecology.js';

test('G-20 fern leaves are sculpted into true age-dependent rosettes on old triangle budgets',()=>{
 const mature=forestFernData({fronds:7,segments:6});
 const young=forestFernData({fronds:7,segments:6,age:'young'});
 const old=forestFernData({fronds:7,segments:6,age:'old'});
 const data=[mature,young,old];
 for(const f of data){
  assert.equal(f.triangles,84);
  assert.equal(f.positions.length,84*9);
  assert.equal(f.colors.length,f.positions.length);
  assert.ok(f.positions.every(Number.isFinite));
  assert.ok(f.colors.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  const y=f.positions.filter((_,i)=>i%3===1);
  assert.ok(Math.max(...y)>.40&&Math.min(...y)<.22);
 }
 assert.notDeepEqual(mature.positions,young.positions);
 assert.notDeepEqual(mature.positions,old.positions);
 assert.ok(Math.max(...old.positions.filter((_,i)=>i%3===0))>
  Math.max(...young.positions.filter((_,i)=>i%3===0)));
 assert.deepEqual(forestFernData({fronds:7,segments:6}),mature);
 assert.equal(forestUnderstoryGeometryData('ferns').triangles,84);
 for(const age of ['young','mature','old']){
  const small=forestFernData({fronds:6,segments:1,age});
  assert.equal(small.triangles,12);
  assert.equal(small.positions.length,108);
  assert.equal(small.colors.length,108);
 }
 assert.throws(()=>forestFernData({age:'oversized'}),RangeError);
});

test('G-20 age profile separates young, mature and old foliage without new batches',()=>{
 const young=forestFernAgeProfile(.05,.85);
 const mature=forestFernAgeProfile(.67,.48);
 const old=forestFernAgeProfile(.99,.05);
 assert.deepEqual([young.age,mature.age,old.age],['young','mature','old']);
 assert.ok(young.width<mature.width&&mature.width<old.width);
 assert.ok(mature.height>young.height);
 assert.ok(old.height<old.width);
 assert.ok([young,mature,old].every(p=>
  Object.values(p).every(v=>typeof v==='string'||Number.isFinite(v))));
 assert.deepEqual(forestFernAgeProfile(.67,.48),mature);
 assert.throws(()=>forestFernAgeProfile(Infinity,0),RangeError);
});

test('G-20 old forest locations, all tree blockers and gameplay clearings stay intact',()=>{
 const before=forestColliders(),treeLayout=createForestLayout();
 const layout=forestUnderstoryLayout();
 const ageTypes=new Set(layout.ferns.map(p=>
  forestFernAgeProfile(p.variation,p.shade).age));
 assert.equal(ageTypes.size,3,'all three ages must be present in the old fern locations');
 assert.equal(layout.ferns.length,540);
 const ec=forestEcologyLayout();
 assert.ok(ec.bracken.length>200);
 const scene=new THREE.Scene();
 const fern=createForestUnderstory(THREE,{scene,radius:261,heightAt:()=>0});
 assert.equal(fern.drawCalls,4);
 const bush=scene.getObjectByName('forest-cinematic-ferns-no-collision');
 assert.ok(bush?.isInstancedMesh);
 assert.equal(bush.geometry.attributes.position.count,84*3);
 const base=new THREE.Matrix4(),pos=new THREE.Vector3(),qu=new THREE.Quaternion(),scale=new THREE.Vector3();
 for(const i of [0,17,148,539]){
  const p=layout.ferns[i],growth=forestFernAgeProfile(p.variation,p.shade);
  bush.getMatrixAt(i,base);
  base.decompose(pos,qu,scale);
  assert.ok(Math.abs(scale.x-p.size*1.10*growth.width)<.0002);
  assert.ok(Math.abs(scale.y-p.size*.98*growth.height)<.0002);
  const n=new THREE.Vector3(Math.cos(p.lat)*Math.sin(p.lon),
    Math.sin(p.lat),Math.cos(p.lat)*Math.cos(p.lon));
  assert.ok(Math.abs(pos.length()-261.055)<.001);
  assert.ok(pos.normalize().distanceTo(n)<.00001);
 }
 const ecoScene=new THREE.Scene();
 const ecology=createForestEcology(THREE,{scene:ecoScene,radius:261,heightAt:()=>0});
 assert.ok(ecoScene.getObjectByName('forest-deep-bracken')?.isInstancedMesh);
 const woods=new THREE.Scene();
 const world=createWhisperingForest(THREE,{scene:woods,radius:261,heightAt:()=>0});
 assert.equal(world.treeCount,400);
 assert.equal(woods.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('forest-')).length,12);
 assert.ok(woods.getObjectByName('forest-ferns')?.isInstancedMesh);
 assert.deepEqual(forestColliders(),before);
 assert.deepEqual(createForestLayout(),treeLayout);
 assert.deepEqual(forestUnderstoryLayout(),layout);
 assert.deepEqual(forestEcologyLayout(),ec);
 assert.deepEqual(forestUnderstoryBudget(),{ferns:335,leaves:620,boulders:105,ivy:190});
 assert.equal(fern.decorativeOnly,true);
});

test('G-20 single source fern sculpture is used in live client without custom shaders',()=>{
 const sources=['forest-understory.js','forest-ecology.js','whispering-forest.js']
  .map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'));
 for(const text of sources){
  assert.match(text,/forest-botanical-geometry\.js\?v=2/);
  assert.match(text,/forestFernData\(/);
  assert.doesNotMatch(text,/new THREE\.ShaderMaterial|onBeforeCompile|registerObstacle/);
 }
});
