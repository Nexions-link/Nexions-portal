// One DOM strip in the existing target-status row; no layout measurements,
// independent animation loop, network messages or gameplay-side effects.
export function createTargetAttackHud({document}){
 const frame=document.getElementById('targetAttackCue'),status=document.getElementById('targetStatus');
 const fill=document.getElementById('targetAttackCueFill'),label=document.getElementById('targetAttackCueLabel');
 const time=document.getElementById('targetAttackCueTime');
 let lastPhase=null,lastTransform=null,lastTime=null,lastValue=undefined,lastAria=null;
 function paint(cue){
  if(!frame||!status||!fill||!label||!time)return;
  if(!cue){
   if(lastPhase!==null){
    if(!frame.hidden)frame.hidden=true;if(status.hidden)status.hidden=false;
    frame.setAttribute('data-attack-phase','idle');
    frame.removeAttribute?.('aria-valuenow');frame.setAttribute('aria-valuetext','');
   }
   else if(!frame.hidden){frame.hidden=true;status.hidden=false;}
   lastPhase=null;lastTransform=null;lastTime=null;lastValue=undefined;lastAria=null;
   return;
  }
  if(frame.hidden)frame.hidden=false;if(!status.hidden)status.hidden=true;
  if(lastPhase!==cue.phase){
   label.textContent=cue.phase==='waiting'?'Ожидает удара':'Готовит удар';
   frame.setAttribute('data-attack-phase',cue.phase);
   frame.setAttribute('aria-label','Подготовка удара цели · приблизительно');
   lastPhase=cue.phase;
  }
  const text=cue.phase==='preparing'?'≈'+(Math.ceil(cue.remainingMs/100)/10).toFixed(1).replace('.',',')+' с':'…';
  if(lastTime!==text){time.textContent=text;lastTime=text;}
  const transform=cue.progress===null?'scaleX(1)':'scaleX('+cue.progress.toFixed(3)+')';
  if(lastTransform!==transform){fill.style.transform=transform;lastTransform=transform;}
  const value=cue.progress===null?null:Math.round(cue.progress*100);
  if(lastValue!==value){
   if(value===null)frame.removeAttribute?.('aria-valuenow');
   else frame.setAttribute('aria-valuenow',String(value));
   lastValue=value;
  }
  const aria=cue.phase==='unknown'?'Готовит удар · время неизвестно':
   cue.phase==='waiting'?'Ожидает подтверждения сервера':'Готовит удар · примерно '+text.slice(1);
  if(lastAria!==aria){frame.setAttribute('aria-valuetext',aria);lastAria=aria;}
 }
 return {paint};
}
