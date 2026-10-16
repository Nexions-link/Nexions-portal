import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installTouchButtons,installSurfaceZoomGuard,createPointerJoystick} from '../touch-input.js';
import {harness} from './harness.mjs';
function input(existingDocument=null){
 const listeners=new Map(),document=existingDocument||{hidden:false};let time=1000;
 document.addEventListener=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)};
 function fire(type,target,values={}){
  const event={type,target,pointerType:'touch',pointerId:1,isPrimary:true,clientX:240,clientY:340,
   detail:1,isTrusted:true,prevented:false,stopped:false,
   preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...values};
  for(const fn of listeners.get(type)||[]){fn(event);if(event.stopped)break;}
  if(!event.stopped)for(const fn of target.events?.[type]||[])fn(event);
  return event;
 }
 function node({button=false,parent=null}={}){
  const n={button,parent,disabled:false,isConnected:true,events:{},style:{},captured:new Set(),clicks:0,
   getAttribute(){return null},closest(){return this.button?this:this.parent?.closest()||null},
   contains(child){for(let p=child;p;p=p.parent)if(p===this)return true;return false},
   addEventListener(type,fn){(this.events[type]??=[]).push(fn)},
   getBoundingClientRect(){return {left:0,top:0,width:100,height:100}},
   setPointerCapture(id){this.captured.add(id)},hasPointerCapture(id){return this.captured.has(id)},
   releasePointerCapture(id){this.captured.delete(id);fire('lostpointercapture',this,{pointerId:id})},
   click(){fire('click',this,{isTrusted:false,detail:0})}};
  if(button)n.addEventListener('click',()=>n.clicks++);
  return n;
 }
 const base=node(),thumb=node(),world=node(),button=node({button:true});
 const stick=createPointerJoystick(base,thumb);
 installTouchButtons(document,{now:()=>time});installSurfaceZoomGuard(document,world,{now:()=>time});
 const holdStick=()=>fire('pointerdown',base,{pointerId:1,clientX:50,clientY:18});
 const tap=(target=button,id=2)=>{fire('pointerdown',target,{pointerId:id,isPrimary:false});return fire('pointerup',target,{pointerId:id,isPrimary:false})};
 return {document,fire,node,base,thumb,world,button,stick,holdStick,tap,advance:ms=>time+=ms};
}
test('second finger activates a button while the first continues holding the joystick',()=>{
 const h=input();h.holdStick();h.tap();
 assert.equal(h.button.clicks,1);assert.equal(h.stick.pointer,1);assert.equal(h.stick.y,-1);
 h.fire('pointerup',h.button,{pointerId:2});assert.equal(h.stick.pointer,1);
 h.fire('pointermove',h.base,{pointerId:1,clientX:82,clientY:50});assert.equal(h.stick.x,1);
 h.fire('pointerup',h.base,{pointerId:1});assert.equal(h.stick.pointer,null);assert.equal(h.stick.x,0);
});
test('independent fingers can tap different dynamic buttons without releasing movement',()=>{
 const h=input(),a=h.node({button:true}),b=h.node({button:true});h.holdStick();
 h.fire('pointerdown',a,{pointerId:2,isPrimary:false});h.fire('pointerdown',b,{pointerId:3,isPrimary:false});
 h.fire('pointerup',b,{pointerId:3,isPrimary:false});h.fire('pointerup',a,{pointerId:2,isPrimary:false});
 assert.equal(a.clicks,1);assert.equal(b.clicks,1);assert.equal(h.stick.pointer,1);
 h.tap(a,4);h.tap(a,5);assert.equal(a.clicks,3);
});
test('compatibility clicks (including Safari detail=0) do not double activate a touch',()=>{
 const h=input();h.holdStick();h.tap();
 for(const detail of [1,0]){
  const event=h.fire('click',h.button,{pointerType:detail?'touch':undefined,detail});
  assert.equal(event.prevented,true);assert.equal(event.stopped,true);
 }
 assert.equal(h.button.clicks,1);
});
test('ghost click is suppressed after the hotbar is replaced or a window closes',()=>{
 const h=input();h.tap();h.button.isConnected=false;
 const replacement=h.node({button:true});
 const event=h.fire('click',replacement,{pointerType:undefined});
 assert.equal(event.stopped,true);assert.equal(replacement.clicks,0);
 h.tap(replacement,3);assert.equal(replacement.clicks,1);
});
test('mouse, keyboard/accessibility and programmatic clicks remain usable',()=>{
 const h=input();h.tap();
 h.button.click();
 h.fire('click',h.button,{detail:0,pointerType:undefined,clientX:0,clientY:0});
 h.fire('pointerdown',h.button,{pointerType:'mouse',button:0});
 h.fire('click',h.button,{pointerType:'mouse'});
 assert.equal(h.button.clicks,4);
});
test('dragged, disabled, canceled and detached buttons do not activate',()=>{
 const h=input();h.holdStick();h.button.disabled=true;h.tap();assert.equal(h.button.clicks,0);
 h.button.disabled=false;h.fire('pointerdown',h.button,{pointerId:2});
 h.fire('pointermove',h.button,{pointerId:2,clientX:280});h.fire('pointerup',h.button,{pointerId:2});
 h.fire('pointerdown',h.button,{pointerId:3});h.fire('pointercancel',h.button,{pointerId:3});h.fire('pointerup',h.button,{pointerId:3});
 h.button.isConnected=false;h.tap(h.button,4);
 assert.equal(h.button.clicks,0);assert.equal(h.stick.pointer,1);
});
test('losing joystick capture clears only its pointer; an already held button can still fire',()=>{
 const h=input();h.holdStick();h.fire('pointerdown',h.button,{pointerId:2,isPrimary:false});
 h.fire('lostpointercapture',h.base,{pointerId:1});assert.equal(h.stick.pointer,null);assert.equal(h.stick.y,0);
 h.fire('pointerup',h.button,{pointerId:2,isPrimary:false});assert.equal(h.button.clicks,1);
});
test('button icon descendants and role=button controls share the same touch path',()=>{
 const h=input(),icon=h.node({parent:h.button});h.tap(icon);
 assert.equal(h.button.clicks,1);
});
test('page hiding cancels pending touch actions',()=>{
 const h=input();h.fire('pointerdown',h.button,{pointerId:2});
 h.document.hidden=true;h.fire('visibilitychange',h.document);h.fire('pointerup',h.button,{pointerId:2});
 assert.equal(h.button.clicks,0);
});
test('rapid UI taps bypass the world double-tap guard; world smart-zoom remains blocked',()=>{
 const h=input(),touch={clientX:240,clientY:340},surface=h.node({parent:h.world});
 for(let i=0;i<2;i++){
  assert.equal(h.fire('touchstart',h.button,{touches:[touch]}).prevented,false);
  assert.equal(h.fire('touchend',h.button,{touches:[],changedTouches:[touch]}).prevented,false);h.advance(50);
 }
 h.fire('touchend',surface,{touches:[],changedTouches:[touch]});h.advance(100);
 assert.equal(h.fire('touchstart',surface,{touches:[touch]}).prevented,true);
 assert.equal(h.fire('gesturechange',surface).prevented,true);
 assert.equal(h.fire('gesturechange',h.button).prevented,false);
 assert.equal(h.fire('touchstart',surface,{touches:[touch,touch]}).prevented,false);
});
test('real RPG: secondary touch casts stomp with joystick held and no native click',()=>{
 const game=harness();game.selectDummy();
 const h=input(globalThis.document),button=game.get('actionsBar').children[1];
 button.closest=()=>button;button.isConnected=true;
 h.holdStick();h.tap(button,2);
 assert.equal(game.rpg.movementLocked,true);assert.equal(h.stick.pointer,1);assert.equal(h.stick.y,-1);
 game.rpg.update(.37);assert.equal(game.rpg.state.resource,53);
 h.fire('click',button,{pointerType:'touch'});assert.equal(game.rpg.state.resource,53);
});
