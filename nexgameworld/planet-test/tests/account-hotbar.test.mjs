import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,descendants} from './harness.mjs';

// Simulate a real long-press pointer sequence into an occupied or empty hotbar
// slot. The game still calls its authoritative hotbarSet action on drop.
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function placeSlotRects(h){
 h.get('actionsBar').children.forEach((button,index)=>{
  button.getBoundingClientRect=()=>({left:index*42,top:280,right:(index+1)*42,bottom:335,width:42,height:55});
 });
}
async function drop(h,source,slot){
 placeSlotRects(h);
 const pointer={pointerId:123,pointerType:'touch',clientX:150,clientY:170,
  preventDefault(){},stopImmediatePropagation(){}};
 for(const fn of source.events.pointerdown||[])fn(pointer);
 await sleep(330);
 const released={...pointer,clientX:slot*42+20,clientY:300};
 for(const fn of source.events.pointermove||[])fn(released);
 for(const fn of source.events.pointerup||[])fn(released);
}
test('account hotbar is saved via server when dragging a book skill to slot 8, and restored on relog',async()=>{
 const profile={level:1,inventory:Array(12).fill(null),actionBar:[]};
 const h=harness({authenticatedProfile:profile}),sent=[];
 h.rpg.setMultiplayer({connected:true,economy:(kind,args)=>{sent.push({kind,...args});return true}});
 assert.equal(h.rpg.state.hotbar[0].id,'autoAttack');
 h.get('spellbookButton').click();
 assert.equal(h.get('spellbookPopover').hidden,false,'new book is a nonmodal popover');
 assert.equal(h.get('modal').hidden,true,'hotbar remains visible while assigning');
 const entries=h.get('spellbookAbilities').children;
 assert.ok(entries.length,'available spells populate the popover');
 assert.ok(descendants(h.get('spellbookAbilities')).some(x=>x.textContent==='Автоатака'));
 await drop(h,entries[0],7);
 assert.equal(sent.at(-1).kind,'hotbarSet');assert.equal(sent.at(-1).slot,7);
 assert.equal(h.rpg.state.hotbar[7],null,'wait for persisted server response');
 assert.equal(h.get('spellbookPopover').hidden,false,'book stays open after the first assignment');
 assert.equal(h.get('spellbookAbilities').children[0],entries[0],
  'server-side assignment must keep the same spellbook drag source');
 const actionBar=[...h.rpg.state.hotbar];actionBar[7]=sent.at(-1).entry;
 const saved={...profile,actionBar};h.rpg.applyServerProgress(saved,'hotbarSet');
 assert.deepEqual(h.rpg.state.hotbar[7],actionBar[7]);
 assert.equal(h.get('spellbookPopover').hidden,false,'server progress does not dismiss the book');
 assert.equal(h.get('spellbookAbilities').children[0],entries[0],
  'server redraw must not replace draggable book entries');
 await drop(h,entries[0],6);
 assert.equal(sent.at(-1).slot,6,'another assignment works without reopening the book');
 assert.equal(h.get('spellbookPopover').hidden,false);
 h.get('spellbookClose').click();
 assert.equal(h.get('spellbookPopover').hidden,true,'close control dismisses the book');
 const fresh=harness({authenticatedProfile:saved});
 assert.deepEqual(fresh.rpg.state.hotbar,actionBar);
 const empty=harness({authenticatedProfile:{...profile,actionBar:Array(8).fill(null)}});
 assert.deepEqual(empty.rpg.state.hotbar,Array(8).fill(null));
});
test('offline hero replaces a filled slot by dragging; no legacy picker remains',async()=>{
 const h=harness({save:{level:10}});
 const before=h.rpg.state.hotbar[0]?.id;
 h.get('spellbookButton').click();
 const tiles=h.get('spellbookAbilities').children;
 const heavy=tiles.find(t=>t.dataset.abilityId==='heavyStrike');
 assert.ok(heavy,'learned heavy strike is in the book');
 await drop(h,heavy,0);
 assert.notEqual(h.rpg.state.hotbar[0]?.id,before);
 assert.equal(h.rpg.state.hotbar[0]?.id,'heavyStrike');
 assert.equal(h.get('spellbookPopover').hidden,false,'book stays open after replacing a skill');
 assert.equal(h.get('spellbookAbilities').children.find(t=>t.dataset.abilityId==='heavyStrike'),heavy,
  'the ability source remains mounted after assignment');
 await drop(h,heavy,6);
 assert.equal(h.rpg.state.hotbar[6]?.id,'heavyStrike','a second slot accepts a drop immediately');
 assert.equal(h.get('spellbookPopover').hidden,false,'second assignment keeps the book open');
 // The occupied slot can be dragged to the removal zone while the book is open.
 const bar=h.get('actionsBar').children;
 const equipped=bar[6];
 const trash=h.get('spellbookTrash');
 trash.getBoundingClientRect=()=>({left:350,top:60,right:550,bottom:120,width:200,height:60});
 const pointer={pointerId:44,pointerType:'touch',clientX:272,clientY:300,
  preventDefault(){},stopImmediatePropagation(){}};
 for(const fn of equipped.events.pointerdown||[])fn(pointer);
 await sleep(330);
 const end={...pointer,clientX:410,clientY:90};
 for(const fn of equipped.events.pointermove||[])fn(end);
 for(const fn of equipped.events.pointerup||[])fn(end);
 assert.equal(h.rpg.state.hotbar[6],null,'dropped slot is removed');
 assert.equal(h.get('spellbookPopover').hidden,false,'book remains open after removal');
 assert.equal(h.get('hotbarAssign').children.length,0,'legacy slot picker not mounted');
 h.get('spellbookButton').click();
 assert.equal(h.get('spellbookPopover').hidden,true,'tapping the book icon toggles it closed');
});
