import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMobImpact,mobVisualMode} from '../mob-impact.js';

test('single impact eases in and settles without discontinuities',()=>{
 const s={seen:0,wasHit:false};let values=[];
 for(let i=0;i<45;i++){
  const frame=advanceMobImpact(s,1/60,{sequence:i?1:1,hitRemaining:i<18?.2:0});
  if(i===0)assert.equal(frame.started,true);
  else assert.equal(frame.started,false);
  values.push(frame.weight);
 }
 assert.ok(values[0]>0&&values[0]<.5);
 assert.ok(Math.max(...values)>.6);
 assert.equal(values.at(-1),0);
 assert.ok(values.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 for(let i=1;i<values.length;i++)
  assert.ok(Math.abs(values[i]-values[i-1])<.5,'no sudden full pose snaps');
});
test('additional hit during recoil restarts one reaction without staying locked',()=>{
 const s={seen:0,wasHit:false};
 advanceMobImpact(s,.016,{sequence:1,hitRemaining:.25});
 for(let i=0;i<10;i++)advanceMobImpact(s,.016,{sequence:1,hitRemaining:.25});
 const newHit=advanceMobImpact(s,.016,{sequence:2,hitRemaining:.25});
 assert.equal(newHit.started,true);
 assert.equal(newHit.side,1);
 for(let i=0;i<40;i++)advanceMobImpact(s,.016,{sequence:2,hitRemaining:0});
 assert.equal(s.active,false);
 assert.equal(advanceMobImpact(s,.016,{sequence:2,hitRemaining:0}).started,false);
});
test('legacy damage flag triggers once and death cancels leftover recoil',()=>{
 const s={};
 const first=advanceMobImpact(s,.016,{hitRemaining:.2});
 assert.equal(first.started,true);
 assert.equal(advanceMobImpact(s,.016,{hitRemaining:.16}).started,false);
 const killed=advanceMobImpact(s,.016,{sequence:1,hitRemaining:.16,dead:true});
 assert.equal(killed.active,false);assert.equal(killed.weight,0);
 assert.equal(advanceMobImpact(s,.016,{sequence:1,dead:false}).started,false);
 const again=advanceMobImpact(s,.016,{sequence:2,hitRemaining:.3});
 assert.equal(again.started,true);
});
test('state priority is corpse, hurt, attack, walk and idle',()=>{
 assert.equal(mobVisualMode({dead:true,hit:true,attack:true,walking:true}),'corpse');
 assert.equal(mobVisualMode({hit:true,attack:true,walking:true}),'Hurt');
 assert.equal(mobVisualMode({attack:true,walking:true}),'Attack');
 assert.equal(mobVisualMode({walking:true}),'Walk');
 assert.equal(mobVisualMode({}),'Idle');
});
test('malformed frames and coarse animation LOD cannot escape safe bounds',()=>{
 const state={};
 for(const dt of [NaN,Infinity,-1,100,1/15]){
  const f=advanceMobImpact(state,dt,{sequence:9,hitRemaining:.2,duration:100});
  assert.ok(Number.isFinite(f.weight)&&f.weight>=0&&f.weight<=1);
 }
});
