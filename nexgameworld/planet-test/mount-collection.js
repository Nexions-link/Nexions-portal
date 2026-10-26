// NexGameWorld M1.5 — presentational mount collection. Entitlement is read-only
// and comes solely from verified character progression on the world server.
// New species only need another catalogue entry, not new UI markup.
import {readMountQuest} from './mount-quest.js';
export const MOUNT_COLLECTION_CATALOG=Object.freeze([
 Object.freeze({
  id:'forest_wolf',name:'Лесной волк',family:'Волки Шепчущего леса',
  icon:'🐺',requiredLevel:10,speedBonus:60,castSeconds:2,
  description:'Верный спутник, приручённый во время путешествия по Шепчущему лесу.',
  acquisition:'Задание «Верность леса» у следопыта Дальнего Ветра'
 })
]);
export function mountCollectionRows(ownedMountIds=[],level=1,mountQuest=null,{
 catalog=MOUNT_COLLECTION_CATALOG
}={}){
 const valid=Array.isArray(ownedMountIds)?ownedMountIds:[];
 const ids=new Set(valid.filter(x=>typeof x==='string'));
 const q=readMountQuest(mountQuest);
 return catalog.map(entry=>({
  ...entry,owned:ids.has(entry.id),
  questStage:entry.id==='forest_wolf'?q.stage:0,
  unlockedByLevel:level>=entry.requiredLevel
 }));
}
export function mountCollectionAction(row,{connected=false,mountState='foot',activeMountId=null}={}){
 if(!row?.owned)return {label:'Не получен',enabled:false,kind:'locked'};
 if(!connected)return {label:'Нет соединения',enabled:false,kind:'offline'};
 const active=activeMountId===row.id;
 if(active&&mountState==='casting')return {label:'Отменить призыв',enabled:true,kind:'dismount'};
 if(active&&mountState==='riding')return {label:'Спешиться',enabled:true,kind:'dismount'};
 if(mountState!=='foot')return {label:'Другой маунт активен',enabled:false,kind:'busy'};
 return {label:'Призвать',enabled:true,kind:'summon'};
}
export function mountCollectionHint(row){
 if(row.owned)return 'Маунт принадлежит этому персонажу и сохранён на сервере.';
 if(!row.unlockedByLevel)return 'Откроется на '+row.requiredLevel+'-м уровне.';
 if(row.questStage===1)return 'Задание принято: изучи два волчьих следа.';
 if(row.questStage===2)return 'Возвращайся к следопыту за наградой.';
 if(row.questStage===3)return 'Награда ещё не подтверждена сервером.';
 return row.acquisition;
}
const element=(document,tag,className,text)=>{
 const node=document.createElement(tag);if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
};
export function renderMountCollection(document,body,{
 ownedMountIds=[],level=1,mountQuest=null,connected=false,mountState='foot',
 activeMountId=null,filter='all',onFilter=()=>{},onToggle=()=>{},onQuest=()=>{}
}={}){
 const rows=mountCollectionRows(ownedMountIds,level,mountQuest);
 const earned=rows.filter(row=>row.owned).length;
 const overview=element(document,'section','ngw-mount-overview');
 overview.append(element(document,'span','ngw-mount-overview-label','КОЛЛЕКЦИЯ ЕЗДОВЫХ ЖИВОТНЫХ'),
  element(document,'strong','ngw-mount-overview-count',earned+' / '+rows.length),
  element(document,'small','ngw-mount-overview-note','Маунты сохраняются отдельно у каждого персонажа.'));
 const tabs=element(document,'div','ngw-mount-filters');
 tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Фильтр коллекции');
 for(const [key,name] of [['all','Все'],['owned','Полученные']]){
  const tab=element(document,'button','ngw-mount-filter'+(filter===key?' is-selected':''),name);
  tab.type='button';tab.setAttribute('aria-pressed',String(filter===key));
  tab.addEventListener('click',()=>onFilter(key));
  tabs.append(tab);
 }
 const grid=element(document,'section','ngw-mount-grid');
 grid.setAttribute('aria-label','Ездовые животные');
 for(const row of rows.filter(row=>filter!=='owned'||row.owned)){
  const item=element(document,'article','ngw-mount-card'+(row.owned?' is-owned':' is-locked'));
  item.dataset.mountId=row.id;
  const portrait=element(document,'div','ngw-mount-portrait');
  const icon=element(document,'span','ngw-mount-portrait-icon',row.icon);
  icon.setAttribute('aria-hidden','true');portrait.append(icon);
  const content=element(document,'div','ngw-mount-details');
  content.append(element(document,'span','ngw-mount-family',row.family),
   element(document,'h3','ngw-mount-name',row.name),
   element(document,'span','ngw-mount-status',row.owned?'Получен':'Не получен'),
   element(document,'p','ngw-mount-description',row.description));
  const specs=element(document,'div','ngw-mount-specs');
  for(const [label,value] of [['Уровень',String(row.requiredLevel)],
   ['Скорость','+'+row.speedBonus+'%'],['Призыв',row.castSeconds+' сек.']]){
   const spec=element(document,'span','ngw-mount-spec');
   spec.append(element(document,'small','',label),element(document,'strong','',value));
   specs.append(spec);
  }
  content.append(specs,element(document,'p','ngw-mount-hint',mountCollectionHint(row)));
  const action=mountCollectionAction(row,{connected,mountState,activeMountId});
  const button=element(document,'button','ngw-mount-primary',action.label);
  button.type='button';button.disabled=!action.enabled;
  button.dataset.action=action.kind;
  button.addEventListener('click',()=>{if(action.enabled)onToggle(row.id,action.kind)});
  const actions=element(document,'div','ngw-mount-actions');actions.append(button);
  if(!row.owned){
   const quest=element(document,'button','ngw-mount-quest','Задание');
   quest.type='button';quest.addEventListener('click',()=>onQuest(row.id));
   actions.append(quest);
  }
  content.append(actions);item.append(portrait,content);grid.append(item);
 }
 if(!grid.children.length)
  grid.append(element(document,'p','ngw-mount-empty','Пока нет полученных маунтов. Найди их задания в журнале.'));
 body.replaceChildren(overview,tabs,grid);
 return {total:rows.length,earned,shown:grid.children.length};
}
