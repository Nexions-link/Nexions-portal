// Cosmetic shadow-map cadence, independent of physics, controls and combat.
// Keep the same map resolution, but decouple shadow cost from 60/90/120 Hz
// beauty rendering. This never changes simulation or camera timing.
export const BALANCED_SHADOW_HZ=20;
export const HIGH_SHADOW_HZ=30;
export function createShadowRefreshBudget(){
 let accumulator=0,wasEnabled=false,previousQuality=null;
 return {
  next(dt,{enabled,quality='balanced'}={}){
   if(!enabled){
    accumulator=0;wasEnabled=false;previousQuality=quality;
    return false;
   }
   const changed=!wasEnabled||previousQuality!==quality;
   wasEnabled=true;previousQuality=quality;
   if(changed){accumulator=0;return true;}
   if(!Number.isFinite(dt)||dt<=0)return false;
   accumulator+=Math.min(dt,.1);
   const interval=1/(quality==='high'?HIGH_SHADOW_HZ:BALANCED_SHADOW_HZ);
   if(accumulator+1e-9<interval)return false;
   accumulator%=interval;
   return true;
  },
  reset(){accumulator=0;wasEnabled=false;previousQuality=null;}
 };
}
