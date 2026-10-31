import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {deciduousCrownData,coniferCrownData,crownDataBounds}
 from '../forest-crown-geometry.js';
import {forestBarkPixel,forestBarkQuality,buildForestBarkPixels}
 from '../forest-bark-texture.js';
import {createForestLayout,forestColliders,createWhisperingForest}
 from '../whispering-forest.js';

test('R3-02 true canopy depth in the original shared geometry, not extra tree meshes',()=>{
 for(const kind of ['deciduous','conifer']){
  const fn=kind==='conifer'?coniferCrownData:deciduousCrownData;
  for(const variant of [0,1,2]){
   const before=fn(variant,{r2:true}),after=fn(variant,{r2:true,art:true});
   assert.equal(before.positions.length,after.positions.length);
   assert.equal(before.colors.length,after.colors.length);
   assert.deepEqual(before.indices,after.indices);
   assert.notDeepEqual(before.positions,after.positions);
   assert.notDeepEqual(before.colors,after.colors);
   assert.deepEqual(fn(variant,{r2:true,art:true}),after);
   assert.ok(after.colors.every(c=>Number.isFinite(c)&&c>=0&&c<=1));
   assert.ok(after.positions.every(Number.isFinite));
   assert.ok(crownDataBounds(after).radialMax<=1.30);
  }
 }
});
test('R3-02 fissured bark and lichen are opaque, periodic and visually distinct',()=>{
 const tex=buildForestBarkPixels(128,256);
 const light=new Set(),bumps=new Set();
 for(let i=0;i<tex.color.length;i+=4){
  assert.equal(tex.color[i+3],255);assert.equal(tex.bump[i+3],255);
  light.add(tex.color[i]);bumps.add(tex.bump[i]);
 }
 assert.ok(light.size>80,'dramatic fissures and highlighted raised bark');
 assert.ok(bumps.size>100,'bump map should resolve fine old-growth plates');
 for(const [u,v] of [[.13,.8],[.6,.1],[.92,.47]]){
  assert.deepEqual(forestBarkPixel(u,v),forestBarkPixel(u+1,v-1));
 }
 assert.ok(forestBarkQuality('high').bumpScale>.09);
 assert.equal(forestBarkQuality('economy').bump,false);
});
test('forest keeps all server colliders, trees, positions and 12 instanced batches',()=>{
 const beforeColliders=forestColliders(),layout=createForestLayout();
 const oldScene=new THREE.Scene(),newScene=new THREE.Scene();
 createWhisperingForest(THREE,{scene:oldScene,radius:261,heightAt:()=>0,r2Vegetation:true,artRemaster:false});
 createWhisperingForest(THREE,{scene:newScene,radius:261,heightAt:()=>0,r2Vegetation:true,artRemaster:true});
 const inst=s=>s.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 const old=inst(oldScene),now=inst(newScene);
 assert.equal(now.length,12);assert.equal(old.length,12);
 for(let i=0;i<12;i++){
  assert.equal(old[i].name,now[i].name);
  // G-17 only adds cosmetic grove leaves within the EXISTING
  // silhouette batch. Every pre-existing transform is preserved.
  const groveBatch=old[i].name==='forest-crown-silhouettes';
  const extra=now[i].instanceMatrix.count-old[i].instanceMatrix.count;
  assert.equal(groveBatch?extra>=0:extra===0,true);
  for(let j=0;j<old[i].instanceMatrix.count;j++){
   const updatedIndex=groveBatch?j+extra:j;
   for(const k of [12,13,14])assert.equal(
    old[i].instanceMatrix.array[16*j+k],
    now[i].instanceMatrix.array[16*updatedIndex+k],
    'existing tree world anchor must stay fixed in '+old[i].name);
  }
  assert.equal(old[i].geometry.attributes.position.count,now[i].geometry.attributes.position.count);
  assert.equal(old[i].geometry.index?.count??0,now[i].geometry.index?.count??0);
 }
 const pick=(s,name)=>s.children.find(x=>x.name===name);
 assert.notDeepEqual(
  Array.from(pick(oldScene,'forest-oak-crown').geometry.attributes.position.array),
  Array.from(pick(newScene,'forest-oak-crown').geometry.attributes.position.array));
 assert.notDeepEqual(
  Array.from(pick(oldScene,'forest-high-boughs').geometry.attributes.position.array),
  Array.from(pick(newScene,'forest-high-boughs').geometry.attributes.position.array));
 assert.ok(pick(newScene,'forest-buttress-roots').geometry.getAttribute('color'));
 assert.deepEqual(forestColliders(),beforeColliders);
 assert.deepEqual(createForestLayout(),layout);
});
test('bark and crown detail are live, with no extra controls or network changes',()=>{
 const forest=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8');
 const planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(forest,/art:artRemaster/);
 assert.match(forest,/createForestBarkTextures\(THREE\)/);
 assert.match(planet,/createWhisperingForest\(THREE,\{scene,radius:R,heightAt,r2Vegetation,artRemaster\}\)/);
 assert.doesNotMatch(forest,/new THREE\.ShaderMaterial|onBeforeCompile|createForestLibraryTree/);
});
