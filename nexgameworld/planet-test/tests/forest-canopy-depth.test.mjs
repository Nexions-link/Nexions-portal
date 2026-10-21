import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestLayout,forestCanopyDetailLayout,forestColliders,
 FOREST_CAMP_PROPS,forestTrailLatitude,forestDistance} from '../whispering-forest.js';

// Canopy detail changes only visuals: all actual blockers stay at existing trees.
test('each old-growth broadleaf has three elevated boughs and leaf masses',()=>{
 const trees=createForestLayout().trees,detail=forestCanopyDetailLayout({trees});
 const broad=trees.filter(t=>!t.evergreen);
 assert.equal(detail.limbs.length,broad.length*3);
 assert.equal(detail.tufts.length,detail.limbs.length);
 assert.deepEqual(detail,forestCanopyDetailLayout({trees}));
 for(let i=0;i<detail.limbs.length;i++){
  const branch=detail.limbs[i],leaves=detail.tufts[i];
  assert.equal(branch.lon,leaves.lon);
  assert.equal(branch.lat,leaves.lat);
  assert.ok(branch.branchHeight-branch.length*.2>4.5,
   'low branch must stay above the moving camera and player');
  assert.ok(leaves.branchHeight>branch.branchHeight);
  assert.ok(branch.length>branch.radius*2);
 }
});

test('canopy layering does not add ground colliders or block the trail',()=>{
 const trees=createForestLayout().trees,detail=forestCanopyDetailLayout({trees});
 assert.equal(forestColliders().length,trees.length+FOREST_CAMP_PROPS.length);
 for(const limb of detail.limbs){
  assert.ok(forestDistance(limb.lon,limb.lat,limb.lon,forestTrailLatitude(limb.lon))>
   7.2+limb.radius,'branches must remain anchored on trees outside the path');
 }
});
