import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createKeyboardMovement,isEditableTarget} from '../keyboard-movement.js';

function game(){
 const listeners=new Map();
 const win={addEventListener:(name,handler)=>{
  const list=listeners.get('win:'+name)||[];list.push(handler);listeners.set('win:'+name,list);
 }};
 const doc={hidden:false,activeElement:null,addEventListener:(name,handler)=>{
  const list=listeners.get('doc:'+name)||[];list.push(handler);listeners.set('doc:'+name,list);
 }};
 let open=true;
 const keyboard=createKeyboardMovement(win,doc,{isGameActive:()=>open});
 const emit=(host,type,changes={})=>{
  const event={code:'',key:'',target:{tagName:'CANVAS'},altKey:false,ctrlKey:false,
   metaKey:false,prevented:false,preventDefault(){this.prevented=true},...changes};
  for(const fn of listeners.get(host+':'+type)||[])fn(event);
  return event;
 };
 const press=(code,key,changes)=>emit('win','keydown',{code,key,...changes});
 const release=(code,key,changes)=>emit('win','keyup',{code,key,...changes});
 return {keyboard,doc,emit,press,release,setOpen:value=>{open=value},listeners};
}

test('WASD and arrows produce joystick-compatible camera-relative axes',()=>{
 const g=game();
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 assert.equal(g.press('KeyW','w').prevented,true);
 assert.deepEqual(g.keyboard.read(),{x:0,y:-1});
 g.press('KeyD','d');
 assert.deepEqual(g.keyboard.read(),{x:1,y:-1});
 g.release('KeyW','w');
 assert.deepEqual(g.keyboard.read(),{x:1,y:0});
 g.release('KeyD','d');
 g.press('ArrowDown','ArrowDown');
 g.press('ArrowLeft','ArrowLeft');
 assert.deepEqual(g.keyboard.read(),{x:-1,y:1});
 g.release('ArrowDown','ArrowDown');
 g.release('ArrowLeft','ArrowLeft');
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
});

test('physical WASD works with Russian keyboard layout and held aliases',()=>{
 const g=game();
 g.press('KeyW','ц');
 g.press('ArrowUp','ArrowUp');
 g.release('KeyW','ц');
 assert.deepEqual(g.keyboard.read(),{x:0,y:-1});
 g.release('ArrowUp','ArrowUp');
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 // Older input devices that provide no code fall back to key.
 g.press('Unidentified','a');
 assert.deepEqual(g.keyboard.read(),{x:-1,y:0});
 g.release('Unidentified','a');
});

test('text entry, chat focus and browser shortcuts are never hijacked',()=>{
 const g=game(),field={tagName:'INPUT'};
 assert.equal(isEditableTarget(field),true);
 assert.equal(g.press('KeyW','w',{target:field}).prevented,false);
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 g.press('KeyW','w',{ctrlKey:true});
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 g.press('KeyW','w');
 g.doc.activeElement={tagName:'TEXTAREA'};
 assert.equal(g.press('KeyD','d').prevented,false);
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 g.doc.activeElement=null;
 g.press('KeyW','w');
 g.emit('doc','focusin',{target:{isContentEditable:true}});
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
});

test('game modal, tab hiding, window blur and pagehide reset movement',()=>{
 const g=game();
 g.press('KeyW','w');
 g.setOpen(false);
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 g.setOpen(true);
 g.press('KeyW','w');
 g.emit('win','blur');
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 g.press('KeyW','w');
 g.doc.hidden=true;g.emit('doc','visibilitychange');
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
 g.doc.hidden=false;
 g.press('KeyW','w');g.emit('win','pagehide');
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
});

test('keyboard listener does not touch mobile pointer handlers or bind touch events',()=>{
 const g=game();
 assert.equal([...g.listeners.keys()].some(key=>/touch|pointer/.test(key)),false);
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
});

test('movement keyup clears state even if input focus changes',()=>{
 const g=game();
 g.press('KeyW','w');
 g.release('KeyW','w',{target:{tagName:'INPUT'}});
 assert.deepEqual(g.keyboard.read(),{x:0,y:0});
});
