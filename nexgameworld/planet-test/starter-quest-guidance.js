// Client-only wayfinding. All quest state and rewards remain authoritative on
// the server; waypoints never mutate objectives or certify interactions.
import {DOLGONOG_SPAWNS,DOLGONOG_BOSS_INDEX} from './mob-levels.js';
import {GATHER_QUESTS} from './gather-world.js';
import {BANDIT_SPAWNS,BANDIT_QUEST_GIVER,BANDIT_QUEST_MIN_LEVEL} from './creature-registry.js';
import {BANDIT_WEAPON_LOCATIONS,BANDIT_WEAPON_ITEM,BANDIT_WEAPON_REQUIRED} from './bandit-weapons.js';
import {RELIC_POSITION,SCOUT_POSITION,BOSS_POSITION} from './mentor-chain.js';
export const QUEST_GIVERS=Object.freeze({
 mentor:Object.freeze({x:-1.5,z:-5}),herbalist:Object.freeze({x:8,z:1}),
 bandit:BANDIT_QUEST_GIVER
});
const arrived=(label,point)=>({title:label,x:point.x,z:point.z});
const count=(inventory,id)=>Array.isArray(inventory)?
 inventory.reduce((n,row)=>n+(row?.id===id?row.qty||0:0),0):0;
const closest=(points,position)=>{
 let chosen=null,best=Infinity;
 for(const p of points){
  const x=Array.isArray(p)?p[0]:p.x,z=Array.isArray(p)?p[1]:p.z;
  const distance=(x-position.x)**2+(z-position.z)**2;
  if(distance<best){best=distance;chosen={x,z};}
 }
 return chosen;
};
export function questWaypoint(id,state,inventory=[],position={x:0,z:0}){
 const mentor=state.quest,bandit=state.banditQuest?.stage??0;
 const weapons=state.banditWeaponsQuest?.stage??(state.banditChiefQuest?.stage>0?2:0);
 const chief=state.banditChiefQuest?.stage??0;
 if(id==='mentor'){
  if(mentor===12)return null;
  if([0,2,3,5,6,8,9,11].includes(mentor))
   return arrived('Наставник Каменный Рог',QUEST_GIVERS.mentor);
  if(mentor===1)return arrived('Равнинные долгоноги',
   closest(DOLGONOG_SPAWNS.slice(0,DOLGONOG_BOSS_INDEX),position));
  if(mentor===4)return arrived('Перо у восточного тотема',RELIC_POSITION);
  if(mentor===7)return arrived('Каменная развилка',SCOUT_POSITION);
  if(mentor===10)return arrived('Грозоклюв',BOSS_POSITION);
 }
 if(/^gather-[1-3]$/.test(id)){
  const questIndex=Number(id.slice(-1)),current=state.gatherStage??0;
  if(current>questIndex||current<questIndex&&!(current===0&&questIndex===1))return null;
  if(current<questIndex||state.gatherAvailable)
   return arrived('Травница Тихая Заря',QUEST_GIVERS.herbalist);
  const q=GATHER_QUESTS[questIndex];
  if(count(inventory,q.item)>=q.count)
   return arrived('Сдать растения травнице',QUEST_GIVERS.herbalist);
  return arrived(q.title,closest(q.locations,position));
 }
 if(id==='bandit-trail'){
  if(bandit===3)return null;
  if(bandit===0||bandit===2)
   return state.level<BANDIT_QUEST_MIN_LEVEL?null:
    arrived('Следопыт Медная Стрела',QUEST_GIVERS.bandit);
  return arrived('Лагерь разбойников',closest(BANDIT_SPAWNS.slice(0,-1),position));
 }
 if(id==='bandit-weapons'){
  if(bandit!==3||weapons===2)return null;
  if(weapons===0||count(inventory,BANDIT_WEAPON_ITEM)>=BANDIT_WEAPON_REQUIRED)
   return arrived('Следопыт Медная Стрела',QUEST_GIVERS.bandit);
  return arrived('Кинжалы у лагеря',closest(BANDIT_WEAPON_LOCATIONS,position));
 }
 if(id==='bandit-chief'){
  if(bandit!==3||weapons!==2||chief===3||chief===0&&state.level<4)return null;
  if(chief===0||chief===2)return arrived('Следопыт Медная Стрела',QUEST_GIVERS.bandit);
  return arrived('Главарь Пыльной тропы',BANDIT_SPAWNS[BANDIT_SPAWNS.length-1]
    ?{x:BANDIT_SPAWNS.at(-1)[0],z:BANDIT_SPAWNS.at(-1)[1]}:QUEST_GIVERS.bandit);
 }
 return null;
}
export function questDirection(point,position){
 if(!point||!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return null;
 const dx=point.x-position.x,dz=point.z-position.z;
 const distance=Math.round(Math.hypot(dx,dz));
 // The small spherical starter zone uses positive z for north and x for east.
 const azimuth=Math.atan2(dx,dz)*180/Math.PI;
 const sectors=['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ'];
 const compass=sectors[Math.round(((azimuth+360)%360)/45)%8];
 return {distance,compass,description:distance<=4?'Рядом · '+point.title:
  point.title+' · '+compass+' · ~'+distance+' м'};
}
export function preferredQuestId(state,inventory=[]){
 const b=state.banditQuest?.stage??0,w=state.banditWeaponsQuest?.stage??0,
  chief=state.banditChiefQuest?.stage??0;
 if(chief>0&&chief<3)return 'bandit-chief';
 if(b===3&&w===1)return 'bandit-weapons';
 if(b>0&&b<3)return 'bandit-trail';
 if(state.gatherStage>=1&&state.gatherStage<=3&&!state.gatherAvailable)
  return 'gather-'+state.gatherStage;
 if(state.quest<12)return 'mentor';
 if(chief===0&&b===3&&w===2&&state.level>=4)return 'bandit-chief';
 if(b===3&&w===0)return 'bandit-weapons';
 if(b===0&&state.level>=BANDIT_QUEST_MIN_LEVEL)return 'bandit-trail';
 if(state.gatherStage===0)return 'gather-1';
 return null;
}
