import test from 'node:test';
import assert from 'node:assert/strict';
import {createMountControls,mountCastProgress,mountCastBottom,MOUNT_CAST_HOTBAR_GAP,MOUNT_ERROR_MESSAGES} from '../mount-controls.js';

function fixture({hotbarTop=null,viewportHeight=844}={}){
 const nodes={};
 const viewHandlers=new Map();
 const view={
  innerHeight:viewportHeight,
  addEventListener:(name,cb)=>viewHandlers.set(name,cb),
  removeEventListener:name=>viewHandlers.delete(name)
 };
 let hotbarY=hotbarTop;
 if(hotbarY!==null)nodes.actionsBar={getBoundingClientRect:()=>({top:hotbarY})};
 for(const id of ['mountButton','mountButtonLabel','mountCast','mountCastFill','mountCastTime']){
  const classes=new Set(),handlers=new Map();
  nodes[id]={
   hidden:id==='mountButton'||id==='mountCast',disabled:false,textContent:'',title:'',
   style:{},attributes:{},classList:{
    toggle:(name,flag)=>flag?classes.add(name):classes.delete(name),
    contains:name=>classes.has(name)
   },
   setAttribute(name,value){this.attributes[name]=value},
   addEventListener(name,listener){handlers.set(name,listener)},
   removeEventListener(name){handlers.delete(name)},
   click(){handlers.get('click')?.()}
  };
 }
 let now=100,summons=0,dismounts=0;const notices=[];
 const controls=createMountControls({
  document:{getElementById:id=>nodes[id]||null,defaultView:view,
   documentElement:{clientHeight:viewportHeight}},clock:()=>now,
  onSummon:()=>{summons++;return true},onDismount:()=>{dismounts++;return true},
  onNotice:message=>notices.push(message)
 });
 return {nodes,controls,notices,get summons(){return summons},get dismounts(){return dismounts},
  setTime:value=>{now=value},
  resize:(height,top)=>{view.innerHeight=height;hotbarY=top;viewHandlers.get('resize')?.()},
  orientation:(height,top)=>{view.innerHeight=height;hotbarY=top;viewHandlers.get('orientationchange')?.()},
  get activeListeners(){return viewHandlers.size}};
}
test('locked until level 10, quest unlock is server owned',()=>{
 const f=fixture(),b=f.nodes.mountButton;
 assert.equal(b.hidden,true);
 f.controls.setLevel(10);f.controls.setConnected(true);
 assert.equal(b.hidden,false);
 assert.equal(b.classList.contains('is-locked'),true);
 b.click();assert.equal(f.summons,0);
 assert.deepEqual(f.notices,[MOUNT_ERROR_MESSAGES.not_owned]);
 f.controls.setMount({mountState:'foot',mountId:null,owned:true});
 assert.equal(b.classList.contains('is-locked'),false);
 b.click();assert.equal(f.summons,1);
 b.click();assert.equal(f.summons,1,'prevent duplicate summon requests');
});
test('authoritative two second cast and cancellation',()=>{
 const f=fixture(),{mountCast,mountCastFill,mountCastTime,mountButton}=f.nodes;
 f.controls.setLevel(10);f.controls.setConnected(true);
 f.controls.setMount({mountState:'foot',owned:true});
 f.controls.beginCast({durationMs:2000});
 assert.equal(mountCast.hidden,false);
 assert.match(mountButton.attributes['aria-label'],/^Отменить призыв/);
 f.setTime(1100);f.controls.tick();
 assert.equal(mountCastFill.style.width,'50.0%');
 assert.equal(mountCast.attributes['aria-valuenow'],'50');
 assert.equal(mountCastTime.textContent,'1.0 с');
 mountButton.click();assert.equal(f.dismounts,1);
 f.controls.setMount({mountState:'foot'});
 assert.equal(mountCast.hidden,true);
 f.controls.setMount({mountState:'riding',mountId:'forest_wolf'});
 assert.equal(mountButton.attributes['aria-pressed'],'true');
 mountButton.click();assert.equal(f.dismounts,2);
 f.controls.setMount({mountState:'foot'});
 assert.equal(mountButton.attributes['aria-pressed'],'false');
});
test('moving interrupts cast once and disconnect resets safely',()=>{
 const f=fixture();
 f.controls.setLevel(10);f.controls.setConnected(true);
 f.controls.setMount({owned:true,mountState:'casting',mountId:'forest_wolf'});
 assert.equal(f.controls.cancelForMovement(true),true);
 assert.equal(f.controls.cancelForMovement(true),false);
 assert.equal(f.dismounts,1);
 f.controls.setConnected(false);
 assert.equal(f.controls.state,'foot');
 assert.equal(f.nodes.mountButton.disabled,true);
 assert.equal(f.nodes.mountCast.hidden,true);
});
test('reject clears cast and shows localized server reason',()=>{
 const f=fixture();
 f.controls.setLevel(10);f.controls.setConnected(true);f.controls.setMount({owned:true});
 f.controls.beginCast({durationMs:2000});
 f.controls.reject('combat');
 assert.equal(f.controls.state,'foot');
 assert.equal(f.nodes.mountCast.hidden,true);
 assert.deepEqual(f.notices,[MOUNT_ERROR_MESSAGES.combat]);
});
test('progress is clamped and cannot complete mounting locally',()=>{
 assert.equal(mountCastProgress(1000,1000,2000),0);
 assert.equal(mountCastProgress(2000,1000,2000),.5);
 assert.equal(mountCastProgress(4000,1000,2000),1);
 assert.equal(mountCastProgress(NaN,1000,2000),0);
 const f=fixture();
 f.controls.setLevel(10);f.controls.setConnected(true);f.controls.setMount({owned:true});
 f.controls.beginCast({durationMs:2000});
 f.setTime(3100);f.controls.tick();
 assert.equal(f.controls.state,'casting','animation timer is not authoritative');
 assert.equal(f.nodes.mountCastTime.textContent,'Подтверждение…');
});

