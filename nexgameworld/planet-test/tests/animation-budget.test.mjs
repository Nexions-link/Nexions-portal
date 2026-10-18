import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeAnimationTime,ANIMATION_LOD} from '../animation-budget.js';

function simulate(metres,{fps=60,seconds=2,urgent=false}={}){
 const mob={};let calls=0,animated=0,first=0;
 for(let n=0;n<fps*seconds;n++){
  const dt=consumeAnimationTime(mob,1/fps,metres,{urgent});
  if(dt>0){if(!first)first=n+1;calls++;animated+=dt;}
 }
 return {calls,animated,pending:mob.animationPending||0,first};
}
test('nearby and combat animation frames are NEVER rate-limited',()=>{
 const near=simulate(8),combat=simulate(65,{urgent:true});
 assert.equal(near.calls,120);
 assert.equal(combat.calls,120);
 assert.ok(Math.abs(near.animated-2)<1e-9);
 assert.ok(Math.abs(combat.animated-2)<1e-9);
});
test('mid-range mob mixer budget is 30Hz; distant idle mixer ~15Hz',()=>{
 const mid=simulate(28),far=simulate(65);
 assert.equal(mid.calls,60);
 assert.equal(far.calls,30);
 assert.ok(Math.abs(mid.animated+mid.pending-2)<1e-9);
 assert.ok(Math.abs(far.animated+far.pending-2)<1e-9);
 assert.ok(far.calls<mid.calls/2+1,'far mobs must use fewer CPU pose evaluations');
 assert.equal(ANIMATION_LOD.farMetres,40);
});
test('approaching an active enemy consumes pending pose time immediately',()=>{
 const mob={};const step=1/60;
 assert.equal(consumeAnimationTime(mob,step,60),0);
 assert.equal(consumeAnimationTime(mob,step,60),0);
 const combat=consumeAnimationTime(mob,step,60,{urgent:true});
 assert.ok(Math.abs(combat-3*step)<1e-9);
 assert.equal(mob.animationPending,0);
 assert.equal(consumeAnimationTime(mob,step,10),step);
});
test('nonfinite distance uses full quality rather than freezing an avatar',()=>{
 const state={};
 assert.equal(consumeAnimationTime(state,1/60,NaN),1/60);
 assert.equal(consumeAnimationTime(state,1/60,Infinity),1/60);
 assert.equal(consumeAnimationTime(state,0,100),0);
 assert.equal(consumeAnimationTime(state,NaN,100),0);
});
test('resume from throttled Safari tab bounds pose update and does not amplify dt',()=>{
 const mob={animationPending:.05};
 assert.equal(consumeAnimationTime(mob,999,80),.12);
 assert.equal(mob.animationPending,0);
});
