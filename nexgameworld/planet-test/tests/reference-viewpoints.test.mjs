import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {getVisualReferenceView,VISUAL_REFERENCE_ID,VISUAL_REFERENCE_RATIO,
 VISUAL_REFERENCE_VIEWS,referenceNormal,referenceViewPose} from '../reference-viewpoints.js';
import {FOREST_CAMP,forestColliders,forestTrailLatitude}
 from '../whispering-forest.js';

test('R1 has exactly four stable points and human-readable before/after criteria',()=>{
 assert.equal(VISUAL_REFERENCE_ID,'R1');
 assert.equal(VISUAL_REFERENCE_RATIO,864/1536);
 assert.deepEqual(VISUAL_REFERENCE_VIEWS.map(v=>v.id),
  ['start','entrance','trail','wolves']);
 assert.ok(VISUAL_REFERENCE_VIEWS.every(v=>v.baseline&&v.target&&v.check));
 assert.ok(VISUAL_REFERENCE_VIEWS.every(v=>Object.isFrozen(v)));
 assert.equal(getVisualReferenceView('nonexistent'),null);
});
test('reference poses follow spherical normals, reproduce exact framing and preserve collisions',()=>{
 const before=forestColliders();
 for(const v of VISUAL_REFERENCE_VIEWS){
  const heightAt=n=>Math.sin(n.x*5)+Math.cos(n.z*3)*.2;
  const a=referenceViewPose(THREE,v,{heightAt}),b=referenceViewPose(THREE,v,{heightAt});
  assert.ok(a.normal.length()>0.999999&&a.normal.length()<1.000001);
  assert.deepEqual(a.position.toArray(),b.position.toArray());
  assert.deepEqual(a.focus.toArray(),b.focus.toArray());
  assert.ok(a.position.distanceTo(a.focus)>8);
  assert.ok(a.position.length()>261+heightAt(a.position.clone().normalize())+.99);
  assert.ok(referenceNormal(v).every(Number.isFinite));
  assert.ok(Math.abs(a.fov-58)<1e-10);
 }
 assert.deepEqual(forestColliders(),before);
});
test('forest views are actually on the forest corridor, not placeholders',()=>{
 for(const id of ['entrance','trail']){
  const v=getVisualReferenceView(id);
  assert.ok(Math.abs(v.lat-forestTrailLatitude(v.lon))<.0001);
 }
 assert.ok(Math.hypot(getVisualReferenceView('wolves').lon-FOREST_CAMP.lon,
  getVisualReferenceView('wolves').lat-FOREST_CAMP.lat)>.10);
 assert.throws(()=>referenceViewPose(THREE,{id:'invalid',zoom:10,pitch:.5,heading:0}));
});
test('art-review code never moves the authoritative actor or overwrites the online state',()=>{
 const src=readFileSync(new URL('../planet.js',import.meta.url),'utf8');
 const module=readFileSync(new URL('../reference-viewpoints.js',import.meta.url),'utf8');
 assert.match(src,/referenceViewPose\(THREE,view/);
 assert.match(src,/cameraGoal\.copy\(referencePose\.position\)/);
 assert.match(src,/focus\.copy\(referencePose\.focus\)/);
 assert.doesNotMatch(module,/updatePlayerPosition|socket\.send|fetch\(|localStorage|sessionStorage/);
 assert.match(src,/if\(referencePose\)\{horizontal=0;forward=0;\}/);
});
test('four selectable views and reversible spectator bar are available in live HTML',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const id of ['referenceViewSelect','referenceViewEnter','referenceViewBar',
  'referenceViewPrev','referenceViewNext','referenceViewExit','referenceViewChecklist'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/referenceViewBar"[^>]*hidden/);
});
