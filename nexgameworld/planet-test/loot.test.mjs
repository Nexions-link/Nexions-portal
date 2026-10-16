// Run with: node --test planet-test/loot.test.mjs
// Pure regression checks for the spherical NexGameWorld game and Atlas.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_CATALOG} from '../items.js';
import {CREATURE_LOOT_TABLES,rollCreatureLoot,getCreatureLootRows,validateCreatureLootTables} from './loot-tables.js';
import {CORPSE_DURATION_SECONDS,NORMAL_MOB_RESPAWN_SECONDS,advanceCorpseTimer,advanceRespawnTimer,
 corpseRowCapacity,canStoreCorpseRow,takeCorpseRow,takeAllCorpseRows} from './corpse-loot.js';

test('every creature drop is a valid item and Atlas uses the same probabilities as the game',()=>{
 assert.deepEqual(validateCreatureLootTables(),[]);
 for(const [id,table] of Object.entries(CREATURE_LOOT_TABLES)){
  const rows=getCreatureLootRows(id);
  assert.ok(rows.length>0,id);
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,id+' duplicates');
  for(const row of rows){
   assert.ok(ITEM_CATALOG[row.id],id+': '+row.id);
   assert.ok(row.chance>=0&&row.chance<=1);
   assert.ok(row.min>=1&&row.max>=row.min);
  }
  assert.deepEqual(rows.filter(r=>r.group==='materials').map(r=>r.id),
   table.materials.map(r=>r.id));
 }
});

test('seeded drops agree with Atlas chances, including mutually exclusive gear',()=>{
 let state=917;const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 for(const creatureId of Object.keys(CREATURE_LOOT_TABLES)){
  const rows=getCreatureLootRows(creatureId),sampleCount=30000,counts=new Map();
  for(let n=0;n<sampleCount;n++){
   const drops=rollCreatureLoot(creatureId,rng);
   assert.ok(drops.every(d=>ITEM_CATALOG[d.id]&&d.qty>0));
   assert.ok(drops.filter(d=>rows.some(r=>r.id===d.id&&r.group==='equipment')).length<=1);
   for(const drop of drops)counts.set(drop.id,(counts.get(drop.id)||0)+1);
  }
  for(const row of rows){
   const observed=(counts.get(row.id)||0)/sampleCount;
   assert.ok(Math.abs(observed-row.chance)<0.015,
    creatureId+'/'+row.id+': expected '+row.chance+', got '+observed);
  }
 }
});

test('manual looting can safely split a stack without duplicating the remainder',()=>{
 const inventory=[{id:'feather',qty:9},{id:'beak',qty:1}];
 const limits=id=>id==='feather'?10:1;
 const corpse={corpse:true,dying:false,root:{visible:true},loot:[{id:'feather',qty:2}]};
 const store=(id,qty)=>{
  if(!canStoreCorpseRow(inventory,{id,qty},limits,2))return false;
  inventory[0].qty+=qty;return true;
 };
 assert.equal(corpseRowCapacity(inventory,corpse.loot[0],limits,2),1);
 const result=takeCorpseRow(corpse,0,{inventory,stackLimit:limits,store,slotCount:2});
 assert.equal(result.ok,true);assert.equal(result.partial,true);
 assert.deepEqual(result.item,{id:'feather',qty:1});
 assert.equal(corpse.loot[0].qty,1);
 assert.equal(inventory[0].qty,10);
 const rejected=takeCorpseRow(corpse,0,{inventory,stackLimit:limits,store,slotCount:2});
 assert.deepEqual(rejected,{ok:false,reason:'full'});
 assert.equal(corpse.loot[0].qty,1);
});

test('take all leaves uncollectable items in the body and never creates items',()=>{
 const inventory=[];const limits=id=>id==='feather'?10:1;
 const corpse={corpse:true,dying:false,root:{visible:true},
  loot:[{id:'feather',qty:2},{id:'beak',qty:1}]};
 const store=(id,qty)=>{
  if(!canStoreCorpseRow(inventory,{id,qty},limits,1))return false;
  const slot=inventory.find(x=>x.id===id);
  if(slot)slot.qty+=qty;else inventory.push({id,qty});
  return true;
 };
 const result=takeAllCorpseRows(corpse,{inventory,stackLimit:limits,store,slotCount:1});
 assert.equal(result.taken.length,1);
 assert.equal(result.remaining,1);
 assert.deepEqual(corpse.loot,[{id:'feather',qty:2}]);
 assert.deepEqual(inventory,[{id:'beak',qty:1}]);
});

test('body lasts 30 seconds after death animation and timer ignores opening/emptying loot',()=>{
 assert.equal(CORPSE_DURATION_SECONDS,30);
 assert.equal(NORMAL_MOB_RESPAWN_SECONDS,30);
 const corpse={corpse:true,dying:true,root:{visible:true},corpseAge:0,
  loot:[{id:'feather',qty:1}]};
 assert.equal(advanceCorpseTimer(corpse,50),false);
 assert.equal(corpse.corpseAge,0);
 corpse.dying=false;
 assert.equal(advanceCorpseTimer(corpse,29),false);
 corpse.loot=[];
 assert.equal(advanceCorpseTimer(corpse,0.99),false);
 assert.equal(advanceCorpseTimer(corpse,0.01),true);
 assert.equal(corpse.corpseAge,30);
 corpse.corpse=false;corpse.root.visible=false;corpse.respawn=NORMAL_MOB_RESPAWN_SECONDS;
 assert.equal(advanceRespawnTimer(corpse,29.99),false);
 assert.equal(advanceRespawnTimer(corpse,0.01),true);
 assert.equal(corpse.respawn,0);
});
