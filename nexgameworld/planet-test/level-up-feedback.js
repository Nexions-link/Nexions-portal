// NexGameWorld level-up celebration. Presentation only: no XP, HP or
// combat state is ever mutated by this component.
export function createLevelUpFeedback({document,layer,schedule=setTimeout,cancel=clearTimeout}){
 if(!document||!layer)throw Error('level_up_feedback_layer_missing');
 let current=null,timer=null,latest=0;
 const element=(tag,className,text='')=>{
  const el=document.createElement(tag);
  el.className=className;el.textContent=text;return el;
 };
 function dismiss(){
  if(timer!==null){cancel(timer);timer=null;}
  current?.remove?.();
  layer.replaceChildren();
  current=null;
 }
 function show(level,{unlockedCharge=false}={}){
  if(!Number.isSafeInteger(level)||level<2||level>60)return null;
  // One confirmation can cross several levels; display only the final one.
  // Never celebrate an older/duplicate save from a delayed WebSocket event.
  if(level<=latest)return null;
  latest=level;dismiss();
  const card=element('div','ngw-levelup-card');
  const shine=element('div','ngw-levelup-shine');
  shine.setAttribute('aria-hidden','true');
  const title=element('div','ngw-levelup-title','НОВЫЙ УРОВЕНЬ');
  const number=element('div','ngw-levelup-number',String(level));
  const footer=element('div','ngw-levelup-footer','Здоровье восстановлено');
  const ornaments=element('div','ngw-levelup-ornaments','◆  ✦  ◆');
  ornaments.setAttribute('aria-hidden','true');
  card.append(shine,title,number,ornaments,footer);
  if(unlockedCharge){
   const unlocked=element('div','ngw-levelup-unlock','Открыта способность «Рывок»');
   card.append(unlocked);
  }
  card.setAttribute('role','status');
  card.setAttribute('aria-label','Новый уровень '+level+
   '. Здоровье восстановлено.'+(unlockedCharge?' Открыта способность Рывок.':''));
  layer.append(card);current=card;
  timer=schedule(()=>{if(current===card)dismiss();},2800);
  return card;
 }
 return {show,dismiss};
}
