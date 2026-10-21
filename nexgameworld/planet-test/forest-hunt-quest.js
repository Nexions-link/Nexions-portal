// Character-specific side quest, shared by browser and server. No scene colliders.
import {FOREST_WOLF_SPAWNS} from './forest-wolf-spawns.js';
import {FOREST_CAMP,FOREST_SITE_CLEARINGS,forestDistance,forestTrailLatitude,forestLocalPoint} from './whispering-forest.js';
import {canWalkCamp} from './sphere-physics.js';
import {EXPEDITION_SCOUT,readExpedition} from './expedition-quest.js';
export const FOREST_HUNT_LEVEL=5,FOREST_HUNT_KILLS=3;
export const FOREST_HUNT_REWARD=Object.freeze({xp:210,gold:42});
export const FOREST_HUNT_SCOUT=EXPEDITION_SCOUT;
export const FOREST_DEN_SITES=Object.freeze([2,4].map((wolfId,index)=>{
 const wolf=FOREST_WOLF_SPAWNS[wolfId];
 for(let k=0;k<150;k++){
  const lon=wolf.lon+(k%15-7)*.011;
  const lat=wolf.lat+(index===0?1:-1)*(.052+Math.floor(k/15)*.010);
  const point=forestLocalPoint(lon,lat);
  if(Math.abs(lat-forestTrailLatitude(lon))*261<16||
   forestDistance(lon,lat,FOREST_CAMP.lon,FOREST_CAMP.lat)<30||
   FOREST_SITE_CLEARINGS.some(p=>forestDistance(lon,lat,p.lon,p.lat)<13)||
   !canWalkCamp(point.x,point.z,2.3,261))continue;
  return Object.freeze({...point,lon,lat,index,range:3.9,
   title:index===0?'Волчьи следы у дуба':'Заброшенное волчье логово'});
 }
 throw Error('forest_den_blocked_'+index);
}));
export const emptyForestHunt=()=>({stage:0,kills:0,traces:[false,false]});
export function readForestHunt(q){
 if(!q||!Number.isInteger(q.stage)||q.stage<0||q.stage>5||
  !Number.isInteger(q.kills)||q.kills<0||q.kills>FOREST_HUNT_KILLS||
  !Array.isArray(q.traces)||q.traces.length!==2||q.traces.some(x=>typeof x!=='boolean'))
  return emptyForestHunt();
 return {stage:q.stage,kills:q.kills,traces:[...q.traces]};
}
export function forestHuntAvailable(state){
 return state?.level>=FOREST_HUNT_LEVEL&&readExpedition(state?.expedition).stage>=2;
}
export function forestHuntJournal(raw,state){
 const q=readForestHunt(raw);
 return {id:'forest-hunt',
  title:['Тени между стволами','Хищники на границе','Следы стаи',
   'Чужая территория','Донесение разведчика','Тихая стоянка'][q.stage],
  status:q.stage===5?'completed':q.stage===0?
    (forestHuntAvailable(state)?'available':'locked'):'current',
  progress:q.stage===0?'Доступно у следопыта':
    q.stage===1?'Убито '+q.kills+' / 3':
    q.stage===2?'Вернуться к следопыту':
    q.stage===3?'Осмотрено '+q.traces.filter(Boolean).length+' / 2':
    q.stage===4?'Сдать донесение':'Лагерь укреплён',
  objective:q.stage===1?'Победить трёх лесных волков':
    q.stage===3?'Осмотреть два следа логова':'Помочь укрепить лесную стоянку'};
}
export function forestHuntNextPoint(raw){
 const q=readForestHunt(raw);
 if(q.stage===1)return FOREST_WOLF_SPAWNS[2];
 if(q.stage===3)return FOREST_DEN_SITES.find(p=>!q.traces[p.index])||FOREST_HUNT_SCOUT;
 return FOREST_HUNT_SCOUT;
}
