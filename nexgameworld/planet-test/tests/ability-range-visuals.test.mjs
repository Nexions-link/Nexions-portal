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
