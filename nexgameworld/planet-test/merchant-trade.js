// NexGameWorld spherical offline merchant rules. Never mutate live NexGame saves.
import {ITEM_CATALOG,itemStackLimit} from '../items.js';
import {canStoreCorpseRow} from './corpse-loot.js';
export const BUYBACK_LIMIT=10;
export function sellInventorySlot(state,index){
 if(!Array.isArray(state?.inventory)||!Number.isInteger(index)||index<0||index>=state.inventory.length)
  return {ok:false,reason:'missing'};
 const row=state.inventory[index],def=ITEM_CATALOG[row?.id];
 if(!def||def.quest||!Number.isFinite(def.sell)||def.sell<=0||
  !Number.isInteger(row.qty)||row.qty<1)return {ok:false,reason:'unsellable'};
 const price=Math.floor(def.sell*row.qty);
 if(price<=0)return {ok:false,reason:'unsellable'};
 const sold={id:row.id,qty:row.qty,price};
 state.inventory.splice(index,1);
 state.buyback=Array.isArray(state.buyback)?state.buyback:[];
 state.buyback.unshift(sold);
 state.buyback=state.buyback.slice(0,BUYBACK_LIMIT);
 state.gold=(Number(state.gold)||0)+price;
 return {ok:true,item:sold};
}
export function buyBackFromMerchant(state,index){
 const list=state?.buyback;
 if(!Array.isArray(list)||!Number.isInteger(index)||index<0||index>=list.length)
  return {ok:false,reason:'missing'};
 const row=list[index],def=ITEM_CATALOG[row?.id];
 if(!def||def.quest||!Number.isInteger(row.qty)||row.qty<1||
  !Number.isInteger(row.price)||row.price<0)return {ok:false,reason:'invalid'};
 if((Number(state.gold)||0)<row.price)return {ok:false,reason:'gold'};
 if(!canStoreCorpseRow(state.inventory,row,itemStackLimit,12))
  return {ok:false,reason:'full'};
 // After the all-or-nothing capacity check, commit the stack transfer.
 let left=row.qty;
 const cap=itemStackLimit(row.id);
 for(const slot of state.inventory){
  if(slot.id!==row.id||slot.qty>=cap)continue;
  const amount=Math.min(left,cap-slot.qty);
  slot.qty+=amount;left-=amount;
  if(!left)break;
 }
 while(left>0){
  const amount=Math.min(left,cap);
  state.inventory.push({id:row.id,qty:amount});left-=amount;
 }
 state.gold-=row.price;
 list.splice(index,1);
 return {ok:true,item:{...row}};
}
export function restoreBuyback(raw){
 if(!Array.isArray(raw))return [];
 return raw.slice(0,BUYBACK_LIMIT).filter(row=>
  row&&ITEM_CATALOG[row.id]&&!ITEM_CATALOG[row.id].quest&&
  Number.isInteger(row.qty)&&row.qty>0&&row.qty<=itemStackLimit(row.id)&&
  Number.isInteger(row.price)&&row.price>=0&&row.price<=9999999
 ).map(row=>({id:row.id,qty:row.qty,price:row.price}));
}