test('cast border stays exactly 20px above measured ability bar',()=>{
 assert.equal(MOUNT_CAST_HOTBAR_GAP,20);
 for(const [height,hotbarTop] of [[844,755],[667,585],[390,309],[1024,935]]){
  const f=fixture({hotbarTop,viewportHeight:height});
  f.controls.setLevel(10);f.controls.setConnected(true);
  f.controls.beginCast({durationMs:2000});
  const cssBottom=Number.parseFloat(f.nodes.mountCast.style.bottom);
  assert.equal(cssBottom,mountCastBottom(height,hotbarTop));
  assert.equal(hotbarTop-(height-cssBottom),20,'exact gap at '+height+'px height');
  f.controls.dispose();
  assert.equal(f.activeListeners,0);
 }
});
test('cast follows hotbar after resize and rotation, without changing mount state',()=>{
 const f=fixture({viewportHeight:844,hotbarTop:750});
 f.controls.setLevel(10);f.controls.setConnected(true);
 f.controls.beginCast({durationMs:2000});
 assert.equal(f.nodes.mountCast.style.bottom,'114px');
 f.resize(780,702);
 assert.equal(f.nodes.mountCast.style.bottom,'98px');
 f.orientation(390,305);
 assert.equal(f.nodes.mountCast.style.bottom,'105px');
 assert.equal(f.controls.state,'casting');
 f.controls.dispose();
 assert.equal(f.activeListeners,0);
});
test('invalid or missing geometry does not destroy the summon HUD',()=>{
 for(const top of [NaN,-10,Infinity,850]){
  assert.equal(mountCastBottom(844,top),null);
 }
 assert.equal(mountCastBottom(0,20),null);
 assert.equal(mountCastBottom(844,800),64);
 const f=fixture();
 f.controls.setLevel(10);f.controls.setConnected(true);
 f.controls.beginCast({durationMs:2000});
 assert.equal(f.controls.state,'casting');
 assert.equal(f.nodes.mountCast.style.bottom,undefined);
});
