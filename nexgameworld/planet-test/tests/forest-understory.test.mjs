import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOREST_UNDERSTORY_CAPS,forestUnderstoryBudget,
 forestUnderstoryLayout,forestUnderstoryGeometryData}
 from '../forest-understory.js';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,
 forestTrailLatitude,forestColliders,forestMoodAt} from '../whispering-forest.js';
const R=261;
test('rich understorey is deterministic and lives outside safe paths',()=>{
 const before=forestColliders(),a=forestUnderstoryLayout(),b=forestUnderstoryLayout();
 assert.deepEqual(a,b,'every client must see the same forest');
 for(const kind of ['ferns','leaves','boulders','ivy'])
  assert.ok(a[kind].length>=FOREST_UNDERSTORY_CAPS[kind]*.70,
   kind+' must cover most of its budget');
 for(const kind of ['ferns','leaves','boulders']){
  for(const p of a[kind]){
   assert.ok(forestMoodAt(p.lon,p.lat)>.23);
   assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*R>=4.7+p.size);
   assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
    FOREST_CAMP.clearingRadius+p.size+4);
   for(const site of FOREST_SITE_CLEARINGS)
    assert.ok(forestDistance(p.lon,p.lat,site.lon,site.lat)>=site.radius+p.size+3);
  }
 }
 assert.deepEqual(forestColliders(),before,'cosmetic scene cannot change physics');
});
test('fern leaves, ivy and leaf litter are actual triangles with no NaN',()=>{
 for(const kind of ['ferns','leaves','ivy']){
  const data=forestUnderstoryGeometryData(kind);
  assert.ok(data.triangles>=18);
  assert.equal(data.positions.length,data.colors.length);
  assert.equal(data.positions.length,9*data.triangles);
  assert.ok(data.positions.every(Number.isFinite));
  assert.ok(data.colors.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
 }
 assert.ok(forestUnderstoryGeometryData('ferns').triangles>=80);
 assert.throws(()=>forestUnderstoryGeometryData('unknown'),RangeError);
});
test('iPhone quality presets bound four instanced meshes',()=>{
 const hi=forestUnderstoryBudget('high'),balanced=forestUnderstoryBudget(),
  low=forestUnderstoryBudget('economy');
 assert.deepEqual(hi,FOREST_UNDERSTORY_CAPS);
 assert.ok(Object.keys(hi).every(k=>low[k]<balanced[k]&&balanced[k]<hi[k]));
 assert.ok(Object.values(forestUnderstoryBudget('high',true)).every(n=>n===0));
});
test('world loads scenery separately from colliders and preserves opaque ground',()=>{
 const world=readFileSync(new URL('../planet.js',import.meta.url),'utf8'),
  light=readFileSync(new URL('../forest-lighting.js',import.meta.url),'utf8'),
  forest=readFileSync(new URL('../forest-understory.js',import.meta.url),'utf8');
 assert.match(world,/artSafety\.register\('understory',\(\)=>createForestUnderstory\(THREE,ART_SCENE_ARGS\)\)/);
 assert.match(world,/artSafety\.update\(qualityName,isPortalPreview\)/);
 assert.match(forest,/new THREE\.InstancedMesh/);
 assert.match(light,/islands=9,facets=9/);
 assert.doesNotMatch(forest,/ShaderMaterial|onBeforeCompile|addCollider|registerObstacle/);
 assert.match(world,/transparent:false,depthWrite:true,side:THREE\.FrontSide/);
});
