// Rendering-only equipment lookup for server-certified nearby players.
// The browser chooses assets from its own catalog: network messages never
// supply a model URL, rarity, tuning, or arbitrary item definition.
import {ITEM_CATALOG} from '../items.js?v=0.6.43.81';
import {AXE_TUNER_DEFAULTS} from '../axe-tuner.js?v=0.3.7.0';
import {SWORD_TUNER_DEFAULTS} from '../sword-tuner.js?v=0.3.7.0';
import {DAGGER_TUNER_DEFAULTS} from '../dagger-tuner.js?v=0.3.7.0';
import {SHIELD_TUNER_DEFAULTS} from '../shield-tuner.js?v=0.3.7.0';
import {BATTLEFURY_ITEM_ID} from './battlefury-tuner.js?v=2';

const WEAPON_ASSETS=Object.freeze({
 axe:Object.freeze({file:'tauren-axe-v0.1.glb',tuning:AXE_TUNER_DEFAULTS}),
 sword:Object.freeze({file:'plains-sword-v0.1.glb',tuning:SWORD_TUNER_DEFAULTS}),
 dagger:Object.freeze({file:'steppe-dagger-v0.1.glb',tuning:DAGGER_TUNER_DEFAULTS})
});
export function remoteEquipmentSpec(peer,slot){
 if(slot!=='weapon'&&slot!=='shield')return null;
 // Older verified presence packets may carry only the certified Battlefury
 // appearance. Keep that supported without accepting arbitrary item IDs.
 const itemId=slot==='weapon'
  ?(peer?.equipment?.weapon??(peer?.battlefury?.itemId===BATTLEFURY_ITEM_ID
   ?BATTLEFURY_ITEM_ID:null))
  :peer?.equipment?.shieldId;
 if(typeof itemId!=='string')return null;
 const def=ITEM_CATALOG[itemId];
 if(!def||def.slot!==slot)return null;
 if(slot==='weapon'){
  const kind=def.weaponKind,asset=WEAPON_ASSETS[kind];
  if(!asset)return null;
  const battlefury=itemId===BATTLEFURY_ITEM_ID;
  if(battlefury&&peer?.battlefury?.itemId!==BATTLEFURY_ITEM_ID)return null;
  // Only the one hardcoded administrator asset may override ordinary gear.
  const url=battlefury?'../assets/weapons/admin-battlefury.glb':
   '../assets/weapons/'+asset.file;
  return {slot,itemId,kind,rarity:def.rarity,url,tuning:asset.tuning,
   sourceId:def.sourceId,battlefury,key:itemId+'|'+url};
 }
 const kind=['uncommon','rare'].includes(def.rarity)?'kite':'round';
 const file=kind==='kite'?'nexgame_kite_shield_quality.glb':
  'nexgame_round_shield_poor.glb';
 const url='../assets/shields/'+file;
 return {slot,itemId,kind,rarity:def.rarity,url,
  tuning:SHIELD_TUNER_DEFAULTS[kind],sourceId:def.sourceId,key:itemId+'|'+url};
}
