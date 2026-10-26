// NGW M1.4. The first mount is earned via the forest scout after level 10.
// Sites deliberately reuse two existing wolf-track landmarks: zero new colliders.
import {FOREST_HUNT_SCOUT,FOREST_DEN_SITES} from './forest-hunt-quest.js';
import {readExpedition} from './expedition-quest.js';
export const MOUNT_QUEST_LEVEL=10;
export const MOUNT_QUEST_ID='forest-wolf';
export const MOUNT_QUEST_SCOUT=FOREST_HUNT_SCOUT;
export const MOUNT_QUEST_SITES=FOREST_DEN_SITES;
export const defaultMountQuest=()=>({stage:0,traces:[false,false]});
export function readMountQuest(raw){
 if(!raw||!Number.isInteger(raw.stage)||raw.stage<0||raw.stage>3||
  !Array.isArray(raw.traces)||raw.traces.length!==2||
  raw.traces.some(v=>typeof v!=='boolean'))return defaultMountQuest();
 return {stage:raw.stage,traces:[...raw.traces]};
}
// Available only after protecting the scout's camp, never as an automatic level unlock.
export function mountQuestOffer(state){
 return state?.level>=MOUNT_QUEST_LEVEL&&readExpedition(state?.expedition).stage>=2&&
  state?.forestHunt?.stage===5&&readMountQuest(state?.mountQuest).stage===0&&
  !(Array.isArray(state?.mounts)&&state.mounts.includes('forest_wolf'));
}
export function mountQuestWaypoint(raw){
 const q=readMountQuest(raw);
 if(q.stage===1)return MOUNT_QUEST_SITES.find(p=>!q.traces[p.index])||MOUNT_QUEST_SCOUT;
 if(q.stage===2)return MOUNT_QUEST_SCOUT;
 return null;
}
export function mountQuestJournal(raw,state){
 const q=readMountQuest(raw),offered=mountQuestOffer(state);
 return {id:MOUNT_QUEST_ID,title:'Верность леса',
  status:q.stage===3?'completed':q.stage>=1?'current':offered?'available':'locked',
  progress:q.stage===3?'Лесной волк получен':q.stage===2?'Вернуться к Дальнему Ветру':
   q.stage===1?'Найдено следов '+q.traces.filter(Boolean).length+' / 2':
   offered?'Доступно у следопыта':'Откроется на 10-м уровне после защиты лагеря',
  objective:q.stage===2?'Вернуться к следопыту Дальнему Ветру':
   'Исследовать два волчьих следа в Шепчущем лесу',
  reward:'Ездовой лесной волк · +60% скорости'};
}
