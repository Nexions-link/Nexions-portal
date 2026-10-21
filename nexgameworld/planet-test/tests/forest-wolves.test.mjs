import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_WOLF_SPAWNS,FOREST_WOLF_LEVELS} from '../forest-wolf-spawns.js';
import {CREATURE_SPAWNS,creatureById,creatureByIndex} from '../creature-registry.js';
import {blocksForestAtLocal,forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude} from '../whispering-forest.js';
import {validateCreatureLootTables,rollCreatureLoot} from '../loot-tables.js';
test('six server/client wolves have canonical levels and stable IDs',()=>{
 assert.equal(FOREST_WOLF_SPAWNS.length,6);
 assert.deepEqual([...FOREST_WOLF_LEVELS],[5,5,6,6,7,7]);
 assert.equal(CREATURE_SPAWNS.length,20);
 for(let i=0;i<6;i++){
  const mob=creatureById('forest-wolf-'+i);
  assert.equal(mob.index,14+i);assert.equal(creatureByIndex(mob.index),mob);
  assert.equal(mob.level,FOREST_WOLF_LEVELS[i]);
  assert.equal(mob.family,'forestWolf');assert.equal(mob.type,'beast');
 }
 assert.deepEqual(validateCreatureLootTables(),[]);
 assert.ok(rollCreatureLoot('forestWolf',()=>0).some(x=>x.id==='wolfPelt'));
});
test('wolf spawns have space to roam and avoid all quest and collision areas',()=>{
 for(let i=0;i<FOREST_WOLF_SPAWNS.length;i++){
  const w=FOREST_WOLF_SPAWNS[i];
  assert.equal(blocksForestAtLocal(w.x,w.z,5.1),false);
  assert.ok(Math.abs(w.lat-forestTrailLatitude(w.lon))*261>18);
  assert.ok(forestDistance(w.lon,w.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>36);
  assert.ok(FOREST_SITE_CLEARINGS.every(s=>forestDistance(w.lon,w.lat,s.lon,s.lat)>15));
  assert.ok(FOREST_WOLF_SPAWNS.slice(i+1).every(other=>Math.hypot(w.x-other.x,w.z-other.z)>18));
 }
});