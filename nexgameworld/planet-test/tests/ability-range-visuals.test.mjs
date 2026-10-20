import test from 'node:test';
import assert from 'node:assert/strict';
import {getAbilityDefinition} from '../../skills.js';
import {getAbilityRangeIndicator} from '../ability-range-visuals.js';

const status=(id,values)=>getAbilityRangeIndicator(getAbilityDefinition(id),values).outOfRange;

test('autoattack dims above 20 m and lights exactly at approach boundary',()=>{
 assert.equal(status('autoAttack',{targetDistance:Infinity}),true);
 assert.equal(status('autoAttack',{targetDistance:20.01}),true);
 assert.equal(status('autoAttack',{targetDistance:20}),false);
 assert.equal(status('autoAttack',{targetDistance:3}),false);
});
test('single target abilities use melee range rather than approach range',()=>{
 assert.equal(status('heavyStrike',{targetDistance:20}),true);
 assert.equal(status('heavyStrike',{targetDistance:3.46}),true);
 assert.equal(status('heavyStrike',{targetDistance:3.45}),false);
 assert.equal(status('heavyStrike',{targetDistance:Infinity}),true);
});
test('area ability checks any nearby living enemy and not only the selected enemy',()=>{
 assert.equal(status('thunderStomp',{targetDistance:2,nearestHostileDistance:4.51}),true);
 assert.equal(status('thunderStomp',{targetDistance:25,nearestHostileDistance:4.5}),false);
 assert.equal(status('thunderStomp',{nearestHostileDistance:Infinity}),true);
});
test('unrelated actions and cooldown presentation are not range-disabled',()=>{
 assert.equal(status('healingPotion',{targetDistance:100,nearestHostileDistance:100}),false);
 assert.equal(getAbilityRangeIndicator(null,{targetDistance:100}).outOfRange,false);
});
test('range visualization updates in both directions as positions change',()=>{
 const def=getAbilityDefinition('heavyStrike');
 const distances=[8,3.3,6,3.4];
 assert.deepEqual(distances.map(targetDistance=>getAbilityRangeIndicator(def,{targetDistance}).outOfRange),[true,false,true,false]);
});


import {getAbilityResourceIndicator} from '../ability-range-visuals.js';

const energy=(id,resource)=>getAbilityResourceIndicator(getAbilityDefinition(id),{resource});
test('heavy strike requires 20 rage and updates at the exact resource threshold',()=>{
 assert.deepEqual([0,10,19.9,20,25,7,20].map(amount=>energy('heavyStrike',amount).insufficient),
  [true,true,true,false,false,true,false]);
 assert.equal(energy('heavyStrike',20).required,20);
});
test('resource and distance must both be ready to light a melee ability',()=>{
 const def=getAbilityDefinition('heavyStrike');
 const ready=(range,resource)=>!getAbilityRangeIndicator(def,{targetDistance:range}).outOfRange
  &&!getAbilityResourceIndicator(def,{resource}).insufficient;
 assert.deepEqual([[4,0],[3,0],[4,20],[3,20],[3,19]].map(([range,resource])=>ready(range,resource)),
  [false,false,false,true,false]);
});
test('future abilities automatically follow their own resource costs',()=>{
 const future={id:'futureManaStrike',resourceCost:35,requiresTarget:true,range:10};
 assert.equal(getAbilityResourceIndicator(future,{resource:34}).insufficient,true);
 assert.equal(getAbilityResourceIndicator(future,{resource:35}).insufficient,false);
 assert.equal(getAbilityResourceIndicator({...future,resourceCost:4.5},{resource:4.5}).insufficient,false);
});
test('free abilities, potions, missing definitions and invalid amounts never require resources',()=>{
 for(const id of ['autoAttack','thunderStomp','healingPotion'])assert.equal(energy(id,0).insufficient,false);
 assert.equal(getAbilityResourceIndicator(null,{resource:0}).insufficient,false);
 assert.equal(getAbilityResourceIndicator({resourceCost:0},{resource:NaN}).insufficient,false);
 assert.equal(getAbilityResourceIndicator(getAbilityDefinition('heavyStrike'),{resource:NaN}).insufficient,true);
});

test('charge is green through 30 metres and unavailable beyond',()=>{
 assert.equal(status('charge',{targetDistance:29.9}),false);
 assert.equal(status('charge',{targetDistance:30}),false);
 assert.equal(status('charge',{targetDistance:30.01}),true);
 assert.equal(status('charge',{targetDistance:Infinity}),true);
});
