import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cycleHostileTarget,createHostileTargetCycle} from '../interaction-targeting.js';
import {harness} from './harness.mjs';
import {cameraObstruction} from '../sphere-physics.js';
import {localToNormal,normalToLocal} from '../start-zone.js';
import * as THREE from 'three';
import {fromHouseCoordinates} from '../hearth-house.js';
const entity=(id,d,a)=>({id,d,a,hp:54,kind:'mob',root:{visible:true}});
const dist=e=>e.d,alignment=e=>e.a;
const select=(mobs,current=null,step=1,canSee=null)=>cycleHostileTarget(mobs,null,current,dist,step,alignment,canSee);
const position={x:0,z:0},facing={x:0,y:0,z:1};
function sequence(mobs){
 const cycle=createHostileTargetCycle();
 return (current,options={})=>cycle.next({mobs,current,dist,alignment,now:0,position,facing,...options});
}
test('first acquisition prefers the forward corridor; close enemies take precedence',()=>{
 const front=entity('front',19,1),side=entity('side',8,.1),rear=entity('rear',7,-1);
 assert.equal(select([rear,side,front]),front);
 assert.equal(select([rear,side,front],front),side);
 assert.equal(select([rear,side,front],side),front);
 const attacker=entity('attacker',3,-1);
 assert.equal(select([front,attacker]),attacker);
});
test('dead, hidden, behind, distant and obstructed enemies are excluded',()=>{
 const good=entity('good',40,.9),dead={...entity('dead',1,1),dead:true};
 const corpse={...entity('corpse',1,1),corpse:true},hidden=entity('hidden',1,1);hidden.root.visible=false;
 const blocked=entity('blocked',2,1);
 assert.equal(select([dead,corpse,hidden,entity('rear',6,-1),entity('far',40.01,1),entity('nan',NaN,1),blocked,good],null,1,e=>e!==blocked),good);
 assert.equal(select([entity('rear',6,-1)]),null);
});
test('stable forward/backward cycle survives distance reordering and wraps',()=>{
 const a=entity('a',10,1),b=entity('b',12,1),c=entity('c',14,1),next=sequence([a,b,c]);
 assert.equal(next(null),a);
 b.d=9;c.d=8;
 assert.equal(next(a),b);
 assert.equal(next(b),c);
 assert.equal(next(c),a);
 assert.equal(next(a,{step:-1}),c);
});
test('timeout, displacement, turn and clear start a new acquisition',()=>{
 const a=entity('a',10,1),b=entity('b',12,1),next=sequence([a,b]);
 assert.equal(next(null),a);b.d=8;
 assert.equal(next(a,{now:3}),b);
 a.d=6;
 assert.equal(next(b,{now:3.1,position:{x:4,z:0}}),a);
 b.d=5;
 assert.equal(next(a,{now:3.2,position:{x:4,z:0},facing:{x:1,y:0,z:0}}),b);
 assert.equal(next(null,{now:3.3}),b);
});
test('dead/occluded members are removed and new members do not disturb the sequence',()=>{
 const a=entity('a',10,1),b=entity('b',12,1),c=entity('c',14,1),mobs=[a,b,c],next=sequence(mobs);
 assert.equal(next(null),a);
 b.dead=true;const added=entity('added',6,1);mobs.push(added);
 assert.equal(next(a),c);
 assert.equal(next(c),added);
 assert.equal(next(added,{canSee:e=>e!==a}),c);
});
test('manual selection starts cycling from the chosen opponent; selection alone never attacks',()=>{
 const a=entity('a',10,1),b=entity('b',12,1),c=entity('c',14,1),next=sequence([a,b,c]);
 assert.equal(next(b),c);
 assert.equal(next(a,{step:-1}),c);
 const h=harness();h.selectDummy();
 const hp=h.get('targetHp').textContent;
 for(let i=0;i<30;i++)h.rpg.update(.1);
 assert.equal(h.get('targetHp').textContent,hp);
});
test('actual target button selects nearby dummy, clears and reacquires it',()=>{
 const h=harness();h.get('targetNext').click();
 assert.equal(h.get('targetName').textContent,'Тренировочный манекен');
 h.get('targetClear').click();h.get('targetNext').click();
 assert.equal(h.get('targetName').textContent,'Тренировочный манекен');
});
test('target sight trace blocks longhouse wall and permits its open doorway',()=>{
 harness();
 const clear=(a,b)=>!cameraObstruction(THREE,{
  start:localToNormal(a.x,a.z,261).multiplyScalar(263),
  desired:localToNormal(b.x,b.z,261).multiplyScalar(262.6),
  getRadius:()=>261,toLocal:normalToLocal,heightAt:()=>0,heroLocal:a,clearance:.05,maxSamples:180});
 // Verify a real opaque obstacle instead of conflating visibility with walkability.
 assert.equal(clear(fromHouseCoordinates(0,0),fromHouseCoordinates(0,15)),true);
 assert.equal(clear(fromHouseCoordinates(0,0),fromHouseCoordinates(13,0)),false);
 assert.equal(clear({x:11,z:-13},{x:11,z:-3}),false); // solid tent
 assert.equal(clear({x:-7,z:12},{x:-7,z:15}),true); // open dummy area
});
