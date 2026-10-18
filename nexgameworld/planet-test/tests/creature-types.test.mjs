import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATURE_TYPE_BEAST,CREATURE_TYPE_HUMANOID,
 creatureTypeForMob,rollCreatureCoins,isValidCorpseCoins,CORPSE_COIN_ID} from '../creature-types.js';
test('all nine normal dolgonogs and the level-three boss are animals without coin drops',()=>{
 for(let i=0;i<=9;i++){
  assert.equal(creatureTypeForMob(i),CREATURE_TYPE_BEAST);
  assert.deepEqual(rollCreatureCoins(creatureTypeForMob(i),i===9?3:1,()=>1),[]);
 }
 assert.equal(creatureTypeForMob(10),null);
});
test('future humanoid coins have a bounded corpse-loot descriptor',()=>{
 const coins=rollCreatureCoins(CREATURE_TYPE_HUMANOID,3,()=>.5);
 assert.equal(coins[0].id,CORPSE_COIN_ID);
 assert.equal(isValidCorpseCoins(coins[0]),true);
 assert.equal(isValidCorpseCoins({id:CORPSE_COIN_ID,qty:0}),false);
 assert.equal(isValidCorpseCoins({id:CORPSE_COIN_ID,qty:999999999}),false);
 assert.throws(()=>rollCreatureCoins('beastly-humanoid',3),/invalid_creature_type/);
});
