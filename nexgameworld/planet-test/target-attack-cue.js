// Presentation of authoritative melee windups, never an attack/cast timer.
// This state cannot deal damage, cancel a server action or mutate mob poses.
export const TARGET_ATTACK_STALE_MS=2000;
const living=mob=>mob?.kind==='mob'&&mob.hp>0&&!mob.dead&&!mob.corpse&&mob.root?.visible!==false;
const validLife=life=>Number.isInteger(life)&&life>=0;

export function createTargetAttackCue({now=()=>performance.now(),maxEntries=128}={}){
 const active=new Map(),lives=new Map();
 const limit=Number.isInteger(maxEntries)?Math.max(1,Math.min(512,maxEntries)):128;
 function accept(id,life,mob){
  if(typeof id!=='string'||!id||!validLife(life)||mob?.id!==id||mob.life!==life)return false;
  const previous=lives.get(id);
  if(previous!==undefined&&life<previous)return false;
  if(previous!==life)active.delete(id);
  lives.set(id,life);
  if(lives.size>limit){const oldest=lives.keys().next().value;lives.delete(oldest);active.delete(oldest);}
  return true;
 }
 function begin(event,mob){
  if(!living(mob)||!accept(event?.mobId,event?.life,mob))return false;
  const at=now();if(!Number.isFinite(at))return false;
  const duration=Number.isFinite(event.windupMs)&&event.windupMs>0?
   Math.min(1000,Math.max(100,event.windupMs)):null;
  active.set(mob.id,{life:mob.life,startedAt:duration===null?null:at,duration,lastSeen:at});
  return true;
 }
 function finish(event,mob){
  if(!accept(event?.mobId,event?.life,mob))return false;
  return active.delete(mob.id);
 }
 function snapshot(row,mob){
  if(!accept(row?.id??mob?.id,row?.life,mob))return false;
  if(row.phase!=='alive'||!living(mob)||row.attackWindup===false){active.delete(mob.id);return true;}
  // Older snapshots without this field cannot invent a windup or keep one
  // alive. A true flag confirms activity, but supplies NO duration/start time.
  if(row.attackWindup!==true)return false;
  const at=now();if(!Number.isFinite(at))return false;
  const previous=active.get(mob.id);
  if(previous&&at-previous.lastSeen<TARGET_ATTACK_STALE_MS)previous.lastSeen=at;
  else active.set(mob.id,{life:mob.life,startedAt:null,duration:null,lastSeen:at});
  return true;
 }
 function read(mob,{connected=true,playerAlive=true}={}){
  if(!connected||!playerAlive){active.clear();return null;}
  if(!living(mob)){if(mob?.id)active.delete(mob.id);return null;}
  const row=active.get(mob.id),at=now();
  if(!row||row.life!==mob.life)return null;
  if(!Number.isFinite(at)||at<row.lastSeen||at-row.lastSeen>=TARGET_ATTACK_STALE_MS){active.delete(mob.id);return null;}
  if(row.startedAt===null)return {phase:'unknown',progress:null,remainingMs:null};
  const elapsed=Math.max(0,at-row.startedAt),remainingMs=Math.max(0,row.duration-elapsed);
  return {phase:remainingMs>0?'preparing':'waiting',progress:Math.min(1,elapsed/row.duration),remainingMs};
 }
 return {begin,finish,snapshot,read,clear(){active.clear();lives.clear();}};
}
