import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGET_POSITION_KEY,targetButtonBounds,clampTargetPoint,normalizeTargetPoint,restoreTargetPoint,installDraggableTargetButton} from '../target-button-drag.js';

test('button stays within safe edges even on narrow portrait screens',()=>{
 const bounds=targetButtonBounds({width:390,height:844},{width:77,height:42},
  {top:59,bottom:34,left:0,right:0});
 assert.deepEqual(bounds,{left:8,top:67,right:305,bottom:760});
 assert.deepEqual(clampTargetPoint({x:999,y:-50},bounds),{x:305,y:67});
 const normalized=normalizeTargetPoint({x:156.5,y:413.5},bounds);
 assert.deepEqual(restoreTargetPoint(normalized,bounds),{x:156.5,y:413.5});
 const landscape=targetButtonBounds({width:844,height:390},{width:77,height:42},
  {left:44,right:44,top:0,bottom:21});
 assert.deepEqual(restoreTargetPoint(normalized,landscape),{
  x:landscape.left+normalized.x*(landscape.right-landscape.left),
  y:landscape.top+normalized.y*(landscape.bottom-landscape.top)
 });
});
test('malformed saved coordinates cannot hide target button offscreen',()=>{
 const b=targetButtonBounds({width:300,height:520},{width:77,height:42});
 for(const val of [null,{}, {x:-1,y:0},{x:0,y:1.01},{x:Infinity,y:.5},{x:'foo',y:0}])
  assert.equal(restoreTargetPoint(val,b),null);
});
function sandbox(){
 const handlers=new Map(),timers=new Map(),storage=new Map(),windowEvents=new Map();
 let seq=0,rect={left:260,top:620,width:77,height:42},clicked=0;
 const button={
  style:{left:'',top:'',right:'',bottom:''},dataset:{},capture:null,
  classList:{labels:new Set(),add(x){this.labels.add(x)},remove(x){this.labels.delete(x)},
   contains(x){return this.labels.has(x)}},
  addEventListener(type,fn){(handlers.get(type)||handlers.set(type,[]).get(type)).push(fn)},
  getBoundingClientRect(){return {...rect}},
  setPointerCapture(id){this.capture=id},
  hasPointerCapture(id){return this.capture===id},
  releasePointerCapture(){this.capture=null}
 };
 function emit(type,coords={}) {
  let prevented=false,stopped=false;
  const event={pointerId:1,pointerType:'touch',button:0,clientX:280,clientY:635,...coords,
   preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}};
  for(const fn of handlers.get(type)||[]){fn(event);if(stopped)break}
  if(type==='click'&&!prevented)clicked++;
  return {prevented,stopped};
 }
 const win={innerWidth:390,innerHeight:844,addEventListener(type,fn){windowEvents.set(type,fn)}};
 const doc={documentElement:{clientWidth:390,clientHeight:844}};
 const store={getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v),
  removeItem:key=>storage.delete(key)};
 const schedule=(fn)=>{const id=++seq;timers.set(id,fn);return id};
 const unschedule=id=>timers.delete(id);
 const flush=()=>{const tasks=[...timers.values()];timers.clear();tasks.forEach(fn=>fn())};
 const api=installDraggableTargetButton(button,{window:win,document:doc,storage:store,safeInsets:{top:59,bottom:34},
  schedule,unschedule});
 return {button,doc,store,storage,emit,flush,api,windowEvents,clicked:()=>clicked};
}
test('a normal tap never starts dragging, and keyboard/native clicks are preserved',()=>{
 const h=sandbox();h.emit('pointerdown');h.emit('pointerup');h.emit('click');
 assert.equal(h.clicked(),1);
 assert.equal(h.storage.has(TARGET_POSITION_KEY),false);
 assert.equal(h.button.classList.contains('is-floating'),false);
});
test('long press allows positioning and persists it without activating target',()=>{
 const h=sandbox();
 h.emit('pointerdown');h.flush();
 assert.equal(h.button.dataset.targetDragging,'true');
 h.emit('pointermove',{clientX:90,clientY:310});
 assert.equal(h.button.style.left,'70px');
 assert.equal(h.button.style.top,'295px');
 h.emit('pointerup',{clientX:90,clientY:310});
 assert.equal(h.button.dataset.targetDragging,'false');
 assert.ok(h.storage.has(TARGET_POSITION_KEY));
 assert.equal(h.emit('click').prevented,true,'native click after a drag must not select');
 assert.equal(h.clicked(),0);
 h.emit('pointerdown');h.emit('pointerup');h.emit('click');
 assert.equal(h.clicked(),1,'tapping the moved target button must still work');
});
test('early movement cancels hold; resize restores normalized position; reset goes home',()=>{
 const h=sandbox();
 h.emit('pointerdown');h.emit('pointermove',{clientX:296,clientY:635});h.flush();h.emit('pointerup');
 assert.equal(h.button.classList.contains('is-floating'),false);
 h.emit('pointerdown');h.flush();h.emit('pointermove',{clientX:300,clientY:500});h.emit('pointerup');
 const saved=h.storage.get(TARGET_POSITION_KEY);
 h.doc.documentElement.clientWidth=844;h.doc.documentElement.clientHeight=390;
 h.windowEvents.get('resize')();
 assert.equal(h.storage.get(TARGET_POSITION_KEY),saved);
 assert.ok(parseFloat(h.button.style.left)>=8);
 assert.ok(parseFloat(h.button.style.top)<=390-42-8);
 h.api.reset();
 assert.equal(h.storage.has(TARGET_POSITION_KEY),false);
 assert.equal(h.button.classList.contains('is-floating'),false);
});
