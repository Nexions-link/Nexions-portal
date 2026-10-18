// Authoritative, shared creature catalog. A spawn ID is stable across clients,
// the PvE server, economy storage, XP, target frames, and quest credit.
import {DOLGONOG_LEVELS,DOLGONOG_SPAWNS,DOLGONOG_BOSS_INDEX,
 mobBaseExperience,monsterMaxHealth} from './mob-levels.js';
import {CREATURE_TYPE_BEAST,CREATURE_TYPE_HUMANOID} from './creature-types.js';
export const BANDIT_CAMP=Object.freeze({x:-68,z:2});
export const BANDIT_QUEST_GIVER=Object.freeze({x:-20,z:13,range:4.7});
export const BANDIT_SPAWNS=Object.freeze([[-50,-17],[-73,-18],[-55,15],[-72,33]].map(p=>Object.freeze(p)));
export const BANDIT_BOSS_INDEX=3;
export const BANDIT_BOSS_SCALE=1.35;
export const BANDIT_QUEST_KILLS=3;
export const BANDIT_QUEST_MIN_LEVEL=3;
export const CREATURE_SPAWNS=Object.freeze([
 ...DOLGONOG_SPAWNS.map(([x,z],i)=>Object.freeze({
  id:'dolgonog-'+i,index:i,x,z,
  family:i===DOLGONOG_BOSS_INDEX?'stormbeak':'dolgonog',
  name:i===DOLGONOG_BOSS_INDEX?'Грозоклюв':'Равнинный долгоног',
  level:DOLGONOG_LEVELS[i],boss:i===DOLGONOG_BOSS_INDEX,type:CREATURE_TYPE_BEAST
 })),
 ...BANDIT_SPAWNS.map(([x,z],i)=>Object.freeze({
  id:'bandit-'+i,index:DOLGONOG_SPAWNS.length+i,x,z,
  family:'bandit',name:i===BANDIT_BOSS_INDEX?'Главарь Пыльной тропы':'Разбойник Пыльной тропы',
  level:i===BANDIT_BOSS_INDEX?5:i===2?3:2,boss:i===BANDIT_BOSS_INDEX,type:CREATURE_TYPE_HUMANOID
 }))
]);
const BY_ID=new Map(CREATURE_SPAWNS.map(m=>[m.id,m]));
export const creatureById=id=>BY_ID.get(id)||null;
export const creatureByIndex=index=>CREATURE_SPAWNS[index]||null;
export const creatureKillReward=mob=>({
 xp:mobBaseExperience(mob.level,mob.boss),gold:0,
 level:mob.level,type:mob.type,lootTable:mob.family
});
export const creatureSpawnHealth=mob=>mob.family==='bandit'?(64+(mob.level-2)*14)*(mob.boss?2:1):
 monsterMaxHealth(mob.level,mob.boss);
