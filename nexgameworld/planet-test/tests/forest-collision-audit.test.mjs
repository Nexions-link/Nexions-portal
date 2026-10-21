import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestLayout,forestColliders,blocksForestAtLocal,FOREST_CAMP,FOREST_CAMP_PROPS,
 forestCampPoint,forestLocalPoint,forestTrailLatitude,FOREST_SITE_CLEARINGS,forestDistance,FOREST_TRUNK_BASE_SCALE}
 from '../whispering-forest.js';
import {canWalkCamp} from '../sphere-physics.js';
import {walkableSphereNormal} from '../../server/world-movement.js';
import {localToNormal} from '../../server/spherical-pve.js';
const R=261;
const local=(lon,lat)=>forestLocalPoint(lon,lat,R);
test('no unseen forest collision: every collider belongs to rendered trunk or visible camp object',()=>{
 const colliders=forestColliders(R),layout=createForestLayout();
 assert.equal(colliders.length,layout.trees.length+FOREST_CAMP_PROPS.length);
 assert.ok(colliders.length>390);
 for(const tree of layout.trees){
  const p=local(tree.lon,tree.lat);
  assert.ok(colliders.some(c=>Math.hypot(c.x-p.x,c.z-p.z)<.001&&Math.abs(c.r-tree.radius*FOREST_TRUNK_BASE_SCALE)<1e-9),
   'forest trunk blocker must match the visible widest base');
  assert.equal(blocksForestAtLocal(p.x,p.z),true);
 }
 for(const prop of FOREST_CAMP_PROPS){
  const at=forestCampPoint(prop.dx,prop.dz,R),p=local(at.lon,at.lat);
  assert.ok(colliders.some(c=>Math.hypot(c.x-p.x,c.z-p.z)<.001&&c.r===prop.r));
 }
});
test('the expedition path is open end to end for both server and client',()=>{
 for(let lon=.145;lon<=1.46;lon+=.006){
  const p=local(lon,forestTrailLatitude(lon));
  assert.equal(canWalkCamp(p.x,p.z,.42,R),true,'client blocked at lon '+lon);
  assert.equal(walkableSphereNormal(localToNormal(p.x,p.z,R),R),true,'server blocked at lon '+lon);
 }
});
test('camp clearing, scout and research points have no invisible obstacle',()=>{
 const center=local(FOREST_CAMP.lon,FOREST_CAMP.lat);
 assert.equal(canWalkCamp(center.x,center.z,.42,R),true);
 const offsets=[[0,-11],[-4,1],[4,-2],[-2,14],[4,15]];
 for(const [dx,dz] of offsets){
  const point=forestCampPoint(dx,dz,R),p=local(point.lon,point.lat);
  assert.equal(canWalkCamp(p.x,p.z,.42,R),true,'camp blocked at '+dx+','+dz);
 }
 for(const site of FOREST_SITE_CLEARINGS){
  const p=local(site.lon,site.lat);
  assert.equal(canWalkCamp(p.x,p.z,.42,R),true,'research landmark blocked');
  assert.ok(createForestLayout().trees.every(t=>forestDistance(t.lon,t.lat,site.lon,site.lat)>=site.radius+t.radius));
 }
});
test('visible camp mesh tangent orientation agrees with geodetic collision coordinates',()=>{
 const lat=FOREST_CAMP.lat,lon=FOREST_CAMP.lon,c=Math.cos(lat),s=Math.sin(lat);
 const normal=[c*Math.sin(lon),s,c*Math.cos(lon)];
 const east=[Math.cos(lon),0,-Math.sin(lon)];
 const south=[s*Math.sin(lon),-c,s*Math.cos(lon)];
 for(const prop of FOREST_CAMP_PROPS){
  const d=Math.hypot(prop.dx,prop.dz),q=forestCampPoint(prop.dx,prop.dz,R),angle=d/R;
  const predicted=normal.map((v,i)=>Math.cos(angle)*v+
    (d?Math.sin(angle)/d:0)*(east[i]*prop.dx+south[i]*prop.dz));
  const actual=[Math.cos(q.lat)*Math.sin(q.lon),Math.sin(q.lat),Math.cos(q.lat)*Math.cos(q.lon)];
  assert.ok(Math.hypot(...predicted.map((v,i)=>v-actual[i]))<1e-8);
 }
});

// A path that only passes at its center can still feel blocked on a phone.
test('both shoulders of the walking trail remain free of forest colliders',()=>{
 for(let lon=.145;lon<=1.46;lon+=.008){
  // The survey camp has visible tents and a table beside the centerline;
  // those should block passage, not be mistaken for invisible trail walls.
  if(forestDistance(lon,forestTrailLatitude(lon),FOREST_CAMP.lon,FOREST_CAMP.lat)<FOREST_CAMP.clearingRadius+4)continue;
  for(const sideways of [-3.5,-2,0,2,3.5]){
   const p=local(lon,forestTrailLatitude(lon)+sideways/R);
   assert.equal(blocksForestAtLocal(p.x,p.z,.42,R),false,
    'unexpected trunk or camp blocker at lon '+lon+' offset '+sideways);
  }
 }
});
