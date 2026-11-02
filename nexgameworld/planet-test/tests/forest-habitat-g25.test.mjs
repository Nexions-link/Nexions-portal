import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {forestHabitatAt} from '../forest-habitat.js';
import {forestEcologyLayout,createForestEcology} from '../forest-ecology.js';
import {forestFloorLayout,createForestFloor} from '../forest-floor.js';
import {forestGroundLifeLayout,createForestGroundLife} from '../forest-ground-life.js';
import {forestUnderstoryLayout,createForestUnderstory} from '../forest-understory.js';
import {forestDistance,forestColliders,createForestLayout,
 FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude} from '../whispering-forest.js';
const within=x=>Number.isFinite(x)&&x>=0&&x<=1;
test('G-25 habitat fields are deterministic, bounded and geographically varied',()=>{
 const rows=[];
 for(let i=0;i<25;i++){
  const lon=.36+i*.038,lat=forestTrailLatitude(lon)+.12;
  const h=forestHabitatAt(lon,lat);rows.push(h);
  assert.deepEqual(forestHabitatAt(lon,lat),h);
  for(const k of ['shade','moisture','opening','clearing','grass','moss','fern','mushroom','shrub'])
   assert.ok(within(h[k]),k);
 }
 assert.ok(Math.max(...rows.map(r=>r.moisture))-
  Math.min(...rows.map(r=>r.moisture))>.08);
 const near=forestHabitatAt(.9,forestTrailLatitude(.9));
 const far=forestHabitatAt(1.1,forestTrailLatitude(1.1)+.10);
 assert.ok(near.clearing<.01);
 assert.ok(far.clearing>.01);
 assert.throws(()=>forestHabitatAt(NaN,0),RangeError);
});
test('G-25 decor remains deterministic, preserves safe access and draw budgets',()=>{
 const before=forestColliders(),trees=createForestLayout();
 const ecology=forestEcologyLayout(),floor=forestFloorLayout();
 const grass=forestGroundLifeLayout(),understory=forestUnderstoryLayout();
 assert.deepEqual(ecology,forestEcologyLayout());
 assert.deepEqual(floor,forestFloorLayout());
 assert.equal(ecology.shrubs.length,500);
 assert.equal(ecology.fungi.length,145);
 assert.equal(floor.moss.length,680);
 assert.equal(floor.litter.length,920);
 assert.equal(grass.grass.length,2100);
 assert.equal(understory.ferns.length,540);
 assert.ok(ecology.bracken.length>200);
 let paired=0;
 for(let i=0;i<ecology.fungi.length;i++){
  const p=ecology.fungi[i];
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=5.25);
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
   FOREST_CAMP.clearingRadius+.25);
  for(const s of FOREST_SITE_CLEARINGS)assert.ok(
   forestDistance(p.lon,p.lat,s.lon,s.lat)>=s.radius+.25);
  if(ecology.fungi.some((other,j)=>i!==j&&
    forestDistance(p.lon,p.lat,other.lon,other.lat)<4))paired++;
 }
 assert.ok(paired>=15,'shaded mushrooms form multiple close colonies');
 const scene=new THREE.Scene(),params={scene,radius:261,heightAt:()=>0};
 const ec=createForestEcology(THREE,params);
 assert.equal(scene.children.filter(x=>x.isInstancedMesh&&x.name.startsWith('forest-')).length,7);
 const f=createForestFloor(THREE,{scene:new THREE.Scene(),radius:261,heightAt:()=>0});
 const g=createForestGroundLife(THREE,{scene:new THREE.Scene(),radius:261,heightAt:()=>0});
 const u=createForestUnderstory(THREE,{scene:new THREE.Scene(),radius:261,heightAt:()=>0});
 assert.equal(f.drawCalls+g.drawCalls+u.drawCalls,9);
 assert.deepEqual(ec.layout,ecology);
 assert.deepEqual(forestColliders(),before);
 assert.deepEqual(createForestLayout(),trees);
});
