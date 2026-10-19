import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceCreatureGait} from '../creature-gait.js';

test('slow roaming and fast chase smoothly change only visual playback speed',()=>{
 const gait={};
 for(let i=0;i<20;i++)advanceCreatureGait(gait,1/60,.95/60);
 const roam=advanceCreatureGait(gait,1/60,.95/60);
 assert.equal(roam.walking,true);
 for(let i=0;i<20;i++)advanceCreatureGait(gait,1/60,2.05/60);
 const chase=advanceCreatureGait(gait,1/60,2.05/60);
 assert.ok(chase.clipRate>roam.clipRate);
 assert.ok(chase.clipRate<=1.35);
 assert.ok(gait.rate>0&&gait.rate<1.6);
});
test('network micro-pauses do not restart walking, sustained stop returns to idle',()=>{
 const state={};
 advanceCreatureGait(state,1/60,2.05/60,{holdSeconds:.32});
 for(let i=0;i<12;i++)assert.equal(
  advanceCreatureGait(state,1/60,0,{holdSeconds:.32}).walking,true);
 for(let i=0;i<60;i++)advanceCreatureGait(state,1/60,0,{holdSeconds:.32});
 assert.equal(advanceCreatureGait(state,1/60,0,{holdSeconds:.32}).walking,false);
 assert.ok(state.rate<.001);
});
test('lag, bad distances, and render stutters cannot create runaway animation',()=>{
 const state={};
 for(const moved of [NaN,Infinity,-10,1e9,0]){
  const sample=advanceCreatureGait(state,.12,moved);
  assert.ok(Number.isFinite(sample.clipRate)&&sample.clipRate>=.73&&sample.clipRate<=1.35);
  assert.ok(Number.isFinite(sample.speed));
 }
 assert.equal(advanceCreatureGait(state,0,1e6).clipRate,1);
 assert.deepEqual(advanceCreatureGait(null,.016,.04),{walking:false,clipRate:1,speed:0});
});
