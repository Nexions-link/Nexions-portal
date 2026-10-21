// Server-side coordination rules. Wolf pack help never overrides an existing fight.
export const WOLF_PACK_RADIUS=27;
export const WOLF_PACK_MAX_HELPERS=1;
export const WOLF_PACK_HOWL_MS=1050;
export const WOLF_PACK_LEASH_MARGIN=1.1;
export const WOLF_PACK_COOLDOWN_MS=18000;
export const wolfPairIndex=index=>Number.isInteger(index)&&index>=14&&index<20?
 Math.floor((index-14)/2):-1;
export function eligibleWolfPackHelper(leader,helper,target,{radius=261,
 distance,clear,leash=23,now=0}={}){
 if(!leader||!helper||!target||leader===helper||
  leader.family!=='forestWolf'||helper.family!=='forestWolf'||
  wolfPairIndex(leader.index)<0||wolfPairIndex(leader.index)!==wolfPairIndex(helper.index)||
  leader.phase!=='alive'||helper.phase!=='alive'||helper.returning||
  helper.aggroId||helper.packAlerted||target.radius!==radius||
  !target.joined||target.hp<=0||target.respawnShieldUntil>now||
  typeof distance!=='function'||typeof clear!=='function')return false;
 if(distance(leader,helper)>WOLF_PACK_RADIUS)return false;
 if(distance({x:helper.spawnX,z:helper.spawnZ},target)>leash-WOLF_PACK_LEASH_MARGIN)return false;
 if(distance(helper,target)>WOLF_PACK_RADIUS)return false;
 return clear(helper,target)&&clear(leader,helper);
}
