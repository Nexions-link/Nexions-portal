import test from 'node:test';
import assert from 'node:assert/strict';
import {forestDistance,FOREST_CAMP,FOREST_SITE_CLEARINGS,forestTrailLatitude} from '../whispering-forest.js';
import {forestEcologyLayout} from '../forest-ecology.js';
import {forestAudioLevel,createForestAmbience} from '../forest-ambience.js';
test('decorative ecology is stable, away from the road, camp and quest markers',()=>{
 const first=forestEcologyLayout(),next=forestEcologyLayout();
 assert.deepEqual(first,next);
 assert.equal(first.shrubs.length,500);
 assert.equal(first.rocks.length,190);
 assert.equal(first.fungi.length,145);
 assert.ok(first.wildlife.length>=6&&first.wildlife.length<=11);
 for(const [items,margin] of [[first.shrubs,1.1],[first.rocks,.9],[first.fungi,.25]]){
  for(const p of items){
   assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=5+margin);
   assert.ok(forestDistance(p.lon,p.lat,FOREST_CAMP.lon,FOREST_CAMP.lat)>=FOREST_CAMP.clearingRadius+margin);
   assert.ok(FOREST_SITE_CLEARINGS.every(s=>forestDistance(p.lon,p.lat,s.lon,s.lat)>=s.radius+margin));
  }
 }
 for(const p of first.wildlife){
  assert.ok(p.kind==='deer'||p.kind==='boar');
  assert.ok(Math.abs(p.lat-forestTrailLatitude(p.lon))*261>=15);
 }
});
test('sounds are opt-in and normalized',()=>{
 let saved='';
 const storage={getItem:()=>saved,setItem:(k,v)=>{saved=v}};
 const audio=createForestAmbience({storage,AudioContextClass:null});
 assert.equal(audio.enabled,false);
 assert.equal(forestAudioLevel(NaN),0);
 assert.equal(forestAudioLevel(2),1);
 assert.equal(forestAudioLevel(-2),0);
 audio.setEnabled(false);assert.equal(saved,'false');
 audio.update(12,.8);audio.dispose();
});
