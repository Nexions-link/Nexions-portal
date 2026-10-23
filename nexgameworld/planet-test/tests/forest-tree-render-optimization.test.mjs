import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAncientPine} from '../tree-library-ancient-pine.js';
import {createForestLibraryTree} from '../tree-library-forest-types.js';
import {enableTreeInstanceCulling,simplifyForestBarkShading,
 createForestShadowSilhouette,configurePilotTreeRender}
 from '../forest-tree-render-optimization.js';
import {createForestLayout,forestTrailLatitude,forestColliders,
 createWhisperingForest} from '../whispering-forest.js';
import {selectForestPilotTrees} from '../whispering-forest-tree-pilot.js';

const triangles=geo=>geo.index?geo.index.count/3:geo.attributes.position.count/3;
test('all original 3D needles survive division into four frustum-cullable canopy tiers',()=>{
 const pine=createAncientPine(THREE,{mapSize:64,seed:17});
 const tiers=pine.group.children.filter(o=>o.isInstancedMesh&&o.name.includes('needle tufts'));
 assert.equal(tiers.length,4);
 assert.equal(tiers.reduce((a,b)=>a+b.count,0),pine.group.userData.geometryCounts.needleTufts);
 assert.ok(tiers.every(m=>m.frustumCulled&&m.boundingSphere?.radius>0));
 const shape=tiers[0].geometry;
 assert.ok(tiers.every(m=>m.geometry===shape));
 assert.ok(pine.group.children.filter(o=>o.isInstancedMesh)
  .every(o=>o.frustumCulled&&o.boundingSphere));
 pine.dispose();
});
test('shadow silhouettes are far cheaper than real meshes but invisible to beauty render',()=>{
 for(const id of ['tree_pine_ancient','tree_oak_whispering','tree_dead_sentinel']){
  const shadow=createForestShadowSilhouette(THREE,{id,height:id==='tree_pine_ancient'?28:25});
  assert.equal(shadow.userData.cosmeticShadow,true);
  assert.equal(shadow.userData.collider,false);
  assert.equal(shadow.material.colorWrite,false);
  assert.equal(shadow.material.depthWrite,false);
  assert.equal(shadow.frustumCulled,true);
  assert.ok(shadow.userData.triangleCount>100&&shadow.userData.triangleCount<3000);
  shadow.geometry.dispose();shadow.material.dispose();
 }
});
test('full artist geometry keeps its coordinates while redundant bump shaders are disabled',()=>{
 const oak=createForestLibraryTree(THREE,{id:'tree_oak_whispering',mapSize:64});
 const trunk=oak.group.children.find(o=>o.name.includes('main trunk'));
 const xyz=trunk.geometry.attributes.position.array.slice();
 const before=oak.group.children.filter(o=>o.isInstancedMesh).map(x=>x.count);
 const count=enableTreeInstanceCulling(oak.group);
 const mats=simplifyForestBarkShading(oak.group);
 assert.ok(count>=1&&mats>=1);
 assert.ok(oak.group.children.filter(o=>o.isInstancedMesh)
  .every(m=>m.frustumCulled&&m.boundingSphere?.radius>0));
 assert.deepEqual([...trunk.geometry.attributes.position.array],[...xyz]);
 assert.deepEqual(oak.group.children.filter(o=>o.isInstancedMesh).map(x=>x.count),before);
 assert.ok(trunk.material.normalMap&&trunk.material.roughnessMap&&trunk.material.map);
 assert.equal(trunk.material.bumpMap,null);
 oak.dispose();
});
test('pilot render uses one cheap shadow caster and NEVER casts master boughs',()=>{
 const oldPhysics=forestColliders();
 const scene=new THREE.Scene();
 const forest=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0,heroTrees:true});
 const models=scene.children.filter(x=>x.userData.forestPilot);
 assert.equal(models.length,3);
 for(const group of models){
  const opt=group.userData.rendererOptimizations;
  assert.ok(opt.culledInstances>=(group.userData.assetId==='tree_dead_sentinel'?0:1));
  assert.ok(opt.savedFragmentPasses>=1);
  assert.ok(opt.shadowProxyTriangles<3000);
  const shadows=[],geometry=[];
  group.traverse(o=>{
   if(!o.isMesh)return;
   if(o.userData.cosmeticShadow)shadows.push(o);
   else geometry.push(o);
  });
  assert.equal(shadows.length,1);
  assert.ok(geometry.every(o=>o.castShadow===false));
  assert.ok(geometry.some(o=>triangles(o.geometry)>shadows[0].userData.triangleCount*4));
  assert.equal(shadows[0].visible,false);
  assert.equal(shadows[0].material.colorWrite,false);
 }
 forest.setQuality('high',false);
 assert.ok(models.every(group=>group.children.some(o=>o.userData.cosmeticShadow&&o.visible&&o.castShadow)));
 assert.ok(models.every(group=>group.children.filter(o=>!o.userData.cosmeticShadow)
  .every(o=>o.castShadow===false)));
 forest.setQuality('high',true);
 assert.ok(models.every(group=>!group.visible));
 assert.deepEqual(forestColliders(),oldPhysics);
 assert.equal(selectForestPilotTrees(createForestLayout(),forestTrailLatitude).length,3);
});
