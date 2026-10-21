import test from 'node:test';
import assert from 'node:assert/strict';
import {forestFloorLayout,forestFloorBudget,forestFloorColors,FOREST_FLOOR_COUNTS}
 from '../forest-floor.js';
import {forestDistance,forestMoodAt,forestTrailLatitude,FOREST_CAMP,
 FOREST_SITE_CLEARINGS,forestColliders,createForestLayout,FOREST_TRUNK_BASE_SCALE}
 from '../whispering-forest.js';
test('forest-floor layers stay deterministic and leave roads, camp and quests passable',()=>{
 const colliders=forestColliders(),layout=forestFloorLayout();
 assert.deepEqual(layout,forestFloorLayout());
 assert.equal(layout.moss.length,FOREST_FLOOR_COUNTS.moss);
 assert.equal(layout.litter.length,FOREST_FLOOR_COUNTS.litter);
 for(const p of [...layout.moss,...layout.litter]){
  assert.ok(forestMoodAt(p.lon,p.lat)>.035);
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=3.4+p.size);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>
   FOREST_CAMP.clearingRadius+p.size+2);
  assert.ok(FOREST_SITE_CLEARINGS.every(s=>forestDistance(p.lon,p.lat,s.lon,s.lat)>s.radius+p.size+1));
 }
 assert.deepEqual(forestColliders(),colliders);
 assert.equal(createForestLayout().trees.length,FOREST_TRUNK_BASE_SCALE>0?400:-1);
});
test('light/dark transition changes ground color continuously',()=>{
 let prev;
 for(let lon=.16;lon<1.44;lon+=.004){
  const p=forestFloorColors(lon,forestTrailLatitude(lon),.5);
  for(const arr of [p.moss,p.leaves,p.twig])
   assert.ok(arr.every(x=>x>=0&&x<=1&&Number.isFinite(x)));
  if(prev)assert.ok(Math.abs(p.moss[0]-prev.moss[0])<.10);
  prev=p;
 }
 assert.ok(forestFloorColors(1.19,forestTrailLatitude(1.19)).shade>
  forestFloorColors(.16,forestTrailLatitude(.16)).shade);
});
test('three performance presets cap draw ranges and preview draws nothing',()=>{
 assert.deepEqual(forestFloorBudget('economy'),{moss:155,litter:210});
 assert.deepEqual(forestFloorBudget('balanced'),{moss:410,litter:565});
 assert.deepEqual(forestFloorBudget('high'),{moss:680,litter:920});
 assert.deepEqual(forestFloorBudget('high',true),{moss:0,litter:0});
});
