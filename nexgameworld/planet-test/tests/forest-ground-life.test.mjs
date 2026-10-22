import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_GROUND_LIFE_CAPS,forestGroundLifeLayout,forestGroundLifeBudget}
 from '../forest-ground-life.js';
import {forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude,
 createForestLayout,forestColliders,blocksForestAtLocal} from '../whispering-forest.js';
test('dense undergrowth is reproducible and leaves paths and important clearings alone',()=>{
 const before=forestColliders(),a=forestGroundLifeLayout(),b=forestGroundLifeLayout();
 assert.deepEqual(a,b);
 for(const key of Object.keys(FOREST_GROUND_LIFE_CAPS)){
  assert.equal(a[key].length,FOREST_GROUND_LIFE_CAPS[key],key);
 }
 for(const [kind,items] of Object.entries(a))for(const p of items){
  const road=kind==='deadwood'?6.3:kind==='saplings'?6.9:4.6;
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=road+p.size);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
    FOREST_CAMP.clearingRadius+p.size+3);
  assert.ok(FOREST_SITE_CLEARINGS.every(s=>forestDistance(p.lon,p.lat,s.lon,s.lat)>=s.radius+p.size+2));
  assert.ok(Number.isFinite(p.shade)&&p.shade>=0&&p.shade<=1);
 }
 const trees=createForestLayout().trees;
 for(const key of Object.keys(a))for(const p of a[key]){
  assert.ok(trees.every(t=>forestDistance(p.lon,p.lat,t.lon,t.lat)>=t.radius*.8+p.size*.58));
 }
 assert.deepEqual(forestColliders(),before);
});
test('grass and leaves have quality budgets, portal preview omits all',()=>{
 assert.deepEqual(forestGroundLifeBudget('economy'),{grass:430,saplings:55,deadwood:65});
 assert.deepEqual(forestGroundLifeBudget('balanced'),{grass:1210,saplings:195,deadwood:195});
 assert.deepEqual(forestGroundLifeBudget('high'),{grass:2100,saplings:360,deadwood:310});
 assert.deepEqual(forestGroundLifeBudget('high',true),{grass:0,saplings:0,deadwood:0});
});
