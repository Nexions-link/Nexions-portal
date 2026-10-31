import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestLayout,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,
 forestColliders,forestTrailLatitude} from '../whispering-forest.js';
import {forestCanopyShadeAt,forestLightResponse,forestSunbreakLayout}
 from '../forest-lighting.js';
import {forestEcologyLayout} from '../forest-ecology.js';

test('forest lighting darkens progressively but preserves clearings and the village',()=>{
 const deep=forestCanopyShadeAt(1.20,forestTrailLatitude(1.20));
 assert.ok(deep>.36&&deep<1,'the deep forest must feel shaded, not blacked out');
 assert.equal(forestCanopyShadeAt(FOREST_CAMP.lon,FOREST_CAMP.lat),0);
 assert.equal(forestCanopyShadeAt(0,0),0);
 assert.equal(forestCanopyShadeAt(Number.NaN,0),0);
 for(const site of FOREST_SITE_CLEARINGS)
  assert.equal(forestCanopyShadeAt(site.lon,site.lat),0,'quest landmarks stay bright');
 for(let lon=.15;lon<1.5;lon+=.012){
  const x=forestCanopyShadeAt(lon,forestTrailLatitude(lon));
  assert.ok(Number.isFinite(x)&&x>=0&&x<=1,'shade must remain bounded');
 }
});

test('darker forest does not make combat unreadable or break preset exposure',()=>{
 const full=forestLightResponse(1,1.14),day=forestLightResponse(0,1.14);
 assert.deepEqual(day,{hemi:1.70,sun:2.8,fill:.62,exposure:1.14});
 assert.ok(full.hemi>1.2&&full.sun>1.5&&full.fill>.5);
 assert.ok(full.exposure>1.08&&full.exposure<day.exposure);
 assert.deepEqual(forestLightResponse(-2,1.14),day);
 assert.deepEqual(forestLightResponse(10,1.14),full);
 assert.ok(forestLightResponse(.8,1.17).exposure>forestLightResponse(.8,1.13).exposure);
});

test('soft sunbreaks are fixed to the visible corridor, away from tents and tree blockers',()=>{
 const spots=forestSunbreakLayout(),trees=createForestLayout().trees;
 assert.ok(spots.length>=12&&spots.length<=22);
 assert.deepEqual(spots,forestSunbreakLayout(),'every visitor sees the same natural light');
 for(const p of spots){
  const distance=Math.abs(p.lat-forestTrailLatitude(p.lon))*261;
  assert.ok(distance>.5&&distance<3.21,'sunbreak must mark the walking route');
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>37);
  assert.ok(FOREST_SITE_CLEARINGS.every(site=>forestDistance(
   site.lon,site.lat,p.lon,p.lat)>=site.radius+9));
  assert.ok(trees.every(t=>forestDistance(t.lon,t.lat,p.lon,p.lat)>=
   t.radius*.78+p.radius+.45));
 }
});

test('shaded bracken is decorative and leaves all original forest colliders untouched',()=>{
 const before=forestColliders();
 const flora=forestEcologyLayout();
 assert.ok(flora.bracken.length>300&&flora.bracken.length<=480);
 assert.deepEqual(forestColliders(),before);
 for(const p of flora.bracken){
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=8.1,
   'thick undergrowth must not cover the main path');
  assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=
   FOREST_CAMP.clearingRadius+.7);
 }
});
