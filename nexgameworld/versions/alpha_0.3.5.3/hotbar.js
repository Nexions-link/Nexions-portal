// NexGame · Alpha 0.3.5.3
// Hotbar data is independent of Three.js and touch/desktop rendering.
// New classes and usable items can extend these registries without changing the UI.
import {getClassAbilities,getAbilityDefinition} from './skills.js?v=0.3.5.3';

export const HOTBAR_SLOT_COUNT=8;
export const DEFAULT_HOTBAR=Object.freeze([
 Object.freeze({kind:'ability',id:'autoAttack'}),
 Object.freeze({kind:'ability',id:'thunderStomp'}),
 Object.freeze({kind:'item',id:'healingPotion'}),
 Object.freeze({kind:'ability',id:'heavyStrike'}),
 null,null,null,null
]);
export const USABLE_ITEMS=Object.freeze({
 healingPotion:Object.freeze({
  id:'healingPotion',name:'Лечебный настой',shortName:'Настой',
  description:'Восстанавливает 55 здоровья. Расходуется по одному за применение.',
  abilityId:'healingPotion',icon:'🧪'
 })
});
export function actionEntry(kind,id){return {kind,id}}
export function actionDefinition(entry,classId='warrior',level=1){
 if(!entry||typeof entry!=='object'||typeof entry.id!=='string')return null;
 if(entry.kind==='ability'){
  const def=getAbilityDefinition(entry.id);
  if(!def||def.kind==='consumable'||(def.classId!=='all'&&def.classId!==classId))return null;
  if(level<def.level)return null;
  return {kind:'ability',id:def.id,name:def.name,description:def.description,
   hotkey:def.hotkey,resourceCost:def.resourceCost,cooldown:def.cooldown,
   gcd:def.gcd,abilityId:def.id};
 }
 if(entry.kind==='item'){
  const item=USABLE_ITEMS[entry.id];
  if(!item)return null;
  return {kind:'item',id:item.id,name:item.name,description:item.description,
   abilityId:item.abilityId,icon:item.icon};
 }
 return null;
}
export function availableHotbarActions(classId='warrior',level=1){
 return {
  abilities:getClassAbilities(classId,level).filter(def=>def.kind!=='consumable')
   .map(def=>actionDefinition(actionEntry('ability',def.id),classId,level)),
  items:Object.values(USABLE_ITEMS).map(item=>
   actionDefinition(actionEntry('item',item.id),classId,level))
 };
}
export function normalizeHotbar(raw,classId='warrior',level=1){
 const list=Array.isArray(raw)?raw:DEFAULT_HOTBAR;
 return Array.from({length:HOTBAR_SLOT_COUNT},(_,i)=>{
  const entry=list[i],info=actionDefinition(entry,classId,level);
  return info?{kind:info.kind,id:info.id}:null;
 });
}
export function assignHotbarSlot(raw,index,entry,classId='warrior',level=1){
 const list=normalizeHotbar(raw,classId,level);
 if(!Number.isInteger(index)||index<0||index>=HOTBAR_SLOT_COUNT)return list;
 if(entry===null){list[index]=null;return list}
 const def=actionDefinition(entry,classId,level);
 if(!def)return list;
 list[index]={kind:def.kind,id:def.id};
 return list;
}
