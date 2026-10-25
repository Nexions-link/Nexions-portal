import test from 'node:test';
import assert from 'node:assert/strict';
import {wolfPairIndex,WOLF_PACK_MAX_HELPERS,WOLF_PACK_HOWL_MS} from '../forest-wolf-pack.js';
import {FOREST_WOLF_SPAWNS} from '../forest-wolf-spawns.js';
test('6 paired wolf territories with warning window and no chain calls',()=>{
 assert.deepEqual([...Array(12)].map((_,i)=>wolfPairIndex(i+14)),[0,0,1,1,2,2,3,3,4,4,5,5]);
 assert.equal(FOREST_WOLF_SPAWNS.length,12);
 assert.equal(WOLF_PACK_MAX_HELPERS,1);
 assert.ok(WOLF_PACK_HOWL_MS>=950);
 assert.equal(wolfPairIndex(13),-1);
 assert.equal(wolfPairIndex(26),-1);
});
