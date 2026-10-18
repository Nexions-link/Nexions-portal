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
 assert.equal(h.rpg.movementLocked,true);assert.ok(h.rpg.getWindowView()?.focus);
 h.get('bag').click();assert.equal(closed,1);assert.equal(h.rpg.getWindowView()?.focus,null);
 h.get('modalClose').click();assert.equal(h.rpg.getWindowView(),null);assert.equal(h.rpg.movementLocked,false);
});
