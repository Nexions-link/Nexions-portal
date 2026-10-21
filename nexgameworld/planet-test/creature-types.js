// Shared monster taxonomy and loot-currency descriptor.
// Animal creatures never produce coins; future humanoid-type mobs may.
// The server chooses creatureType from its own spawn table, never client data.
export const CREATURE_TYPE_BEAST='beast';
export const CREATURE_TYPE_HUMANOID='humanoid';
export const CREATURE_TYPE_LABELS=Object.freeze({beast:'Животное',humanoid:'Гуманоид'});
export const CORPSE_COIN_ID='coins';
export const MAX_CORPSE_COIN_DROP=100000;
export function creatureTypeForMob(index){
 return Number.isInteger(index)&&index>=0&&index<=9?CREATURE_TYPE_BEAST:
  Number.isInteger(index)&&index>=10&&index<=13?CREATURE_TYPE_HUMANOID:
  Number.isInteger(index)&&index>=14&&index<=19?CREATURE_TYPE_BEAST:null;
}
export function rollCreatureCoins(creatureType,level,rng=Math.random){
 if(creatureType===CREATURE_TYPE_BEAST)return [];
 if(creatureType!==CREATURE_TYPE_HUMANOID||!Number.isInteger(level)||level<1||level>60)
  throw new RangeError('invalid_creature_type');
 const value=rng();
 if(!Number.isFinite(value)||value<0||value>1)throw new RangeError('invalid_coin_rng');
 // One currency stack, measured in the existing NexGameWorld coin unit.
 // Humanoids can use this after the first humanoid spawn is defined.
 return [{id:CORPSE_COIN_ID,qty:Math.min(MAX_CORPSE_COIN_DROP,Math.max(1,Math.floor(1+level*2+value*(3+level))))}];
}
export function isValidCorpseCoins(row){
 return !!row&&row.id===CORPSE_COIN_ID&&Number.isSafeInteger(row.qty)&&row.qty>=1&&row.qty<=MAX_CORPSE_COIN_DROP;
}
