// Planet Test PT 0.5.1: keep friendly proximity interaction and combat targeting
// independent, mirroring the behaviour of the stable NexGame.
import {TARGET_ACQUISITION_RADIUS} from '../target-selection.js?v=0.3.7.1';
import {HOUSE_CHEST} from './hearth-house.js?v=3';
// Last legal melee blow is 3.45m + 0.35m network tolerance.
export const CORPSE_LOOT_RANGE=4.5;
export const INTERACTION_RANGE=Object.freeze({gather:2.8,banditWeapon:2.8,chest:HOUSE_CHEST.range-.5,mentor:4.7,vendor:4.7,herbalist:4.7,banditQuest:4.7,corpse:CORPSE_LOOT_RANGE});
export function nearbyInteractable(entities,dist,resourceReady){
 const rows=[];
 for(const entity of entities){
  if(!entity?.root?.visible)continue;
  let range=0;
  if(entity.kind==='relic'){
   range=2.8;
  }else if(entity.kind==='gather'||entity.kind==='banditWeapon'){
   if(!resourceReady(entity))continue;
   range=INTERACTION_RANGE[entity.kind];
  }else if(entity.kind==='mob'){
   if(!entity.corpse||!entity.loot?.length)continue; // Loot can open during the falling animation.
   range=INTERACTION_RANGE.corpse;
  }else range=INTERACTION_RANGE[entity.kind]||0;
  if(!range)continue;
  const d=dist(entity);
  if(Number.isFinite(d)&&d<=range)rows.push({entity,d});
 }
 rows.sort((a,b)=>a.d-b.d);
 return rows[0]?.entity||null;
}
// NGW policy inspired by WoW's explicit Tab lock and forward/backward cycle.
// Blizzard's native ranking is unpublished; these thresholds are our own.
export const CENTER_TARGET_COSINE=Math.cos(Math.PI/6);
export const FORWARD_TARGET_COSINE=.5;
export const TARGET_CYCLE_TIMEOUT=2;
export const TARGET_CYCLE_TURN=Math.cos(35*Math.PI/180);
export function targetPriorityZone(alignment){
 if(!Number.isFinite(alignment))return 2;
 if(alignment>=CENTER_TARGET_COSINE)return 0;
 if(alignment>=FORWARD_TARGET_COSINE)return 1;
 return 2;
}
function hostileCandidates(mobs,dummy,dist,alignment,canSee){
 return mobs.concat(dummy?[dummy]:[]).map((entity,index)=>{
  const d=dist(entity),a=alignment?alignment(entity):NaN;
  return {entity,index,d,a};
 }).filter(({entity,d,a})=>entity?.root?.visible&&entity.hp>0&&!entity.dead&&!entity.corpse&&
   Number.isFinite(d)&&d<=TARGET_ACQUISITION_RADIUS&&
   // Nearby attackers remain reachable even after running behind the hero.
   (!Number.isFinite(a)||a>=0||d<=5)&&(!canSee||canSee(entity)))
 .sort((a,b)=>{
  const closeA=a.d<=5?0:1,closeB=b.d<=5?0:1;
  return closeA-closeB||targetPriorityZone(a.a)-targetPriorityZone(b.a)||a.d-b.d||a.index-b.index;
 }).map(row=>row.entity);
}
export function cycleHostileTarget(mobs,dummy,current,dist,step=1,alignment=null,canSee=null){
 const rows=hostileCandidates(mobs,dummy,dist,alignment,canSee);
 if(!rows.length)return null;
 const i=rows.indexOf(current);
 return rows[i<0?0:(i+(step<0?-1:1)+rows.length)%rows.length];
}
// Freeze a short sequence so moving mobs cannot continually reorder Tab.
// Reset on deliberate retargeting, a pause, a meaningful turn or displacement.
export function createHostileTargetCycle(){
 let order=[],last=null,startedAt=-Infinity,origin=null,forward=null;
 function reset(){order=[];last=null;startedAt=-Infinity;origin=null;forward=null;}
 function next({mobs,dummy,current,dist,alignment,canSee,step=1,now,position,facing}){
  const available=hostileCandidates(mobs,dummy,dist,alignment,canSee);
  const moved=origin&&position&&Math.hypot(position.x-origin.x,position.z-origin.z)>3;
  const turned=forward&&facing&&forward.x*facing.x+forward.y*facing.y+forward.z*facing.z<TARGET_CYCLE_TURN;
  const expired=now-startedAt>TARGET_CYCLE_TIMEOUT;
  const reacquire=expired||moved||turned;
  const restart=!order.length||current!==last||reacquire;
  if(restart){
   order=available;origin=position?{...position}:null;forward=facing?{...facing}:null;
  }else{
   const alive=new Set(available);
   order=order.filter(e=>alive.has(e));
   for(const entity of available)if(!order.includes(entity))order.push(entity);
  }
  startedAt=now;
  if(!order.length){last=null;return null;}
  // A fresh direction/position/pause acquires the best target again. A direct
  // click starts cycling from that selected enemy, including Shift+Tab.
  const index=reacquire&&current===last?-1:order.indexOf(current);
  last=order[index<0?0:(index+(step<0?-1:1)+order.length)%order.length];
  return last;
 }
 return {next,reset};
}
