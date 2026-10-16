import {ITEM_CATALOG,deriveStats} from '../items.js?v=0.3.5.17';
export const EQUIPMENT_LABELS={weapon:'Оружие',shield:'Щит',head:'Голова',chest:'Грудь',legs:'Ноги',hands:'Руки',waist:'Пояс',wrists:'Запястья',feet:'Ступни'};
const failure=error=>({ok:false,error});
export function equipFromBag(state,id,inCombat=false){
 const def=ITEM_CATALOG[id];
 if(!def?.slot||!EQUIPMENT_LABELS[def.slot])return failure('Предмет нельзя экипировать');
 if(def.slot!=='weapon'&&inCombat)return failure('Сначала выйди из боя, чтобы сменить экипировку');
 if(state.level<(def.requiredLevel||1))return failure('Требуется '+def.requiredLevel+' уровень');
 const index=state.inventory.findIndex(item=>item?.id===id&&item.qty>0);
 if(index<0)return failure('Предмета нет в рюкзаке');
 const previous=state.equipment[def.slot]?.id,item=state.inventory[index];
 if(previous&&item.qty>1&&state.inventory.length>=12)return failure('Сумка заполнена');
 // Atomic exchange, including a completely full backpack. No HP is granted.
 if(item.qty===1){
  if(previous)state.inventory[index]={id:previous,qty:1};
  else state.inventory.splice(index,1);
 }else{
  item.qty--;if(previous)state.inventory.push({id:previous,qty:1});
 }
 state.equipment[def.slot]={id};
 state.hp=Math.min(state.hp,deriveStats(state.level,state.equipment).maxHp);
 return {ok:true,slot:def.slot};
}
export function unequipToBag(state,slot,inCombat=false){
 if(slot!=='weapon'&&inCombat)return failure('Сначала выйди из боя, чтобы снять экипировку');
 const item=state.equipment[slot];
 if(!item)return failure('Слот пуст');
 if(state.inventory.length>=12)return failure('Для снятой вещи нужно свободное место в рюкзаке');
 state.inventory.push({id:item.id,qty:1});delete state.equipment[slot];
 state.hp=Math.min(state.hp,deriveStats(state.level,state.equipment).maxHp);
 return {ok:true,slot};
}
