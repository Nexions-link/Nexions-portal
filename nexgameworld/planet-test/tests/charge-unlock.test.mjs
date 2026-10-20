import test from 'node:test';
import assert from 'node:assert/strict';
import {availableHotbarActions} from '../../hotbar.js';
import {getAbilityDefinition,abilityFailure,createAbilityRuntime} from '../../skills.js';
test('the spellbook exposes charge at level 8 and not at 7',()=>{
 assert.ok(!availableHotbarActions('warrior',7).abilities.some(x=>x.id==='charge'));
 const list=availableHotbarActions('warrior',8).abilities;
 assert.ok(list.some(x=>x.id==='charge'&&x.name==='Рывок'));
});
test('charge ability checks target and 30 m without requiring facing or rage',()=>{
 const ability=getAbilityDefinition('charge'),runtime=createAbilityRuntime();
 const base={classId:'warrior',level:8,runtime,resource:0,hasTarget:true,range:29.9,facing:false};
 assert.equal(abilityFailure(ability,base),'');
 assert.equal(abilityFailure(ability,{...base,range:30.1}),'Цель слишком далеко');
 assert.equal(abilityFailure(ability,{...base,hasTarget:false}),'Нет цели');
 assert.equal(abilityFailure(ability,{...base,level:7}),'Необходим 8 уровень');
});
