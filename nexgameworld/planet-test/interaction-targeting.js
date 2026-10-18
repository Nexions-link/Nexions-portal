// Planet Test PT 0.5.1: keep friendly proximity interaction and combat targeting
// independent, mirroring the behaviour of the stable NexGame.
import {TARGET_ACQUISITION_RADIUS} from '../target-selection.js?v=0.3.7.1';
import {HOUSE_CHEST} from './hearth-house.js?v=2';
export const INTERACTION_RANGE=Object.freeze({gather:2.8,chest:HOUSE_CHEST.range,mentor:4.7,vendor:4.7,herbalist:4.7,corpse:3.1});
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
// Classic-inspired Tab: centred targets first, then broad front, then sides,
// then rear. Distance is the tie-breaker inside each zone; holding a target and
// cycling backwards are still supported. This is our explicit, stable policy,
// rather than claiming to reproduce Blizzard's unpublished internal algorithm.
export const CENTER_TARGET_COSINE=Math.cos(Math.PI/6); // 30-degree half-angle
export const FORWARD_TARGET_COSINE=.5; // 60-degree half-angle
export function targetPriorityZone(alignment){
 if(!Number.isFinite(alignment))return 2; // distance-only fallback
 if(alignment>=CENTER_TARGET_COSINE)return 0;
 if(alignment>=FORWARD_TARGET_COSINE)return 1;
 if(alignment>=0)return 2;
 return 3;
}
export function cycleHostileTarget(mobs,dummy,current,dist,step=1,alignment=null){
 const directed=typeof alignment==='function';
 const nearby=mobs.concat(dummy?[dummy]:[]).map((entity,index)=>{
  const d=dist(entity);
  // Cosine of the signed-independent angle in the hero's tangent plane.
  // Undefined/singular facing falls back to distance-only selection.
  const a=directed?alignment(entity):NaN;
  return {entity,index,d,a:Number.isFinite(a)?Math.max(-1,Math.min(1,a)):NaN};
 }).filter(({entity,d})=>entity?.root?.visible&&entity.hp>0&&!entity.dead&&!entity.corpse&&
   Number.isFinite(d)&&d<=TARGET_ACQUISITION_RADIUS)
 .sort((a,b)=>{
  const zoneA=targetPriorityZone(a.a),zoneB=targetPriorityZone(b.a);
  return zoneA-zoneB||a.d-b.d||(Number.isFinite(a.a)&&Number.isFinite(b.a)?b.a-a.a:0)||a.index-b.index;
 }).map(item=>item.entity);
 if(!nearby.length)return null;
 const currentIndex=nearby.indexOf(current);
 if(currentIndex===-1)return nearby[0];
 return nearby[(currentIndex+(step<0?-1:1)+nearby.length)%nearby.length];
}
