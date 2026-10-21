// One local animation owns the impact. No overlapping auto/special swings.
export const MELEE_ANIMATION_SECONDS=.8;
export const MELEE_IMPACT_SECONDS=.34;
export const STOMP_ANIMATION_SECONDS=.75;
export const STOMP_IMPACT_SECONDS=.36;
export const MELEE_RANGE=3.45;
export const APPROACH_RANGE=20;
export function rageForHit(skill){
 return skill==='autoAttack'?12:skill==='heavyStrike'?8:skill==='thunderStomp'?3:0;
}
export function rollMeleeDamage(stats,bonus=0,rng=Math.random){
 return Math.round(stats.damageMin+rng()*(stats.damageMax-stats.damageMin))+bonus;
}
export function createCombatTimeline(){
 let current=null;
 return {
  get busy(){return current!==null},
  get current(){return current},
  get attackProgress(){return current&&current.skill!=='thunderStomp'?current.elapsed/MELEE_ANIMATION_SECONDS:-1},
  get stompProgress(){return current?.skill==='thunderStomp'?current.elapsed/STOMP_ANIMATION_SECONDS:-1},
  start(skill,target=null,{visualOnly=false}={}){
   if(current)return false;
   current={skill,target,elapsed:0,impacted:false,visualOnly:!!visualOnly};return true;
  },
  update(dt){
   if(!current)return null;
   current.elapsed+=Math.max(0,Number.isFinite(dt)?dt:0);
   const stomp=current.skill==='thunderStomp';
   let impact=null;
   if(!current.impacted&&current.elapsed>=(stomp?STOMP_IMPACT_SECONDS:MELEE_IMPACT_SECONDS)){
    current.impacted=true;impact={skill:current.skill,target:current.target,...(current.visualOnly?{visualOnly:true}:{})};
   }
   if(current.elapsed>=(stomp?STOMP_ANIMATION_SECONDS:MELEE_ANIMATION_SECONDS))current=null;
   return impact;
  },
  clear(){current=null}
 };
}
