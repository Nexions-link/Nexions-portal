import test from 'node:test';
import assert from 'node:assert/strict';
import {BANDIT_CAMP,BANDIT_PATROLS,BANDIT_CHIEF_PATH,BANDIT_CHIEF_LOCATION,BANDIT_EXPANSION,
 canAcceptBanditExpansion,nextPatrolPoint,shouldResetBandit,applyBanditExpansionEvent} from './bandit-camp-data.js';
import {BANDIT_CAMP as LIVE_CAMP,BANDIT_SPAWNS,BANDIT_BOSS_INDEX,creatureById} from './creature-registry.js';
import {canWalkCamp} from './sphere-physics.js';
import {mobSegmentClear} from './mob-navigation.js';

test('camp uses the live world location and stable server spawn IDs',()=>{
 assert.deepEqual(BANDIT_CAMP.center,LIVE_CAMP);
 for(const patrol of BANDIT_PATROLS)assert.equal(creatureById(patrol.id)?.family,'bandit');
});
test('expansion is gated by level',()=>{
 assert.equal(canAcceptBanditExpansion(2,0),false);
 assert.equal(canAcceptBanditExpansion(3,0),true);
 assert.equal(canAcceptBanditExpansion(3,2),false);
 assert.equal(canAcceptBanditExpansion(4,2),true);
});
test('patrol follows waypoints and wraps',()=>{
 const patrol=BANDIT_PATROLS[0];
 assert.deepEqual(nextPatrolPoint(patrol,{x:-50,z:-17},0).target,{x:-51,z:-23});
 assert.equal(nextPatrolPoint(patrol,{x:-47,z:-18},2).index,0);
 assert.equal(shouldResetBandit({x:-50,z:-17},{x:-50,z:3}),true);
 assert.equal(shouldResetBandit({x:-50,z:-17},{x:-50,z:-14}),false);
});
test('unverified or irrelevant quest events do not progress',()=>{
 const start={stage:2,count:0,ready:false};
 assert.equal(applyBanditExpansionEvent(start,{type:'kill',role:'scout'}),start);
 const end=applyBanditExpansionEvent(start,{type:'kill',role:'boss'});
 assert.deepEqual(end,{stage:2,count:1,ready:true});
 assert.equal(applyBanditExpansionEvent(end,{type:'kill',role:'boss'}),end);
 assert.equal(BANDIT_EXPANSION.length,3);
});

test('west frontier spawns and patrols are individually pullable, away from obstacles',()=>{
 const points=BANDIT_SPAWNS.map(([x,z])=>({x,z}));
 assert.deepEqual(BANDIT_CAMP.center,{x:-68,z:2});
 assert.deepEqual(BANDIT_CHIEF_LOCATION,points[BANDIT_BOSS_INDEX]);
 assert.ok(Math.hypot(BANDIT_CAMP.center.x,BANDIT_CAMP.center.z)>65);
 assert.ok(BANDIT_CAMP.aggroRadius<=6);
 assert.ok(BANDIT_CAMP.leashRadius<=14);
 const guards=points.slice(0,BANDIT_BOSS_INDEX);
 const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 for(const [i,guard] of guards.entries()){
  assert.ok(canWalkCamp(guard.x,guard.z,.52),'guard '+i+' stands on walkable ground');
  assert.ok(gap(guard,BANDIT_CHIEF_LOCATION)>20,'chief is separated from guard '+i);
  for(const [j,other] of guards.entries())if(i!==j)
   assert.ok(gap(guard,other)>20,'guard '+i+' can be pulled without guard '+j);
 }
 for(const patrol of BANDIT_PATROLS){
  const otherGuards=guards.filter((_,i)=>'bandit-'+i!==patrol.id);
  for(const [x,z] of patrol.points){
   assert.ok(Math.hypot(x,z)<83,'patrol stays inside detailed terrain');
   assert.ok(canWalkCamp(x,z,.52),'patrol waypoint is walkable');
   for(const guard of otherGuards)
    assert.ok(gap({x,z},guard)>12,'patrol never approaches another guard aggro radius');
  }
  for(let i=1;i<patrol.points.length;i++){
   const [ax,az]=patrol.points[i-1],[bx,bz]=patrol.points[i];
   assert.ok(mobSegmentClear(ax,az,bx,bz,(x,z)=>canWalkCamp(x,z,.52)),
    'bandit patrol segment is unobstructed');
  }
 }
});
test('isolated chief path remains walkable and on the hand-painted spherical terrain',()=>{
 const waypoints=BANDIT_CHIEF_PATH;
 assert.equal(waypoints.length,5);
 assert.deepEqual(waypoints.at(-1),[BANDIT_CHIEF_LOCATION.x,BANDIT_CHIEF_LOCATION.z]);
 for(let i=0;i<waypoints.length;i++){
  const [x,z]=waypoints[i];
  assert.ok(Math.hypot(x,z)<83,'boss path stays within terrain patch');
  assert.ok(canWalkCamp(x,z,.52),'boss path waypoint is traversable');
  if(i){
   const [ax,az]=waypoints[i-1];
   assert.ok(mobSegmentClear(ax,az,x,z,(px,pz)=>canWalkCamp(px,pz,.52)),
    'player can walk the path without crossing obstacles');
  }
 }
});
