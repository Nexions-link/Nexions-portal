import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installDom,descendants,harness} from './harness.mjs';
import {createChestSheet} from '../chest-sheet.js';
import {OFFLINE_CHEST} from '../gather-world.js';
const items={axe:{name:'Топор',icon:'🪓'},quest:{name:'Цветок',quest:true}};
function setup(){
 installDom();const body=document.createElement('div'),sent=[];
 const sheet=createChestSheet({items,qualityColors:{},move:(...args)=>{sent.push(args);return true},notify(){}});
 const snapshot={slots:Array(18).fill(null),inventory:Array(12).fill(null)};
 snapshot.slots[9]={id:'axe',qty:2};snapshot.inventory[7]={id:'axe',qty:1};snapshot.inventory[4]={id:'quest',qty:1};
 const render=()=>{body.replaceChildren();sheet.render(body,snapshot)};
 render();return {body,sent,sheet,snapshot,render,nodes:()=>descendants(body)};
}
test('chest selection is explicit, uses sparse server slot indexes, and blocks repeat transfers until ACK',()=>{
 const h=setup();h.nodes().find(e=>e.className==='inventory-grid chest-sheet-grid').children[9].click();
 assert.equal(h.sent.length,0);const action=h.nodes().find(e=>e.textContent==='Забрать');action.click();action.click();
 assert.equal(h.sent.length,1);assert.deepEqual(h.sent[0].slice(0,2),['withdraw',9]);
 assert.ok(h.nodes().filter(e=>e.className.includes('inventory-slot')).every(e=>e.disabled));
 h.sheet.result({ok:false,requestId:h.sent[0][2]});h.render();
 assert.equal(h.nodes().find(e=>e.className==='inventory-grid chest-sheet-grid').children[9].disabled,false);
});
test('bag tab survives snapshots, preserves deposit index and forbids quest item transfers',()=>{
 const h=setup();h.nodes().find(e=>e.className==='chest-tabs').children[1].click();
 h.render();const grid=h.nodes().find(e=>e.className==='inventory-grid chest-sheet-grid');assert.equal(grid.children.length,12);
 grid.children[4].click();assert.equal(h.nodes().find(e=>e.textContent==='Положить').disabled,true);
 grid.children[7].click();h.nodes().find(e=>e.textContent==='Положить').click();assert.deepEqual(h.sent[0].slice(0,2),['deposit',7]);
});
test('shared chest locks movement, preserves camera settings, and closes lid when another window opens',()=>{
 const h=harness({x:OFFLINE_CHEST.x,z:OFFLINE_CHEST.z});let opened=0,closed=0;
 h.rpg.setMultiplayer({connected:true,openChest(){opened++},closeChest(){closed++}});
 h.rpg.interact();assert.equal(h.get('modal').dataset.kind,'chest');assert.equal(opened,1);
 assert.equal(h.rpg.movementLocked,true);assert.ok(h.rpg.getWindowView()?.focus==null,'ordinary windows do not shift camera');
 h.rpg.onChestState({slots:Array(18).fill(null),revision:1,inventory:Array(12).fill(null)});
 assert.ok(h.rpg.getWindowView()?.focus);
 h.get('bag').click();assert.equal(closed,1);assert.ok(h.rpg.getWindowView()?.focus==null,'ordinary windows do not shift camera');
 h.get('modalClose').click();assert.equal(h.rpg.getWindowView(),null);assert.equal(h.rpg.movementLocked,false);
});
test('rejected chest open closes the loading sheet and releases movement with a readable message',()=>{
 const h=harness({x:OFFLINE_CHEST.x,z:OFFLINE_CHEST.z});
 h.rpg.setMultiplayer({connected:true,openChest(){return true},closeChest(){}});
 h.rpg.interact();assert.equal(h.rpg.movementLocked,true);
 h.rpg.onChestResult({kind:'chestOpen',ok:false,reason:'untrusted_interaction_context'});
 assert.equal(h.get('modal').hidden,true);assert.equal(h.rpg.movementLocked,false);
 assert.equal(h.get('toast').textContent,'Нельзя открыть сундук во время боя');
});

test('chest occupancy sync starts before the user opens storage',()=>{
 const h=harness({x:OFFLINE_CHEST.x,z:OFFLINE_CHEST.z});let polls=0;
 h.rpg.setMultiplayer({connected:true,requestChestStatus(){polls++;return true}});
 h.rpg.update(.1);
 assert.equal(polls,1,'nearby chest must request occupancy before opening');
 assert.equal(h.get('modal').hidden,true);
 h.rpg.update(.1);
 assert.equal(polls,1,'requests are throttled while waiting for a response');
 h.rpg.update(1.6);
 assert.equal(polls,2,'a lost read-only status must retry quickly');
 h.rpg.onChestStatus({occupied:3,revision:3});
 h.rpg.update(.1);
 assert.equal(polls,2,'a successful count returns to background refresh cadence');
});

