import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobSegmentClear,findMobRoute,moveMobToward} from '../mob-navigation.js';
import {canWalkCamp} from '../sphere-physics.js';
import {canWadeAtLocal} from '../start-zone.js';

const walk=(x,z)=>canWalkCamp(x,z,.52)&&canWadeAtLocal(x,z);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

test('a mob cannot cut straight through an original village tent, even in one long frame',()=>{
 const from={x:5,z:-7},goal={x:17,z:-7};
 assert.equal(walk(from.x,from.z),true);
 assert.equal(walk(goal.x,goal.z),true);
 assert.equal(mobSegmentClear(from.x,from.z,goal.x,goal.z,walk),false);
 const mob={...from};
 const nav=moveMobToward(mob,{goalX:goal.x,goalZ:goal.z,speed:25,dt:.6,mode:'chase',canWalk:walk});
 assert.equal(nav.blocked,false);
 assert.equal(walk(mob.x,mob.z),true);
 assert.ok(dist(from,mob)>0);
 assert.equal(mobSegmentClear(from.x,from.z,mob.x,mob.z,walk),true);
});

test('mob steers around the full tent and arrives without phasing through fabric',()=>{
 const mob={x:5,z:-7},goal={x:17,z:-7};
 let total=0,everDetoured=false;
 for(let i=0;i<480&&dist(mob,goal)>.28;i++){
  const previous={x:mob.x,z:mob.z};
  const result=moveMobToward(mob,{goalX:goal.x,goalZ:goal.z,speed:2.05,dt:.05,mode:'chase',canWalk:walk});
  total+=result.moved;
  if(Math.abs(mob.z+7)>.6)everDetoured=true;
  assert.ok(walk(mob.x,mob.z),`entered tent at tick ${i}`);
  assert.ok(mobSegmentClear(previous.x,previous.z,mob.x,mob.z,walk));
 }
 assert.ok(everDetoured,'detour must bend around the solid tent');
 assert.ok(dist(mob,goal)<.4,`remaining ${dist(mob,goal)}m`);
 assert.ok(total>12,'detour travels farther than a straight 12 m line');
});

test('a longhouse wall is an obstacle while its doorway remains available',()=>{
 let solution=null;
 // Stone landmarks can overlap the exterior: choose genuinely walkable
 // approaches on opposite sides of the longhouse before checking its wall.
 for(const z of [-2,0,-4,3,-7,6]){
  if(solution)break;
  for(const xa of [-42,-41,-40]){
   if(solution)break;
   for(const xb of [-12,-13,-14]){
    const outside={x:xa,z},other={x:xb,z};
    if(!walk(outside.x,outside.z)||!walk(other.x,other.z))continue;
    if(mobSegmentClear(outside.x,outside.z,other.x,other.z,walk))continue;
    const path=findMobRoute(outside.x,outside.z,other.x,other.z,walk);
    if(path?.length>=2){solution={outside,other,path};break;}
   }
  }
 }
 assert.ok(solution,'route must skirt the longhouse walls');
 let pos=solution.outside;
 for(const point of solution.path){
  assert.ok(mobSegmentClear(pos.x,pos.z,point.x,point.z,walk));
  pos=point;
 }
});

test('wildlife respects deep water and misses no thin collision in fast movement',()=>{
 const safe=(x,z)=>canWalkCamp(x,z,.52)&&canWadeAtLocal(x,z);
 assert.equal(safe(30,26),false,'the lake centre is too deep for walking mobs');
 assert.equal(mobSegmentClear(30,4,30,48,safe),false);
 const needle=(x,z)=>Math.abs(x-2)>.15;
 assert.equal(mobSegmentClear(0,0,4,0,needle,.2),false);
});

test('return-to-spawn reuses the route finder, then resets navigation mode',()=>{
 const mob={x:5,z:-7};
 const chase=moveMobToward(mob,{goalX:17,goalZ:-7,speed:2,dt:.05,mode:'chase',canWalk:walk});
 assert.ok(chase.moved>0);
 assert.equal(mob.navigation.mode,'chase');
 const returning=moveMobToward(mob,{goalX:5,goalZ:-7,speed:2,dt:.05,mode:'return',canWalk:walk});
 assert.ok(returning.moved>=0);
 assert.equal(mob.navigation.mode,'return');
 assert.ok(walk(mob.x,mob.z));
});

test('moving player triggers re-route; impossible goals never produce NaN or wall penetration',()=>{
 const mob={x:5,z:-7};
 moveMobToward(mob,{goalX:17,goalZ:-7,speed:2,dt:.05,mode:'chase',canWalk:walk});
 const before={x:mob.x,z:mob.z};
 moveMobToward(mob,{goalX:17,goalZ:-17,speed:2,dt:.05,mode:'chase',canWalk:walk});
 assert.equal(mob.navigation.goalZ,-17);
 assert.ok(Number.isFinite(mob.x)&&Number.isFinite(mob.z));
 assert.ok(mobSegmentClear(before.x,before.z,mob.x,mob.z,walk));
 let blocked=false;
 for(let i=0;i<100;i++){
  const previous={x:mob.x,z:mob.z};
  const result=moveMobToward(mob,{goalX:11,goalZ:-7,speed:2,dt:.05,mode:'chase',canWalk:walk});
  blocked ||= result.blocked;
  assert.ok(walk(mob.x,mob.z));
  assert.ok(mobSegmentClear(previous.x,previous.z,mob.x,mob.z,walk));
  assert.ok(Number.isFinite(mob.x)&&Number.isFinite(mob.z));
 }
 assert.equal(walk(11,-7),false,'the intended goal is inside tent fabric');
 assert.ok(blocked,'mob eventually stops at the tent edge');
});
