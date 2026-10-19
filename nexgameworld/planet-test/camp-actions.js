// Standalone offline port of NexGame's herbalist, harvesting and house-chest
// gameplay. All quest parameters and locations are shared with gather-world.js,
// and progress is stored only in the isolated Planet Test save.
import {GATHER_QUESTS,GATHER_INTERACT_RANGE,GATHER_CAST_SECONDS,GATHER_RESPAWN_SECONDS,OFFLINE_CHEST} from './gather-world.js?v=18';
import {ITEM_CATALOG,itemStackLimit} from '../items.js?v=0.3.5.17';
const $=id=>document.getElementById(id);
export function createCampActions({state,herbalist,gathering,mobs,hero,distance,addItem,takeItem,itemCount,
 persist,levelCheck,draw,openWindow,closeWindow,msg,getClock}){
 const {nodes,chest}=gathering;
 let cast=null,lootNode=null;
 const available=node=>{
  const q=GATHER_QUESTS[state.gatherStage];
  return !!q&&!state.gatherAvailable&&node.stage===state.gatherStage&&
   (node.pending||(itemCount(q.item)<q.count&&getClock()>=node.readyAt));
 };
 const gatherCount=(stage=state.gatherStage)=>GATHER_QUESTS[stage]?itemCount(GATHER_QUESTS[stage].item):0;
 const fighting=()=>mobs.some(m=>m.aggro&&!m.dead&&m.root.visible&&distance(m)<11);
 function cancel(message=''){
  if(!cast)return;
  cast=null;$('gatherCast').hidden=true;$('gatherCastFill').style.width='0%';
  if(message)msg(message);
 }
 function begin(node){
  if(!available(node))return msg('Сейчас собрать этот ресурс нельзя');
  if(distance(node)>GATHER_INTERACT_RANGE)return msg('Подойди ближе к растению');
  if(fighting())return msg('Нельзя собирать во время боя');
  if(node.pending){lootNode=node;openWindow('gatherLoot');return;}
  cast={node,elapsed:0,hp:state.hp,position:hero.root.position.clone()};
  $('gatherCast').hidden=false;
  $('gatherCastLabel').textContent='Сбор: '+ITEM_CATALOG[node.item].name;
  $('gatherCastTime').textContent='1,5 с';$('gatherCastFill').style.width='0%';
  $('gatherCast').setAttribute('aria-valuenow','0');
 }
 function fits(rows,capacity,id,qty){
  let space=(capacity-rows.length)*itemStackLimit(id);
  for(const row of rows)if(row.id===id)space+=itemStackLimit(id)-row.qty;
  return space>=qty;
 }
 function deposit(from,to,maxSlots,i){
  const row=from[i];if(!row||!fits(to,maxSlots,row.id,row.qty))return msg('Недостаточно места');
  let qty=row.qty,cap=itemStackLimit(row.id);
  for(const target of to)if(target.id===row.id&&target.qty<cap){
   const n=Math.min(qty,cap-target.qty);target.qty+=n;qty-=n;
  }
  while(qty>0){const n=Math.min(qty,cap);to.push({id:row.id,qty:n});qty-=n;}
  from.splice(i,1);persist();draw();
 }
 function accept(){
  if(state.gatherStage===0)state.gatherStage=1;
  else if(!(state.gatherAvailable&&state.gatherStage<=3))return;
  state.gatherAvailable=false;persist();closeWindow();draw();
  msg('Новое задание: '+GATHER_QUESTS[state.gatherStage].title);
 }
 function turnIn(){
  const stage=state.gatherStage,q=GATHER_QUESTS[stage];
  if(!q||state.gatherAvailable||gatherCount()<q.count)return msg('Сначала собери все ингредиенты');
  if(!takeItem(q.item,q.count))return msg('Ингредиентов не хватает');
  state.gold+=q.gold;state.xp+=q.xp;levelCheck();
  state.gatherStage=stage+1;state.gatherAvailable=stage<3;
  persist();closeWindow();draw();
  msg(stage===3?'«Дары Мулгора» завершены!':'Сбор выполнен! У травницы есть новое поручение.');
 }
 function takeLoot(){
  const node=lootNode;
  if(!node?.pending||!available(node)||distance(node)>GATHER_INTERACT_RANGE)return msg('Слишком далеко от ресурса');
  if(!fits(state.inventory,12,node.item,1))return msg('В рюкзаке нет места. Вернись позже.');
  addItem(node.item,1);node.pending=false;node.readyAt=getClock()+GATHER_RESPAWN_SECONDS;
  lootNode=null;persist();closeWindow();draw();
  msg('Получено: '+ITEM_CATALOG[node.item].name+
    (GATHER_QUESTS[state.gatherStage]&&gatherCount()>=GATHER_QUESTS[state.gatherStage].count?' · Возвращайся к Тихой Заре!':''));
 }
 function interact(entity){
  if(entity?.kind==='herbalist'){openWindow('herbalist');return true;}
  if(entity?.kind==='chest'){openWindow('chest');return true;}
  if(entity?.kind==='gather'){begin(entity);return true;}
  return false;
 }
 function render(kind,body,line){
  if(kind==='herbalist'){
   const stage=state.gatherStage,q=GATHER_QUESTS[stage];
   line('Травница Тихая Заря','Цепочка «Дары Мулгора» · три задания');
   if(stage===0){
    line('Цветы равнин','Собери 4 луговых цветка вокруг лагеря. Сбор занимает 1,5 секунды.',
      [['Принять',accept]]);
   }else if(stage===4)line('Дары Мулгора','Все три поручения завершены. Спасибо за помощь!');
   else if(state.gatherAvailable)
    line(q.title,q.intro+' · '+q.hint,[['Принять',accept]]);
   else{
    line(q.title,'Собрано '+gatherCount()+' / '+q.count+'. '+q.hint+
     ' Награда: '+q.gold+' монет и '+q.xp+' опыта.',
     gatherCount()>=q.count?[['Сдать',turnIn]]:[]);
   }
   line('Лечебный настой','Восстанавливает 55 HP · стоимость 10 монет',[
     ['Купить',()=>{if(state.gold<10)return msg('Недостаточно монет');
       if(!fits(state.inventory,12,'healingPotion',1))return msg('Рюкзак заполнен');
       state.gold-=10;addItem('healingPotion',1);persist();draw();msg('Настой куплен');}]
   ]);
   return true;
  }
  if(kind==='gatherLoot'){
   if(!lootNode?.pending){line('Пусто','Собранный ресурс уже забрали');return true;}
   const def=ITEM_CATALOG[lootNode.item];
   line('🌿 Собранный ресурс','Забери предмет в рюкзак. Если нет места, освободи сумку и вернись.');
   line((def.icon||'🌼')+' '+def.name+' ×1','Добыча с земли',[['Забрать',takeLoot]]);
   return true;
  }
  if(kind==='chest'){
   line('Сундук в большом доме','18 ячеек · офлайн-хранилище этого персонажа');
   const container=document.createElement('div');container.className='inventory-grid';
   body.append(container);
   for(let i=0;i<OFFLINE_CHEST.slots;i++){
    const row=state.chestInventory[i],def=row?ITEM_CATALOG[row.id]:null;
    const cell=document.createElement('button');cell.type='button';cell.className='inventory-slot '+(row?'occupied':'empty');
    if(row){
     const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=def?.icon||'📦';
     const count=document.createElement('span');count.className='slot-count';count.textContent=row.qty>1?row.qty:'';
     cell.append(icon,count);cell.setAttribute('aria-label','Забрать '+(def?.name||'предмет')+' ×'+row.qty);
     cell.addEventListener('click',()=>{deposit(state.chestInventory,state.inventory,12,i);openWindow('chest');});
    }else{cell.textContent='·';cell.setAttribute('aria-label','Пустая ячейка '+(i+1));}
    container.append(cell);
   }
   line('Переложить из рюкзака','Нажми на предмет, чтобы убрать его в сундук');
   const inventory=document.createElement('div');inventory.className='inventory-grid';body.append(inventory);
   for(let i=0;i<state.inventory.length;i++){
    const entry=state.inventory[i],def=ITEM_CATALOG[entry.id];
    const cell=document.createElement('button');cell.type='button';cell.className='inventory-slot occupied';
    cell.textContent=(def?.icon||'📦')+' '+(entry.qty>1?'×'+entry.qty:'');
    cell.title='Положить '+(def?.name||entry.id);
    cell.addEventListener('click',()=>{deposit(state.inventory,state.chestInventory,OFFLINE_CHEST.slots,i);openWindow('chest');});
    inventory.append(cell);
   }
   return true;
  }
  return false;
 }
 function update(dt){
  const now=getClock();
  // Spherical distance controls visuals only; interaction range is unchanged.
  gathering.update(now,available,distance);
  const stage=state.gatherStage,q=GATHER_QUESTS[stage],count=gatherCount();
  const ready=stage===0||(state.gatherAvailable&&stage<=3);
  const complete=q&&!state.gatherAvailable&&count>=q.count;
  // Quest punctuation matches the main game's ! and ? convention.
  // Preserve NPC names; quest glyphs are separate sprites.
  for(const marker of herbalist.root.children){
   if(!marker.userData.questMarker)continue;
   marker.visible=(ready&&marker.userData.glyph==='!')||
     (complete&&marker.userData.glyph==='?')||
     (!ready&&!complete&&stage>0&&stage<=3&&marker.userData.glyph==='·');
  }
  const tracker=$('gatherQuestTracker');
  if(tracker){
   tracker.hidden=stage===0||stage>=4||state.gatherAvailable;
   if(!tracker.hidden){
    $('gatherQuestStage').textContent='Сбор · '+stage+' / 3';
    $('gatherQuestTitle').textContent=q.title;
    $('gatherQuestText').textContent=(complete?'Собрано! Возвращайся к Тихой Заре.':q.hint)+' '+count+' / '+q.count;
   }
  }
  if(!cast)return;
  const {node,hp,position}=cast;
  if(!available(node)||distance(node)>GATHER_INTERACT_RANGE||fighting()||state.hp<hp||
     hero.root.position.distanceToSquared(position)>.14*.14){
   cancel('Сбор прерван');return;
  }
  cast.elapsed=Math.min(GATHER_CAST_SECONDS,cast.elapsed+dt);
  const percent=cast.elapsed/GATHER_CAST_SECONDS*100;
  $('gatherCastFill').style.width=percent.toFixed(1)+'%';
  $('gatherCastTime').textContent=Math.max(0,GATHER_CAST_SECONDS-cast.elapsed).toFixed(1).replace('.',',')+' с';
  $('gatherCast').setAttribute('aria-valuenow',String(Math.round(percent)));
  // The main character animation owns this cast pose. Directly rotating
  // hip joints here was overwritten by the frame-by-frame walking animation.
  if(cast.elapsed>=GATHER_CAST_SECONDS){
   cast=null;$('gatherCast').hidden=true;node.pending=true;lootNode=node;openWindow('gatherLoot');
  }
 }
 return {interact,render,update,cancel,available,
  setVisualQuality(value){gathering.setVisualQuality(value);},
  get casting(){return !!cast},
  get gatherCount(){return gatherCount()},
  get chest(){return chest}};
}
