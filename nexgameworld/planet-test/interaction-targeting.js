// Planet Test PT 0.5.1: keep friendly proximity interaction and combat targeting
// independent, mirroring the behaviour of the stable NexGame.
import {TARGET_ACQUISITION_RADIUS} from '../target-selection.js?v=0.3.7.1';
export const INTERACTION_RANGE=Object.freeze({gather:2.8,chest:4.7,mentor:4.7,vendor:4.7,herbalist:4.7,corpse:3.1});
export function nearbyInteractable(entities,dist,resourceReady){
 const rows=[];
 for(const entity of entities){
  if(!entity?.root?.visible)continue;
  let range=0;
  if(entity.kind==='relic'){
   range=2.8;
  }else if(entity.kind==='gather'){
   if(!resourceReady(entity))continue;
   range=INTERACTION_RANGE.gather;
  }else if(entity.kind==='mob'){
   if(!entity.corpse||entity.dying||!entity.loot?.length)continue;
   range=INTERACTION_RANGE.corpse;
  }else range=INTERACTION_RANGE[entity.kind]||0;
  if(!range)continue;
  const d=dist(entity);
  if(Number.isFinite(d)&&d<=range)rows.push({entity,d});
 }
 rows.sort((a,b)=>a.d-b.d);
 return rows[0]?.entity||null;
}
export function cycleHostileTarget(mobs,dummy,current,dist,step=1){
 const nearby=mobs.concat(dummy?[dummy]:[]).map((entity,index)=>({entity,index,d:dist(entity)}))
  .filter(({entity,d})=>entity?.root?.visible&&entity.hp>0&&!entity.dead&&!entity.corpse&&
    Number.isFinite(d)&&d<=TARGET_ACQUISITION_RADIUS)
  // Strict nearest-first distance. No special treatment for training dummies.
  .sort((a,b)=>a.d-b.d||a.index-b.index)
  .map(item=>item.entity);
 if(!nearby.length)return null;
 const currentIndex=nearby.indexOf(current);
 if(currentIndex===-1)return nearby[0];
 return nearby[(currentIndex+(step<0?-1:1)+nearby.length)%nearby.length];
}
