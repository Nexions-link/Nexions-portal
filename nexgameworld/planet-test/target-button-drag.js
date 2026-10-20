// Dragging an active combat control must never change targeting on a normal tap.
// User preference is device-local, not bound to a character/server position.
export const TARGET_POSITION_KEY='ngw-target-button-position-v1';
const margin=8;
const limit=(value,min,max)=>Math.min(max,Math.max(min,value));
export function targetButtonBounds(viewport,button,insets={}){
 const width=Math.max(1,Number(viewport?.width)||1),height=Math.max(1,Number(viewport?.height)||1);
 const bw=Math.max(1,Number(button?.width)||1),bh=Math.max(1,Number(button?.height)||1);
 const left=margin+Math.max(0,Number(insets.left)||0),top=margin+Math.max(0,Number(insets.top)||0);
 const right=Math.max(left,width-bw-margin-Math.max(0,Number(insets.right)||0));
 const bottom=Math.max(top,height-bh-margin-Math.max(0,Number(insets.bottom)||0));
 return {left,top,right,bottom};
}
export function clampTargetPoint(point,bounds){
 return {x:limit(Number(point.x)||0,bounds.left,bounds.right),
  y:limit(Number(point.y)||0,bounds.top,bounds.bottom)};
}
export function normalizeTargetPoint(point,bounds){
 const pos=clampTargetPoint(point,bounds);
 return {x:bounds.right>bounds.left?(pos.x-bounds.left)/(bounds.right-bounds.left):0,
  y:bounds.bottom>bounds.top?(pos.y-bounds.top)/(bounds.bottom-bounds.top):0};
}
export function restoreTargetPoint(value,bounds){
 if(!value||typeof value!=='object'||!Number.isFinite(value.x)||!Number.isFinite(value.y)||
    value.x<0||value.x>1||value.y<0||value.y>1)return null;
 return clampTargetPoint({
  x:bounds.left+value.x*(bounds.right-bounds.left),
  y:bounds.top+value.y*(bounds.bottom-bounds.top)
 },bounds);
}
function browserSafeInsets(document,win){
 const probe=document.createElement('div');
 probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px)';
 document.body.appendChild(probe);
 const css=win.getComputedStyle(probe);
 const result={top:parseFloat(css.paddingTop)||0,right:parseFloat(css.paddingRight)||0,
  bottom:parseFloat(css.paddingBottom)||0,left:parseFloat(css.paddingLeft)||0};
 probe.remove();return result;
}
export function installDraggableTargetButton(button,{
 window:win=window,document=win.document,storage=win.localStorage,
 holdMs=430,schedule=(fn,delay)=>setTimeout(fn,delay),unschedule=id=>clearTimeout(id),
 safeInsets=null
}={}){
 if(!button)return null;
 let press=null,suppressClick=false,floating=false,size=null;
 const insets=safeInsets||browserSafeInsets(document,win);
 const viewport=()=>({width:document.documentElement.clientWidth||win.innerWidth,
  height:document.documentElement.clientHeight||win.innerHeight});
 const dimensions=()=>size||{width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height};
 const bounds=()=>targetButtonBounds(viewport(),dimensions(),insets);
 const stored=()=>{
  try{return JSON.parse(storage?.getItem(TARGET_POSITION_KEY)||'null')}catch{return null}
 };
 const apply=(point)=>{
  const pos=clampTargetPoint(point,bounds());
  button.classList.add('is-floating');
  button.style.left=pos.x+'px';button.style.top=pos.y+'px';
  button.style.right='auto';button.style.bottom='auto';
  floating=true;return pos;
 };
 const restore=()=>{
  const point=restoreTargetPoint(stored(),bounds());
  if(point)apply(point);
  else{
   button.classList.remove('is-floating');
   button.style.left='';button.style.top='';button.style.right='';button.style.bottom='';
   floating=false;
  }
 };
 function release(event,cancelled=false){
  if(!press||press.id!==event.pointerId)return;
  if(press.timer!==null)unschedule(press.timer);
  if(press.dragging){
   suppressClick=true;
   if(!cancelled){
    const rect=button.getBoundingClientRect();
    const x=parseFloat(button.style.left),y=parseFloat(button.style.top);
    const location=normalizeTargetPoint({
     x:Number.isFinite(x)?x:rect.left,y:Number.isFinite(y)?y:rect.top
    },bounds());
    try{storage?.setItem(TARGET_POSITION_KEY,JSON.stringify(location))}catch{}
   }else restore();
  }
  button.dataset.targetDragging='false';
  button.classList.remove('is-dragging');
  const id=press.id;press=null;
  if(button.hasPointerCapture?.(id))button.releasePointerCapture(id);
 }
 button.addEventListener('pointerdown',event=>{
  if(press||(event.pointerType==='mouse'&&event.button!==0))return;
  suppressClick=false;
  const rect=button.getBoundingClientRect();
  size={width:rect.width,height:rect.height};
  press={id:event.pointerId,x:event.clientX,y:event.clientY,originX:rect.left,originY:rect.top,
   timer:null,dragging:false};
  button.setPointerCapture?.(event.pointerId);
  const id=event.pointerId;
  press.timer=schedule(()=>{
   if(!press||press.id!==id)return;
   press.timer=null;press.dragging=true;
   button.dataset.targetDragging='true';
   button.classList.add('is-dragging');
   apply({x:press.originX,y:press.originY});
  },holdMs);
 });
 button.addEventListener('pointermove',event=>{
  if(!press||press.id!==event.pointerId)return;
  const dx=event.clientX-press.x,dy=event.clientY-press.y;
  if(!press.dragging){
   // Gestures before the hold threshold are not drags.
   if(Math.hypot(dx,dy)>12&&press.timer!==null){unschedule(press.timer);press.timer=null}
   return;
  }
  event.preventDefault();
  apply({x:press.originX+dx,y:press.originY+dy});
 });
 button.addEventListener('pointerup',event=>release(event));
 button.addEventListener('pointercancel',event=>release(event,true));
 button.addEventListener('lostpointercapture',event=>release(event,true));
 button.addEventListener('contextmenu',event=>event.preventDefault());
 // Native click after dragging is not a target-selection action; preserve taps/keyboard clicks.
 button.addEventListener('click',event=>{
  if(!suppressClick)return;
  suppressClick=false;event.preventDefault();event.stopImmediatePropagation();
 },true);
 const onResize=()=>{if(!press&&floating)restore()};
 win.addEventListener('resize',onResize);
 win.addEventListener('orientationchange',onResize);
 restore();
 return {reset:()=>{try{storage?.removeItem(TARGET_POSITION_KEY)}catch{}restore()},
  restore};
}
