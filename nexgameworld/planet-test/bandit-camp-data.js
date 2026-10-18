// Bandit camp phase 1: encounter design aligned with the live spherical world.
// Authoritative quest acceptance, kills and rewards remain in server/bandit-quest.js.
import {BANDIT_CAMP as LIVE_CAMP,BANDIT_QUEST_MIN_LEVEL} from './creature-registry.js';
export const BANDIT_CAMP=Object.freeze({
 id:'dust-trail-camp',name:'Лагерь Пыльной тропы',
 center:Object.freeze({...LIVE_CAMP}),unlockLevel:BANDIT_QUEST_MIN_LEVEL,
 patrolRadius:12,leashRadius:19
});
export const BANDIT_PATROLS=Object.freeze([
 Object.freeze({id:'bandit-0',points:Object.freeze([[-40,9],[-37,12],[-40,15]].map(Object.freeze))}),
 Object.freeze({id:'bandit-1',points:Object.freeze([[-46,15],[-44,19],[-48,21]].map(Object.freeze))})
]);
export const BANDIT_EXPANSION=Object.freeze([
 Object.freeze({id:'bandit-recon',title:'Следы разбойников',level:3,objective:'discover',required:1,xp:65}),
 Object.freeze({id:'bandit-supplies',title:'Украденные припасы',level:3,objective:'recover',required:1,xp:90}),
 Object.freeze({id:'bandit-captain',title:'Главарь Пыльной тропы',level:4,objective:'kill',role:'boss',required:1,xp:180})
]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function canAcceptBanditExpansion(level,stage){
 return Number.isInteger(level)&&Number.isInteger(stage)&&stage>=0&&
 stage<BANDIT_EXPANSION.length&&level>=BANDIT_EXPANSION[stage].level;
}
export function nextPatrolPoint(patrol,position,index=0,arrival=1.1){
 const points=patrol?.points;
 if(!Array.isArray(points)||!points.length||!position)return null;
 const i=((Math.trunc(index)%points.length)+points.length)%points.length;
 const next=distance(position,{x:points[i][0],z:points[i][1]})<=arrival?(i+1)%points.length:i;
 return {index:next,target:{x:points[next][0],z:points[next][1]}};
}
export function shouldResetBandit(spawn,position){
 return !spawn||!position||distance(spawn,position)>BANDIT_CAMP.leashRadius;
}
export function applyBanditExpansionEvent(progress,event){
 // Pure reducer only; caller must verify the event server-side and persist it.
 if(!progress||!event||!Number.isInteger(progress.stage))return progress;
 const quest=BANDIT_EXPANSION[progress.stage];
 if(!quest||progress.ready)return progress;
 const matches=quest.objective===event.type&&
  (quest.objective!=='kill'||quest.role===event.role);
 if(!matches)return progress;
 const count=Math.min(quest.required,Math.max(0,progress.count||0)+1);
 return {...progress,count,ready:count>=quest.required};
}
