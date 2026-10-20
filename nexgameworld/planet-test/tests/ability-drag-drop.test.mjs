import test from 'node:test';
import assert from 'node:assert/strict';
import {hotbarSlotAtPoint,withinRect,attachAbilityDrag} from '../ability-drag-drop.js';
import {readFileSync} from 'node:fs';

test('drop hit testing selects the exact slot and never falls through gaps',()=>{
 const slots=Array.from({length:8},(_,i)=>({getBoundingClientRect:()=>({
  left:10+52*i,right:54+52*i,top:260,bottom:310})}));
 assert.equal(hotbarSlotAtPoint(slots,11,270),0);
 assert.equal(hotbarSlotAtPoint(slots,10+52*7+22,290),7);
 assert.equal(hotbarSlotAtPoint(slots,60,280),-1);
 assert.equal(hotbarSlotAtPoint(slots,18,320),-1);
 assert.equal(hotbarSlotAtPoint(slots,NaN,300),-1);
 assert.equal(withinRect({hidden:true,getBoundingClientRect:()=>({left:0,right:20,top:0,bottom:20})},5,5),false);
});
test('book opens as a non-modal panel and no old slot-number picker is reachable',()=>{
 const src=readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<section id="spellbookPopover"/);
 assert.match(src,/\['spellbookButton',toggleSpellbook\]/);
 assert.doesNotMatch(src,/kind==='spells'/);
 assert.doesNotMatch(html,/id="hotbarAssign"/);
 assert.doesNotMatch(src,/chooseSlot/);
});
test('cancelled drag must not assign, quick taps leave actions clickable',()=>{
 const handlers=new Map(),timers=new Map(),slots=[],assign=[];
 const node=()=>({classList:{add(){},remove(){},toggle(){}},style:{},
  dataset:{},events:{},addEventListener(k,fn){(handlers.get(k)||handlers.set(k,[]).get(k)).push(fn)},
  setPointerCapture(){},hasPointerCapture(){return false}});
 const source=node(),bar={children:slots};
 const doc={createElement(){return {style:{},remove(){}}},body:{appendChild(){}}};
 let tid=0;
 attachAbilityDrag(source,{document:doc,hotbar:bar,entry:{id:'heavyStrike',name:'Рубящий удар'},
  onDrop:(slot)=>assign.push(slot),schedule:fn=>{timers.set(++tid,fn);return tid},unschedule:id=>timers.delete(id)});
 const pointer={pointerId:1,pointerType:'touch',clientX:30,clientY:100,button:0,
  preventDefault(){},stopImmediatePropagation(){}};
 for(const fn of handlers.get('pointerdown')||[])fn(pointer);
 for(const fn of handlers.get('pointerup')||[])fn(pointer);
 assert.deepEqual(assign,[]);
 for(const fn of handlers.get('pointerdown')||[])fn(pointer);
 for(const fn of handlers.get('pointercancel')||[])fn(pointer);
 assert.deepEqual(assign,[]);
});
