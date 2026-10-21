import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_ATMOSPHERE_LIMITS,forestAtmosphereBudget,forestHazeLayout}
 from '../forest-atmosphere.js';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,forestMoodAt,forestColliders,
 forestTrailLatitude} from '../whispering-forest.js';
test('atmospheric layout stable, keeps campsite and quest markers legible',()=>{
 const before=forestColliders();
 const a=forestHazeLayout(),b=forestHazeLayout();
 assert.deepEqual(a,b);
 assert.ok(a.length>=38&&a.length<=FOREST_ATMOSPHERE_LIMITS.haze);
 for(const p of a){
  assert.ok(p.size>=3.4&&p.size<7.0);
  assert.ok(p.opacity>=.52&&p.opacity<=1);
  assert.ok(forestMoodAt(p.lon,p.lat)>.3);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>
   FOREST_CAMP.clearingRadius+p.size+4);
  for(const site of FOREST_SITE_CLEARINGS)
   assert.ok(forestDistance(p.lon,p.lat,site.lon,site.lat)>site.radius+p.size+1);
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=4);
 }
 assert.deepEqual(forestColliders(),before,'visual atmosphere must not register physics');
});
test('iPhone presets bound the number of transparent overlays',()=>{
 assert.deepEqual(forestAtmosphereBudget('economy'),{haze:14,beams:0,motes:0});
 assert.deepEqual(forestAtmosphereBudget('balanced'),{haze:38,beams:10,motes:120});
 assert.deepEqual(forestAtmosphereBudget('high'),{haze:72,beams:22,motes:264});
 assert.deepEqual(forestAtmosphereBudget('high',true),{haze:0,beams:0,motes:0});
});
