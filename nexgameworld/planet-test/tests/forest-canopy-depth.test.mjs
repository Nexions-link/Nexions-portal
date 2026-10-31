import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestLayout,forestCanopyDetailLayout,forestColliders,
 FOREST_CAMP_PROPS,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude,
 forestDistance,forestDepthBand,forestGroveComposition,forestGroveFoliageLayout,
 createWhisperingForest} from '../whispering-forest.js';
import * as THREE from 'three';
import {deciduousCrownData,coniferCrownData} from '../forest-crown-geometry.js';

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

test('G-16 preserves the crown topology while carving visible sky gaps',()=>{
 for(const kind of ['deciduous','conifer']){
  const fn=kind==='conifer'?coniferCrownData:deciduousCrownData;
  const before=fn(1,{r2:true,art:false}),after=fn(1,{r2:true,art:true});
  assert.equal(before.positions.length,after.positions.length);
  assert.deepEqual(before.indices,after.indices);
  assert.ok(after.positions.every(Number.isFinite));
  const gaps=[];
  for(let i=0;i<before.positions.length;i+=3){
   const a=Math.hypot(before.positions[i],before.positions[i+2]);
   const b=Math.hypot(after.positions[i],after.positions[i+2]);
   if(a>.15)gaps.push((a-b)/a);
  }
  assert.ok(gaps.some(v=>v>.13),kind+' must expose sky gaps');
  assert.ok(gaps.some(v=>Math.abs(v)<.07),kind+' must retain solid masses');
 }
});
test('G-16 depth grades existing trees without colliders or draw batches',()=>{
 const layout=createForestLayout(),before=forestColliders();
 const groups={near:0,middle:0,far:0};
 for(const tree of layout.trees)groups[forestDepthBand(tree.lon,tree.lat)]++;
 assert.ok(Object.values(groups).every(n=>n>10),JSON.stringify(groups));
 const scene=new THREE.Scene();
 createWhisperingForest(THREE,{scene,radius:261,heightAt:()=>0,artRemaster:true});
 const batches=scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 assert.equal(batches.length,12);
 assert.equal(scene.children.find(x=>x.name==='forest-ancient-trunks').count,400);
 const oak=scene.children.find(x=>x.name==='forest-oak-crown');
 const broad=layout.trees.filter(t=>!t.evergreen),chosen={};
 broad.forEach((t,i)=>{
  const band=forestDepthBand(t.lon,t.lat);
  if(chosen[band]===undefined)chosen[band]=i;
 });
 assert.equal(Object.keys(chosen).length,3);
 const color=new THREE.Color(),samples=Object.fromEntries(
  Object.entries(chosen).map(([band,i])=>{
   oak.getColorAt(i,color);
   return [band,color.toArray()];
  }));
 assert.notDeepEqual(samples.near,samples.middle);
 assert.notDeepEqual(samples.middle,samples.far);
 assert.deepEqual(forestColliders(),before);
});

test('G-17 grove geometry is deterministic, above all clearings and attached to old trees',()=>{
 const layout=createForestLayout(),extras=forestGroveFoliageLayout(layout);
 assert.deepEqual(extras,forestGroveFoliageLayout(layout));
 assert.ok(extras.length>=10&&extras.length<=120,'a bounded extra foliage budget');
 const groups={left:0,right:0},originals=new Set(
  layout.trees.map(t=>t.lon+','+t.lat));
 for(const tuft of extras){
  assert.equal(tuft.groveDetail,true);
  assert.ok(originals.has(tuft.anchorLon+','+tuft.anchorLat));
  const parent=layout.trees.find(t=>
   t.lon===tuft.anchorLon&&t.lat===tuft.anchorLat);
  assert.ok(parent&&!parent.evergreen);
  assert.ok(tuft.branchHeight>12&&tuft.branchHeight<parent.height);
  assert.ok(Math.abs(tuft.lat-forestTrailLatitude(tuft.lon))*261>=11);
  assert.ok(forestDistance(tuft.lon,tuft.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>
   FOREST_CAMP.clearingRadius+8);
  assert.ok(FOREST_SITE_CLEARINGS.every(c=>
   forestDistance(tuft.lon,tuft.lat,c.lon,c.lat)>c.radius+7));
  groups[tuft.lat>forestTrailLatitude(tuft.lon)?'left':'right']++;
 }
 assert.ok(groups.left>0&&groups.right>0,'both trail banks receive foliage');
});
test('G-17 composition leaves the canonical tree layout, trunk transform and collision intact',()=>{
 const layout=createForestLayout(),colliders=forestColliders();
 const original=layout.trees.map(t=>({lon:t.lon,lat:t.lat,height:t.height,radius:t.radius}));
 const visual=layout.trees.map(forestGroveComposition);
 assert.ok(visual.some(x=>x.roadside>.7&&x.crownWidth<.9));
 assert.ok(visual.some(x=>x.grove>.7&&x.crownWidth>1.05));
 const sceneA=new THREE.Scene(),sceneB=new THREE.Scene();
 createWhisperingForest(THREE,{scene:sceneA,radius:261,heightAt:()=>0,artRemaster:false});
 createWhisperingForest(THREE,{scene:sceneB,radius:261,heightAt:()=>0,artRemaster:true});
 const batches=s=>s.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-'));
 assert.equal(batches(sceneA).length,12);
 assert.equal(batches(sceneB).length,12);
 const find=(s,n)=>s.children.find(x=>x.name===n);
 assert.deepEqual(Array.from(find(sceneA,'forest-ancient-trunks').instanceMatrix.array),
  Array.from(find(sceneB,'forest-ancient-trunks').instanceMatrix.array));
 assert.equal(find(sceneB,'forest-crown-silhouettes').instanceMatrix.count,
  find(sceneA,'forest-crown-silhouettes').instanceMatrix.count+
   forestGroveFoliageLayout(layout).length);
 assert.deepEqual(forestColliders(),colliders);
 assert.deepEqual(createForestLayout().trees.map(t=>({
  lon:t.lon,lat:t.lat,height:t.height,radius:t.radius
 })),original);
});
