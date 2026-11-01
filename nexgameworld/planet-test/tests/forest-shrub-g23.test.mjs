import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {forestShrubLeafData,forestShrubFamilyProfile,FOREST_SHRUB_FAMILIES}
 from '../forest-art-ecology.js';
import {forestEcologyLayout,createForestEcology} from '../forest-ecology.js';
import {forestColliders,createForestLayout,forestTrailLatitude,forestDistance,
 FOREST_CAMP,FOREST_SITE_CLEARINGS} from '../whispering-forest.js';
import {forestCanopyShadeAt} from '../forest-lighting.js';

test('G-23 three real leaf silhouettes preserve exactly 18 triangles per shrub',()=>{
 assert.deepEqual(FOREST_SHRUB_FAMILIES,['broad','lanceolate','toothed']);
 const geometries=FOREST_SHRUB_FAMILIES.map(f=>forestShrubLeafData(f));
 for(const data of geometries){
  assert.equal(data.triangles,18);
  assert.equal(data.positions.length,162);
  assert.equal(data.colors.length,162);
  assert.ok(data.positions.every(Number.isFinite));
  assert.ok(data.colors.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  assert.ok(Math.max(...data.positions.filter((_,i)=>i%3===1))>.65);
 }
 assert.notDeepEqual(geometries[0].positions,geometries[1].positions);
 assert.notDeepEqual(geometries[1].positions,geometries[2].positions);
 assert.notDeepEqual(geometries[0].positions,geometries[2].positions);
 assert.deepEqual(forestShrubLeafData(),geometries[0]);
 assert.deepEqual(forestShrubLeafData('toothed'),geometries[2]);
 assert.throws(()=>forestShrubLeafData('giant'),RangeError);
});
test('G-23 shrub families vary shape and sunshade without growing over path',()=>{
 const broad=forestShrubFamilyProfile(.12,.2);
 const needle=forestShrubFamilyProfile(.53,.2);
 const teeth=forestShrubFamilyProfile(.89,.2);
 assert.equal(broad.family,'broad');
 assert.equal(needle.family,'lanceolate');
 assert.equal(teeth.family,'toothed');
 assert.ok(broad.width>needle.width);
 assert.ok(needle.height>broad.height);
 assert.ok(needle.height>teeth.height);
 for(const p of [broad,needle,teeth]){
  assert.ok(p.light>.80&&p.light<1.15);
  assert.ok(p.width>.65&&p.width<1.1);
  assert.ok(p.height>.85&&p.height<1.22);
 }
 assert.ok(forestShrubFamilyProfile(.20,.9).light<
  forestShrubFamilyProfile(.20,.1).light);
 assert.throws(()=>forestShrubFamilyProfile(NaN,.3),RangeError);
});
test('G-23 exactly 500 legacy shrub coordinates survive in three botanical instanced batches',()=>{
 const trees=createForestLayout(),blocked=forestColliders(),layout=forestEcologyLayout();
 const scene=new THREE.Scene();
 const ecology=createForestEcology(THREE,{scene,radius:261,heightAt:()=>0});
 assert.deepEqual(ecology.layout,layout);
 assert.equal(layout.shrubs.length,500);
 const groups=FOREST_SHRUB_FAMILIES.map(f=>{
  const batch=scene.getObjectByName('forest-shrubs-'+f);
  assert.ok(batch?.isInstancedMesh);
  assert.equal(batch.geometry.attributes.position.count,54);
  assert.equal(batch.material.vertexColors,true);
  assert.equal(batch.castShadow,false);
  return {family:f,mesh:batch,points:layout.shrubs.filter(p=>
   forestShrubFamilyProfile(p.variation,forestCanopyShadeAt(p.lon,p.lat)).family===f)};
 });
 assert.equal(groups.reduce((sum,x)=>sum+x.points.length,0),500);
 for(const {family,mesh,points} of groups){
  assert.ok(points.length>100,'each botanical family should be visible');
  assert.equal(mesh.instanceMatrix.count,points.length);
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
  const q=new THREE.Quaternion(),scale=new THREE.Vector3();
  for(const i of [0,Math.floor(points.length/2),points.length-1]){
   const p=points[i],profile=forestShrubFamilyProfile(p.variation,
    forestCanopyShadeAt(p.lon,p.lat));
   mesh.getMatrixAt(i,matrix);
   matrix.decompose(position,q,scale);
   const n=new THREE.Vector3(Math.sin(p.lon)*Math.cos(p.lat),
    Math.sin(p.lat),Math.cos(p.lon)*Math.cos(p.lat));
   assert.ok(position.distanceTo(n.multiplyScalar(261.045))<.0001,
    'the original shrub anchor may not be relocated');
   assert.ok(Math.abs(scale.x-p.size*profile.width)<.0001);
   assert.ok(Math.abs(scale.y-p.size*1.2*profile.height)<.0001);
  }
 }
 assert.equal(scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-')).length,7);
 assert.equal(scene.children.find(x=>x.name==='forest-mushroom-caps').instanceMatrix.count,145);
 ecology.setQuality('economy');
 for(const group of groups)assert.equal(group.mesh.count,Math.floor(group.points.length*.32));
 ecology.setQuality('high');
 for(const group of groups)assert.equal(group.mesh.count,group.points.length);
 ecology.setQuality('balanced');
 for(const group of groups)assert.equal(group.mesh.count,Math.floor(group.points.length*.65));
 for(const p of layout.shrubs){
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=6.1);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
   FOREST_CAMP.clearingRadius+1.1);
  for(const site of FOREST_SITE_CLEARINGS)
   assert.ok(forestDistance(p.lon,p.lat,site.lon,site.lat)>=site.radius+1.1);
 }
 assert.deepEqual(forestColliders(),blocked);
 assert.deepEqual(createForestLayout(),trees);
 assert.deepEqual(forestEcologyLayout(),layout);
});
test('G-23 is baked into real client and never changes pickups, collisions or shaders',()=>{
 const src=readFileSync(new URL('../forest-ecology.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(src,/forestShrubLeafData\(family\)/);
 assert.match(src,/forest-shrubs-/);
 assert.match(src,/FOREST_SHRUB_FAMILIES/);
 assert.match(world,/createForestEcology\(THREE,\{scene,radius:R,heightAt\}\)/);
 assert.doesNotMatch(src,/addCollider|registerPickup|onBeforeCompile|ShaderMaterial|new WebSocket/);
});
