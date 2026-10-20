// Touch buttons must not depend on Safari generating a primary-finger click.
// Pointer IDs belong to independent controls; never reject a secondary finger.
export function installTouchButtons(document,{now=()=>performance.now()}={}){
 const presses=new Map(),recent=[];
 const buttonAt=target=>target?.closest?.('button,[role="button"]');
 const enabled=button=>button&&!button.disabled&&button.dataset?.targetDragging!=='true'&&button.getAttribute?.('aria-disabled')!=='true';
 const prune=()=>{while(recent.length&&now()-recent[0].time>800)recent.shift()};
 document.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'){recent.length=0;return;}
  const button=buttonAt(event.target);
  if(!enabled(button))return;
  presses.set(event.pointerId,{button,x:event.clientX,y:event.clientY,moved:false});
 },true);
 document.addEventListener('pointermove',event=>{
  const press=presses.get(event.pointerId);
  if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>14)press.moved=true;
 },true);
 document.addEventListener('pointercancel',event=>presses.delete(event.pointerId),true);
 document.addEventListener('pointerup',event=>{
  const press=presses.get(event.pointerId);presses.delete(event.pointerId);
  if(!press||press.moved||!enabled(press.button)||press.button.isConnected===false)return;
  if(buttonAt(event.target)!==press.button||Math.hypot(event.clientX-press.x,event.clientY-press.y)>14)return;
  event.preventDefault();prune();
  recent.push({button:press.button,x:event.clientX,y:event.clientY,time:now()});
  if(recent.length>16)recent.shift();
  // Reuse the existing action handlers, including newly rendered hotbar slots.
  // This programmatic click is untrusted and passes the deduplication below.
  press.button.click();
 },true);
 document.addEventListener('click',event=>{
  if(event.isTrusted===false)return;
  const virtual=event.detail===0&&!event.pointerType&&!event.clientX&&!event.clientY&&!event.sourceCapabilities?.firesTouchEvents;
  if(virtual)return;
  prune();const button=buttonAt(event.target);
  // A handler can rebuild the hotbar or close a window. Suppress a following
  // compatibility click even if the browser retargets it onto the new markup.
  if(recent.some(p=>p.button===button||Math.hypot(event.clientX-p.x,event.clientY-p.y)<24)){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')recent.length=0},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){presses.clear();recent.length=0}});
}

export function installSurfaceZoomGuard(document,surface,{now=()=>performance.now()}={}){
 let lastTap=null;
 const world=target=>!!surface?.contains(target);
 document.addEventListener('touchstart',event=>{
  if(!world(event.target)||event.touches.length!==1){lastTap=null;return;}
  const finger=event.touches[0];
  if(lastTap&&now()-lastTap.time<350&&Math.hypot(finger.clientX-lastTap.x,finger.clientY-lastTap.y)<42){
   event.preventDefault();lastTap=null;
  }
 },{passive:false,capture:true});
 document.addEventListener('touchend',event=>{
  if(!world(event.target)||event.touches.length||event.changedTouches.length!==1){lastTap=null;return;}
  const finger=event.changedTouches[0],time=now();
  const close=lastTap&&time-lastTap.time<330&&Math.hypot(finger.clientX-lastTap.x,finger.clientY-lastTap.y)<36;
  lastTap={time,x:finger.clientX,y:finger.clientY};
  if(close){event.preventDefault();lastTap=null}
 },{passive:false,capture:true});
 document.addEventListener('dblclick',event=>{if(world(event.target))event.preventDefault()},true);
 for(const type of ['gesturestart','gesturechange','gestureend'])
  document.addEventListener(type,event=>{if(world(event.target))event.preventDefault()},{passive:false,capture:true});
}

export function createPointerJoystick(base,thumb){
 const state={x:0,y:0,pointer:null,release};
 const clamp=v=>Math.max(-1,Math.min(1,v));
 function move(event){
  const rect=base.getBoundingClientRect(),cap=rect.width*.32,
   dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2,
   length=Math.max(1,Math.hypot(dx,dy));
  state.x=clamp(dx/cap);state.y=clamp(dy/cap);
  if(length>cap){state.x=dx/length;state.y=dy/length;}
  thumb.style.transform=`translate(${state.x*cap}px,${state.y*cap}px)`;
 }
 function release(){
  const id=state.pointer;state.pointer=null;state.x=state.y=0;
  thumb.style.transform='translate(0,0)';
  if(id!==null&&base.hasPointerCapture?.(id))base.releasePointerCapture(id);
 }
 base.addEventListener('pointerdown',event=>{
  if(state.pointer!==null||(event.pointerType==='mouse'&&event.button!==0))return;
  event.preventDefault();state.pointer=event.pointerId;base.setPointerCapture(event.pointerId);move(event);
 });
 base.addEventListener('pointermove',event=>{if(state.pointer===event.pointerId){event.preventDefault();move(event)}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])
  base.addEventListener(type,event=>{if(state.pointer===event.pointerId)release()});
 return state;
}
