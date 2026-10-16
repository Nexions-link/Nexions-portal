import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_CATALOG} from '../../items.js';
import {CREATURE_LOOT_TABLES,rollCreatureLoot,getCreatureLootRows,validateCreatureLootTables} from '../loot-tables.js';
test('every table references real items and valid odds',()=>{
 assert.deepEqual(validateCreatureLootTables(),[]);
 for(const creature of Object.keys(CREATURE_LOOT_TABLES))
  for(const row of getCreatureLootRows(creature)){
   assert.ok(ITEM_CATALOG[row.id],row.id);
   assert.ok(row.chance>=0&&row.chance<=1);
   assert.ok(row.min>=1&&row.max>=row.min);
  }
});
test('ordinary drops can be empty; selected RNG reliably yields one feather',()=>{
 assert.deepEqual(rollCreatureLoot('dolgonog',()=>.99),[]);
 assert.deepEqual(rollCreatureLoot('dolgonog',()=>.5),[{id:'feather',qty:1}]);
});
test('boss exclusive feather is guaranteed',()=>{
 assert.deepEqual(rollCreatureLoot('stormbeak',()=>.99),[{id:'giantFeather',qty:1}]);
});
test('Atlas summed equipment chances match game chances',()=>{
 for(const creature of Object.keys(CREATURE_LOOT_TABLES)){
  const table=CREATURE_LOOT_TABLES[creature];
  const gear=getCreatureLootRows(creature).filter(r=>r.group==='equipment');
  const sum=gear.reduce((s,row)=>s+row.chance,0);
  assert.ok(Math.abs(sum-table.equipment.poor-table.equipment.uncommon)<1e-10);
  assert.equal(gear.find(r=>r.id==='scalpingStrength').chance,gear.find(r=>r.id==='scalpingStamina').chance);
 }
});
test('a material roll and an equipment roll can both succeed independently',()=>{
 const seq=[.8,.1,.9,.9,.005,.1];
 const result=rollCreatureLoot('dolgonog',()=>seq.shift());
 assert.ok(result.some(row=>row.id==='beak'));
 assert.ok(result.some(row=>row.id==='warriorTunic'));
 assert.ok(!result.some(row=>row.id==='feather'));
});
test('a boar in the atlas is not a boar in the playable game',()=>{
 assert.equal(CREATURE_LOOT_TABLES['wild-boar'],undefined);
 assert.deepEqual(getCreatureLootRows('wild-boar'),[]);
 assert.throws(()=>rollCreatureLoot('wild-boar'),/No NexGameWorld loot table/);
});
test('a malformed table is rejected',()=>{
 assert.ok(validateCreatureLootTables({bad:{
  materials:[{id:'unknown',chance:2,min:4,max:1}],equipment:{poor:.8,uncommon:.3}
 }}).length>=3);
});
