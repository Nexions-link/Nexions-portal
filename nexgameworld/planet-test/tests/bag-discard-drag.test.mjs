import test from 'node:test';
import assert from 'node:assert/strict';
import {isBagWorldDrop,attachBagDiscardDrag} from '../bag-discard-drag.js';
const bounds={left:160,top:90,right:420,bottom:380};
const viewport={id:'viewport'};
const world={id:'game-canvas',closest:q=>q==='#viewport'?viewport:null};
const hud={id:'playerFrame',closest:()=>null};
const panel={getBoundingClientRect:()=>bounds,classList:{toggle(){},remove(){}}};
const document={body:{appendChild(){}},elementFromPoint:(x,y)=>x>60&&y<70?hud:world};
test('release must be on free world area beyond the bag, not another UI control',()=>{
 assert.equal(isBagWorldDrop(document,panel,220,200),false);
 assert.equal(isBagWorldDrop(document,panel,425,200),false,'margin avoids edge accidents');
 assert.equal(isBagWorldDrop(document,panel,440,200),true);
 assert.equal(isBagWorldDrop(document,panel,90,35),false,'do not discard on HUD');
 assert.equal(isBagWorldDrop(document,panel,NaN,600),false);
});
test('holding and dragging to world discards only on pointer release',()=>{
 const actions={},source={classList:{add(){},remove(){}},setPointerCapture(){},
  hasPointerCapture:()=>false,
  addEventListener:(type,fn)=>{(actions[type]??=[]).push(fn)}};
 const ghost={style:{},classList:{toggle(){}},setAttribute(){},remove(){},textContent:''};
 const doc={...document,createElement:()=>ghost};
 let discard=0,scheduled=null,cancelled=false;
 attachBagDiscardDrag(source,{document:doc,panel,item:{name:'топор'},
  onDiscard:()=>discard++,schedule:fn=>(scheduled=fn,1),unschedule:()=>{cancelled=true}});
 const act=(eventType,x,y,extra={})=>actions[eventType].forEach(fn=>fn({
  pointerId:8,pointerType:'touch',clientX:x,clientY:y,preventDefault(){},
  ...extra
 }));
 act('pointerdown',180,200);scheduled();act('pointermove',470,500);
 assert.equal(discard,0);
 act('pointerup',470,500);
 assert.equal(discard,1);
 act('pointerdown',180,200);scheduled();act('pointerup',240,200);
 assert.equal(discard,1);
 act('pointerdown',180,200);scheduled();act('pointercancel',470,500);
 assert.equal(discard,1);
 act('pointerdown',180,200);act('pointermove',200,200);
 assert.equal(cancelled,true);
 act('pointerup',480,500);
 assert.equal(discard,1,'scroll/move before hold cannot trigger deletion');
});
test('game integrates slot-id checking, confirmation and revisioned economy request',async()=>{
 const fs=await import('node:fs');
 const rpg=fs.readFileSync(new URL('../offline-rpg.js',import.meta.url),'utf8');
 assert.match(rpg,/attachBagDiscardDrag\(cell/);
 assert.match(rpg,/window\.confirm\('Удалить '/);
 assert.match(rpg,/sendAccountAction\('inventoryDiscard'/);
 assert.match(rpg,/state\.inventory\.splice\(i,1\)/);
});
