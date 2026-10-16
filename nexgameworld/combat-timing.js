// Synchronize predictive client swings against server-authoritative combat.
// The damage packet fires 340ms into the unchanged 800ms melee animation.
export const MELEE_IMPACT_MS=340;
export const AUTO_SWING_SAFETY_MS=90;
export const AUTO_SWING_ACK_TIMEOUT_MS=3500;
const safe=value=>Number.isFinite(value)?Math.max(0,value):0;
export function createAutoSwingClock(now=()=>performance.now()){
 let awaiting=false,sentAt=0,nextStartAt=0;
 return {
  canStart(){
   if(awaiting&&now()-sentAt>=AUTO_SWING_ACK_TIMEOUT_MS)awaiting=false;
   return !awaiting&&now()>=nextStartAt;
  },
  onSent(){awaiting=true;sentAt=now()},
  onAccepted(cooldownMs){
   awaiting=false;
   if(Number.isFinite(cooldownMs))
    nextStartAt=Math.max(nextStartAt,now()+Math.max(0,safe(cooldownMs)-MELEE_IMPACT_MS)+AUTO_SWING_SAFETY_MS);
  },
  onRejected(retryAfterMs){
   awaiting=false;
   nextStartAt=Math.max(nextStartAt,now()+Math.max(0,safe(retryAfterMs)-MELEE_IMPACT_MS)+AUTO_SWING_SAFETY_MS);
  },
  reset(){awaiting=false;sentAt=0;nextStartAt=0},
  remainingMs(){return Math.max(0,nextStartAt-now())},
  get awaiting(){return awaiting}
 };
}
// Specials obey the 1.5s global cooldown; regular autoattack does not.
export function reconcileAbilityCooldown(runtime,abilityId,cooldownMs,gcdMs){
 if(!runtime||!abilityId||abilityId==='autoAttack')return;
 if(Number.isFinite(cooldownMs)&&cooldownMs>0)
  runtime.cooldowns[abilityId]=Math.max(safe(runtime.cooldowns[abilityId]),cooldownMs/1000);
 if(Number.isFinite(gcdMs)&&gcdMs>0)
  runtime.gcd=Math.max(safe(runtime.gcd),gcdMs/1000);
}
