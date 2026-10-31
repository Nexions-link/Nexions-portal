// Cosmetic shadow-map cadence, independent of physics, controls and combat.
// The high preset redraws its 2048 px map on every rendered frame;
// balanced (1024 px) schedules about 30 redraws/second on 60 Hz screens.
export const BALANCED_SHADOW_HZ=30;
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
   if(quality==='high')return true;
   if(!Number.isFinite(dt)||dt<=0)return false;
   accumulator+=Math.min(dt,.1);
   const interval=1/BALANCED_SHADOW_HZ;
   if(accumulator+1e-9<interval)return false;
   accumulator%=interval;
   return true;
  },
  reset(){accumulator=0;wasEnabled=false;previousQuality=null;}
 };
}
