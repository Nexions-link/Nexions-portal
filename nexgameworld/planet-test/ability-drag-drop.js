// Shared drag/drop logic for the book popover and eight hotbar slots.
// Actual assignment remains in the RPG state/server hotbarSet action.
export function hotbarSlotAtPoint(buttons,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return -1;
 for(const [index,button] of Array.from(buttons).entries()){
  if(!button)continue;
  const r=button.getBoundingClientRect();
  if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return index;
 }
 return -1;
}
export function withinRect(node,x,y){
 if(!node||node.hidden)return false;
 const r=node.getBoundingClientRect();
 return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}
// Pointer capture is necessary on iOS: the touch starts in the popover but
// ends on the hotbar underneath. Only a deliberate hold triggers a drop.
export function attachAbilityDrag(source,{
 document,hotbar,entry,onDrop,trash=null,onDiscard=null,holdMs=280,
 schedule=(fn,ms)=>setTimeout(fn,ms),unschedule=timer=>clearTimeout(timer)
}){
 let press=null,suppressClick=false;
 const update=event=>{
  if(!press?.dragging)return;
  event.preventDefault();
  if(press.ghost){
   press.ghost.style.left=event.clientX+'px';press.ghost.style.top=event.clientY+'px';
  }
  const hovered=hotbarSlotAtPoint(hotbar.children,event.clientX,event.clientY);
  for(const [i,button] of Array.from(hotbar.children).entries())
   button.classList.toggle('ngw-drop-target',i===hovered);
  trash?.classList.toggle('ngw-drop-target',hovered<0&&withinRect(trash,event.clientX,event.clientY));
 };
 const finish=(event,cancelled=false)=>{
  if(!press||press.id!==event.pointerId)return;
  if(press.timer!==null)unschedule(press.timer);
  const dragging=press.dragging;
  if(dragging){
   suppressClick=true;
   if(!cancelled){
    const slot=hotbarSlotAtPoint(hotbar.children,event.clientX,event.clientY);
    if(slot>=0)onDrop(slot,entry);
    else if(withinRect(trash,event.clientX,event.clientY))onDiscard?.();
   }
   press.ghost?.remove?.();
   for(const button of hotbar.children)button.classList.remove('ngw-drop-target','ngw-drop-eligible');
   trash?.classList.remove('ngw-drop-target');
  }
  source.classList.remove('ngw-source-dragging');
  source.dataset.spellDragging='false';
  const pointer=press.id;press=null;
  if(source.hasPointerCapture?.(pointer))source.releasePointerCapture(pointer);
 };
 source.addEventListener('pointerdown',event=>{
  if(press||(event.pointerType==='mouse'&&event.button!==0))return;
  suppressClick=false;
  press={id:event.pointerId,x:event.clientX,y:event.clientY,timer:null,dragging:false,ghost:null};
  source.setPointerCapture?.(event.pointerId);
  const id=event.pointerId;
  press.timer=schedule(()=>{
   if(!press||press.id!==id)return;
   press.timer=null;
   press.dragging=true;
   source.dataset.spellDragging='true';
   source.classList.add('ngw-source-dragging');
   const ghost=document.createElement('div');ghost.className='ngw-ability-drag-ghost';
   ghost.textContent=entry.name||entry.id||'Умение';
   ghost.style.left=press.x+'px';ghost.style.top=press.y+'px';
   document.body?.appendChild(ghost);press.ghost=ghost;
   for(const node of hotbar.children)node.classList.add('ngw-drop-eligible');
  },holdMs);
 });
 source.addEventListener('pointermove',event=>{
  if(!press||press.id!==event.pointerId)return;
  if(!press.dragging&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>13&&press.timer!==null){
   // Do not hijack page scroll or swipes before the long press.
   unschedule(press.timer);press.timer=null;
  }
  update(event);
 });
 source.addEventListener('pointerup',event=>finish(event));
 source.addEventListener('pointercancel',event=>finish(event,true));
 source.addEventListener('lostpointercapture',event=>finish(event,true));
 source.addEventListener('click',event=>{
  if(!suppressClick)return;
  suppressClick=false;event.preventDefault();event.stopImmediatePropagation();
 },true);
 source.addEventListener('contextmenu',event=>event.preventDefault());
 return {cancel:()=>{if(press)finish({pointerId:press.id},true)}};
}
