import test from 'node:test';
import assert from 'node:assert/strict';
import {BANDIT_CAMP,BANDIT_PATROLS,BANDIT_EXPANSION,
 canAcceptBanditExpansion,nextPatrolPoint,shouldResetBandit,applyBanditExpansionEvent} from './bandit-camp-data.js';
import {BANDIT_CAMP as LIVE_CAMP,creatureById} from './creature-registry.js';

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
 assert.deepEqual(nextPatrolPoint(patrol,{x:-40,z:9},0).target,{x:-37,z:12});
 assert.equal(nextPatrolPoint(patrol,{x:-40,z:15},2).index,0);
 assert.equal(shouldResetBandit({x:-40,z:9},{x:-40,z:29}),true);
 assert.equal(shouldResetBandit({x:-40,z:9},{x:-40,z:12}),false);
});
test('unverified or irrelevant quest events do not progress',()=>{
 const start={stage:2,count:0,ready:false};
 assert.equal(applyBanditExpansionEvent(start,{type:'kill',role:'scout'}),start);
 const end=applyBanditExpansionEvent(start,{type:'kill',role:'boss'});
 assert.deepEqual(end,{stage:2,count:1,ready:true});
 assert.equal(applyBanditExpansionEvent(end,{type:'kill',role:'boss'}),end);
 assert.equal(BANDIT_EXPANSION.length,3);
});
