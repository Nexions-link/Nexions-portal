// Tiny HUD summaries. Derived from verified live quest progress and inventory,
// never from map hints or predicted kills.
import {GATHER_QUESTS} from './gather-world.js';
import {BANDIT_QUEST_KILLS} from './creature-registry.js';
import {BANDIT_WEAPON_ITEM,BANDIT_WEAPON_REQUIRED} from './bandit-weapons.js';
import {isAcceptedQuest} from './starter-quest-guidance.js';
import {readExpedition} from './expedition-quest.js';
import {readForestHunt,FOREST_HUNT_KILLS} from './forest-hunt-quest.js';
const amount=(inventory,id)=>(Array.isArray(inventory)?inventory:[])
 .reduce((n,row)=>n+(row?.id===id?Math.max(0,Number(row.qty)||0):0),0);
const bounded=(n,max)=>Math.max(0,Math.min(max,Math.trunc(Number(n)||0)));
const progress=(id,title,verb,done,total,after)=>({
 id,title,detail:verb+' '+bounded(done,total)+' / '+total+
  (done>=total&&after?' · '+after:''),complete:done>=total
});
export function questProgressSummary(id,state,inventory=state?.inventory||[]){
 if(!isAcceptedQuest(id,state))return null;
 if(id==='forest-hunt'){
  const q=readForestHunt(state.forestHunt);
  if(q.stage===1)return progress(id,'Хищники на границе','Убито',q.kills,FOREST_HUNT_KILLS,'Сдать');
  if(q.stage===2)return progress(id,'Хищники на границе','Убито',FOREST_HUNT_KILLS,FOREST_HUNT_KILLS,'Сдать');
  if(q.stage===3)return progress(id,'Следы стаи','Исследовано',q.traces.filter(Boolean).length,2,'Сдать');
  if(q.stage===4)return progress(id,'Следы стаи','Исследовано',2,2,'Сдать');
 }
 if(id==='expedition'){
  const q=readExpedition(state.expedition);
  if(q.stage===1)return {id,title:'За последним холмом',detail:'Найти лагерь разведчиков',complete:false};
  if(q.stage===2)return progress(id,'Лесные ориентиры','Исследовано',q.visited.filter(Boolean).length,3,'Сдать');
  if(q.stage===3)return progress(id,'Лесные ориентиры','Исследовано',3,3,'Сдать');
 }
 const stage=state.quest;
 if(id==='mentor'){
  if(stage===1)return progress(id,'Обряд силы','Убито',state.kills,3,'Сдать');
  if(stage===2)return progress(id,'Обряд силы','Убито',3,3,'Сдать');
  if(stage===4)return {id,title:'Голос предков',detail:'Найти перо',complete:false};
  if(stage===5)return {id,title:'Голос предков',detail:'Перо найдено · Сдать',complete:true};
  if(stage===7)return {id,title:'Следы исполина',detail:'Разведать пастбище',complete:false};
  if(stage===8)return {id,title:'Следы исполина',detail:'Разведка · Сдать',complete:true};
  if(stage===10)return progress(id,'Грозоклюв','Убито',0,1,'Сдать');
  if(stage===11)return progress(id,'Грозоклюв','Убито',1,1,'Сдать');
 }
 if(id==='bandit-trail'){
  const q=state.banditQuest||{};
  return progress(id,'Разведка лагеря','Убито',
   q.stage===2?BANDIT_QUEST_KILLS:q.kills,BANDIT_QUEST_KILLS,'Сдать');
 }
 if(id==='bandit-chief'){
  return progress(id,'Главарь разбойников','Убито',
   state.banditChiefQuest?.stage===2?1:0,1,'Сдать');
 }
 if(id==='bandit-weapons')return progress(id,'Оружие разбойников','Собрано',
  amount(inventory,BANDIT_WEAPON_ITEM),BANDIT_WEAPON_REQUIRED,'Сдать');
 if(/^gather-[1-3]$/.test(id)){
  const q=GATHER_QUESTS[Number(id.slice(-1))];
  return progress(id,q.title,'Собрано',amount(inventory,q.item),q.count,'Сдать');
 }
 return null;
}
export function renderQuestProgressPanel(document,panel,rows){
 if(!panel)return;
 const visible=rows.slice(0,3).filter(Boolean);
 panel.hidden=visible.length===0;
 if(!visible.length){panel.replaceChildren();return;}
 const heading=document.createElement('div');heading.className='ngw-quest-panel-heading';
 heading.textContent='ЗАДАНИЯ  '+visible.length+'/3';
 const list=document.createElement('div');list.className='ngw-quest-panel-list';
 for(const row of visible){
  const item=document.createElement('div');item.className='ngw-quest-panel-item'+(row.complete?' is-complete':'');
  item.dataset.questId=row.id;
  const title=document.createElement('span');title.className='ngw-quest-panel-name';title.textContent=row.title;
  const summary=document.createElement('small');summary.className='ngw-quest-panel-detail';summary.textContent=row.detail;
  item.append(title,summary);list.append(item);
 }
 panel.replaceChildren(heading,list);
}
