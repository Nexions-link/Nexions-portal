import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestLayout,FOREST_CAMP,FOREST_CAMP_PROPS,forestDistance,forestLocalPoint,
 forestCampPoint,blocksForestAtLocal,forestTrailLatitude} from '../whispering-forest.js';
test('expedition clearing excludes trees and logs',()=>{
 const layout=createForestLayout();
 for(const t of layout.trees)assert.ok(forestDistance(t.lon,t.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=FOREST_CAMP.clearingRadius+t.radius);
 for(const t of layout.logs)assert.ok(forestDistance(t.lon,t.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=FOREST_CAMP.clearingRadius+4);
 assert.equal(FOREST_CAMP_PROPS.filter(x=>x.kind==='tent').length,3);
});
test('deterministic server collider blocks trees and tents while the centre trail is open',()=>{
 const t=createForestLayout().trees[0],a=forestLocalPoint(t.lon,t.lat);
 assert.equal(blocksForestAtLocal(a.x,a.z),true);
 const tent=FOREST_CAMP_PROPS.find(x=>x.kind==='tent');
 const pos=forestCampPoint(tent.dx,tent.dz),b=forestLocalPoint(pos.lon,pos.lat);
 assert.equal(blocksForestAtLocal(b.x,b.z),true);
 const c=forestLocalPoint(FOREST_CAMP.lon,FOREST_CAMP.lat);
 assert.equal(blocksForestAtLocal(c.x,c.z),false);
 for(const lon of [.23,.31,.39,.48,.64,.79,.99,1.15,1.36]){
  const p=forestLocalPoint(lon,forestTrailLatitude(lon));
  assert.equal(blocksForestAtLocal(p.x,p.z),false,'trail blocked at '+lon);
 }
});