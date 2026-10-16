// Run: node --test planet-test/gather-visibility.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RESOURCE_VISUAL_COLORS,resourceProximityCue} from './gather-visibility.js';

const source=name=>readFileSync(fileURLToPath(new URL(name,import.meta.url)),'utf8');

test('all three herbalist resources have distinct, subdued outline palettes',()=>{
 assert.equal(Object.keys(RESOURCE_VISUAL_COLORS).length,3);
 assert.notEqual(RESOURCE_VISUAL_COLORS[1].rim,RESOURCE_VISUAL_COLORS[2].rim);
 assert.notEqual(RESOURCE_VISUAL_COLORS[2].rim,RESOURCE_VISUAL_COLORS[3].rim);
});

test('cues become stronger only as the player approaches active gatherable resources',()=>{
 const far=resourceProximityCue(35,.68);
 const medium=resourceProximityCue(7,.68);
 const close=resourceProximityCue(2,.68);
 assert.equal(far.ringOpacity,0);
 assert.equal(far.sparkVisible,false);
 assert.ok(medium.ringOpacity>0);
 assert.ok(close.ringOpacity>medium.ringOpacity);
 assert.equal(close.glintCount,1);
 assert.ok(close.sparkScale>medium.sparkScale);
 assert.ok(close.ringOpacity<=.27);
});

test('economy quality avoids particles but retains close ground-ring readability',()=>{
 const economy=resourceProximityCue(2,.15);
 const balanced=resourceProximityCue(2,.68);
 const high=resourceProximityCue(2,1);
 assert.ok(economy.ringOpacity>0);
 assert.equal(economy.glintCount,0);
 assert.equal(economy.sparkVisible,false);
 assert.equal(balanced.glintCount,1);
 assert.equal(high.glintCount,2);
 assert.equal(high.sparkVisible,true);
});

test('distant, missing, and nonsensical inputs cannot produce distracting cues',()=>{
 for(const d of [14,50,Infinity,NaN]){
  const cue=resourceProximityCue(d,1);
  assert.equal(cue.ringOpacity,0);
  assert.equal(cue.glintCount,0);
  assert.equal(cue.sparkVisible,false);
 }
 assert.equal(resourceProximityCue(-2,1).ringOpacity,resourceProximityCue(0,1).ringOpacity);
});

test('spherical gathering logic preserves eligibility and uses player distance only for visuals',()=>{
 const gather=source('./gather-world.js');
 const camp=source('./camp-actions.js');
 const rpg=source('./offline-rpg.js');
 assert.match(gather,/node\.root\.visible=!!isAvailable\(node,clock\)/);
 assert.match(gather,/resourceProximityCue\(distance,visualQuality\)/);
 assert.match(camp,/gathering\.update\(now,available,distance\)/);
 assert.match(camp,/gathering\.setVisualQuality\(value\)/);
 assert.match(rpg,/camp\.setVisualQuality\(detail\)/);
 assert.match(camp,/node\.stage===state\.gatherStage/);
 assert.match(camp,/getClock\(\)>=node\.readyAt/);
 assert.match(camp,/GATHER_INTERACT_RANGE/);
});

test('moon mushrooms have dark rounded caps, a pale stalk and slightly larger sizes',()=>{
 const world=source('./gather-world.js');
 assert.match(world,/mushroomCap:material\('#78502c'/);
 assert.match(world,/mushroomRim:material\('#b18a56'/);
 assert.match(world,/const mushroomDome=new THREE\.SphereGeometry\(1,14,9,0,Math\.PI\*2,0,Math\.PI\/2\)/);
 assert.match(world,/\[\[-\.17,-\.1,\.41,\.40\],\[\.29,\.15,\.29,\.31\]\]/);
 assert.match(world,/quest-moon-mushroom-dark-cap/);
 assert.match(world,/quest-moon-mushroom-stalk/);
 assert.doesNotMatch(world,/mats\.spot/);
 // Keep the other quest resources, all three quest locations and interactions unchanged.
 assert.match(world,/GATHER_QUESTS\[stage\]\.locations\.forEach/);
 assert.match(world,/if\(stage===1\)/);
 assert.match(world,/else if\(stage===2\)/);
});
