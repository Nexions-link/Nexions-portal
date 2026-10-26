// NexGameWorld M1.3 — mount HUD. No client-side grant, timer-based mounting or speed changes.
// All state transitions are confirmed by the authoritative spherical world.
export const MOUNT_ERROR_MESSAGES=Object.freeze({
 level:'Ездовые животные доступны с 10-го уровня.',
 not_owned:'Сначала получи ездового волка в задании 10-го уровня.',
 combat:'Нельзя призвать маунта во время боя.',
 water:'В воде нельзя призвать маунта.',
 indoors:'Для призыва маунта выйди из здания или тесного прохода.',
 moving:'Остановись, чтобы призвать маунта.',
 busy:'Призыв уже выполняется.',
 dead:'Нельзя призвать маунта, пока персонаж мёртв.'
});
export const mountCastProgress=(now,startedAt,durationMs)=>{
 if(!Number.isFinite(now)||!Number.isFinite(startedAt)||!Number.isFinite(durationMs)||durationMs<=0)return 0;
 return Math.max(0,Math.min(1,(now-startedAt)/durationMs));
};
export function createMountControls({document,clock=()=>performance.now(),onSummon=()=>false,
 onDismount=()=>false,onNotice=()=>{}}={}){
 const button=document?.getElementById('mountButton');
 const label=document?.getElementById('mountButtonLabel');
 const cast=document?.getElementById('mountCast');
 const fill=document?.getElementById('mountCastFill');
 const time=document?.getElementById('mountCastTime');
 if(!button||!label||!cast||!fill||!time)
  return {setLevel(){},setConnected(){},setMount(){},beginCast(){},reject(){},tick(){},
   cancelForMovement(){},activate(){},dispose(){}};
 let level=1,owned=false,connected=false,state='foot',duration=2000,started=0,requested=false;
 let moveCancelSent=false;
 const render=()=>{
  button.hidden=level<10;
  const casting=state==='casting',riding=state==='riding';
  button.disabled=!connected||level<10;
  button.classList.toggle('is-locked',!owned&&!casting&&!riding);
  button.classList.toggle('is-riding',riding);
  button.classList.toggle('is-casting',casting);
  label.textContent=casting?'Отмена':riding?'Слезть':owned?'Призвать':'Маунт';
  const title=!connected?'Нет связи с игровым сервером':
   casting?'Отменить призыв':riding?'Спешиться':
   owned?'Призвать лесного волка (M)':MOUNT_ERROR_MESSAGES.not_owned;
  button.title=title+' · Удержание — переместить';
  button.setAttribute('aria-label',title+'. Для перемещения удерживайте и перетащите');
  button.setAttribute('aria-pressed',String(riding));
  cast.hidden=!casting;
 };
 const setLevel=value=>{if(Number.isInteger(value)&&value>=1){level=value;render()}};
 const setConnected=value=>{
  connected=value===true;
  if(!connected){state='foot';requested=false;moveCancelSent=false;}
  render();
 };
 const setMount=mount=>{
  if(!mount||typeof mount!=='object')return;
  if(typeof mount.owned==='boolean')owned=mount.owned;
  if(['foot','casting','riding'].includes(mount.mountState)){
   if(state!=='casting'&&mount.mountState==='casting'&&!started)started=clock();
   state=mount.mountState;
   if(state!=='casting'){started=0;requested=false;moveCancelSent=false;}
   else requested=false;
  }
  render();
 };
 const beginCast=event=>{
  duration=Number.isFinite(event?.durationMs)?Math.max(500,Math.min(10000,event.durationMs)):2000;
  started=clock();state='casting';requested=false;moveCancelSent=false;
  render();tick();
 };
 const reject=reason=>{
  requested=false;
  if(state==='casting'){state='foot';started=0;moveCancelSent=false;}
  render();onNotice(MOUNT_ERROR_MESSAGES[reason]||'Не удалось призвать ездовое животное.');
 };
 const activate=()=>{
  if(!connected||level<10)return false;
  if(state==='riding'||state==='casting'){
   if(requested)return false;
   requested=true;
   const sent=onDismount();
   if(sent===false)requested=false;
   return sent!==false;
  }
  if(!owned){onNotice(MOUNT_ERROR_MESSAGES.not_owned);return false;}
  if(requested)return false;
  requested=true;
  const sent=onSummon();
  if(sent===false)requested=false;
  return sent!==false;
 };
 const cancelForMovement=moving=>{
  if(!moving||state!=='casting'||moveCancelSent||!connected)return false;
  moveCancelSent=true;
  return onDismount()!==false;
 };
 const tick=()=>{
  if(state!=='casting'||cast.hidden)return;
  const p=mountCastProgress(clock(),started,duration);
  fill.style.width=(p*100).toFixed(1)+'%';
  cast.setAttribute('aria-valuenow',String(Math.round(p*100)));
  time.textContent=p>=1?'Подтверждение…':((1-p)*duration/1000).toFixed(1)+' с';
 };
 button.addEventListener('click',activate);
 render();
 return {setLevel,setConnected,setMount,beginCast,reject,tick,cancelForMovement,activate,
  dispose:()=>button.removeEventListener('click',activate),
  get state(){return state},get owned(){return owned},get connected(){return connected}};
}
