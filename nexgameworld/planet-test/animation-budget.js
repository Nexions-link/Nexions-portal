// Visual-only animation throttling for portrait/mobile rendering.
// Authoritative coordinates, hit detection, mob decisions and death effects
// must NEVER use this budget. Preserve elapsed animation time between frames.
export const ANIMATION_LOD=Object.freeze({
 nearMetres:22,farMetres:40,
 midInterval:1/30,farInterval:1/15
});

export function consumeAnimationTime(entity,dt,metres,{urgent=false}={}){
 if(!entity||!Number.isFinite(dt)||dt<=0)return 0;
 // The render loop already caps dt. A bound also protects against tab resume.
 const step=Math.min(dt,.12);
 const previous=Number.isFinite(entity.animationPending)?Math.max(0,entity.animationPending):0;
 const total=Math.min(.12,previous+step);
 const interval=urgent||!Number.isFinite(metres)||metres<=ANIMATION_LOD.nearMetres
  ?0:metres<ANIMATION_LOD.farMetres?ANIMATION_LOD.midInterval:ANIMATION_LOD.farInterval;
 if(interval>0&&total+1e-8<interval){
  entity.animationPending=total;
  return 0;
 }
 entity.animationPending=0;
 return total;
}
