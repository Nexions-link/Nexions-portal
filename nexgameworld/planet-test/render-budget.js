// Cosmetic shadow-map cadence, independent of physics, controls and combat.
// The high preset redraws its 1024 px map on every rendered frame;
// balanced (512 px) schedules about 30 redraws/second on 60 Hz screens.
export const BALANCED_SHADOW_HZ=30;
export function createShadowRefreshBudget(){
 let accumulator=0,wasEnabled=false,previousQuality=null,previousHz=0;
 return {
  next(dt,{enabled,quality='balanced',maxHz=0}={}){
   if(!enabled){
    accumulator=0;wasEnabled=false;previousQuality=quality;previousHz=maxHz;
    return false;
   }
   const changed=!wasEnabled||previousQuality!==quality||previousHz!==maxHz;
   wasEnabled=true;previousQuality=quality;previousHz=maxHz;
   if(changed){accumulator=0;return true;}
   if(quality==='high'&&!(maxHz>0))return true;
   if(!Number.isFinite(dt)||dt<=0)return false;
   accumulator+=Math.min(dt,.1);
   const interval=1/(maxHz>0?Math.min(60,Math.max(8,maxHz)):BALANCED_SHADOW_HZ);
   if(accumulator+1e-9<interval)return false;
   accumulator%=interval;
   return true;
  },
  reset(){accumulator=0;wasEnabled=false;previousQuality=null;previousHz=0;}
 };
}