test('a denied chest request never enters the inspection camera before server confirmation',()=>{
 const h=harness({x:OFFLINE_CHEST.x,z:OFFLINE_CHEST.z});
 h.rpg.setMultiplayer({connected:true,openChest(){return true},closeChest(){}});
 h.rpg.interact();assert.equal(h.rpg.getWindowView().focus,null);
 h.rpg.onChestResult({ok:false,kind:'chestOpen',reason:'untrusted_interaction_context'});
 assert.equal(h.rpg.getWindowView(),null);
});

test('temporary distance mismatch retries opening without closing the sheet',async()=>{
 const h=harness({x:OFFLINE_CHEST.x,z:OFFLINE_CHEST.z});let opens=0,closes=0;
 h.rpg.setMultiplayer({connected:true,openChest(){opens++;return true},closeChest(){closes++}});
 h.rpg.interact();assert.equal(opens,1);
 h.rpg.onChestResult({kind:'chestOpen',ok:false,reason:'interaction_too_far'});
 assert.equal(h.get('modal').hidden,false);
 assert.ok(descendants(h.get('mbody')).some(e=>e.textContent==='Синхронизируем положение с сервером…'));
 await new Promise(resolve=>setTimeout(resolve,750));
 assert.equal(opens,2);
 h.rpg.onChestState({slots:Array(18).fill(null),revision:2,inventory:Array(12).fill(null)});
 assert.equal(h.get('modal').hidden,false);
 assert.ok(h.rpg.getWindowView().focus);
 h.get('modalClose').click();assert.equal(closes,1);
});

test('after withdrawal the equipped item resolves its original sparse bag slot',()=>{
 const before=Array(12).fill(null);before[2]={id:'wornAxe',qty:1};
 const account={nickname:'Герой',level:10,experience:0,gold:50,health:100,
  inventory:before,equipment:{},quests:{},actionBar:[]};
 const h=harness({authenticatedProfile:account}),sent=[];
 h.rpg.setMultiplayer({connected:true,
  economy:(kind,params)=>{sent.push({kind,...params});return true}});
 const after=Array(12).fill(null);
 after[2]={id:'wornAxe',qty:1};after[10]={id:'batteredBuckler',qty:1};
 h.rpg.onChestResult({ok:true,requestId:'withdraw',inventory:after,
  slots:Array(18).fill(null),revision:2});
 h.get('bag').click();
 const cells=descendants(h.get('mbody')).filter(e=>e.className.includes('inventory-slot'));
 cells[1].click();
 descendants(h.get('mbody')).find(e=>e.textContent==='Надеть').click();
 assert.deepEqual(sent.at(-1),{kind:'equip',bagSlot:10,equipmentSlot:'shield'});
 assert.equal(h.rpg.state.equipment.shield,undefined);
 h.rpg.applyServerProgress({...account,revision:3,inventory:after.map((row,i)=>i===10?null:row),
  equipment:{shield:{id:'batteredBuckler'}}},'equip');
 assert.equal(h.rpg.state.equipment.shield.id,'batteredBuckler');
 assert.equal(h.rpg.state.inventory.some(row=>row.id==='batteredBuckler'),false);
 h.get('modalClose').click();
});
test('chest opening repairs missed bag update; a chest broadcast never erases bag',()=>{
 const base=Array(12).fill(null);base[0]={id:'wornAxe',qty:1};
 const h=harness({authenticatedProfile:{level:10,inventory:base,health:95,equipment:{}}});
 const sparse=Array(12).fill(null);sparse[9]={id:'chainVest',qty:1};
 h.rpg.onChestState({slots:Array(18).fill(null),inventory:sparse,revision:6});
 assert.deepEqual(h.rpg.state.inventory,[{id:'chainVest',qty:1}]);
 h.rpg.onChestState({slots:Array(18).fill(null),revision:7});
 assert.deepEqual(h.rpg.state.inventory,[{id:'chainVest',qty:1}]);
 const sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,params)=>{sent.push({kind,...params});return true}});
 h.get('bag').click();
 descendants(h.get('mbody')).find(e=>e.className.includes('inventory-slot occupied')).click();
 descendants(h.get('mbody')).find(e=>e.textContent==='Надеть').click();
 assert.equal(sent.at(-1).bagSlot,9);
 h.get('modalClose').click();
});
