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

test('all 400 original procedural trees remain visible at their original anchors',()=>{
 const scene=new THREE.Scene(),collidersBefore=forestColliders();
 const forest=createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0});
 assert.equal(forest.pilotTreeCount,0);
 assert.deepEqual(forest.pilotSites,[]);
 assert.equal(forest.treeCount,FOREST_TREE_CAP);
 assert.equal(scene.children.filter(x=>x.userData.forestPilot).length,0);
 const trunks=scene.children.find(x=>x.name==='forest-ancient-trunks');
 assert.ok(trunks?.isInstancedMesh);
 assert.equal(trunks.count,400);
 assert.ok(scene.children.filter(x=>x.name.startsWith('forest-'))
  .every(x=>x.isInstancedMesh||x.isGroup));
 const sizes=new THREE.Vector3(),matrix=new THREE.Matrix4();
 for(let i=0;i<400;i++){
  trunks.getMatrixAt(i,matrix);
  matrix.decompose(new THREE.Vector3(),new THREE.Quaternion(),sizes);
  assert.ok(sizes.x>.2&&sizes.y>10&&sizes.z>.2,
   'previously replaced trunks must not be hidden '+i);
 }
 forest.setQuality('high',false);
 forest.setQuality('economy',true);
 assert.deepEqual(forestColliders(),collidersBefore);
});
test('heavy art gallery is fully isolated from gameplay module imports',()=>{
 const forest=readFileSync(new URL('../whispering-forest.js',import.meta.url),'utf8'),
  planet=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 assert.doesNotMatch(forest,/createWhisperingForestTreePilot|forestTreeKey/);
 assert.doesNotMatch(forest,/tree-library-forest-types|tree-library-ancient-pine/);
 assert.doesNotMatch(planet,/heroTrees:!isPortalPreview/);
 assert.match(planet,/createWhisperingForest\(THREE,\{scene,radius:R,heightAt\}\)/);
 assert.equal(selectForestPilotTrees(layout,forestTrailLatitude).length,3,
  'retained archived gallery anchors are data-only and not rendered');
});
