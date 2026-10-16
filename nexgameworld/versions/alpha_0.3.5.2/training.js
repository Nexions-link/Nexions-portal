// NexGame Alpha 0.3.5.1 — reusable, passive training target combat rules.
// Kept independent of Three.js so future warrior/shaman/hunter skills all use it.
export const TRAINING_DUMMY=Object.freeze({
 id:'trainingDummy',name:'Тренировочный манекен',
 x:-7,z:15,maxHp:99999,resetAfter:3
});
export function createTrainingStats(){
 return {hits:0,totalDamage:0,lastDamage:0,lastAbility:'',startedAt:-1,lastHitAt:-1,restored:true};
}
export function resetTrainingTarget(target){
 target.hp=target.maxHp;
 target.trainingStats=createTrainingStats();
 return target;
}
export function applyTrainingHit(target,amount,now,abilityId='autoAttack'){
 if(!target?.trainingDummy||!Number.isFinite(amount)||amount<=0)return 0;
 const time=Number.isFinite(now)?now:0;
 const previous=target.trainingStats;
 if(!previous||previous.hits===0||time-previous.lastHitAt>=TRAINING_DUMMY.resetAfter){
  resetTrainingTarget(target);
 }
 const stats=target.trainingStats;
 if(stats.hits===0)stats.startedAt=time;
 const actual=Math.min(Math.max(0,target.hp-1),amount);
 target.hp=Math.max(1,target.hp-amount);
 stats.hits++;
 stats.totalDamage+=actual;
 stats.lastDamage=actual;
 stats.lastAbility=abilityId;
 stats.lastHitAt=time;
 stats.restored=false;
 return actual;
}
export function updateTrainingTarget(target,now){
 if(!target?.trainingDummy||!target.trainingStats?.hits)return false;
 const stats=target.trainingStats;
 if(!stats.restored&&Number.isFinite(now)&&now-stats.lastHitAt>=TRAINING_DUMMY.resetAfter){
  target.hp=target.maxHp;
  stats.restored=true;
  return true;
 }
 return false;
}
export function trainingDps(target){
 const s=target?.trainingStats;
 if(!s?.hits)return 0;
 const duration=Math.max(1,s.lastHitAt-s.startedAt);
 return Math.round(s.totalDamage/duration*10)/10;
}
