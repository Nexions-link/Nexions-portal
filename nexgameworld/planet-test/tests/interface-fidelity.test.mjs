import test from 'node:test';
import assert from 'node:assert/strict';
import {interfaceShortcut} from '../interface-shortcuts.js';
import {itemTooltipData,tooltipPosition,createItemTooltip} from '../item-tooltip.js';
import {harness,descendants,installDom} from './harness.mjs';

const occupied=h=>descendants(h.get('mbody')).filter(node=>String(node.className).split(' ').includes('inventory-slot'));
const context=(node,{pointerType='mouse',button=2}={})=>{
 for(const fn of node.events.contextmenu||[])fn({pointerType,button,preventDefault(){}});
};
const profile={classId:'warrior',raceId:'orc',nickname:'Воин',level:4,health:90,gold:30,
 inventory:[{id:'feebleSword',qty:1},{id:'healingPotion',qty:2}],equipment:{weapon:{id:'wornAxe'}}};

test('familiar WoW panel keys preserve aliases and physical keys under a Russian layout',()=>{
 for(const [key,panel] of Object.entries({b:'bag',i:'bag',p:'spellbook',o:'party',g:'party',l:'quests',j:'quests',c:'character',n:'mounts'}))
  assert.equal(interfaceShortcut({key}),panel,key);
 assert.equal(interfaceShortcut({key:'и',code:'KeyB'}),'bag');
 assert.equal(interfaceShortcut({key:'з',code:'KeyP'}),'spellbook');
 for(const changed of [{repeat:true},{defaultPrevented:true},{ctrlKey:true},{altKey:true},{metaKey:true},
  {target:{tagName:'INPUT'}},{target:{tagName:'TEXTAREA'}},{target:{isContentEditable:true}}])
  assert.equal(interfaceShortcut({key:'b',...changed}),null,'text/browser/repeated keys must remain untouched');
});

test('item tooltip uses actual weapon stats, level restrictions and the equipped item for comparison',()=>{
 const data=itemTooltipData('feebleSword',{level:1,equipment:{weapon:{id:'wornAxe'}}});
 assert.equal(data.name,'Непрочный меч');assert.equal(data.currentId,'wornAxe');
 assert.match(data.type,/Одноручное.*Меч/);assert.match(data.requirement,/3/);
 assert.ok(data.stats.some(row=>row.label==='Урон'&&row.value==='3–7'));
 assert.ok(data.stats.some(row=>row.label==='Скорость'&&row.value==='2 с'));
 assert.ok(data.changes.some(row=>row.key==='dps'&&row.trend==='better'));
 assert.equal(data.price,7);
 assert.equal(itemTooltipData('not-an-item'),null);
 assert.equal(itemTooltipData('healingPotion').action,'Использовать');
 assert.match(itemTooltipData('meadowFlower').type,/задания/);
});

test('tooltip placement keeps comparisons within narrow and lower-edge viewports',()=>{
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const size={width:Math.min(470,viewport.width-16),height:300};
  const at=tooltipPosition({left:viewport.width-65,right:viewport.width-15,top:viewport.height-70,width:50},size,viewport);
  assert.ok(at.x>=8&&at.y>=8);
  assert.ok(at.x+size.width<=viewport.width-8);
  assert.ok(at.y+size.height<=viewport.height-8);
 }
});

test('hover/focus and Shift compare only display information; touch long-press stays reserved for dragging',()=>{
 installDom();const doc=globalThis.document,handlers={};
 doc.body=doc.createElement('body');doc.addEventListener=(name,fn)=>(handlers[name]??=[]).push(fn);
 const tooltip=createItemTooltip({document:doc,getLevel:()=>4,getEquipment:()=>({weapon:{id:'wornAxe'}})});
 const source=doc.createElement('button');tooltip.bind(source,'feebleSword');
 for(const fn of source.events.pointerenter)fn({pointerType:'mouse',shiftKey:false});
 assert.equal(tooltip.element.hidden,false);assert.equal(tooltip.element.children.length,1);
 for(const fn of handlers.keydown)fn({key:'Shift'});
 assert.equal(tooltip.element.children.length,2);
 assert.ok(descendants(tooltip.element).some(node=>node.textContent==='Сейчас надето'));
 for(const fn of source.events.pointerleave)fn({});assert.equal(tooltip.element.hidden,true);
 for(const fn of source.events.pointerdown)fn({pointerType:'touch'});
 for(const fn of source.events.focus)fn({});assert.equal(tooltip.element.hidden,true);
 tooltip.dispose();
});

test('right-click equipment uses the existing server equip action and never predicts ownership changes',()=>{
 const h=harness({authenticatedProfile:profile}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true;}});
 h.get('bag').click();const before=JSON.stringify([h.rpg.state.equipment,h.rpg.state.inventory]);
 context(occupied(h)[0]);assert.deepEqual(sent.at(-1),{kind:'equip',bagSlot:0,equipmentSlot:'weapon'});
 assert.equal(JSON.stringify([h.rpg.state.equipment,h.rpg.state.inventory]),before);
 const count=sent.length;context(occupied(h)[0],{pointerType:'touch'});assert.equal(sent.length,count);
});

test('right-click cannot bypass a weapon level requirement',()=>{
 const h=harness({authenticatedProfile:{...profile,level:1}}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(...args)=>{sent.push(args);return true;}});
 h.get('bag').click();context(occupied(h)[0]);
 assert.equal(sent.length,0);assert.match(h.get('toast').textContent,/уровень 3/);
});

test('right-click potion retains server authority and the existing offline consumption rules',()=>{
 const h=harness({authenticatedProfile:profile}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true;}});
 h.get('bag').click();const before=JSON.stringify([h.rpg.state.hp,h.rpg.state.inventory]);
 context(occupied(h)[1]);assert.equal(sent.at(-1).kind,'usePotion');
 assert.equal(JSON.stringify([h.rpg.state.hp,h.rpg.state.inventory]),before);
 const offline=harness({save:{hp:60,inventory:[{id:'healingPotion',qty:2}]}});
 offline.get('bag').click();context(occupied(offline)[0]);
 assert.equal(offline.rpg.state.hp,115);assert.equal(offline.rpg.state.inventory[0].qty,1);
 assert.equal(offline.get('modal').hidden,false);assert.equal(offline.get('modal').dataset.kind,'bag');
});
