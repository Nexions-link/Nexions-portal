import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_TREE_CAP,FOREST_ENTRANCE_LONGITUDE,forestTrailLatitude,
 forestMoodAt,createForestLayout} from '../whispering-forest.js';
test('expedition forest placement is deterministic and bounded',()=>{
 const a=createForestLayout(),b=createForestLayout();
 assert.deepEqual(a,b);
 assert.equal(a.trees.length,FOREST_TREE_CAP);
 assert.ok(a.ground.length>700);
 assert.equal(a.logs.length,34);
 assert.ok(a.trees.every(t=>t.height>14&&t.height<50&&t.lon>=FOREST_ENTRANCE_LONGITUDE));
});
test('trees and fallen timber leave the expedition path free',()=>{
 const {trees,logs}=createForestLayout();
 assert.ok(trees.every(t=>Math.abs(t.lat-forestTrailLatitude(t.lon))*261>=7.2+t.radius));
 assert.ok(logs.every(t=>Math.abs(t.lat-forestTrailLatitude(t.lon))*261>=6));
});
test('forest atmosphere fades into adjacent biomes rather than switching abruptly',()=>{
 assert.equal(forestMoodAt(.10,0),0);
 assert.ok(forestMoodAt(.30,-.02)>0);
 assert.ok(forestMoodAt(.85,forestTrailLatitude(.85))>.9);
 assert.ok(forestMoodAt(1.7,0)<.1);
 assert.ok(forestMoodAt(.85,1.2)<.01);
});
