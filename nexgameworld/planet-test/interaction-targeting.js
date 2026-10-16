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
// Spherical NexGameWorld directional targeting: favour what the hero faces, not a closer
// enemy off to the side. Keep the original 40 m spherical acquisition range.
// Targets outside the 60° forward cone remain reachable by cycling.
export const FORWARD_TARGET_COSINE=.5;
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
  const aFront=Number.isFinite(a.a)&&a.a>=FORWARD_TARGET_COSINE;
  const bFront=Number.isFinite(b.a)&&b.a>=FORWARD_TARGET_COSINE;
  if(aFront!==bFront)return aFront?-1:1;
  if(aFront&&bFront){
   // Centred enemies beat much nearer ones at the edge of the cone;
   // distance resolves targets pointing in almost the same direction.
   const scoreA=1-a.a+a.d/500,scoreB=1-b.a+b.d/500;
   return scoreA-scoreB||a.d-b.d||a.index-b.index;
  }
  return a.d-b.d||a.index-b.index;
 }).map(item=>item.entity);
 if(!nearby.length)return null;
 const currentIndex=nearby.indexOf(current);
 if(currentIndex===-1)return nearby[0];
 return nearby[(currentIndex+(step<0?-1:1)+nearby.length)%nearby.length];
}
