import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForestLayout,forestTrailLatitude,forestColliders,forestLocalPoint,
 FOREST_TREE_CAP,FOREST_SITE_CLEARINGS,FOREST_CAMP,forestDistance,
 createWhisperingForest} from '../whispering-forest.js';
import {FOREST_PILOT_SPECIES,FOREST_PILOT_LONGITUDES,forestTreeKey,
 selectForestPilotTrees,forestTrunkFitScale,createWhisperingForestTreePilot}
 from '../whispering-forest-tree-pilot.js';
import {readFileSync} from 'node:fs';

const layout=createForestLayout();
test('three forest pilots re-use the EXACT existing trunk coordinates',()=>{
 const before=JSON.stringify(layout),sites=selectForestPilotTrees(layout,forestTrailLatitude);
 assert.equal(sites.length,3);
 assert.deepEqual(sites.map(x=>x.id),FOREST_PILOT_SPECIES);
 assert.equal(new Set(sites.map(x=>forestTreeKey(x.site))).size,3);
 assert.deepEqual(sites,selectForestPilotTrees(layout,forestTrailLatitude));
 assert.deepEqual(JSON.stringify(layout),before);
 for(const {site,index} of sites){
  assert.ok(layout.trees.includes(site),'no newly invented forest anchor');
  assert.ok(Math.abs(site.lon-FOREST_PILOT_LONGITUDES[index])<.21);
  assert.ok(Math.abs(site.lat-forestTrailLatitude(site.lon))*261>10.5+site.radius);
  assert.ok(forestDistance(site.lon,site.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>
   FOREST_CAMP.clearingRadius+site.radius);
  for(const area of FOREST_SITE_CLEARINGS)
   assert.ok(forestDistance(site.lon,site.lat,area.lon,area.lat)>=area.radius+site.radius);
 }
 assert.equal(layout.trees.length,FOREST_TREE_CAP);
});

test('trunk shell is scaled INSIDE pre-existing server collision cylinder',()=>{
 const ids=FOREST_PILOT_SPECIES;
 for(const [i,{site}] of selectForestPilotTrees(layout,forestTrailLatitude).entries()){
  const size=forestTrunkFitScale(ids[i],17+i*53,site,[28,25,20][i]);
  assert.ok(size.horizontal>.1&&size.vertical>0);
  assert.ok(size.masterBaseRadius*size.horizontal<=
   size.existingBlockerRadius*.986);
  assert.ok(size.existingBlockerRadius>.7);
 }
 assert.throws(()=>forestTrunkFitScale('tree_oak_whispering',17,{radius:0},25),RangeError);
});

test('controlled scene hides only three original tree instancing matrices',()=>{
 const scene=new THREE.Scene(),collidersBefore=forestColliders();
 const forest=createWhisperingForest(THREE,{
  scene,radius:261,heightAt:()=>0,heroTrees:true
 });
 assert.equal(forest.pilotTreeCount,3);
 assert.equal(forest.treeCount,FOREST_TREE_CAP);
 const pilot=scene.children.filter(x=>x.userData.forestPilot===true);
 assert.equal(pilot.length,3);
 assert.ok(pilot.every(x=>x.children.length>2&&x.userData.modelBaseRadius<=
  x.userData.originalColliderRadius));
 const trunks=scene.children.find(x=>x.name==='forest-ancient-trunks');
 const sites=selectForestPilotTrees(layout,forestTrailLatitude);
 for(const {site} of sites){
  const id=layout.trees.indexOf(site),matrix=new THREE.Matrix4();
  trunks.getMatrixAt(id,matrix);
  const scale=new THREE.Vector3();matrix.decompose(new THREE.Vector3(),
   new THREE.Quaternion(),scale);
  assert.ok(scale.length()<.00001,'the original art must not double-draw');
 }
 forest.setQuality('high',false);
 assert.ok(pilot.every(x=>x.visible));
 forest.setQuality('high',true);
 assert.ok(pilot.every(x=>!x.visible));
 assert.deepEqual(forestColliders(),collidersBefore,'authoritative physics unchanged');
});

test('the in-game forest is wired to sculptural preview only outside portal',()=>{
 const forest=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8'),
  planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.match(forest,/createWhisperingForestTreePilot/);
 assert.match(forest,/replaced\.has\(forestTreeKey\(p\)\)/);
 assert.match(planet,/heroTrees:!isPortalPreview/);
 assert.doesNotMatch(forest,/FOREST_TREE_CAP\s*=\s*3/);
});
