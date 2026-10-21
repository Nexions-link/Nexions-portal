import test from 'node:test';
import assert from 'node:assert/strict';
import {wolfPairIndex,WOLF_PACK_MAX_HELPERS,WOLF_PACK_HOWL_MS} from '../forest-wolf-pack.js';
import {FOREST_WOLF_SPAWNS} from '../forest-wolf-spawns.js';
test('3 paired wolf territories with warning window and no chain calls',()=>{
 assert.deepEqual([...Array(6)].map((_,i)=>wolfPairIndex(i+14)),[0,0,1,1,2,2]);
 assert.equal(FOREST_WOLF_SPAWNS.length,6);
 assert.equal(WOLF_PACK_MAX_HELPERS,1);
 assert.ok(WOLF_PACK_HOWL_MS>=950);
 assert.equal(wolfPairIndex(13),-1);
 assert.equal(wolfPairIndex(20),-1);
});
