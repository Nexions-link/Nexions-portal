// One authoritative 40-metre radius for hostile target acquisition in NexGame.
// Applies to clicking a target, the target-cycle button, and autoattack acquisition.
// Combat's shorter approach/melee ranges are separate gameplay constraints.
export const TARGET_ACQUISITION_RADIUS=40;

export function targetDistance2D(origin,enemy){
 const p=enemy?.root?.position;
 if(!p||!Number.isFinite(origin?.x)||!Number.isFinite(origin?.z)
  ||!Number.isFinite(p.x)||!Number.isFinite(p.z))return Infinity;
 return Math.hypot(origin.x-p.x,origin.z-p.z);
}

export function targetsByProximity(enemies,origin,isEligible,range=TARGET_ACQUISITION_RADIUS){
 if(!Array.isArray(enemies)||!Number.isFinite(range)||range<0)return [];
 const predicate=typeof isEligible==='function'?isEligible:
  enemy=>!!enemy&&enemy.dead<=0&&enemy.hp>0;
 return enemies.map((enemy,order)=>({enemy,order,distance:targetDistance2D(origin,enemy)}))
  .filter(row=>predicate(row.enemy)&&row.distance<=range)
  .sort((a,b)=>a.distance-b.distance||a.order-b.order)
  .map(row=>row.enemy);
}

export function nextTargetByProximity(enemies,current,origin,isEligible,step=1,range=TARGET_ACQUISITION_RADIUS){
 const sorted=targetsByProximity(enemies,origin,isEligible,range);
 if(!sorted.length)return null;
 const currentIndex=sorted.indexOf(current);
 if(currentIndex===-1)return sorted[0];
 const direction=Number.isFinite(step)&&step<0?-1:1;
 return sorted[(currentIndex+direction+sorted.length)%sorted.length];
}

export function targetIsInRange(enemy,origin,range=TARGET_ACQUISITION_RADIUS){
 return targetDistance2D(origin,enemy)<=range;
}
