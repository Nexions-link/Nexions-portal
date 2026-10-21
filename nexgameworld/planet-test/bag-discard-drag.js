// Hold-to-drag inventory item. Only release on the free game world beyond
// the floating bag panel is a discard candidate. The caller confirms the
// irreversible action and sends a server-authoritative economy request.
const isFinitePoint=(x,y)=>Number.isFinite(x)&&Number.isFinite(y);
export function isBagWorldDrop(document,panel,x,y,margin=10){
 if(!panel||!document||!isFinitePoint(x,y))return false;
 const box=panel.getBoundingClientRect();
 if(x>=box.left-margin&&x<=box.right+margin&&
    y>=box.top-margin&&y<=box.bottom+margin)return false;
 const node=document.elementFromPoint?.(x,y);
 if(!node)return false;
 return node===document.body||node.id==='viewport'||
  !!node.closest?.('#viewport');
}
export function attachBagDiscardDrag(source,{
 document,panel,item,onDiscard,holdMs=260,
 schedule=(fn,ms)=>setTimeout(fn,ms),unschedule=timer=>clearTimeout(timer)
}){
 let hold=null,suppressClick=false;
 function paint(x,y){
  if(!hold?.dragging)return;
  const free=isBagWorldDrop(document,panel,x,y);
  if(hold.ghost){
   hold.ghost.style.left=x+'px';
   hold.ghost.style.top=y+'px';
   hold.ghost.classList.toggle('is-free',free);
   hold.ghost.textContent=free?'Отпусти — удалить '+item.name:'Перетащи за пределы рюкзака';
  }
  panel.classList.toggle('ngw-bag-discard-ready',free);
 }
 function finish(event,cancel=false){
  if(!hold||event.pointerId!==hold.id)return;
  if(hold.timer!==null)unschedule(hold.timer);
  const dragging=hold.dragging;
  const discard=dragging&&!cancel&&
   isBagWorldDrop(document,panel,event.clientX,event.clientY);
  if(dragging){
   suppressClick=true;
   hold.ghost?.remove?.();
   panel.classList.remove('ngw-bag-discard-ready');
   source.classList.remove('ngw-bag-item-dragging');
  }
  const id=hold.id;
  hold=null;
  if(source.hasPointerCapture?.(id))source.releasePointerCapture(id);
  if(discard)onDiscard(item);
 }
 source.addEventListener('pointerdown',event=>{
  if(hold||event.pointerType==='mouse'&&event.button!==0)return;
  suppressClick=false;
  const startX=event.clientX,startY=event.clientY,id=event.pointerId;
  hold={id,startX,startY,timer:null,dragging:false,ghost:null};
  source.setPointerCapture?.(id);
  hold.timer=schedule(()=>{
   if(!hold||hold.id!==id)return;
   hold.timer=null;hold.dragging=true;
   source.classList.add('ngw-bag-item-dragging');
   const ghost=document.createElement('div');
   ghost.className='ngw-bag-discard-ghost';
   ghost.setAttribute('aria-hidden','true');
   document.body?.appendChild(ghost);
   hold.ghost=ghost;
   paint(startX,startY);
  },holdMs);
 });
 source.addEventListener('pointermove',event=>{
  if(!hold||hold.id!==event.pointerId)return;
  if(!hold.dragging&&hold.timer!==null&&
      Math.hypot(event.clientX-hold.startX,event.clientY-hold.startY)>13){
   unschedule(hold.timer);hold.timer=null;
  }
  if(hold.dragging){event.preventDefault();paint(event.clientX,event.clientY);}
 });
 source.addEventListener('pointerup',event=>finish(event));
 source.addEventListener('pointercancel',event=>finish(event,true));
 source.addEventListener('lostpointercapture',event=>finish(event,true));
 source.addEventListener('click',event=>{
  if(!suppressClick)return;
  suppressClick=false;event.preventDefault();event.stopImmediatePropagation();
 },true);
 source.addEventListener('contextmenu',event=>event.preventDefault());
 return {cancel:()=>{
  if(hold)finish({pointerId:hold.id},true);
 }};
}
